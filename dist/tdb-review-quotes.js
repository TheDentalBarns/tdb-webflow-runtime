/* TDB CMS review quotes v1.0.0. CMS selects records; native template owns layout. */
(() => {
'use strict';if(window.TDBReviewQuotes)return;const instances=new WeakMap();
function mount(old,data,{openReviews}){
 if(instances.has(old))return instances.get(old);
 const source=document.querySelector('[data-tdb-quotes-template]');if(!source)throw Error('Native review carousel template unavailable');
 const records=data.featured.map(id=>data.records.find(r=>r.id===id)).filter(Boolean);if(!records.length)return {destroy(){}};
 const root=source.cloneNode(true);root.removeAttribute('data-tdb-quotes-template');root.setAttribute('data-tdb-quotes','');root.hidden=false;root.classList.remove('is-hidden');
 const viewport=root.querySelector('[data-tdb-quotes-viewport]'),track=root.querySelector('[data-tdb-quotes-track]'),template=root.querySelector('[data-tdb-quotes-card]');
 const motion=window.TDBMotion,reduced=matchMedia('(prefers-reduced-motion: reduce)'),controller=new AbortController(),{signal}=controller;let entryTimer=0,entryPending=records.length>1&&!reduced.matches,swiper,animations=[];
 function stop(){clearTimeout(entryTimer);animations.forEach(a=>a.cancel());animations=[];}
 track.replaceChildren(...records.map(record=>{const card=template.cloneNode(true);card.dataset.reviewId=record.id;card.querySelector('[data-tdb-quotes-excerpt]').textContent=record.excerpt;card.querySelector('[data-tdb-quotes-name]').textContent=record.name;card.querySelector('[data-tdb-quotes-source]').replaceChildren(...window.TDBReviewCMS.sourceIcon(record.platform,true).childNodes);const button=card.querySelector('[role="button"]');button.setAttribute('aria-label','Read full review by '+record.name);return card;}));
 window.jQuery?.(old).triggerHandler('mouseenter');old.replaceWith(root);
 const ticker=window.TDBNativeTicker.mount(root.querySelector('[data-tdb-quotes-current]'));root.querySelector('[data-tdb-quotes-total]').textContent=String(records.length).padStart(2,'0');
 function reveal(){stop();if(!swiper)return;swiper.slides.forEach((node,i)=>{node.inert=i!==swiper.activeIndex;node.setAttribute('aria-hidden',String(i!==swiper.activeIndex));});if(reduced.matches)return;const content=swiper.slides[swiper.activeIndex]?.querySelector('.tdb-quotes_open');if(content?.animate)animations=[content.animate([{opacity:0},{opacity:1}],{duration:motion.defaults.fadeIn,easing:'ease-out'})];}
 swiper=new window.Swiper(viewport,{direction:'horizontal',wrapperClass:'tdb-quotes_track',slideClass:'tdb-quotes_slide',slidesPerView:1,loop:records.length>1,loopAdditionalSlides:1,loopPreventsSlide:false,preventInteractionOnTransition:false,observer:false,speed:reduced.matches?0:motion.duration(innerWidth),keyboard:{enabled:false},on:{slideChange(){queueMicrotask(()=>ticker.update(String(swiper.realIndex+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1));},slideChangeTransitionStart:stop,slideChangeTransitionEnd:reveal,touchStart(){entryPending=false;stop();}}});motion.bindSwiper(swiper);reveal();const dd=motion.ddText(root.querySelectorAll('.tdb-quotes_byline'));
 const io=new IntersectionObserver(entries=>{if(entryPending&&entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.2)){entryTimer=setTimeout(()=>{entryPending=false;swiper.slideNext();},motion.defaults.entryDelay);}else clearTimeout(entryTimer);},{threshold:.2});io.observe(viewport);
 root.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();entryPending=false;e.key==='ArrowLeft'?swiper.slidePrev():swiper.slideNext();}},{signal});
 async function open(e){const target=e.target.closest('[role="button"]');if(!target||!swiper.allowClick||swiper.animating)return;if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();entryPending=false;target.setAttribute('aria-busy','true');try{await openReviews({trigger:target,reviewId:target.closest('[data-review-id]').dataset.reviewId,signal});}catch(error){if(!signal.aborted)root.dispatchEvent(new CustomEvent('tdb:review-error',{bubbles:true,detail:{error}}));}finally{target.removeAttribute('aria-busy');}}
 root.addEventListener('click',open,{signal});root.addEventListener('keydown',open,{signal});
 const resize=new ResizeObserver(()=>{if(!swiper.animating)swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);});resize.observe(viewport);
 reduced.addEventListener('change',()=>{stop();swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches){entryPending=false;swiper.slideTo(swiper.activeIndex,0);ticker.settle();}},{signal});
 const api={destroy(){dd.destroy();controller.abort();io.disconnect();resize.disconnect();stop();swiper.destroy(true,true);ticker.destroy();root.replaceWith(old);instances.delete(old);}};instances.set(old,api);return api;
}
window.TDBReviewQuotes=Object.freeze({version:'1.0.0',mount});
})();
