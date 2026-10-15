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
test('missing exports reject all waiters without re-executing a partially loaded script',async()=>{
 const f=setup();try{
  const a=f.api.load('/feature.js',{ready:()=>!!f.w.One});
  const b=f.api.load('/feature.js',{ready:()=>!!f.w.Two});
  assert.equal(a,b);assert.equal(f.doc.scripts.length,1);
  f.w.One={};f.finish(f.doc.scripts[0]);
  await assert.rejects(a,{code:'TDB_EXPORT'});await assert.rejects(b,{code:'TDB_EXPORT'});
  await assert.rejects(f.api.load('/feature.js',{ready:()=>!!f.w.Two}),{code:'TDB_EXPORT'});
  assert.equal(f.doc.scripts.length,1,'an executed script is retained, never reinserted');
  f.w.Two={};await f.api.load('/feature.js',{ready:()=>!!f.w.Two});
 }finally{f.close();}
});
test('a completed tag cannot falsely satisfy a missing export or trigger re-execution',async()=>{
 const f=setup();try{
  const first=f.api.load('/feature.js');f.finish(f.doc.scripts[0]);await first;
  await assert.rejects(f.api.load('/feature.js',{ready:()=>!!f.w.Feature}),{code:'TDB_EXPORT'});
  assert.equal(f.doc.scripts.length,1);
  f.w.Feature={};await f.api.load('/feature.js',{ready:()=>!!f.w.Feature});
  assert.equal(f.doc.scripts.length,1);
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
test('timeouts retain one execution, then adopt a late successful export',async()=>{
 const f=setup();try{
  const first=f.api.load('/slow.js',{timeout:10,ready:()=>!!f.w.Slow});const old=f.doc.scripts[0];
  await assert.rejects(first,{code:'TDB_TIMEOUT'});assert.equal(old.isConnected,true);
  await assert.rejects(f.api.load('/slow.js'),{code:'TDB_TIMEOUT'});
  assert.equal(f.doc.scripts.length,1);
  f.w.Slow={};f.finish(old);await f.api.load('/slow.js');
  assert.equal(f.doc.scripts.length,1,'a late load is adopted rather than executed twice');
 }finally{f.close();}
});
test('an explicit late network failure releases a timed-out flight for retry',async()=>{
 const f=setup();try{
  const first=f.api.load('/slow.js',{timeout:10});const old=f.doc.scripts[0];
  await assert.rejects(first,{code:'TDB_TIMEOUT'});f.fail(old);
  const next=f.api.load('/slow.js');const fresh=f.doc.scripts[0];
  assert.notEqual(old,fresh);f.finish(fresh);await next;
 }finally{f.close();}
});
test('shared recovery retries an explicit network failure once, never a bad export',async()=>{
 const f=setup();try{
  const flight=f.api.loadWithRecovery('/retry.js');f.fail(f.doc.scripts[0]);
  await new Promise(r=>setTimeout(r,270));assert.equal(f.doc.scripts.length,1);
  f.finish(f.doc.scripts[0]);await flight;
  const invalid=f.api.loadWithRecovery('/invalid.js',{ready:()=>false});
  f.finish(f.doc.scripts[1]);await assert.rejects(invalid,{code:'TDB_EXPORT'});
  assert.equal(f.doc.scripts.length,2);
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
test('one release ignores stale per-file and cohort overrides',()=>{
 const sha='a'.repeat(40),f=setup({'tdb-gallery.js':sha,'tdb-ticker.js':'main'});try{
  assert.equal(f.api.resolve(base+'old/dist/tdb-gallery.js'),base+'registry/dist/tdb-gallery.js');
  assert.equal(f.api.resolve(base+'old/dist/tdb-parallax.js'),base+'registry/dist/tdb-parallax.js');
  assert.equal(f.api.resolve(base+'old/dist/tdb-motion.js'),base+'registry/dist/tdb-motion.js');
  assert.equal(f.api.resolve(base+'old/dist/tdb-ticker.js'),base+'registry/dist/tdb-ticker.js');
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
