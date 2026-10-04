/* TDB review loader v3.4.0. Permission, presence, preparation and playback stay separate. */
(() => {
'use strict';if(window.TDBReviewLoader)return;
const script=document.currentScript,base=new URL('./',script.src),roots=new Map();
const events=['CookieScriptLoaded','CookieScriptCurrentState','CookieScriptAccept','CookieScriptAcceptAll','CookieScriptReject','CookieScriptClose'];
const options=window.TDBReviewOptions||{};
let contentFlight,feature,controller=new AbortController();
function allowed(){
 if(options.permission)return Boolean(options.permission());
 try{const state=window.CookieScript?.instance?.currentState?.();if(['accept','reject','close'].includes(String(state?.action).toLowerCase()))return true;
 const raw=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('CookieScriptConsent='));const saved=raw&&JSON.parse(decodeURIComponent(raw.slice(raw.indexOf('=')+1)));return ['accept','reject','close'].includes(String(saved?.action||saved?.a).toLowerCase());}catch{return false;}
}
const active=signal=>{if(signal?.aborted||!allowed())throw new DOMException('Cancelled','AbortError');};
const drawerRoot=()=>document.querySelector('[data-tdb-reviews]');
const kindOf=root=>root.matches('[data-tdb-review-introduction]')?'introduction':root.matches('[data-tdb-review-cards]')?'cards':'quotes';
async function code(kind,signal){
 active(signal);
 await window.TDBModules.load(new URL('tdb-motion.js',base));active(signal);
 const names=['tdb-ticker.js','tdb-review-cms.js'];
 if(kind)names.push(`tdb-review-${kind}.js`);
 if(drawerRoot())names.push('tdb-drawer.js','tdb-filters.js','tdb-reviews.js');
 await Promise.all(names.map(name=>window.TDBModules.load(new URL(name,base))));active(signal);
 if(drawerRoot()||kind==='quotes'||kind==='cards'){
  await window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js',base),{attribute:'data-swiper-js',ready:()=>typeof window.Swiper==='function'&&Boolean(window.TDBSwiper)});active(signal);
 }
}
async function prepare({signal=controller.signal,kind=null}={}){
 active(signal);
 if(!roots.size&&!drawerRoot())throw Error('No review component on this page');
 await code(kind,signal);active(signal);
 if(!contentFlight){const flight=window.TDBReviewCMS.load({signal:controller.signal});contentFlight=flight;flight.catch(()=>{if(contentFlight===flight)contentFlight=null;});}
 const data=await contentFlight;active(signal);
 // Only the first CMS batch and hidden drawer are prepared near the first section.
 const root=drawerRoot();if(root&&!feature)feature=window.TDBReviews.mount(root,data);
 return data;
}
async function open({trigger,signal=controller.signal,reviewId=''}){
 const data=await prepare({signal});active(signal);
 if(!feature)throw Error('Native review drawer unavailable');
 const intro=trigger.closest('[data-tdb-review-introduction]');
 // The native quote is CMS-rendered before JS. Find its record without hard-coded names.
 await data.ensureIdentity?.(intro,{signal});active(signal);
 const id=reviewId||window.TDBReviewCMS.resolveIdentity(data.records,intro);
 if(id)await data.ensure?.([id],{signal});active(signal);
 const openingFeature=feature;await openingFeature.open(trigger,id);
 if(signal.aborted){openingFeature.destroy();if(feature===openingFeature)feature=null;}
}
function sync(){
 if(!allowed()){
  if(!controller.signal.aborted)controller.abort();controller=new AbortController();contentFlight=null;
  feature?.destroy();feature=null;
  for(const state of roots.values()){state.instance?.destroy();state.instance=null;state.pending=null;}
  return;
 }
 for(const [root,state] of roots){
  if(!root.isConnected&&!state.instance){proximity?.unobserve(root);roots.delete(root);continue;}
  if(!state.near||state.instance||state.pending)continue;
  const signal=controller.signal,token={};state.pending=token;
  (async()=>{
   const kind=kindOf(root),data=await prepare({signal,kind});active(signal);
   if(kind==='quotes')await data.ensure?.(data.featured,{signal});
   // Existing looping cards need their complete sequence; load it only near that section.
   if(kind==='cards')await data.loadAll?.({signal});
   if(kind==='introduction')await data.ensureIdentity?.(root,{signal});
   active(signal);
   root.querySelectorAll('[data-tdb-review-count]').forEach(n=>n.setAttribute('data-tdb-review-count',String(data.total)));
   root.querySelectorAll('[data-tdb-review-rating]').forEach(n=>n.setAttribute('data-tdb-review-rating',data.average.toFixed(2)));
   const hooks={prepare:args=>prepare({...args,kind:null}),openReviews:open,closeReviews:()=>{feature?.destroy();feature=null;}};
   state.instance=kind==='introduction'?window.TDBReviewIntroduction.mount(root,hooks):kind==='cards'?window.TDBReviewCards.mount(root,data,hooks):window.TDBReviewQuotes.mount(root,data,hooks);
  })().catch(()=>{}).finally(()=>{if(state.pending===token)state.pending=null;});
 }
}
const proximity='IntersectionObserver'in window?new IntersectionObserver(entries=>{entries.forEach(e=>{const state=roots.get(e.target);if(state)state.near=e.isIntersecting;});sync();},{rootMargin:'700px 0px'}):null;
function discover(){[...document.querySelectorAll('[data-tdb-review-introduction],[data-tdb-review-cards]'),...document.querySelectorAll('.testimonial_slider.w-slider')].filter(root=>root.matches('[data-tdb-review-introduction],[data-tdb-review-cards]')||root.parentElement.querySelector('.testimonial15_rating-wrapper')).forEach(root=>{if(roots.has(root))return;const state={near:!proximity,instance:null,pending:null};roots.set(root,state);proximity?.observe(root);for(const event of ['pointerover','focusin'])root.addEventListener(event,()=>{state.near=true;sync();},{passive:true});});sync();}
for(const name of events){window.addEventListener(name,sync);document.addEventListener(name,sync);}
options.subscribe?.(sync);window.addEventListener('online',sync);window.addEventListener('pageshow',sync);
window.TDBReviewLoader=Object.freeze({version:'3.4.0',prepare,open,refresh:discover,status:()=>({allowed:allowed(),prepared:!!feature,instances:[...roots.values()].filter(s=>s.instance).length})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',discover,{once:true});else discover();
})();

