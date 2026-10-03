/* TDB shared dependency registry v1.0.0. Definitions do not mount components. */
(() => {
'use strict'; if(window.TDBModules)return;
const flights=new Map();
function load(url,{attribute,ready}={}){
 const src=new URL(url,location.href).href;
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
window.TDBModules=Object.freeze({version:'1.0.0',load});
})();
