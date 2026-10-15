const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/instagram/deferred.js','utf8').replace('__TDB_IG_TEMPLATE__',JSON.stringify(fs.readFileSync('src/instagram/template.html','utf8').trim()));
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
test('entry and destination images decode before the native entry sequence mounts',async()=>{
 const e=setup(),sourceRoot=e.d.querySelector('template').content.firstElementChild;
 for(const name of ['first','middle','last']){
  const img=e.d.createElement('img');img.setAttribute('data-ig-class','ig-native_photo');img.src='/'+name+'.webp';sourceRoot.append(img);
 }
 let release;const gate=new Promise(r=>release=r),preloads=[];
 e.w.Image=function(){const img=e.d.createElement('img');Object.defineProperties(img,{complete:{value:true},naturalWidth:{value:1}});img.decode=()=>gate;preloads.push(img);return img;};
 const flight=e.prepare();await tick();assert.equal(e.mounts(),0);assert.deepEqual(preloads.map(x=>new URL(x.src).pathname),['/first.webp','/last.webp']);
 release();await flight;assert.equal(e.mounts(),1);assert.equal(e.holder.dataset.igState,'ready');
 assert.equal(sourceRoot.querySelectorAll('img[src]').length,3);e.close();
});

function useFeed(e, options={}){
 e.d.querySelector('template').remove();e.holder.setAttribute('data-tdb-ig-feed','/tdb-content/v1/instagram.json');
 const posts=Array.from({length:3},(_,i)=>({url:'https://www.instagram.com/p/post'+i+'/',
  image:{src:'https://cdn.prod.website-files.com/67837ee85ee175873126e461/post'+i+'.webp',alt:i===0?'<img src=x onerror=alert(1)>':'Photo '+i},
  date:'2026-01-10',mediaType:'image',likes:i,comments:null,shares:null}));
 const payload={version:1,feed:'instagram',checkedAt:Date.now(),posts};
 const requests=[],preloads=[];
 e.w.fetch=async(url,config)=>{requests.push({url:String(url),config});if(options.gate)await options.gate;
  return {ok:!options.fail,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(payload)};};
 e.w.Image=function(){const img=e.d.createElement('img');Object.defineProperties(img,{complete:{value:true},naturalWidth:{value:1}});
  img.decode=async()=>{};preloads.push(img);return img;};
 return {payload,requests,preloads};
}

test('JSON path has no CMS template or startup requests; fills the existing layout after proximity',async()=>{
 const e=setup({allowed:false}),f=useFeed(e);await e.prepare();assert.equal(f.requests.length,0);assert.equal(e.loads.length,0);
 e.permit(true);await e.prepare();assert.equal(f.requests.length,1);assert.equal(e.mounts(),1);
 const root=e.holder.querySelector('[data-tdb-ig-native]'),slides=[...root.querySelectorAll('[data-ig-slide]')];
 assert.equal(slides.length,3);assert.equal(slides[0].getAttribute('data-ig-record-likes'),'0');assert.equal(slides[0].getAttribute('data-ig-record-comments'),'');
 assert.equal(root.querySelectorAll('[data-ig-slide] img[src]').length,0);
 assert.equal(root.querySelectorAll('[onerror]').length,0);assert.equal(slides[0].querySelector('.ig-native_photo').alt,f.payload.posts[0].image.alt);
 assert.deepEqual(f.preloads.map(img=>new URL(img.src).pathname.split('/').at(-1)),['post0.webp','post2.webp']);
 assert.equal(f.requests[0].config.credentials,'omit');e.close();
});
test('late JSON cannot mount after permission is revoked',async()=>{
 let release;const e=setup(),f=useFeed(e,{gate:new Promise(r=>release=r)});const flight=e.prepare();await tick();
 e.permit(false);assert.equal(f.requests[0].config.signal.aborted,true);release();await flight;
 assert.equal(e.mounts(),0);assert.equal(e.holder.children.length,1);e.close();
});
test('bad feed response, stale data and invalid post links retain the Instagram holding link',async()=>{
 for(const change of [f=>f.payload.checkedAt-=3600001,f=>f.payload.posts[0].url='javascript:alert(1)',
  f=>f.payload.posts[1].url=f.payload.posts[0].url,f=>f.payload.posts=[],f=>f.payload.posts[0].image.src='https://other.example/track',
  f=>f.payload.posts[0].date='2026-02-31',f=>f.payload.posts[0].likes=-1]){
  const e=setup(),f=useFeed(e);change(f);await e.prepare();assert.equal(e.mounts(),0);assert.equal(e.holder.children.length,1);
  assert.equal(f.preloads.length,0);assert.equal(e.holder.querySelector('a').href,'https://www.instagram.com/thedentalbarns/');e.close();
 }
 const e=setup();useFeed(e,{fail:true});await e.prepare();assert.equal(e.mounts(),0);e.close();
});
test('feed endpoint cannot send a request to another origin',async()=>{
 const e=setup(),f=useFeed(e);e.holder.setAttribute('data-tdb-ig-feed','https://other.example/tdb-content/v1/instagram.json');
 await e.prepare();assert.equal(f.requests.length,0);assert.equal(e.mounts(),0);e.close();
});
