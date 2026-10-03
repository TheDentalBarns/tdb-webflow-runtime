/* TDB shared dependency registry v1.1.0. Definitions do not mount components. */
(() => {
'use strict'; if(window.TDBModules)return;
const flights=new Map();
function load(url,{attribute,ready}={}){
 let src=new URL(url,location.href).href;
 // Migrated review pages own the shared release pin for motion and Swiper.
 // Resolve before checking ready/cache so differently pinned callers share one flight.
 const reviewLoader=document.querySelector('script[data-tdb-reviews-loader][src]');
 const shared=src.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/TheDentalBarns\/tdb-webflow-runtime@[^/]+\/dist\/(tdb-motion\.js|tdb-swiper-8\.4\.7\.min\.js)$/);
 if(reviewLoader&&shared){
  src=new URL(shared[1],reviewLoader.src).href;
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
window.TDBModules=Object.freeze({version:'1.1.0',load});
})();
