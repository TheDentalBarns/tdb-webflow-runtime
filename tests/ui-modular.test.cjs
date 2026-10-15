/* Regression checks for preserved CSS declarations and asynchronous ownership.
 * NODE_PATH may provide jsdom/postcss; build dependencies are pinned separately. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const postcss = require('postcss');
const {JSDOM} = require('jsdom');
const CleanCSS = require('clean-css');
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
  const before = declarations((read('tests/fixtures/ui-before-modular.css')+'\n'+read('tests/fixtures/slider-before-modular.css')).replaceAll('html[data-wf-page="677cf86df9952f978d94d8a9"]:has','html:has'));
  const after = declarations(['dist/tdb-ui.css','dist/tdb-vip-chrome.css','dist/tdb-vimeo.css','dist/tdb-announcement.css','dist/tdb-slider-ui.css'].map(read).join('\n'));
  for (const [key,count] of before) {
    // User explicitly removed empty-quote masking; all other original declarations survive.
    if (key.startsWith('.section_standard-testimonial:has(') || key.startsWith('[data-tdb-dd-page],.tdbc-dd-fade|') || key.startsWith('[data-tdb-dd-preset="orange"]|') || key.startsWith('[data-tdb-copy-paragraphs]|') || key.startsWith('.tdb-consent-dialog|-webkit-tap-highlight-color|')) { assert.equal(after.has(key), false); continue; }
    assert.equal(after.get(key), count, key);
  }
  assert(!read('dist/tdb-ui.css').includes('data-vimeo'));
  assert(read('dist/tdb-ui.css').includes('.tdb-consent'), 'consent states returned to the shared stylesheet in the later consent release');
});
// Vimeo ownership and recovery are exercised in vimeo-consent-gate.test.cjs.
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('announcement waits for both state bundles before requesting its engines',async()=>{
  const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window,loaded=[];
  let sharedReady,announcementReady;
  w.tdbEnsureUI=()=>new Promise(r=>sharedReady=r);
  w.tdbEnsureAnnouncementUI=()=>new Promise(r=>announcementReady=r);
  w.TDBModules={load:async url=>loaded.push(String(url))};
  w.eval("const TDBRuntimeModuleRoot=new URL('https://cdn.example/release/dist/');\n"+read('src/banner/loader.js'));
  const flight=w.TDBAnnouncementLoader.load();assert.equal(loaded.length,0);
  sharedReady();await tick();assert.equal(loaded.length,0);
  announcementReady();await flight;assert(loaded.some(x=>x.endsWith('tdb-announcement.js')));w.close();
});

test('slider focus waits for shared and slider CSS before initialising',async()=>{
  const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window,loaded=[];
  let uiReady,sliderReady;
  w.tdbEnsureUI=()=>new Promise(r=>uiReady=r);
  w.tdbEnsureSliderUI=()=>new Promise(r=>sliderReady=r);
  w.TDBModules={load:async url=>loaded.push(String(url))};
  w.eval("const TDBRuntimeModuleRoot=new URL('https://cdn.example/release/dist/');\n"+read('src/runtime/deferred-ui.js'));
  const flight=w.tdbEnsureSliderFocus();uiReady();await tick();assert.equal(loaded.length,0);
  sliderReady();await flight;assert(loaded.some(x=>x.endsWith('tdb-slider-focus.js')));w.close();
});
test('native VIP markup still waits for coordination CSS',async()=>{
  const dom=new JSDOM('<!doctype html><html data-wf-page="677cf86df9952f978d94d8a9"><body><div id="tdb-vip-drawer" data-tdb-vip-native="1"></div></body></html>',{runScripts:'outside-only',url:'https://dentalbarns.webflow.io/'}),w=dom.window;
  // Isolate the public loader without starting unrelated features.
  const source=read('src/vip-drawer/loader.js');
  w.eval("const TDBRuntimeModuleRoot=new URL('https://cdn.example/release/dist/');\n"+source);
  w.TDBModules={resolve:url=>String(url)};
  w.TDBRuntimePageState={vipScrollSeed:{lastY:0,up:0,down:0,peek:false}};
  let cssReady,loaded=0;
  w.TDBFooterInitialScrollY=0;w.tdbPreloadVIPScript=()=>{};
  w.tdbEnsureUI=w.tdbEnsureVIPUI=()=>Promise.resolve();
  w.tdbEnsureVIPChrome=()=>new Promise(r=>cssReady=r);
  w.tdbLoadVIPScript=async()=>{loaded++;w.TDBVIPDrawer={resumeScroll(){}};};
  w.prepareVIPDrawerLoader();
  const flight=w.TDBVIPDrawerLoader.load();await tick();assert.equal(loaded,0);
  cssReady();await flight;assert.equal(loaded,1);w.close();
});
