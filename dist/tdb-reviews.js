/* TDB native reviews v3.1.0. Native Webflow layout; horizontal shared Swiper. */
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
 const ticker=window.TDBNativeTicker.mount(position);let swiper=null,animations=[],destroyed=false;
 $('[data-tdb-reviews-average]').textContent=data.average.toFixed(2);$('[data-tdb-reviews-total]').textContent=data.total+' reviews';$('[data-tdb-reviews-length]').textContent=String(records.length).padStart(2,'0');
 function slide(record,index){
  const node=template.cloneNode(true);node.removeAttribute('data-tdb-review-template');node.dataset.tdbReviewId=record.id;node.setAttribute('aria-label',`Review ${index+1} of ${records.length}`);
  const field=k=>node.querySelector(`[data-review-render="${k}"]`);
  field('name').textContent=record.name;field('text').textContent=record.text;field('excerpt').textContent=record.excerpts[context]||record.excerpt||'';
  const date=new Date(record.date);field('date').textContent=Number.isNaN(date.getTime())?'':(record.approx?'Approx. ':'')+date.toLocaleDateString('en-GB',record.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  field('historic').hidden=!record.historic;
  const source=field('source'),url=safeURL(record.url);if(url){source.href=url;source.target='_blank';source.rel='noopener noreferrer';}else{source.removeAttribute('href');source.setAttribute('aria-disabled','true');}
  source.setAttribute('aria-label',record.platform+' review source');field('icon').replaceChildren(...cms.sourceIcon(record.platform,false).childNodes);
  const stars=field('rating'),unrated=field('unrated');stars.classList.toggle('is-hidden',!record.rating);unrated.classList.toggle('is-hidden',!!record.rating);stars.setAttribute('aria-label',record.rating+' out of 5 stars');stars.querySelectorAll('[data-tdb-star]').forEach((star,i)=>star.classList.toggle('is-empty',i>=record.rating));
  field('response-wrap').hidden=!record.showResponse;field('response').textContent=record.response||'';return node;
 }
 track.replaceChildren(...records.map(slide));
 function stop(){animations.forEach(a=>a.cancel());animations=[];}
 function hoist(){if(!swiper)return;const active=swiper.slides[swiper.activeIndex],scroll=active?.querySelector('[data-tdb-review-scroll]');if(scroll)scroll.scrollTop=0;mark.classList.add('is-stationary');staticLayer.append(mark);}
 function reflect(){if(!swiper||destroyed)return;const index=swiper.activeIndex;
  for(const [i,item] of [...swiper.slides].entries()){item.inert=i!==index;item.setAttribute('aria-hidden',String(i!==index));}
  ticker.update(String(index+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1);position.setAttribute('aria-label',`Review ${index+1} of ${records.length}`);
  for(const [node,disabled] of [[previous,index===0],[next,index===records.length-1]]){node.classList.toggle('is-disabled',disabled);node.setAttribute('aria-disabled',String(disabled));}
 }
 function reveal(){stop();if(!swiper||destroyed)return;reflect();const active=swiper.slides[swiper.activeIndex];active?.querySelector('[data-tdb-review-quote-frame]')?.append(mark);mark.classList.remove('is-stationary');
  const excerpt=active?.querySelector('[data-review-render="excerpt"]');if(!reduced.matches&&excerpt?.animate)animations=[excerpt.animate([{opacity:0},{opacity:1}],{duration:motion.defaults.fadeIn,easing:'ease-out'})];
 }
 function build(id){
  const index=Math.max(0,records.findIndex(r=>r.id===id));
  if(swiper){hoist();swiper.slideTo(index,0);swiper.update();reveal();return;}
  swiper=new window.Swiper(viewport,{init:false,direction:'horizontal',wrapperClass:'tdb-review-drawer_track',slideClass:'tdb-review-drawer_slide',slidesPerView:1,initialSlide:index,loop:false,preventInteractionOnTransition:false,observer:false,speed:reduced.matches?0:motion.duration(innerWidth),touchStartPreventDefault:false,threshold:10,keyboard:{enabled:false},watchOverflow:true,on:{slideChange(){queueMicrotask(reflect);},sliderFirstMove(){stop();hoist();},slideChangeTransitionStart(){stop();hoist();},slideChangeTransitionEnd:reveal,touchEnd(){if(!this.animating)queueMicrotask(reveal);}}});
  motion.bindSwiper(swiper);swiper.init();reveal();
 }
 function navigate(direction){if(!swiper)return;hoist();direction<0?swiper.slidePrev():swiper.slideNext();if(!swiper.animating)reveal();}
 function action(node,fn){const handle=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();if(node.getAttribute('aria-disabled')!=='true')fn();};node.addEventListener('click',handle,{signal});node.addEventListener('keydown',handle,{signal});}
 action(previous,()=>navigate(-1));action(next,()=>navigate(1));
 root.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();navigate(e.key==='ArrowLeft'?-1:1);}},{signal});
 let preferred='';const drawer=window.TDBDrawer.mount(root.closest('[data-tdb-drawer]'),{onOpen(){build(preferred);},onClose(){stop();ticker.settle();}});
 const resize=new ResizeObserver(()=>{if(swiper&&!swiper.animating){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);swiper.update();}});resize.observe(viewport);
 reduced.addEventListener('change',()=>{stop();if(swiper){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches){swiper.slideTo(swiper.activeIndex,0);ticker.settle();reveal();}}},{signal});
 const api=Object.freeze({async open(trigger,id){preferred=id||'';return drawer.open(trigger);},close(){return drawer.close();},destroy(){if(destroyed)return;destroyed=true;drawer.destroy();ctrl.abort();resize.disconnect();stop();staticLayer.append(mark);mark.classList.add('is-stationary');swiper?.destroy(true,true);ticker.destroy();track.replaceChildren();instances.delete(root);}});instances.set(root,api);return api;
}
window.TDBReviews=Object.freeze({version:'3.1.0',mount});
})();
