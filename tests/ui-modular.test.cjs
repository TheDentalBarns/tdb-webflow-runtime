/* Regression checks for preserved CSS declarations and asynchronous ownership.
 * NODE_PATH may provide jsdom/postcss; build dependencies are pinned separately. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const postcss = require('postcss');
const {JSDOM} = require('jsdom');
const CleanCSS = require('../tools/runtime-build/node_modules/clean-css');
const read = path => fs.readFileSync(path, 'utf8');
function declarations(css) {
  const clean = new CleanCSS({level:0,rebase:false}).minify(css.replace(/\/\*[\s\S]*?\*\//g,''));
  assert.deepEqual(clean.errors, []);
  const out = new Map();
  postcss.parse(clean.styles).walkDecls(decl => {
    const scope = [];
    for (let node=decl.parent; node && node.type !== 'root'; node=node.parent)
      scope.unshift(node.type === 'rule' ? node.selector : '@'+node.name+' '+node.params);
    const key = [...scope,decl.prop,decl.value,String(decl.important||false)].join('|');
    out.set(key,(out.get(key)||0)+1);
  });
  return out;
}
test('all original UI and slider declarations survive the split', () => {
  const before = declarations(read('tests/fixtures/ui-before-modular.css')+'\n'+read('tests/fixtures/slider-before-modular.css'));
  const after = declarations(['dist/tdb-ui.css','dist/tdb-vimeo.css','dist/tdb-announcement.css','dist/tdb-slider-ui.css','src/styles/tdb-consent-states.css'].map(read).join('\n'));
  for (const [key,count] of before) assert.equal(after.get(key), count, key);
  assert(!read('dist/tdb-ui.css').includes('data-vimeo'));
  assert(!read('dist/tdb-ui.css').includes('.tdb-consent'));
});
function fixture(markup, allowed=false, sharedReady=false) {
  const dom=new JSDOM('<!doctype html><html><head><link data-tdb-ui-css rel="stylesheet" media="print" href="https://cdn.test/release/dist/tdb-ui.css"></head><body>'+markup+'</body></html>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, events=[];
  const shared=w.document.querySelector('link');
  if(sharedReady){shared.media='all';Object.defineProperty(shared,'sheet',{value:{},configurable:true});}
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.test/release/dist/tdb-vimeo-loader.js'}});
  let near;
  w.IntersectionObserver=class{constructor(cb){near=()=>cb([{isIntersecting:true}]);}observe(){}disconnect(){}};
  w.CookieScript={instance:{currentState:()=>({categories:allowed?['functionality']:[]}),show:()=>events.push('settings')}};
  w.eval(read('dist/tdb-vimeo-loader.js'));
  return {w,dom,events,near:()=>near?.(),allow:()=>{allowed=true;},shared,load(node){Object.defineProperty(node,'sheet',{value:{},configurable:true});node.dispatchEvent(new w.Event('load'));}};
}
const hero='<section data-vimeo-hero-shell><button data-vimeo-control="play">Play</button></section>';
const content='<section data-vimeo-content-init><button data-vimeo-control="play">Play</button></section>';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('no video means no video stylesheet; distant content waits for proximity', async()=>{
  const absent=fixture('No videos');
  assert.equal(absent.w.document.querySelector('[data-tdb-vimeo-css]'),null);absent.dom.window.close();
  const f=fixture(content);
  assert.equal(f.w.document.querySelector('[data-tdb-vimeo-css]'),null);
  f.near();assert(f.w.document.querySelector('[data-tdb-vimeo-css]'));f.dom.window.close();
});
test('hero requests video CSS immediately, but controller waits for BOTH styles',async()=>{
  const f=fixture(hero,true);
  const css=f.w.document.querySelector('[data-tdb-vimeo-css]');assert(css);
  assert.equal(css.previousElementSibling,f.shared);
  f.near();f.load(css);await tick();
  assert.equal(f.w.document.querySelector('[data-vimeo-controller-js]'),null);
  f.load(f.shared);await tick();
  assert(f.w.document.querySelector('[data-vimeo-controller-js]'));
  f.dom.window.close();
});
test('video stylesheet failure can retry and never starts the controller early',async()=>{
  const f=fixture(hero,true,true);f.near();
  const first=f.w.document.querySelector('[data-tdb-vimeo-css]');first.dispatchEvent(new f.w.Event('error'));await tick();
  assert.equal(f.w.document.querySelector('[data-vimeo-controller-js]'),null);
  f.w.document.querySelector('button').click();await tick();
  const next=f.w.document.querySelector('[data-tdb-vimeo-css]');assert(next);assert.notEqual(first,next);
  f.load(next);await tick();assert(f.w.document.querySelector('[data-vimeo-controller-js]'));f.dom.window.close();
});
test('declined functionality permission still opens consent without requesting Vimeo',async()=>{
  const f=fixture(hero,false,true);f.near();f.load(f.w.document.querySelector('[data-tdb-vimeo-css]'));await tick();
  f.w.document.querySelector('button').click();
  assert.deepEqual(f.events,['settings']);assert.equal(f.w.document.querySelector('[data-vimeo-controller-js]'),null);
  assert.equal(f.w.document.querySelector('section').getAttribute('data-vimeo-ui'),'awaiting-consent');f.dom.window.close();
});
test('announcement waits for both state bundles before requesting its engines',async()=>{
  const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window,loaded=[];
  let sharedReady,announcementReady;
  w.tdbEnsureUI=()=>new Promise(r=>sharedReady=r);
  w.tdbEnsureAnnouncementUI=()=>new Promise(r=>announcementReady=r);
  w.TDBModules={load:async url=>loaded.push(String(url))};
  w.eval(read('src/banner/loader.js'));
  const flight=w.TDBAnnouncementLoader.load();assert.equal(loaded.length,0);
  sharedReady();await tick();assert.equal(loaded.length,0);
  announcementReady();await flight;assert(loaded.some(x=>x.endsWith('tdb-announcement.js')));w.close();
});
