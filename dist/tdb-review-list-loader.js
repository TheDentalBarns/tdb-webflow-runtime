/* TDB review archive loader v1.0.0. Presence + proximity + performance gate.
 * CMS HTML/pagination remain available immediately. No tracking dependencies.
 * An existing CookieScript decision (accept OR reject/close) releases enhancement;
 * deliberate filter intent also releases this functional module.
 */
(() => {
'use strict';if(window.TDBReviewListLoader)return;
const script=document.currentScript,base=new URL('./',script.src),root=document.querySelector('[data-tdb-review-page]');if(!root)return;script.setAttribute('data-tdb-reviews-loader','');
let near=false,intent=false,flight=null,instance=null;
const decided=()=>{try{const action=window.CookieScript?.instance?.currentState?.()?.action;if(['accept','reject','close'].includes(String(action).toLowerCase()))return true;const raw=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('CookieScriptConsent='));const saved=raw&&JSON.parse(decodeURIComponent(raw.slice(raw.indexOf('=')+1)));return ['accept','reject','close'].includes(String(saved?.action||saved?.a).toLowerCase());}catch{return false;}};
async function registry(){if(window.TDBModules)return;await new Promise((resolve,reject)=>{let n=[...document.scripts].find(s=>/\/tdb-modules\.js(?:[?#]|$)/.test(s.src));if(n){let tries=0;const poll=()=>window.TDBModules?resolve():++tries>100?reject(Error('Registry unavailable')):setTimeout(poll,100);poll();}else{n=document.createElement('script');n.src=new URL('tdb-modules.js',base);n.onload=resolve;n.onerror=reject;document.head.append(n);}});}
async function prepare(){if(instance)return instance;if(flight)return flight;flight=(async()=>{await registry();await TDBModules.load(new URL('tdb-motion.js',base),{ready:()=>!!window.TDBMotion});await Promise.all([['tdb-ticker.js','TDBNativeTicker'],['tdb-filters.js','TDBFilters'],['tdb-review-cms.js','TDBReviewCMS'],['tdb-review-list.js','TDBReviewList']].map(([name,key])=>TDBModules.load(new URL(name,base),{ready:()=>!!window[key]})));instance=TDBReviewList.mount(root);return instance;})();flight.catch(()=>{flight=null;});return flight;}
function sync(){if(near&&(intent||decided()))prepare().catch(()=>{});}
const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){near=true;sync();}},{rootMargin:'700px'});io.observe(root.querySelector('[data-tdb-review-cms]'));
for(const name of ['CookieScriptLoaded','CookieScriptCurrentState','CookieScriptAccept','CookieScriptAcceptAll','CookieScriptReject','CookieScriptClose'])addEventListener(name,sync);
const toggle=root.querySelector('[data-tdb-filter-toggle]');
// A functional user request is not a request for marketing consent.
for(const name of ['pointerenter','focus','pointerdown'])toggle.addEventListener(name,()=>{intent=true;near=true;sync();},{passive:true});
const trigger=event=>{const t=event.target.closest('[data-tdb-filter-toggle]');if(!t||instance)return;event.preventDefault();event.stopImmediatePropagation();intent=true;near=true;prepare().then(()=>t.click()).catch(()=>{root.querySelector('[data-tdb-list-status]').textContent='Filters could not load. Please try again.';});};document.addEventListener('click',trigger,true);
if(location.hash&&location.hash.includes('=')){intent=true;near=true;sync();}
const idle=()=>registry().then(()=>TDBModules.load(new URL('tdb-review-availability.js',base))).catch(()=>{});if(document.readyState==='complete')idle();else addEventListener('load',idle,{once:true});
window.TDBReviewListLoader={prepare,status:()=>({near,prepared:!!instance,...instance?.status()})};
})();
