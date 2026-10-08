/* TDB native review cards v2.1.1. Designer/CMS markup with shared behaviour. */
(() => {
'use strict';
if(window.TDBReviewCards)return;
const instances=new WeakMap(),batchSize=20,prefetchDistance=6;
function mount(root,data,{openReviews}){
 if(instances.has(root))return instances.get(root);
 const $=s=>root.querySelector(s),viewport=$('[data-tdb-cards-viewport]'),track=$('[data-tdb-cards-track]'),navigation=$('[data-tdb-cards-navigation]'),status=$('[data-tdb-cards-status]'),previous=$('[data-tdb-cards-prev]'),next=$('[data-tdb-cards-next]');
 const nativeSlides=[...track.children].filter(n=>n.matches('.tdb-review-cards_slide'));
 if(!nativeSlides.length)throw Error('Native CMS review cards are unavailable');
 const originals=nativeSlides.map(n=>n.cloneNode(true)),template=originals[0],seedById=new Map(nativeSlides.map(n=>[n.dataset.reviewId,n]));
 const controller=new AbortController(),{signal}=controller,motion=window.TDBMotion,reduced=motion.reduced,cms=window.TDBReviewCMS,context=cms.contextForPath(location.pathname),fades=motion.fadeController();
 const ticker=window.TDBNativeTicker.mount($('[data-tdb-cards-current]')),originalEasing=track.style.transitionTimingFunction;
 let entryPending=true,entryTimer=0,entryFrame=0,entryObserver,entryVisible=false;
 let swiper,phase='initializing',shownQuote,settledSlide,revealTimer=0,rendered=0,loading,pending=[],advanceAfterLoad=false,updating=false;
 function fill(slide,record,index){
  slide.dataset.reviewId=record.id;slide.dataset.reviewRating=record.rating||'';slide.dataset.reviewSubject=record.historic?'Dr Keely - historic practice':'The Dental Barns';slide.dataset.reviewPlatform=record.platform;
  slide.setAttribute('role','group');slide.setAttribute('aria-roledescription','slide');slide.setAttribute('aria-label',`${index+1} of ${data.total}`);
  const field=k=>slide.querySelector(`[data-cards-render="${k}"]`);
  field('name').textContent=record.name;field('excerpt').textContent=record.excerpts[context]||record.excerpt;field('excerpt').style.opacity='0';const preview=document.createElement('span');preview.className='tdb-review-cards_body-preview';preview.textContent=record.text;field('text').replaceChildren(preview);
  const date=new Date(record.date);field('date').textContent=Number.isNaN(date.getTime())?'':(record.approx?'Approx. ':'')+date.toLocaleDateString('en-GB',record.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  field('rating').setAttribute('aria-label',record.rating?record.rating+' out of 5 stars':'Rating not supplied');
  field('icon').replaceChildren(...cms.sourceIcon(record.platform,false).childNodes);
  slide.querySelector('[data-tdb-cards-open]').setAttribute('aria-label','Read full review by '+record.name);
  return slide;
 }
 const initial=data.records.slice(0,batchSize).map((record,index)=>fill(seedById.get(record.id)||template.cloneNode(true),record,index));
 track.replaceChildren(...initial);rendered=initial.length;track.style.transitionTimingFunction=motion.reviews.easing;
 const hasMore=()=>rendered<data.records.length||data.hasMore,busy=()=>swiper?.animating||swiper?.touchEventsData?.isTouched,fadeTime=()=>reduced.matches?0:motion.reviews.fade;
 function hide(){clearTimeout(revealTimer);revealTimer=0;if(shownQuote)fades.to(shownQuote,0,fadeTime());shownQuote=null;}
 function begin(){if(!swiper||updating||phase==='initializing'||phase==='destroyed')return;hide();phase='moving';}
 function controls(){
  for(const [button,disabled]of[[previous,swiper.activeIndex===0],[next,swiper.activeIndex>=rendered-1&&!hasMore()]]){button.setAttribute('aria-disabled',String(disabled));button.classList.toggle('is-disabled',disabled);}
  next.toggleAttribute('data-tdb-loading',Boolean(loading&&swiper.activeIndex>=rendered-1));
 }
 function reflect(){
  if(!swiper||phase==='destroyed')return;
  const rect=viewport.getBoundingClientRect();swiper.slides.forEach(slide=>{const r=slide.getBoundingClientRect(),visible=r.right>rect.left+1&&r.left<rect.right-1;slide.inert=!visible;slide.setAttribute('aria-hidden',String(!visible));});
  ticker.update(String(swiper.activeIndex+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1);controls();
 }
 function reveal(delay){
  if(!swiper||entryPending||phase==='initializing'||phase==='destroyed')return;const active=swiper.slides[swiper.activeIndex];
  if(phase==='settled'&&settledSlide===active&&(revealTimer||shownQuote))return;
  clearTimeout(revealTimer);reflect();settledSlide=active;phase='settled';
  const show=()=>{revealTimer=0;if(phase!=='settled'||swiper.slides[swiper.activeIndex]!==active)return;shownQuote=active?.querySelector('[data-cards-render="excerpt"]');fades.to(shownQuote,1,fadeTime());};
  const pause=reduced.matches?0:delay??(swiper.swipeDirection==='prev'?motion.reviews.previousDelay:motion.reviews.nextDelay);if(pause)revealTimer=setTimeout(show,pause);else show();
 }
 function flush(){
  if(!pending.length||busy()||signal.aborted)return;
  const added=pending;pending=[];track.append(...added.map((record,index)=>fill(template.cloneNode(true),record,rendered+index)));rendered+=added.length;fitBodies();
  updating=true;swiper.update();updating=false;reflect();
  if(advanceAfterLoad){advanceAfterLoad=false;move(1);}
 }
 function more(){
  if(loading||pending.length||!hasMore()||signal.aborted)return loading;
  loading=Promise.resolve().then(async()=>{
   if(rendered>=data.records.length&&data.hasMore)await data.loadMore({signal});
   if(signal.aborted)return;
   pending=data.records.slice(rendered,rendered+batchSize);status.textContent='';flush();
  }).catch(()=>{advanceAfterLoad=false;if(!signal.aborted)status.textContent='More reviews could not load. Use Next to try again.';}).finally(()=>{loading=null;if(!signal.aborted)controls();});
  controls();return loading;
 }
 function prefetch(){if(rendered-swiper.activeIndex<=prefetchDistance)more();}
 // Give the final review the same focused left position on wide screens.
 function trailingRoom(){const style=getComputedStyle(viewport),slide=track.firstElementChild;return Math.max(0,viewport.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-(slide?.getBoundingClientRect().width||0));}

 function fitBodies(){
  const measurements=[...track.children].map(slide=>{
   const node=slide.querySelector('[data-cards-render="text"]');
   if(!node)return null;
   const line=parseFloat(getComputedStyle(node).lineHeight);
   const available=node.getBoundingClientRect().height;
   if(!Number.isFinite(line)||line<=0)return null;
   const lines=Math.max(0,Math.floor((available-.5)/line));
   return {node,preview:node.firstElementChild,lines,height:lines*line};
  });
  measurements.forEach(item=>{
   if(!item)return;
   item.node.style.setProperty('--tdb-review-body-lines',String(Math.max(1,item.lines)));
   // Clamp a normal-flow child: grid blockification defeats the legacy box clamp.
   // Keep the outer grid row fixed, and measure fractional rather than rounded height.
   if(item.preview)item.preview.style.maxHeight=item.height+'px';
  });
 }
 function finishEntry(advance){
  if(!entryPending)return;
  entryPending=false;clearTimeout(entryTimer);cancelAnimationFrame(entryFrame);entryObserver?.disconnect();
  root.dataset.tdbSliderFirstView=advance?'advanced':'skipped-interaction';
  if(advance&&swiper.activeIndex===0&&rendered>1){phase='moving';swiper.slideTo(1,swiper.params.speed);}
  else {phase='moving';reveal(motion.reviews.initialDelay);}
 }
 function scheduleEntry(){
  if(!entryPending||!entryVisible||document.hidden||entryTimer||entryFrame)return;
  entryFrame=requestAnimationFrame(()=>{entryFrame=requestAnimationFrame(()=>{
   entryFrame=0;
   entryTimer=setTimeout(()=>{entryTimer=0;if(entryVisible&&!document.hidden&&!signal.aborted)finishEntry(true);},motion.carousel.entryStart);
  });});
 }
 function setupEntry(){
  root.dataset.tdbSliderFirstView='pending';
  const intent=()=>finishEntry(false);
  for(const event of ['pointerdown','touchstart','keydown','focusin'])root.addEventListener(event,intent,{capture:true,passive:true,signal});
  entryObserver=new IntersectionObserver(entries=>{
   entryVisible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>0);
   if(entryVisible){scheduleEntry();startProgress();}
   else{clearTimeout(entryTimer);cancelAnimationFrame(entryFrame);entryTimer=entryFrame=0;progressSampler.pause();}
  },{threshold:0});
  // Keep progress visibility separate: the one-shot entry observer disconnects.
  entryObserver.observe(viewport);
  progressObserver.observe(viewport);
  document.addEventListener('visibilitychange',()=>{
   if(document.hidden){clearTimeout(entryTimer);cancelAnimationFrame(entryFrame);entryTimer=entryFrame=0;progressSampler.pause();}
   else{scheduleEntry();startProgress();}
  },{signal});
 }
 const progress=$('[data-tdb-cards-progress]'),marker=progress?.firstElementChild;
 let progressVisible=false,lastProgress='';
 function paintProgress(){
  if(!marker||!swiper?.slides.length)return;
  const first=swiper.slides[0],second=swiper.slides[1],a=first.getBoundingClientRect(),v=viewport.getBoundingClientRect();
  const step=second?second.getBoundingClientRect().left-a.left:a.width;
  const origin=v.left+parseFloat(getComputedStyle(viewport).paddingLeft);
  const index=Math.max(0,Math.min(data.total-1,(origin-a.left)/Math.max(1,step)));
  const width=progress.clientWidth,segment=width/Math.max(1,data.total);
  const travel=data.total>1?index*(width-segment)/(data.total-1):0,pose=segment+':'+travel;
  if(pose!==lastProgress){marker.style.width=segment+'px';marker.style.transform=`translateX(${travel}px)`;lastProgress=pose;}
 }
 const progressSampler=window.TDBRenderedProgress.observe({track,paint:paintProgress,enabled:()=>progressVisible&&!signal.aborted});
 function startProgress(){progressSampler.schedule();}
 const progressObserver=new IntersectionObserver(entries=>{progressVisible=entries.some(e=>e.isIntersecting);if(progressVisible)startProgress();else{progressSampler.pause();}},{rootMargin:'100px'});
 signal.addEventListener('abort',()=>progressObserver.disconnect(),{once:true});

 swiper=window.TDBSwiper.create(viewport,{init:false,direction:'horizontal',wrapperClass:'tdb-review-cards_track',slideClass:'tdb-review-cards_slide',slidesPerView:'auto',slidesOffsetAfter:trailingRoom,initialSlide:0,loop:false,rewind:false,resistanceRatio:0,preventInteractionOnTransition:false,speed:reduced.matches?0:motion.duration(innerWidth),watchSlidesProgress:true,keyboard:{enabled:false},on:{slideChange(){queueMicrotask(()=>{reflect();if(!updating)prefetch();});},sliderFirstMove:begin,transitionStart:begin}});
 const stopSettled=window.TDBSwiper.onSettled(swiper,reason=>{flush();if(!busy())reveal(reason==='release'?motion.reviews.cardDelay:undefined);prefetch();});
 // Apply runtime opacity rules only after Swiper has assigned the active slide.
 // Its initial geometry reads otherwise start a first-card dim/brighten pulse.
 swiper.init();root.classList.add('is-ready');phase='waiting-entry';setupEntry();fitBodies();$('[data-tdb-cards-total]').textContent=String(data.total).padStart(2,'0');status.textContent='';navigation.classList.remove('is-inactive');reflect();
 function move(direction){
  finishEntry(false);
  const selected=direction<0?previous:next;
  if(selected.getAttribute('aria-disabled')==='true')return;
  for(const arrow of [previous,next])arrow.classList.toggle('is-selected',arrow===selected);
  if(direction<0)advanceAfterLoad=false;
  if(direction>0&&swiper.activeIndex>=rendered-1&&hasMore()){advanceAfterLoad=true;more();flush();return;}
  const target=Math.max(0,Math.min(rendered-1,swiper.activeIndex+direction));if(target===swiper.activeIndex)return;
  swiper.swipeDirection=direction<0?'prev':'next';swiper.slideTo(target);
 }
 async function activate(event){
  if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(event.type==='keydown'&&!['Enter',' ','ArrowLeft','ArrowRight'].includes(event.key))return;
  const button=event.target.closest('[data-tdb-cards-open],[data-tdb-cards-prev],[data-tdb-cards-next]');
  if(event.key==='ArrowLeft'||(!event.key?.startsWith('Arrow')&&button?.hasAttribute('data-tdb-cards-prev'))){event.preventDefault();move(-1);return;}
  if(event.key==='ArrowRight'||(!event.key?.startsWith('Arrow')&&button?.hasAttribute('data-tdb-cards-next'))){event.preventDefault();move(1);return;}
  if(!button||!swiper.allowClick||button.getAttribute('aria-busy')==='true')return;
  event.preventDefault();button.setAttribute('aria-busy','true');
  try{await openReviews({trigger:button,reviewId:button.closest('[data-review-id]').dataset.reviewId,signal});}catch(error){if(!signal.aborted)status.textContent='The review could not load. Please try again.';}finally{button.removeAttribute('aria-busy');}
 }
 root.addEventListener('click',activate,{signal});root.addEventListener('keydown',activate,{signal});window.addEventListener('online',prefetch,{signal});
 const resize=new ResizeObserver(()=>{if(!busy()){updating=true;swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);swiper.update();updating=false;fitBodies();reflect();startProgress();}});resize.observe(viewport);
 document.fonts?.ready.then(()=>{if(!signal.aborted)fitBodies();});
 reduced.addEventListener('change',()=>{hide();phase='moving';swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches){swiper.slideTo(swiper.activeIndex,0);ticker.settle();}reveal(0);},{signal});
 const api={destroy(){finishEntry(false);progressSampler.destroy();hide();phase='destroyed';controller.abort();resize.disconnect();stopSettled();fades.destroy();swiper.destroy(true,true);ticker.destroy();track.style.transitionTimingFunction=originalEasing;track.replaceChildren(...originals.map(n=>n.cloneNode(true)));root.classList.remove('is-ready');navigation.classList.add('is-inactive');previous.setAttribute('aria-disabled','true');next.setAttribute('aria-disabled','false');previous.classList.add('is-disabled');next.classList.remove('is-disabled');previous.classList.remove('is-selected');next.classList.remove('is-selected');next.removeAttribute('data-tdb-loading');status.textContent='';instances.delete(root);}};
 instances.set(root,api);return api;
}
window.TDBReviewCards=Object.freeze({version:'2.1.1',mount});window.TDBSwiper?.register('review-cards',window.TDBReviewCards);
})();
