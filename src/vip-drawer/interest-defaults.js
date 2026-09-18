/* Shared VIP enquiry defaults. Display labels remain separate from submitted values. */
(()=>{
 'use strict';
 if(window.TDBVIPInterest)return;
 const selector='select[name="Treatment-Of-Interest"],select[name="Treatment of Interest"]';
 const manual=new WeakMap(),seen=new WeakSet();
 const allowed=['Cosmetic Dentistry','Restorative Dentistry','Signature Assessment','Smile Design','Nervous Patient Care','Invisalign','Composite Bonding','Veneers','Whitening'];
 function pageInterest(path){
   path=path.toLowerCase().replace(/\/$/,'');
   if(['/first-visit','/fast-track','/signature-assessment'].includes(path))return 'Signature Assessment';
   if(!/^\/(services|treatments|areas)\//.test(path))return '';
   if(/signature-assessment|fast-track|smile-assessment/.test(path))return 'Signature Assessment';
   if(/smile-design/.test(path))return 'Smile Design';
   if(/nervous/.test(path))return 'Nervous Patient Care';
   if(/invisalign|clear-aligners/.test(path))return 'Invisalign';
   if(/composite-bonding/.test(path))return 'Composite Bonding';
   if(/veneers/.test(path))return 'Veneers';
   if(/whitening/.test(path))return 'Whitening';
   if(/general-dentistry|restorative/.test(path))return 'Restorative Dentistry';
   if(/cosmetic/.test(path))return 'Cosmetic Dentistry';
   return '';
 }
 const requested=new URLSearchParams(location.search).get('interest');
 let preferred=allowed.includes(requested)?requested:pageInterest(location.pathname);
 function apply(select){
   const value=manual.has(select)?manual.get(select):preferred;
   if((value||manual.has(select))&&[...select.options].some(o=>o.value===value))select.value=value;
   select.classList.toggle('is-filled',!!select.value);
 }
 function scan(root){
   const fields=root.matches?.(selector)?[root]:[...root.querySelectorAll(selector)];
   fields.forEach(select=>{if(!seen.has(select)){seen.add(select);apply(select);}});
 }
 document.addEventListener('change',event=>{
   const select=event.target;if(!select.matches?.(selector))return;
   if(event.isTrusted)manual.set(select,select.value);
   else apply(select);
 },true);
 document.addEventListener('focusin',event=>{if(event.target.matches?.(selector))apply(event.target);});
 window.TDBVIPInterest=Object.freeze({
   fromCalculator(value){preferred=value==='Smile Design'?'Smile Design':'Signature Assessment';document.querySelectorAll(selector).forEach(apply);},
 });
 function start(){scan(document);new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node);}).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
