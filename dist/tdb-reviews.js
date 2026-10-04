/* TDB native reviews v3.5.0. Native Webflow layout; original quote choreography. */
(() => {
'use strict';if(window.TDBReviews)return;
const instances=new WeakMap();
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return'';}};
function mount(root,data){
 if(instances.has(root))return instances.get(root);
 const cms=window.TDBReviewCMS,motion=window.TDBMotion,ctrl=new AbortController(),{signal}=ctrl;
 const $=s=>root.querySelector(s),template=$('[data-tdb-review-template]'),track=$('[data-tdb-reviews-track]'),viewport=$('[data-tdb-reviews-slider]'),mark=$('[data-tdb-review-static-mark]'),staticLayer=$('[data-tdb-review-static-layer]');
 if(!template||!track||!viewport||!mark||!staticLayer)throw Error('Native review template missing');
 const filterButton=$('[data-tdb-filter-toggle]'),filterPanel=$('[data-tdb-review-filter-panel]');
 const filter=motion.filterToggle(filterButton,{onChange:setFilterOpen});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),context=cms.contextForPath(location.pathname);
 const records=data.records.slice(),slideCache=new Map();let knownCount=records.length;
 const position=$('[data-tdb-reviews-position]'),previous=$('[data-tdb-reviews-prev]'),next=$('[data-tdb-reviews-next]');
 const ticker=window.TDBNativeTicker.mount(position),fades=motion.fadeController();let swiper=null,moreFlight=null,pendingAppend=false,destroyed=false,phase='closed',revealTimer=0,shownQuote=null,settledSlide=null,reflectedIndex=-1;

 let selection={sort:'recommended',rating:'',platform:'',treatment:'',experience:''};
 let filterOpen=false,filterAnimation=null,filterRevision=0,filterFlight=null,filterReady=!!data.indexReady,filterPrimeTimer=0;
 let indexMode=false,matched=[],queryController=null,queryRevision=0,selectionBusy=false,pendingBatch=null;
 const canLoadMore=()=>indexMode?records.length<matched.length:data.hasMore;
 const filterOptions=filterPanel?[...filterPanel.querySelectorAll('[data-tdb-filter-group]')]:[];
 const filterStatus=filterPanel?.querySelector('[data-tdb-filter-status]'),filterApply=filterPanel?.querySelector('[data-tdb-filter-apply]');
 function hasSelection(){return selection.sort!=='recommended'||['rating','platform','treatment','experience'].some(key=>selection[key]);}
 $('[data-tdb-reviews-average]').textContent=data.average.toFixed(2);$('[data-tdb-reviews-total]').textContent=data.total+' reviews';const length=()=>indexMode?matched.length:data.hasMore?data.total:records.length;$('[data-tdb-reviews-length]').textContent=String(length()).padStart(2,'0');
 function slide(record,index){
  if(slideCache.has(record.id))return slideCache.get(record.id);
  const node=template.cloneNode(true);node.removeAttribute('data-tdb-review-template');node.dataset.tdbReviewId=record.id;node.setAttribute('aria-label',`Review ${index+1} of ${length()}`);
  const field=k=>node.querySelector(`[data-review-render="${k}"]`);
  field('name').textContent=record.name;field('text').textContent=record.text;field('excerpt').textContent=record.excerpts[context]||record.excerpt||'';field('excerpt').style.opacity='0';
  const date=new Date(record.date);field('date').textContent=Number.isNaN(date.getTime())?'':(record.approx?'Approx. ':'')+date.toLocaleDateString('en-GB',record.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  field('historic').hidden=!record.historic;
  const source=field('source'),url=safeURL(record.url);if(url){source.href=url;source.target='_blank';source.rel='noopener noreferrer';}else{source.removeAttribute('href');source.setAttribute('aria-disabled','true');}
  source.setAttribute('aria-label',record.platform+' review source');field('icon').replaceChildren(...cms.sourceIcon(record.platform,false).childNodes);
  const stars=field('rating'),unrated=field('unrated');stars.classList.toggle('is-hidden',!record.rating);unrated.classList.toggle('is-hidden',!!record.rating);stars.setAttribute('aria-label',record.rating+' out of 5 stars');stars.querySelectorAll('[data-tdb-star]').forEach((star,i)=>star.classList.toggle('is-empty',i>=record.rating));
  field('response-wrap').hidden=!record.showResponse;field('response').textContent=record.response||'';slideCache.set(record.id,node);return node;
 }
 track.replaceChildren(...records.map(slide));const unsubscribe=data.subscribe?.(()=>{pendingAppend=true;appendRecords();});
 function appendRecords(){
  if(indexMode){if(pendingBatch&&!swiper?.animating){const batch=pendingBatch;pendingBatch=null;appendBatch(batch);}pendingAppend=false;knownCount=data.records.length;return;}
  if(destroyed||!pendingAppend||swiper?.animating)return;
  const added=data.records.slice(knownCount);knownCount=data.records.length;records.push(...added);track.append(...added.map((record,i)=>slide(record,records.length-added.length+i)));pendingAppend=false;
  $('[data-tdb-reviews-length]').textContent=String(length()).padStart(2,'0');
  [...track.children].forEach((node,i)=>node.setAttribute('aria-label',`Review ${i+1} of ${length()}`));
  swiper?.update();reflectedIndex=-1;reflect();
 }
 function primeMore(){
  if(indexMode){primeFilteredMore();return;}
  if(destroyed||moreFlight||filterFlight||hasSelection()||!data.hasMore||!swiper||records.length-swiper.activeIndex>7)return;
  moreFlight=data.loadMore({signal}).catch(error=>{if(!signal.aborted)root.dispatchEvent(new CustomEvent('tdb:review-error',{bubbles:true,detail:{error}}));}).finally(()=>{moreFlight=null;});
 }
 const originalEasing=track.style.transitionTimingFunction;track.style.transitionTimingFunction=motion.reviews.easing;
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
  ticker.update(String(index+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1);position.setAttribute('aria-label',`Review ${index+1} of ${length()}`);
  for(const [node,disabled] of [[previous,filterOpen||index===0],[next,filterOpen||index===records.length-1&&!canLoadMore()]]){node.classList.toggle('is-disabled',disabled);node.setAttribute('aria-disabled',String(disabled));}
  if(phase!=='closed')primeMore();
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
  swiper=new window.Swiper(viewport,{init:false,direction:'horizontal',wrapperClass:'tdb-review-drawer_track',slideClass:'tdb-review-drawer_slide',slidesPerView:1,initialSlide:index,loop:false,preventInteractionOnTransition:false,observer:false,speed:reduced.matches?0:motion.duration(innerWidth),touchStartPreventDefault:false,threshold:10,keyboard:{enabled:false},watchOverflow:true,on:{slideChange(){queueMicrotask(reflect);},sliderFirstMove:begin,transitionStart:begin,transitionEnd(){appendRecords();if(phase==='moving')reveal();},touchEnd(){requestAnimationFrame(()=>{if(!destroyed&&phase==='moving'&&!swiper.animating)reveal(motion.reviews.cardDelay);});}}});
  window.TDBSwiper.bindSwiper(swiper);swiper.init();
 }
 function build(id){
  appendRecords();
  const index=Math.max(0,records.findIndex(r=>r.id===id));
  phase='opening';hideQuote();settledSlide=null;fades.to(mark,1,0);
  if(swiper)swiper.slideTo(index,0);else createSwiper(index);
  swiper.slides[index].querySelector('[data-tdb-review-scroll]').scrollTop=0;reveal(motion.reviews.openDelay);
 }
 function navigate(direction){if(filterOpen||!swiper||direction<0&&swiper.isBeginning)return;if(direction>0&&swiper.isEnd){if(canLoadMore()){primeMore();const current=swiper.activeIndex;moreFlight?.then(()=>{if(!destroyed&&phase!=='closed'&&swiper.activeIndex===current&&!swiper.isEnd)navigate(1);});}return;}swiper.swipeDirection=direction<0?'prev':'next';begin();direction<0?swiper.slidePrev():swiper.slideNext();if(!swiper.animating&&phase==='moving')reveal();}
 function action(node,fn){const handle=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();if(node.getAttribute('aria-disabled')!=='true')fn();};node.addEventListener('click',handle,{signal});node.addEventListener('keydown',handle,{signal});}
 action(previous,()=>navigate(-1));action(next,()=>navigate(1));
 root.addEventListener('keydown',e=>{if(filterOpen||e.target.matches('input,select,textarea'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();navigate(e.key==='ArrowLeft'?-1:1);}},{signal});

 // Native panel and options; runtime only selects CMS records and animates the panel.
 function matching(state=selection){
  return (data.indexReady?data.filterIndex:data.records).filter(record=>(!state.rating||(state.rating==='unrated'?!record.rating:record.rating===Number(state.rating)))&&
   (!state.platform||record.platform===state.platform)&&(!state.treatment||record.topics.includes(state.treatment))&&
   (!state.experience||record.topics.includes(state.experience)));
 }
 function ordered(){
  const list=matching();
  const time=record=>{const value=Date.parse(record.date);return Number.isFinite(value)?value:null;};
  return list.sort((a,b)=>{
   if(selection.sort==='highest'||selection.sort==='lowest'){
    if(a.rating===null||b.rating===null)return a.rating===b.rating?0:a.rating===null?1:-1;
    return selection.sort==='highest'?b.rating-a.rating:a.rating-b.rating;
   }
   if(selection.sort==='recent'||selection.sort==='oldest'){
    const at=time(a),bt=time(b);if(at===null||bt===null)return at===bt?0:at===null?1:-1;
    return selection.sort==='recent'?bt-at:at-bt;
   }
   return 0; // Stable sort retains the native CMS order for ties and Recommended.
  });
 }
 function updateFilterOptions(message){
  if(!filterPanel)return;
  for(const option of filterOptions){
   const key=option.dataset.tdbFilterGroup,value=option.dataset.tdbFilterValue,selected=selection[key]===value;
   const unavailable=!filterReady||(key!=='sort'&&!selected&&!matching({...selection,[key]:value}).length);
   option.disabled=unavailable;option.tabIndex=unavailable?-1:0;option.setAttribute('aria-disabled',String(unavailable));option.setAttribute('aria-pressed',String(selected));
   option.classList.toggle('is-selected',selected);option.classList.toggle('is-unavailable',unavailable);
  }
  const count=matching().length;
  filterStatus.textContent=message||(selectionBusy?'Loading matching reviews…':filterReady?(hasSelection()?count+' matching '+(count===1?'review':'reviews'):'All reviews'):'Preparing review filters…');
  filterApply.textContent=filterReady?'View '+count+' '+(count===1?'review':'reviews'):'View reviews';filterApply.disabled=selectionBusy;filterApply.setAttribute('aria-disabled',String(selectionBusy));
 }
 function renderSelection(chosen){
  if(!chosen.length)return;
  const wasOpen=phase!=='closed';hideQuote();staticLayer.append(mark);mark.classList.add('is-stationary');
  swiper?.destroy(true,true);swiper=null;records.splice(0,records.length,...chosen);knownCount=data.records.length;pendingAppend=false;
  track.replaceChildren(...records.map(slide));
  [...track.children].forEach((node,i)=>{node.setAttribute('aria-label',`Review ${i+1} of ${length()}`);node.querySelector('[data-tdb-review-scroll]').scrollTop=0;node.querySelector('[data-review-render="excerpt"]').style.opacity='0';});
  $('[data-tdb-reviews-length]').textContent=String(length()).padStart(2,'0');reflectedIndex=-1;settledSlide=null;
  phase=wasOpen?'opening':'closed';createSwiper();swiper.allowTouchMove=!filterOpen;reflect();
  if(wasOpen)reveal(0);updateFilterOptions();
 }

 async function replaceSelection(){
  queryController?.abort();queryController=new AbortController();const request=queryController,revision=++queryRevision;
  const abort=()=>request.abort();signal.addEventListener('abort',abort,{once:true});
  selectionBusy=true;pendingBatch=null;updateFilterOptions();
  const desired=ordered();
  try{
   const batch=await data.fetchRecords(desired.slice(0,20).map(record=>record.id),{signal:request.signal});
   if(destroyed||revision!==queryRevision)return;
   indexMode=true;matched=desired;selectionBusy=false;moreFlight=null;renderSelection(batch);
  }catch(error){if(!request.signal.aborted){selectionBusy=false;updateFilterOptions('Could not load these reviews. Choose again or Reset.');filterApply.disabled=true;filterApply.setAttribute('aria-disabled','true');}}
  finally{signal.removeEventListener('abort',abort);}
 }
 function appendBatch(batch){
  if(destroyed||!indexMode)return;
  const offset=records.length;records.push(...batch);track.append(...batch.map((record,i)=>slide(record,offset+i)));
  [...track.children].forEach((node,i)=>node.setAttribute('aria-label',`Review ${i+1} of ${length()}`));
  swiper?.update();reflectedIndex=-1;reflect();
 }
 function primeFilteredMore(){
  if(destroyed||selectionBusy||moreFlight||pendingBatch||!swiper||!canLoadMore()||records.length-swiper.activeIndex>7)return;
  const revision=queryRevision,ids=matched.slice(records.length,records.length+20).map(record=>record.id);
  const flight=data.fetchRecords(ids,{signal:queryController?.signal||signal}).then(batch=>{
   if(destroyed||revision!==queryRevision)return;
   if(swiper?.animating)pendingBatch=batch;else appendBatch(batch);
  }).catch(error=>{if(!signal.aborted&&revision===queryRevision)root.dispatchEvent(new CustomEvent('tdb:review-error',{bubbles:true,detail:{error}}));})
  .finally(()=>{if(moreFlight===flight)moreFlight=null;});moreFlight=flight;
 }
 async function prepareFilters(){
  if(!filterPanel||destroyed)return;
  if(filterReady){updateFilterOptions();return;}
  if(filterFlight)return filterFlight;
  updateFilterOptions();filterPanel.setAttribute('aria-busy','true');
  // Runs on drawer-open/filter intent, not during initial page loading. Shares the
  // existing CMS metadata index; review bodies are fetched only for result batches.
  filterFlight=(async()=>{try{
   await data.loadIndex({signal});if(destroyed)return;filterReady=!!data.indexReady;updateFilterOptions();
  }catch(error){if(!signal.aborted)updateFilterOptions('Filters could not load. Tap Reset to retry.');}
  finally{filterFlight=null;filterPanel?.setAttribute('aria-busy','false');}})();
  return filterFlight;
 }
 function setFilterOpen(open,immediate=false){
  if(!filterPanel)return;filterOpen=open;const revision=++filterRevision;
  const from=filterAnimation?getComputedStyle(filterPanel).transform:open?'translateY(100%)':'translateY(0)';
  filterAnimation?.cancel();filterAnimation=null;
  filterButton.setAttribute('aria-expanded',String(open));filterButton.setAttribute('aria-label',open?'Close review filters':'Filter and sort reviews');
  filterPanel.setAttribute('aria-hidden',String(!open));filterPanel.inert=!open;viewport.inert=open;
  if(swiper){swiper.allowTouchMove=!open;reflectedIndex=-1;reflect();}
  if(open){filterPanel.classList.remove('is-closed');prepareFilters();filterPanel.querySelector('[data-tdb-filter-heading]').focus({preventScroll:true});}
  else if(filterPanel.contains(document.activeElement))filterButton.focus({preventScroll:true});
  const finish=()=>{if(revision!==filterRevision)return;if(!open)filterPanel.classList.add('is-closed');filterAnimation?.cancel();filterAnimation=null;};
  const duration=immediate||reduced.matches?0:motion.duration(innerWidth);
  if(!duration){finish();return;}
  const animation=filterPanel.animate([{transform:from},{transform:open?'translateY(0)':'translateY(100%)'}],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
  filterAnimation=animation;animation.finished.then(finish).catch(()=>{});
 }
 if(filterPanel){
  filterPanel.id='tdb-review-filters-'+Math.random().toString(36).slice(2,9);filterPanel.inert=true;
  filterButton.setAttribute('aria-controls',filterPanel.id);filterButton.setAttribute('aria-expanded','false');filterButton.setAttribute('aria-label','Filter and sort reviews');
  for(const event of ['pointerenter','focus','pointerdown'])filterButton.addEventListener(event,prepareFilters,{signal,passive:true});
  filterOptions.forEach(option=>action(option,()=>{if(option.disabled||!filterReady)return;selection[option.dataset.tdbFilterGroup]=option.dataset.tdbFilterValue;replaceSelection();}));
  action(filterPanel.querySelector('[data-tdb-filter-reset]'),()=>{selection={sort:'recommended',rating:'',platform:'',treatment:'',experience:''};if(filterReady)replaceSelection();else prepareFilters();});
  action(filterApply,()=>{if(!filterApply.disabled)filter.set(false);});
  root.addEventListener('keydown',event=>{if(filterOpen&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();filter.set(false);}},{signal,capture:true});
  reduced.addEventListener('change',()=>{if(filterAnimation)setFilterOpen(filterOpen,true);},{signal});
  updateFilterOptions();
 }
 let preferred='';const drawer=window.TDBDrawer.mount(root.closest('[data-tdb-drawer]'),{onOpen(){build(preferred);clearTimeout(filterPrimeTimer);filterPrimeTimer=setTimeout(prepareFilters,250);},onClose(){clearTimeout(filterPrimeTimer);filter.reset(true);hideQuote();phase='closed';if(mark.closest('[data-tdb-review-scroll]')?.scrollTop>0)fades.to(mark,0,fadeTime());ticker.settle();}});
 // Native Webflow visibility keeps the closed drawer measurable without showing it.
 if(viewport.clientWidth)createSwiper();
 const resize=new ResizeObserver(()=>{if(swiper&&!swiper.animating){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);swiper.update();}});resize.observe(viewport);
 reduced.addEventListener('change',()=>{if(swiper){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches&&phase!=='closed'){hideQuote();phase='moving';swiper.slideTo(swiper.activeIndex,0);ticker.settle();reveal(0);}}},{signal});
 const api=Object.freeze({async open(trigger,id){preferred=id||'';return drawer.open(trigger);},close(){return drawer.close();},destroy(){if(destroyed)return;destroyed=true;queryController?.abort();clearTimeout(filterPrimeTimer);filterAnimation?.cancel();filterPanel?.classList.add('is-closed');filterPanel?.setAttribute('aria-hidden','true');if(filterPanel)filterPanel.inert=true;viewport.inert=false;filter.destroy();unsubscribe?.();drawer.destroy();ctrl.abort();resize.disconnect();clearTimeout(revealTimer);fades.destroy();staticLayer.append(mark);mark.classList.add('is-stationary');swiper?.destroy(true,true);track.style.transitionTimingFunction=originalEasing;ticker.destroy();track.replaceChildren();slideCache.clear();instances.delete(root);}});instances.set(root,api);return api;
}
window.TDBReviews=Object.freeze({version:'3.5.0',mount});
})();

