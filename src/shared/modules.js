/* TDB shared dependency registry v1.5.0. Independently pinned shared releases. */
(() => {
'use strict'; if(window.TDBModules)return;
const flights=new Map();
const registry=document.currentScript;
const motionRoot=registry?.src?new URL(registry.dataset?.tdbMotionBase||'./',registry.src):null;
// A motion-only release can retain the existing carousel URLs and cache entries.
const carouselRoot=registry?.dataset?.tdbCarouselBase?new URL(registry.dataset.tdbCarouselBase,registry.src):motionRoot;
const drawerRoot=registry?.dataset?.tdbDrawerBase?new URL(registry.dataset.tdbDrawerBase,registry.src):carouselRoot;
const drawerFiles=new Set(['tdb-drawer.js','tdb-reviews.js','tdb-review-introduction.js','tdb-review-cards.js']);
const carouselFiles=new Set(['tdb-rendered-progress.js','tdb-swiper-8.4.7.min.js','tdb-motion.js','tdb-parallax.js','tdb-gallery.js','tdb-slider-focus.js','tdb-sliders.js','tdb-review-quotes.js','tdb-review-cards.js','tdb-review-cms.js','tdb-reviews.js','tdb-drawer.js','tdb-filters.js','tdb-ticker.js','tdb-logo-marquee.js','tdb-review-availability.js']);
function load(url,{attribute,ready}={}){
 let src=new URL(url,location.href).href;
 const requested=src.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/TheDentalBarns\/tdb-webflow-runtime@[^/]+\/dist\/([^/]+)$/);
 // Motion uses this registry's release; other assets can retain a pinned base.
 // Resolve before ready/cache checks so differently
 // pinned consumers share one flight whichever component requests the engine first.
 const sharedLoader=document.querySelector('script[data-tdb-reviews-loader][src]')||document.querySelector('script[data-tdb-logo-marquee-loader][src]');
 const shared=src.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/TheDentalBarns\/tdb-webflow-runtime@[^/]+\/dist\/(tdb-motion\.js|tdb-filters\.js|tdb-drawer\.js|tdb-ticker\.js|tdb-swiper-8\.4\.7\.min\.js)$/);
 if(carouselRoot&&requested&&(carouselFiles.has(requested[1])||drawerFiles.has(requested[1]))){
  src=new URL(requested[1],requested[1]==='tdb-motion.js'?motionRoot:drawerFiles.has(requested[1])?drawerRoot:carouselRoot).href;
  if(requested[1]==='tdb-swiper-8.4.7.min.js'&&ready){const engineReady=ready;ready=()=>engineReady()&&typeof window.TDBSwiper?.create==='function';}
 }else if(sharedLoader&&shared){
  src=new URL(shared[1],sharedLoader.src).href;
  if(shared[1]==='tdb-swiper-8.4.7.min.js'&&ready){const engineReady=ready;ready=()=>engineReady()&&Boolean(window.TDBSwiper);}
 }
 if(ready?.())return Promise.resolve();
 if(flights.has(src))return flights.get(src);
 const promise=new Promise((resolve,reject)=>{
  let node=[...document.scripts].find(s=>s.src===src)||(attribute&&document.querySelector(`script[${attribute}]`));
  if(node&&node.src!==src)return reject(Error('Conflicting dependency URL: '+attribute));
  if(node?.dataset.tdbLoaded==='true')return resolve();
  const fresh=!node;node||=document.createElement('script');
  const cleanup=()=>{clearTimeout(timer);node.removeEventListener('load',done);node.removeEventListener('error',fail);};
  const done=()=>{cleanup();node.dataset.tdbLoaded='true';resolve();};
  const fail=()=>{cleanup();if(fresh)node.remove();reject(Error('Dependency unavailable'));};
  const timer=setTimeout(fail,20000);
  node.addEventListener('load',done,{once:true});node.addEventListener('error',fail,{once:true});
  if(fresh){node.src=src;node.async=true;if(attribute)node.setAttribute(attribute,'true');document.head.append(node);}
 });
 flights.set(src,promise);promise.catch(()=>flights.delete(src));return promise;
}
const busy=new WeakMap();
async function withBusy(trigger,action,{signal,loading=true,onStart,onError}={}){
 if(signal?.aborted||trigger.getAttribute('aria-busy')==='true')return;
 const token={};busy.set(trigger,token);
 trigger.setAttribute('aria-busy','true');if(loading)trigger.setAttribute('data-tdb-loading','true');
 const clear=()=>{if(busy.get(trigger)!==token)return;busy.delete(trigger);trigger.removeAttribute('aria-busy');if(loading)trigger.removeAttribute('data-tdb-loading');};
 signal?.addEventListener('abort',clear,{once:true});
 try{onStart?.();return await action();}
 catch(error){if(!signal?.aborted&&error.name!=='AbortError'){if(onError)onError(error);else throw error;}}
 finally{signal?.removeEventListener('abort',clear);clear();}
}
window.TDBModules=Object.freeze({version:'1.5.0',load,withBusy});
})();
