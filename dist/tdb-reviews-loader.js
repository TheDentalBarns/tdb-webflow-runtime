/* TDB review loader v3.9.0. Permission, presence, preparation and playback stay separate. */
(() => {
'use strict';if(window.TDBReviewLoader)return;
const script=document.currentScript,base=new URL('./',script.src),roots=new Map();
const events=['CookieScriptLoaded','CookieScriptCurrentState','CookieScriptAccept','CookieScriptAcceptAll','CookieScriptAcceptSelection','CookieScriptReject','CookieScriptClose'];
const options=window.TDBReviewOptions||{};
let contentFlight,feature,drawerFlight,controller=new AbortController();
function allowed(){
 if(options.permission)return Boolean(options.permission());
 try{const state=window.CookieScript?.instance?.currentState?.();if(['accept','reject','close'].includes(String(state?.action).toLowerCase()))return true;
 const raw=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('CookieScriptConsent='));const saved=raw&&JSON.parse(decodeURIComponent(raw.slice(raw.indexOf('=')+1)));return ['accept','reject','close'].includes(String(saved?.action||saved?.a).toLowerCase());}catch{return false;}
}
const active=signal=>{if(signal?.aborted||!allowed())throw new DOMException('Cancelled','AbortError');};
const drawerRoot=()=>document.querySelector('[data-tdb-reviews]');
const kindOf=root=>root.matches('[data-tdb-review-introduction]')?'introduction':root.matches('[data-tdb-review-cards]')?'cards':'quotes';
function earlyAvailability(root,available){
 if(!root.matches('[data-tdb-review-introduction],[data-tdb-review-quotes],[data-tdb-review-cards]'))return;
 root.querySelectorAll('[data-tdb-review-trigger],[data-tdb-quote-action],[data-tdb-cards-open]').forEach(trigger=>{
  trigger.setAttribute('aria-disabled',String(!available));trigger.setAttribute('tabindex',available?'0':'-1');
  if(!available){trigger.removeAttribute('aria-busy');trigger.removeAttribute('data-tdb-loading');}
 });
}
async function code(kind,signal,drawer=false){
 active(signal);
 await window.TDBModules.load(new URL('tdb-motion.js',base));active(signal);
 const names=['tdb-ticker.js','tdb-review-cms.js'];
 if(kind)names.push(kind==='quotes'?'tdb-review-quote-adapter.js':`tdb-review-${kind}.js`);
 if(kind==='quotes')names.push('tdb-quote-carousel.js');
 if(kind==='cards')names.push('tdb-slider-focus.js');
 if(drawer&&drawerRoot())names.push('tdb-drawer.js','tdb-filters.js','tdb-reviews.js');
 await Promise.all(names.map(name=>window.TDBModules.load(new URL(name,base),name==='tdb-quote-carousel.js'?{ready:()=>!!window.TDBQuoteCarousel}:{})));active(signal);
 if((drawer&&drawerRoot())||kind==='quotes'||kind==='cards'){
  await window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js',base),{attribute:'data-swiper-js',ready:()=>typeof window.Swiper==='function'&&typeof window.TDBSwiper?.create==='function'});active(signal);
 }
 if(window.TDBSwiper){
  for(const [name,plugin] of [['review-drawer',window.TDBReviews],['review-cards',window.TDBReviewCards],['review-testimonials',window.TDBReviewQuotes]]){if(plugin)window.TDBSwiper.register(name,plugin);}
 }
}
async function prepare({signal=controller.signal,kind=null,drawer=kind===null}={}){
 active(signal);
 if(!roots.size&&!drawerRoot())throw Error('No review component on this page');
 await code(kind,signal,drawer);active(signal);
 if(!contentFlight){const flight=window.TDBReviewCMS.load({signal:controller.signal});contentFlight=flight;flight.catch(()=>{if(contentFlight===flight)contentFlight=null;});}
 const data=await contentFlight;active(signal);
 // A nearby introduction needs CMS/ticker data, never the hidden drawer.
 const root=drawerRoot();if(drawer&&root&&!feature)feature=window.TDBSwiper.mount('review-drawer',root,data);
 return data;
}
function warmDrawer(){
 if(!allowed()||!drawerRoot())return Promise.resolve();
 if(!drawerFlight){const flight=code(null,controller.signal,true);drawerFlight=flight;flight.catch(()=>{if(drawerFlight===flight)drawerFlight=null;});}
 return drawerFlight;
}
function scheduleWarm(root,state){
 if(!state.visible||state.warming||!allowed()||!drawerRoot())return;
 state.warming=true;
 const run=()=>{state.warming=false;if(!state.visible||!root.isConnected||!allowed())return;warmDrawer().catch(()=>{});};
 if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:2000});else setTimeout(run,250);
}
async function open({trigger,signal=controller.signal,reviewId='',onReady}){
 const data=await prepare({signal});active(signal);
 if(!feature)throw Error('Native review drawer unavailable');
 const intro=trigger.closest('[data-tdb-review-introduction]');
 // The native quote is CMS-rendered before JS. Find its record without hard-coded names.
 await data.ensureIdentity?.(intro,{signal});active(signal);
 const id=reviewId||window.TDBReviewCMS.resolveIdentity(data.records,intro);
 if(id)await data.ensure?.([id],{signal});active(signal);
 onReady?.();
 const openingFeature=feature;await openingFeature.open(trigger,id);
 if(signal.aborted){openingFeature.destroy();if(feature===openingFeature)feature=null;}
}
// A fast click may precede the introduction module/CMS. Preserve that one intent
// in the small loader, using the same native control states as the mounted card.
async function earlyOpen(event){
 if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
 const trigger=event.target.closest?.('[data-tdb-review-trigger],[data-tdb-quote-action],[data-tdb-cards-open]'),root=trigger?.closest('[data-tdb-review-introduction],[data-tdb-review-quotes],[data-tdb-review-cards]'),state=roots.get(root);
 if(!trigger||!state||state.instance||!allowed())return;
 event.preventDefault();event.stopImmediatePropagation();
 if(trigger.getAttribute('aria-busy')==='true')return;
 trigger.setAttribute('aria-busy','true');trigger.setAttribute('data-tdb-loading','true');
 state.near=true;sync();
 const signal=controller.signal;
 const status=root.querySelector('[data-tdb-review-status]');if(status)status.textContent='';
 try{await open({trigger,signal,reviewId:trigger.closest('[data-review-id]')?.dataset.reviewId||''});}
 catch(error){if(status&&!signal.aborted&&error.name!=='AbortError')status.textContent='The reviews could not load. Please try again.';}
 finally{if(controller.signal===signal){trigger.removeAttribute('aria-busy');trigger.removeAttribute('data-tdb-loading');}}
}
function sync(){
 if(!allowed()){
  if(!controller.signal.aborted)controller.abort();controller=new AbortController();contentFlight=null;drawerFlight=null;
  feature?.destroy();feature=null;
  for(const [root,state] of roots){state.instance?.destroy();state.instance=null;state.pending=null;earlyAvailability(root,false);}
  return;
 }
 for(const [root,state] of roots){
  earlyAvailability(root,true);
  scheduleWarm(root,state);
  if(!root.isConnected&&!state.instance){proximity?.unobserve(root);visible?.unobserve(root);roots.delete(root);continue;}
  if(!state.near||state.instance||state.pending)continue;
  const signal=controller.signal,token={};state.pending=token;
  (async()=>{
   const kind=kindOf(root),data=await prepare({signal,kind});active(signal);
   if(kind==='quotes')await data.ensure?.(data.featured,{signal});
   if(kind==='introduction')await data.ensureIdentity?.(root,{signal});
   active(signal);
   root.querySelectorAll('[data-tdb-review-count]').forEach(n=>n.setAttribute('data-tdb-review-count',String(data.total)));
   root.querySelectorAll('[data-tdb-review-rating]').forEach(n=>n.setAttribute('data-tdb-review-rating',data.average.toFixed(2)));
   const hooks={prepare:async({signal:localSignal}={})=>{active(signal);active(localSignal);return data;},openReviews:open,closeReviews:()=>{feature?.destroy();feature=null;}};
   state.instance=kind==='introduction'?window.TDBReviewIntroduction.mount(root,hooks):kind==='cards'?window.TDBSwiper.mount('review-cards',root,data,hooks):window.TDBSwiper.mount('review-testimonials',root,data,hooks);
  })().catch(()=>{}).finally(()=>{if(state.pending===token)state.pending=null;});
 }
}
const proximity='IntersectionObserver'in window?new IntersectionObserver(entries=>{entries.forEach(e=>{const state=roots.get(e.target);if(state)state.near=e.isIntersecting;});sync();},{rootMargin:'700px 0px'}):null;
const visible='IntersectionObserver'in window?new IntersectionObserver(entries=>{entries.forEach(e=>{const state=roots.get(e.target);if(state){state.visible=e.isIntersecting;scheduleWarm(e.target,state);}});},{threshold:0}):null;
function discover(){[...document.querySelectorAll('[data-tdb-review-introduction],[data-tdb-review-cards],[data-tdb-review-quotes]')].forEach(root=>{if(roots.has(root))return;const state={near:!proximity,visible:!visible,warming:false,instance:null,pending:null};roots.set(root,state);proximity?.observe(root);visible?.observe(root);for(const event of ['pointerover','focusin','pointerdown'])root.addEventListener(event,event=>{state.near=true;sync();if(event.target.closest?.('[data-tdb-review-trigger]')&&allowed())prepare().catch(()=>{});},{passive:true});});sync();}
for(const name of events){window.addEventListener(name,sync);document.addEventListener(name,sync);}
options.subscribe?.(sync);window.addEventListener('online',sync);window.addEventListener('pageshow',sync);
document.addEventListener('click',earlyOpen,true);document.addEventListener('keydown',earlyOpen,true);
window.TDBReviewLoader=Object.freeze({version:'3.9.0',prepare,open,refresh:discover,status:()=>({allowed:allowed(),prepared:!!feature,instances:[...roots.values()].filter(s=>s.instance).length})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',discover,{once:true});else discover();
})();

