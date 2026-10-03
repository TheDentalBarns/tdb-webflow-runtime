/* TDB native reviews v3.2.0. Native Webflow layout; original quote choreography. */
(() => {
'use strict';if(window.TDBReviews)return;
const instances=new WeakMap();
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return'';}};
function mount(root,data){
 if(instances.has(root))return instances.get(root);
 const cms=window.TDBReviewCMS,motion=window.TDBMotion,ctrl=new AbortController(),{signal}=ctrl;
 const $=s=>root.querySelector(s),template=$('[data-tdb-review-template]'),track=$('[data-tdb-reviews-track]'),viewport=$('[data-tdb-reviews-slider]'),mark=$('[data-tdb-review-static-mark]'),staticLayer=$('[data-tdb-review-static-layer]');
 if(!template||!track||!viewport||!mark||!staticLayer)throw Error('Native review template missing');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),context=cms.contextForPath(location.pathname);
 const records=data.records.slice(),position=$('[data-tdb-reviews-position]'),previous=$('[data-tdb-reviews-prev]'),next=$('[data-tdb-reviews-next]');
 const ticker=window.TDBNativeTicker.mount(position),fades=motion.fadeController();let swiper=null,destroyed=false,phase='closed',revealTimer=0,shownQuote=null,settledSlide=null,reflectedIndex=-1;
 $('[data-tdb-reviews-average]').textContent=data.average.toFixed(2);$('[data-tdb-reviews-total]').textContent=data.total+' reviews';$('[data-tdb-reviews-length]').textContent=String(records.length).padStart(2,'0');
 function slide(record,index){
  const node=template.cloneNode(true);node.removeAttribute('data-tdb-review-template');node.dataset.tdbReviewId=record.id;node.setAttribute('aria-label',`Review ${index+1} of ${records.length}`);
  const field=k=>node.querySelector(`[data-review-render="${k}"]`);
  field('name').textContent=record.name;field('text').textContent=record.text;field('excerpt').textContent=record.excerpts[context]||record.excerpt||'';field('excerpt').style.opacity='0';
  const date=new Date(record.date);field('date').textContent=Number.isNaN(date.getTime())?'':(record.approx?'Approx. ':'')+date.toLocaleDateString('en-GB',record.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  field('historic').hidden=!record.historic;
  const source=field('source'),url=safeURL(record.url);if(url){source.href=url;source.target='_blank';source.rel='noopener noreferrer';}else{source.removeAttribute('href');source.setAttribute('aria-disabled','true');}
  source.setAttribute('aria-label',record.platform+' review source');field('icon').replaceChildren(...cms.sourceIcon(record.platform,false).childNodes);
  const stars=field('rating'),unrated=field('unrated');stars.classList.toggle('is-hidden',!record.rating);unrated.classList.toggle('is-hidden',!!record.rating);stars.setAttribute('aria-label',record.rating+' out of 5 stars');stars.querySelectorAll('[data-tdb-star]').forEach((star,i)=>star.classList.toggle('is-empty',i>=record.rating));
  field('response-wrap').hidden=!record.showResponse;field('response').textContent=record.response||'';return node;
 }
 track.replaceChildren(...records.map(slide));const originalEasing=track.style.transitionTimingFunction;track.style.transitionTimingFunction=motion.reviews.easing;
 const fadeTime=()=>reduced.matches?0:motion.reviews.fade;
 function hideQuote(){clearTimeout(revealTimer);revealTimer=0;if(shownQuote)fades.to(shownQuote,0,fadeTime());shownQuote=null;}
 function begin(){
  if(!swiper||destroyed||phase==='closed'||phase==='opening')return;
  hideQuote();phase='moving';
  const scroll=mark.closest('[data-tdb-review-scroll]');
  if(scroll?.scrollTop>0){fades.to(mark,0,fadeTime());return;}
  mark.classList.add('is-stationary');staticLayer.append(mark);
 }
 function reflect(){if(!swiper||destroyed||reflectedIndex===swiper.activeIndex)return;const index=swiper.activeIndex;reflectedIndex=index;
  for(const [i,item] of [...swiper.slides].entries()){const inactive=i!==index;if(item.inert!==inactive)item.inert=inactive;if(item.getAttribute('aria-hidden')!==String(inactive))item.setAttribute('aria-hidden',String(inactive));}
  ticker.update(String(index+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1);position.setAttribute('aria-label',`Review ${index+1} of ${records.length}`);
  for(const [node,disabled] of [[previous,index===0],[next,index===records.length-1]]){node.classList.toggle('is-disabled',disabled);node.setAttribute('aria-disabled',String(disabled));}
 }
 function reveal(delay){
  if(!swiper||destroyed||phase==='closed')return;
  const active=swiper.slides[swiper.activeIndex];
  if(phase==='settled'&&settledSlide===active&&(revealTimer||shownQuote))return;
  clearTimeout(revealTimer);reflect();
  const oldScroll=mark.closest('[data-tdb-review-scroll]'),newScroll=active?.querySelector('[data-tdb-review-scroll]');
  if(oldScroll&&oldScroll!==newScroll&&oldScroll.scrollTop>(newScroll?.scrollTop||0))fades.to(mark,0,0);
  active?.querySelector('[data-tdb-review-quote-frame]')?.append(mark);mark.classList.remove('is-stationary');
  for(const item of swiper.slides)if(item!==active)item.querySelector('[data-tdb-review-scroll]').scrollTop=0;
  settledSlide=active;phase='settled';
  const show=()=>{revealTimer=0;if(destroyed||phase!=='settled'||swiper.slides[swiper.activeIndex]!==active)return;shownQuote=active.querySelector('[data-review-render="excerpt"]');fades.to(shownQuote,1,fadeTime());fades.to(mark,1,fadeTime());};
  const pause=reduced.matches?0:delay??(swiper.swipeDirection==='prev'?motion.reviews.previousDelay:motion.reviews.nextDelay);
  if(pause)revealTimer=setTimeout(show,pause);else show();
 }
 function createSwiper(index=0){
  swiper=new window.Swiper(viewport,{init:false,direction:'horizontal',wrapperClass:'tdb-review-drawer_track',slideClass:'tdb-review-drawer_slide',slidesPerView:1,initialSlide:index,loop:false,preventInteractionOnTransition:false,observer:false,speed:reduced.matches?0:motion.duration(innerWidth),touchStartPreventDefault:false,threshold:10,keyboard:{enabled:false},watchOverflow:true,on:{slideChange(){queueMicrotask(reflect);},sliderFirstMove:begin,transitionStart:begin,transitionEnd(){if(phase==='moving')reveal();},touchEnd(){requestAnimationFrame(()=>{if(!destroyed&&phase==='moving'&&!swiper.animating)reveal(motion.reviews.cardDelay);});}}});
  motion.bindSwiper(swiper);swiper.init();
 }
 function build(id){
  const index=Math.max(0,records.findIndex(r=>r.id===id));
  phase='opening';hideQuote();settledSlide=null;fades.to(mark,1,0);
  if(swiper)swiper.slideTo(index,0);else createSwiper(index);
  swiper.slides[index].querySelector('[data-tdb-review-scroll]').scrollTop=0;reveal(motion.reviews.openDelay);
 }
 function navigate(direction){if(!swiper||direction<0&&swiper.isBeginning||direction>0&&swiper.isEnd)return;begin();direction<0?swiper.slidePrev():swiper.slideNext();if(!swiper.animating&&phase==='moving')reveal();}
 function action(node,fn){const handle=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();if(node.getAttribute('aria-disabled')!=='true')fn();};node.addEventListener('click',handle,{signal});node.addEventListener('keydown',handle,{signal});}
 action(previous,()=>navigate(-1));action(next,()=>navigate(1));
 root.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();navigate(e.key==='ArrowLeft'?-1:1);}},{signal});
 let preferred='';const drawer=window.TDBDrawer.mount(root.closest('[data-tdb-drawer]'),{onOpen(){build(preferred);},onClose(){hideQuote();phase='closed';if(mark.closest('[data-tdb-review-scroll]')?.scrollTop>0)fades.to(mark,0,fadeTime());ticker.settle();}});
 // Native Webflow visibility keeps the closed drawer measurable without showing it.
 if(viewport.clientWidth)createSwiper();
 const resize=new ResizeObserver(()=>{if(swiper&&!swiper.animating){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);swiper.update();}});resize.observe(viewport);
 reduced.addEventListener('change',()=>{if(swiper){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches&&phase!=='closed'){hideQuote();phase='moving';swiper.slideTo(swiper.activeIndex,0);ticker.settle();reveal(0);}}},{signal});
 const api=Object.freeze({async open(trigger,id){preferred=id||'';return drawer.open(trigger);},close(){return drawer.close();},destroy(){if(destroyed)return;destroyed=true;drawer.destroy();ctrl.abort();resize.disconnect();clearTimeout(revealTimer);fades.destroy();staticLayer.append(mark);mark.classList.add('is-stationary');swiper?.destroy(true,true);track.style.transitionTimingFunction=originalEasing;ticker.destroy();track.replaceChildren();instances.delete(root);}});instances.set(root,api);return api;
}
window.TDBReviews=Object.freeze({version:'3.2.0',mount});
})();
