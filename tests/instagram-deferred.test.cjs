const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/instagram/deferred.js','utf8');
const starter="const TDBRuntimeModuleRoot=new URL('https://cdn.example/dist/');"+fs.readFileSync('src/runtime/instagram-feature-loader.js','utf8');
const html='<template data-tdb-ig-source="awards"><div data-tdb-ig-native="awards" data-ig-class="ig-native_feed"><div data-ig-class="ig-native_photo" data-cms="untouched"></div></div></template><div data-tdb-ig-placeholder="awards"><a class="tdb-ig-holding-image" href="https://www.instagram.com/thedentalbarns/">Instagram</a></div>';
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function setup(options={}){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://dentalbarns.webflow.io/'}),w=dom.window,d=w.document,subscriptions=new Set(),loads=[],observers=[];
 let permission=options.allowed!==false,fail=!!options.fail,mounts=0;
 Object.defineProperty(d,'currentScript',{value:{src:'https://cdn.example/dist/tdb-instagram-deferred.js'}});
 w.console.warn=()=>{};
 w.TDBConsent={allows:()=>permission,subscribe(fn){subscriptions.add(fn);fn();return()=>subscriptions.delete(fn);}};
 w.IntersectionObserver=class{constructor(fn,config){this.fn=fn;this.config=config;this.nodes=new Set();observers.push(this);}observe(node){this.nodes.add(node);}unobserve(node){this.nodes.delete(node);}disconnect(){this.nodes.clear();}};
 w.TDBModules={async load(url,config){loads.push({url:String(url),type:config?.type});if(options.gate)await options.gate;if(fail)throw Error('offline');
  if(String(url).endsWith('tdb-instagram-deferred.js'))w.eval(source);
 }};
 w.TDBInstagramNative={refresh(root){if(root){mounts++;root.dataset.tdbIgReady='2.2.0';}},destroy(){}};
 w.eval(source);
 const holder=d.querySelector('[data-tdb-ig-placeholder]');
 return {w,d,holder,loads,observers,mounts:()=>mounts,prepare:()=>w.TDBInstagramDeferred.prepare(holder),
  permit(v){permission=v;[...subscriptions].forEach(fn=>fn());},fix(){fail=false;},
  close(){w.TDBInstagramFeatureLoader?.destroy();w.TDBInstagramDeferred.destroy();w.close();}};
}
test('CMS source stays inert; CSS and native module finish before mounting; original stays unchanged',async()=>{
 let release;const e=setup({gate:new Promise(r=>release=r)}),original=e.d.querySelector('template').innerHTML;
 assert.equal(e.d.querySelector('[data-tdb-ig-native]'),null);
 const flight=e.prepare();await tick();assert.equal(e.mounts(),0);assert.equal(e.holder.children.length,1);
 release();await flight;assert.equal(e.mounts(),1);assert.equal(e.loads.filter(x=>x.type==='style').length,1);
 assert.equal(e.holder.dataset.igState,'ready');assert.ok(e.holder.querySelector('.ig-native_photo[data-cms="untouched"]'));
 assert.equal(e.d.querySelector('template').innerHTML,original);await e.prepare();assert.equal(e.mounts(),1);e.close();
});
test('permission prevents download; revocation during download prevents stale insertion',async()=>{
 let release;const e=setup({allowed:false,gate:new Promise(r=>release=r)});
 await e.prepare();assert.equal(e.loads.length,0);e.permit(true);const flight=e.prepare();e.permit(false);release();await flight;
 assert.equal(e.mounts(),0);assert.equal(e.holder.children.length,1);e.close();
});
test('failed CSS keeps the real Instagram fallback and supports a clean retry',async()=>{
 const e=setup({fail:true});await e.prepare();assert.equal(e.holder.dataset.igState,'error');assert.equal(e.mounts(),0);
 assert.equal(e.holder.querySelector('a').href,'https://www.instagram.com/thedentalbarns/');
 e.fix();e.w.Date.now=()=>Date.now()+6000;await e.prepare();assert.equal(e.holder.dataset.igState,'ready');assert.equal(e.mounts(),1);e.close();
});
test('teardown removes the hydrated copy and restores the unchanged fallback/source',async()=>{
 const e=setup();await e.prepare();e.w.TDBInstagramDeferred.destroy();assert.equal(e.holder.children.length,1);assert.equal(e.holder.dataset.igState,undefined);
 assert.ok(e.d.querySelector('template').content.querySelector('[data-ig-class]'));e.close();
});
test('starter waits for permission and 400px proximity before deferred feature request',async()=>{
 const e=setup({allowed:false});e.w.eval(starter+';prepareInstagramFeatureLoader()');await tick();assert.equal(e.loads.length,0);
 e.permit(true);await tick();assert.equal(e.loads.length,0);const observer=e.observers.find(o=>o.config.rootMargin==='400px');
 observer.fn([{target:e.holder,isIntersecting:true}]);await tick();assert.ok(e.loads.some(x=>x.url.endsWith('tdb-instagram-deferred.js')));assert.equal(e.holder.dataset.igState,'ready');e.close();
});
