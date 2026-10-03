/* TDB review loader v3.0.0. Permission, proximity, loading and playback are separate. */
(() => {
'use strict';if(window.TDBReviewLoader)return;
const script=document.currentScript,base=new URL('./',script.src),roots=new Map();
const events=['CookieScriptLoaded','CookieScriptCurrentState','CookieScriptAccept','CookieScriptAcceptAll','CookieScriptReject','CookieScriptClose'];
let sharedFlight,contentFlight,feature,controller=new AbortController();
const options=window.TDBReviewOptions||{};
function allowed(){
 if(options.permission)return Boolean(options.permission());
 try{const state=window.CookieScript?.instance?.currentState?.();if(['accept','reject','close'].includes(String(state?.action).toLowerCase()))return true;
 const raw=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('CookieScriptConsent='));const saved=raw&&JSON.parse(decodeURIComponent(raw.slice(raw.indexOf('=')+1)));return ['accept','reject','close'].includes(String(saved?.action||saved?.a).toLowerCase());}catch{return false;}
}
const active=signal=>{if(signal?.aborted||!allowed())throw new DOMException('Cancelled','AbortError');};
async function code(signal){
 active(signal);
 if(!sharedFlight)sharedFlight=(async()=>{
  await window.TDBModules.load(new URL('tdb-motion.js',base));
  active(signal);
  await Promise.all(['tdb-ticker.js','tdb-review-cms.js','tdb-drawer.js','tdb-review-introduction.js','tdb-reviews.js','tdb-review-quotes.js'].map(name=>window.TDBModules.load(new URL(name,base))));
  active(signal);
  await window.TDBModules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@b3a0f0f2a1e57b5a67db5f5159c449cff07eebd6/dist/tdb-swiper-8.4.7.min.js',{attribute:'data-swiper-js',ready:()=>typeof window.Swiper==='function'});
 })().catch(error=>{sharedFlight=null;throw error;});
 await sharedFlight;active(signal);
}
async function prepare({signal=controller.signal}={}){
 await code(signal);active(signal);
 if(!contentFlight)contentFlight=window.TDBReviewCMS.load({signal:controller.signal}).catch(error=>{contentFlight=null;throw error;});
 const data=await contentFlight;active(signal);return data;
}
async function open({trigger,signal=controller.signal,reviewId=''}){
 const data=await prepare({signal});active(signal);
 const root=document.querySelector('[data-tdb-reviews]');if(!root)throw Error('Native review drawer unavailable');
 feature||=window.TDBReviews.mount(root,data);
 const intro=trigger.closest('[data-tdb-review-introduction]'),id=reviewId||window.TDBReviewCMS.resolveIdentity(data.records,intro);
 await feature.open(trigger,id);if(signal.aborted){feature.destroy();feature=null;}
}
function sync(){
 if(!allowed()){
  controller.abort();controller=new AbortController();contentFlight=null;sharedFlight=null;
  feature?.destroy();feature=null;for(const state of roots.values()){state.instance?.destroy();state.instance=null;state.pending=false;}return;
 }
 for(const [root,state] of roots){
  if(!root.isConnected&&!state.instance){roots.delete(root);continue;}
  if(!state.near||state.instance||state.pending)continue;
  state.pending=true;const signal=controller.signal;
  prepare({signal}).then(data=>{active(signal);root.querySelectorAll('[data-tdb-review-count]').forEach(n=>n.setAttribute('data-tdb-review-count',String(data.total)));root.querySelectorAll('[data-tdb-review-rating]').forEach(n=>n.setAttribute('data-tdb-review-rating',data.average.toFixed(2)));state.instance=root.matches('[data-tdb-review-introduction]')?window.TDBReviewIntroduction.mount(root,{prepare,openReviews:open,closeReviews:()=>{feature?.destroy();feature=null;}}):window.TDBReviewQuotes.mount(root,data,{openReviews:open});return prepare({signal});}).catch(()=>{}).finally(()=>state.pending=false);
 }
}
const proximity='IntersectionObserver'in window?new IntersectionObserver(entries=>{entries.forEach(e=>{const state=roots.get(e.target);if(state)state.near=e.isIntersecting;});sync();},{rootMargin:'700px 0px'}):null;
function discover(){[...document.querySelectorAll('[data-tdb-review-introduction]'),...document.querySelectorAll('.testimonial_slider.w-slider')].filter(root=>root.matches('[data-tdb-review-introduction]')||root.parentElement.querySelector('.testimonial15_rating-wrapper')).forEach(root=>{if(roots.has(root))return;roots.set(root,{near:!proximity,instance:null,pending:false});proximity?.observe(root);for(const event of ['pointerover','focusin'])root.addEventListener(event,()=>{roots.get(root).near=true;sync();},{passive:true});});sync();}
for(const name of events){window.addEventListener(name,sync);document.addEventListener(name,sync);}
options.subscribe?.(sync);window.addEventListener('online',sync);window.addEventListener('pageshow',sync);
window.TDBReviewLoader=Object.freeze({version:'3.0.0',prepare,open,refresh:discover,status:()=>({allowed:allowed(),instances:[...roots.values()].filter(s=>s.instance).length})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',discover,{once:true});else discover();
})();
