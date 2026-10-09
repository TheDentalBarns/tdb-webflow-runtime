const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require(process.env.TDB_JSDOM||'jsdom');
const source=fs.readFileSync('dist/tdb-modules.js','utf8');
const base='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@';
function setup(pins={}){
 const dom=new JSDOM('<!doctype html><head></head><body><button>Open</button></body>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
 const w=dom.window, registry=w.document.createElement('script');
 registry.src=base+'registry/dist/tdb-modules.js';
 registry.dataset.tdbCarouselBase=base+'carousel/dist/';
 registry.dataset.tdbMotionBase=base+'motion/dist/';
 registry.dataset.tdbAssetPins=JSON.stringify(pins);
 Object.defineProperty(w.document,'currentScript',{value:registry});
 w.eval(source);
 return {w,api:w.TDBModules,doc:w.document,close:()=>w.close(),finish:node=>node.dispatchEvent(new w.Event('load')),fail:node=>node.dispatchEvent(new w.Event('error'))};
}
test('concurrent consumers share transport and validate every required export',async()=>{
 const f=setup();try{
  const a=f.api.load('/feature.js',{ready:()=>!!f.w.One});
  const b=f.api.load('/feature.js',{ready:()=>!!f.w.Two});
  assert.equal(a,b);assert.equal(f.doc.scripts.length,1);
  f.w.One={};f.finish(f.doc.scripts[0]);
  await assert.rejects(a,/expected export/);await assert.rejects(b,/expected export/);
  assert.equal(f.doc.scripts.length,0);
  const retry=f.api.load('/feature.js',{ready:()=>!!f.w.Two});
  f.w.Two={};f.finish(f.doc.scripts[0]);await retry;
  assert.equal(f.doc.scripts.length,1);
 }finally{f.close();}
});
test('known loaded tags cannot falsely satisfy a missing export; retry replaces only owned tags',async()=>{
 const f=setup();try{
  const first=f.api.load('/feature.js');f.finish(f.doc.scripts[0]);await first;
  await assert.rejects(f.api.load('/feature.js',{ready:()=>!!f.w.Feature}),/expected export/);
  assert.equal(f.doc.scripts.length,0);
  const retry=f.api.load('/feature.js',{ready:()=>!!f.w.Feature});f.w.Feature={};f.finish(f.doc.scripts[0]);await retry;
  await f.api.load('/feature.js',{ready:()=>!!f.w.Feature});assert.equal(f.doc.scripts.length,1);
 }finally{f.close();}
});
test('existing in-flight tags are adopted, errors allow retry, and a late old load does not settle the retry',async()=>{
 const f=setup();try{
  const existing=f.doc.createElement('script');existing.src='https://dentalbarns.webflow.io/feature.js';f.doc.head.append(existing);
  const first=f.api.load('/feature.js');assert.equal(f.doc.scripts.length,1);f.fail(existing);await assert.rejects(first,/unavailable/);
  assert.equal(existing.isConnected,true,'external tag ownership is preserved');
  let resolved=false;const retry=f.api.load('/feature.js').then(()=>{resolved=true;});
  assert.equal(f.doc.scripts.length,2);f.finish(existing);await Promise.resolve();assert.equal(resolved,false);
  f.finish(f.doc.scripts[1]);await retry;assert.equal(resolved,true);
 }finally{f.close();}
});
test('timeouts clear flights and listeners before a subsequent successful attempt',async()=>{
 const f=setup();try{
  const first=f.api.load('/slow.js',{timeout:10});const old=f.doc.scripts[0];
  await assert.rejects(first,/timed out/);assert.equal(old.isConnected,false);
  const retry=f.api.load('/slow.js');f.finish(old);assert.equal(f.doc.scripts.length,1);f.finish(f.doc.scripts[0]);await retry;
 }finally{f.close();}
});
test('stylesheet loading is single-flight, validates readiness, and reuses a loaded existing sheet',async()=>{
 const f=setup();try{
  const first=f.api.load('/feature.css',{type:'style'}),second=f.api.load('/feature.css',{type:'style'});
  assert.equal(first,second);const link=f.doc.querySelector('link');assert.equal(link.rel,'stylesheet');f.finish(link);await first;
  const existing=f.doc.createElement('link');existing.rel='stylesheet';existing.href='/existing.css';Object.defineProperty(existing,'sheet',{value:{}});f.doc.head.append(existing);
  await f.api.load('/existing.css',{type:'style'});assert.equal(f.doc.querySelectorAll('link').length,2);
  const missing=f.api.load('/missing.css',{type:'style',ready:()=>false});f.finish(f.doc.querySelector('link[href$="missing.css"]'));await assert.rejects(missing,/expected export/);
 }finally{f.close();}
});
test('module tags retain their type and conflicting URLs/types reject without duplicate tags',async()=>{
 const f=setup();try{
  const promise=f.api.load('/module.js',{type:'module',attribute:'data-feature'});const node=f.doc.scripts[0];assert.equal(node.type,'module');
  await assert.rejects(f.api.load('/other.js',{attribute:'data-feature'}),/Conflicting dependency URL/);
  await assert.rejects(f.api.load('/module.js'),/Conflicting dependency type/);f.finish(node);await promise;
  assert.equal(f.doc.scripts.length,1);
 }finally{f.close();}
});
test('per-file immutable pins preserve every unrelated cohort and ignore mutable pins',()=>{
 const sha='a'.repeat(40),f=setup({'tdb-gallery.js':sha,'tdb-ticker.js':'main'});try{
  assert.equal(f.api.resolve(base+'old/dist/tdb-gallery.js'),base+sha+'/dist/tdb-gallery.js');
  assert.equal(f.api.resolve(base+'old/dist/tdb-parallax.js'),base+'carousel/dist/tdb-parallax.js');
  assert.equal(f.api.resolve(base+'old/dist/tdb-motion.js'),base+'motion/dist/tdb-motion.js');
  assert.equal(f.api.resolve(base+'old/dist/tdb-ticker.js'),base+'carousel/dist/tdb-ticker.js');
  assert.equal(f.api.resolve('https://example.com/tdb-gallery.js'),'https://example.com/tdb-gallery.js');
 }finally{f.close();}
});
test('an aborted busy action cannot clear the state of a later action',async()=>{
 const f=setup();try{
  const button=f.doc.querySelector('button'),controller=new f.w.AbortController();let endFirst,endSecond;
  const first=f.api.withBusy(button,()=>new Promise(r=>{endFirst=r;}),{signal:controller.signal});
  controller.abort();assert.equal(button.hasAttribute('aria-busy'),false);
  const second=f.api.withBusy(button,()=>new Promise(r=>{endSecond=r;}));
  endFirst();await first;assert.equal(button.getAttribute('aria-busy'),'true');
  endSecond();await second;assert.equal(button.hasAttribute('aria-busy'),false);
 }finally{f.close();}
});
