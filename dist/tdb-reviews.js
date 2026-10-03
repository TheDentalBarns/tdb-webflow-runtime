/* TDB native reviews v3.0.0. Native Webflow templates; shared Swiper and drawer mechanics. */
(() => {
'use strict';if(window.TDBReviews)return;
const instances=new WeakMap();
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return'';}};
function mount(root,data){
 if(instances.has(root))return instances.get(root);
 const cms=window.TDBReviewCMS,motion=window.TDBMotion,ctrl=new AbortController(),{signal}=ctrl;
 const $=selector=>root.querySelector(selector),template=$('[data-tdb-review-template]'),track=$('[data-tdb-reviews-track]'),viewport=$('[data-tdb-reviews-slider]');
 if(!template||!track||!viewport)throw Error('Native review template missing');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let records=[],swiper=null,preferred='',fadeTimer=0,quoteAnimations=[],destroyed=false;
 const ticker=window.TDBNativeTicker.mount($('[data-tdb-reviews-position]'));
 const context=cms.contextForPath(location.pathname),position=$('[data-tdb-reviews-position]'),filters=$('[data-tdb-reviews-filters]'),toggle=$('[data-tdb-reviews-filter-toggle]'),status=$('[data-tdb-reviews-status]');
 filters.hidden=filters.hidden||filters.classList.contains('is-hidden');
 $('[data-tdb-reviews-average]').textContent=data.average.toFixed(2);$('[data-tdb-reviews-total]').textContent=data.total+' reviews';
 function choose(){
  const topic=$('[data-tdb-reviews-topic]').value,platform=$('[data-tdb-reviews-platform]').value,sort=$('[data-tdb-reviews-sort]').value;
  const effective=topic==='all'?context:topic,rank=r=>effective==='nervous'?r.nRank:effective==='invisalign'?r.iRank:effective==='location'?r.lRank:r.rank;
  const items=data.records.filter(r=>(topic==='all'||r.topics.includes(topic))&&(platform==='all'||r.platform===platform));
  items.sort((a,b)=>sort==='newest'?(Date.parse(b.date)||0)-(Date.parse(a.date)||0)||a.rank-b.rank:(b.id===preferred)-(a.id===preferred)||Number(b.topics.includes(effective))-Number(a.topics.includes(effective))||rank(a)-rank(b)||a.rank-b.rank);
  if(sort==='newest')return items;
  const regular=[],duplicates=[],last=[],seen=new Set();for(const r of items){if(r.rating===1)last.push(r);else if(r.duplicate&&seen.has(r.duplicate))duplicates.push(r);else{regular.push(r);if(r.duplicate)seen.add(r.duplicate);}}return [...regular,...duplicates,...last];
 }
 function slide(record){
  const node=template.cloneNode(true);node.removeAttribute('data-tdb-review-template');node.dataset.tdbReviewId=record.id;node.setAttribute('aria-label','Review by '+record.name);
  const field=key=>node.querySelector(`[data-review-render="${key}"]`);
  field('name').textContent=record.name;field('text').textContent=record.text;field('excerpt').textContent=record.excerpts[context]||record.excerpt||'';
  const mark=new DOMParser().parseFromString(cms.quoteMark,'text/html').querySelector('svg');if(mark)field('quote-mark').append(mark);
  const date=new Date(record.date);field('date').textContent=Number.isNaN(date.getTime())?'':(record.approx?'Approx. ':'')+date.toLocaleDateString('en-GB',record.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  field('historic').hidden=!record.historic;
  const source=field('source'),url=safeURL(record.url);if(url){source.href=url;source.target='_blank';source.rel='noopener noreferrer';}else{source.removeAttribute('href');source.setAttribute('aria-disabled','true');}
  source.setAttribute('aria-label',record.platform+' review source');const icon=cms.sourceIcon(record.platform,false);field('icon').replaceChildren(...icon.childNodes);
  field('rating').textContent=record.rating?'★'.repeat(record.rating):'Unrated';field('rating').setAttribute('aria-label',record.platform==='Facebook'?'Facebook recommendation':record.rating?record.rating+' out of 5 stars':'Rating not supplied');
  field('response-wrap').hidden=!record.showResponse;field('response').textContent=record.response||'';
  return node;
 }
 function stopFade(){clearTimeout(fadeTimer);quoteAnimations.forEach(a=>a.cancel());quoteAnimations=[];}
 function reveal(){stopFade();if(!swiper)return;for(const item of swiper.slides){const current=item===swiper.slides[swiper.activeIndex];item.inert=!current;item.setAttribute('aria-hidden',String(!current));}
  if(reduced.matches)return;const quote=swiper.slides[swiper.activeIndex]?.querySelector('[data-review-render="excerpt"]');if(quote?.animate)quoteAnimations=[quote.animate([{opacity:0,transform:'translateY(0.5rem)'},{opacity:1,transform:'translateY(0)'}],{duration:motion.defaults.fadeIn,easing:'ease-out'})];
 }
 function update(){if(!swiper)return;ticker.update(String(swiper.realIndex+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1);position.setAttribute('aria-label',`Review ${swiper.realIndex+1} of ${records.length}`);}
 function build(){
  stopFade();swiper?.destroy(true,true);swiper=null;records=choose();track.replaceChildren(...records.map(slide));$('[data-tdb-reviews-length]').textContent=String(records.length).padStart(2,'0');
  status.textContent=records.length?'':'No reviews match these filters.';
  if(!records.length){ticker.update('00',1,false);return;}
  swiper=new window.Swiper(viewport,{direction:'vertical',wrapperClass:'tdb-reviews_track',slideClass:'tdb-reviews_slide',slidesPerView:1,initialSlide:Math.max(0,records.findIndex(r=>r.id===preferred)),loop:records.length>1,loopAdditionalSlides:1,loopPreventsSlide:false,preventInteractionOnTransition:false,observer:false,observeParents:false,speed:reduced.matches?0:motion.duration(innerWidth),touchStartPreventDefault:false,touchMoveStopPropagation:true,threshold:10,keyboard:{enabled:false},preloadImages:false,watchOverflow:true,on:{slideChange(){queueMicrotask(update);},slideChangeTransitionStart(){stopFade();},slideChangeTransitionEnd(){reveal();},touchEnd(){if(!this.animating)reveal();}}});
  motion.bindSwiper(swiper);update();reveal();
 }
 function action(node,fn){const handle=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();fn();};node.addEventListener('click',handle,{signal});node.addEventListener('keydown',handle,{signal});}
 action($('[data-tdb-reviews-prev]'),()=>swiper?.slidePrev());action($('[data-tdb-reviews-next]'),()=>swiper?.slideNext());
 action(toggle,()=>{filters.hidden=!filters.hidden;filters.classList.toggle('is-hidden',filters.hidden);toggle.setAttribute('aria-expanded',String(!filters.hidden));});
 root.addEventListener('change',e=>{if(e.target.matches('select')){preferred='';build();}},{signal});
 root.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();},{signal,capture:true});
 root.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.key==='ArrowDown'?swiper?.slideNext():swiper?.slidePrev();}},{signal});
 viewport.addEventListener('touchstart',e=>{const scroll=e.target.closest('[data-tdb-review-scroll]');if(swiper)swiper.allowTouchMove=!scroll||scroll.scrollHeight<=scroll.clientHeight+2;},{signal,passive:true,capture:true});
 viewport.addEventListener('touchend',()=>{if(swiper)swiper.allowTouchMove=true;},{signal,passive:true});
 const resize=new ResizeObserver(()=>{if(swiper&&!swiper.animating){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);swiper.update();}});resize.observe(viewport);
 const drawer=window.TDBDrawer.mount(root.closest('[data-tdb-drawer]'),{onOpen(){build();},onClose(){stopFade();ticker.settle();}});
 reduced.addEventListener('change',()=>{stopFade();if(swiper){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches)swiper.slideTo(swiper.activeIndex,0);}}, {signal});
 const api=Object.freeze({async open(trigger,id){preferred=id||'';return drawer.open(trigger);},close(){return drawer.close();},destroy(){if(destroyed)return;destroyed=true;drawer.destroy();ctrl.abort();resize.disconnect();stopFade();swiper?.destroy(true,true);ticker.destroy();track.replaceChildren();instances.delete(root);}});instances.set(root,api);return api;
}
window.TDBReviews=Object.freeze({version:'3.0.0',mount});
})();
