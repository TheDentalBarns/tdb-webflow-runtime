/* TDB Treatment Calculator loader v1.4.9. URLs are immutable release pins. */
(function(){
 'use strict';if(window.__tdbCalculatorLoader)return;window.__tdbCalculatorLoader=true;
 const base='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@b0de026eb9e266fdb242aa4edad91a2bd3624284';
 const selector='[data-tdb-calc-open],a[href$="#treatment-calculator"]';
 let loading=null;
 function asset(type,url){return new Promise((resolve,reject)=>{const el=document.createElement(type==='css'?'link':'script');let timer;
   if(type==='css'){el.rel='stylesheet';el.href=url;}else{el.src=url;el.async=true;}
   el.onload=()=>{clearTimeout(timer);resolve();};el.onerror=()=>{clearTimeout(timer);el.remove();reject(Error('Calculator asset unavailable'));};
   timer=setTimeout(()=>{el.remove();reject(Error('Calculator load timed out'));},15000);document.head.append(el);
 });}
 function load(){if(window.TDBCalculator)return Promise.resolve(window.TDBCalculator);if(loading)return loading;
   loading=asset('css',base+'/dist/tdb-calculator.css').then(()=>asset('js',base+'/dist/tdb-calculator.js')).then(()=>window.TDBCalculator).catch(e=>{loading=null;throw e;});return loading;}
 function start(){
   const mount=document.querySelector('[data-tdb-calculator="inline"]');
   if(mount){if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load().catch(()=>{const p=mount.querySelector('[data-tdb-calc-fallback]');if(p)p.textContent='The calculator could not load. Please refresh, or browse our treatment fees below.';});}},{rootMargin:'500px'});observer.observe(mount);}else load().catch(()=>{});}
   document.addEventListener('click',e=>{const link=e.target.closest(selector);if(!link||window.TDBCalculator||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0)return;e.preventDefault();e.stopImmediatePropagation();link.setAttribute('aria-busy','true');load().then(api=>api.open(link)).catch(()=>{location.assign(link.href||'/dental-cost-lichfield#treatment-calculator');}).finally(()=>link.removeAttribute('aria-busy'));},true);
   // Delegation also supports FAQ links inserted after initial page rendering.
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
