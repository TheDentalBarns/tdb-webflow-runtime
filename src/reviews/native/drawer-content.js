/* TDB native reviews v3.14.0. Native Webflow layout; original quote choreography. */
(() => {
'use strict';if(window.TDBReviews)return;
const instances=new WeakMap();
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return'';}};
function mount(root,data){
 if(instances.has(root))return instances.get(root);
 const cms=window.TDBReviewCMS,motion=window.TDBMotion,ctrl=new AbortController(),{signal}=ctrl;
 const $=s=>root.querySelector(s),template=$('[data-tdb-review-template]'),track=$('[data-tdb-reviews-track]'),viewport=$('[data-tdb-reviews-slider]'),mark=$('[data-tdb-review-static-mark]'),staticLayer=$('[data-tdb-review-static-layer]');
 if(!template||!track||!viewport||!mark||!staticLayer)throw Error('Native review template missing');
 const filterButton=$('[data-tdb-filter-toggle]'),filterPanel=$('[data-tdb-review-filter-panel]'),filterBackdrop=$('[data-tdb-filter-backdrop]');
 const drawerRoot=root.closest('[data-tdb-drawer]'),mainClose=drawerRoot.querySelector('[data-tdb-drawer-close]'),filterBadge=filterButton?.querySelector('[data-tdb-filter-badge]');
 let filter=null;
 const reduced=window.TDBMotion.reduced,context=cms.contextForPath(location.pathname);
 const records=data.records.slice(),slideCache=new Map();let knownCount=records.length;
 const position=$('[data-tdb-reviews-position]'),previous=$('[data-tdb-reviews-prev]'),next=$('[data-tdb-reviews-next]');
 const totalNode=$('[data-tdb-reviews-length]'),totalTicker=window.TDBNativeTicker.mount(totalNode);let shownTotal=Number(totalNode.textContent)||0;
 const ticker=window.TDBNativeTicker.mount(position),fades=motion.fadeController();let swiper=null,moreFlight=null,pendingAppend=false,destroyed=false,phase='closed',revealTimer=0,shownQuote=null,settledSlide=null,reflectedIndex=-1;

 let selection={sort:'recommended',rating:[],platform:[],treatment:[],experience:[]};
 let filterOpen=false,filterFlight=null,filterReady=!!data.indexReady,filterPrimeTimer=0,filterLoadFailed=false;
 let indexMode=false,matched=[],queryController=null,queryRevision=0,selectionBusy=false,pendingBatch=null;
 const canLoadMore=()=>indexMode?records.length<matched.length:data.hasMore;
 const filterOptions=filterPanel?[...filterPanel.querySelectorAll('[data-tdb-filter-group]')]:[];
 const filterStatus=filterPanel?.querySelector('[data-tdb-filter-status]'),filterApply=$('[data-tdb-filter-apply]'),filterActions=$('.tdb-review-filter_actions');
 const filterReset=filterPanel?.querySelector('[data-tdb-filter-reset]');
 const filterApplyCount=filterApply?.querySelector('[data-tdb-filter-apply-count]'),filterApplyReserve=filterApply?.querySelector('[data-tdb-filter-count-reserve]'),filterApplyPlural=filterApply?.querySelector('[data-tdb-filter-apply-plural]');
 const filterApplyTicker=filterApplyCount?window.TDBNativeTicker.mount(filterApplyCount):null;let shownApplyCount=null;
 const canonical=topic=>cms.canonicalTopic(topic),multi=key=>key==='rating'||key==='platform'||key==='treatment'||key==='experience';
 const normalise=(key,value)=>key==='rating'||key==='platform'?value:canonical(value);
 const chosen=(key,value)=>multi(key)?value?selection[key].includes(normalise(key,value)):!selection[key].length:selection[key]===value;
 function candidate(key,value){
  if(!multi(key))return {...selection,[key]:value};
  value=normalise(key,value);const current=selection[key];
  return {...selection,[key]:!value?[]:current.includes(value)?current.filter(item=>item!==value):[...current,value]};
 }
 const copySelection=state=>({...state,rating:[...state.rating],platform:[...state.platform],treatment:[...state.treatment],experience:[...state.experience]});
 let appliedSelection=copySelection(selection),draftController=null,draftFlight=null,draftCache=null,draftTimer=0,applyRevision=0;
 const disclosures=filterPanel?[...filterPanel.querySelectorAll('[data-tdb-filter-disclosure]')].map(button=>({key:button.dataset.tdbFilterDisclosure,button,body:button.parentElement.querySelector('.tdb-review-filter_options'),summary:button.querySelector('[data-tdb-filter-selection]'),chevron:button.querySelector('[data-tdb-filter-chevron]')})).filter(entry=>entry.body&&entry.summary):[];
 // A width-only Webflow breakpoint also catches portrait phones. This condition
 // activates native Designer combo styles only for short, touch-screen landscape.
 // The same Webflow bars stay in one reading flow; styles remain native.
 const readingPane=$('[data-tdb-review-reading-pane]');
 const landscapeNodes=[readingPane,$('.tdb-review-drawer_header'),$('.tdb-review-drawer_footer'),viewport,track,mainClose,filterPanel,filterPanel?.querySelector('[data-tdb-filter-scroll]'),filterPanel?.querySelector('.tdb-review-filter_heading'),filterActions].filter(Boolean);
 let landscape=false;
 const originalMarkTranslate=mark.style.translate;
 let markScrollTop=0;
 // Keep the SVG in its native overlay. Reparenting it out of the moving
 // card on first touch invalidates both rendering layers on mobile.
 // Native styles still own its geometry; only the reading offset is runtime.
 if(mark.parentNode!==staticLayer)staticLayer.append(mark);
 mark.classList.add('is-stationary');
 const readingFooter=$('.tdb-review-drawer_footer');
 const readingScroll=()=>reading.scroll();
 function syncMarkScroll(){
  markScrollTop=readingScroll()?.scrollTop||0;
  const translate=landscape||!markScrollTop?originalMarkTranslate:'0px '+(-markScrollTop)+'px';
  if(mark.style.translate!==translate)mark.style.translate=translate;
 }
 root.addEventListener('scroll',event=>{if(event.target===readingScroll()&&phase!=='closed')syncMarkScroll();},{capture:true,passive:true,signal});
 const reading=window.TDBDrawerReading.mount({
  pane:readingPane,footer:readingFooter,viewport,track,swiper:()=>swiper,
  slideScroll:()=>swiper?.slides[swiper.activeIndex]?.querySelector('[data-tdb-review-scroll]'),
  active:()=>phase!=='closed'&&phase!=='opening',
  nodes:()=>[...landscapeNodes,...[template,...slideCache.values()].flatMap(node=>[node,node.querySelector('[data-tdb-review-scroll]')])],
  onMode(value){landscape=value;placeFilterClose(true);},onRestore:syncMarkScroll
 });
 const captureReadingAnchor=reading.capture,applyReadingAnchor=reading.apply;
 // The filter footer is native content inside the sliding panel. Only the
 // floating control has separate motion: morph back, then fade over its origin.
 const floatingFilterButton=filterButton?.cloneNode(true),floatingFilterBadge=floatingFilterButton?.querySelector('[data-tdb-filter-badge]');
 const filterApplyWord=filterApplyPlural?.parentElement;
 const applyPadding=['padding-left','padding-right'].map(key=>[key,filterApply?.style.getPropertyValue(key)||'',filterApply?.style.getPropertyPriority(key)||'']);
 const applyWordHidden=filterApplyWord?.hidden;
 function restoreApplyFit(){
  if(filterApplyWord)filterApplyWord.hidden=applyWordHidden;
  for(const [key,value,priority] of applyPadding)if(filterApply){if(value)filterApply.style.setProperty(key,value,priority);else filterApply.style.removeProperty(key);}
 }
 function fitFilterApply(){
  if(destroyed||!filterOpen||!filterApplyWord||!floatingFilterButton?.isConnected||!filterActions)return;
  // Measure native hit boxes, not icon artwork. Keep the centred X untouched;
  // first omit only the noun, then spend padding if the short label still needs it.
  restoreApplyFit();
  const footer=filterActions.getBoundingClientRect(),close=floatingFilterButton.getBoundingClientRect();
  const edge=footer.right-parseFloat(getComputedStyle(filterActions).paddingRight);
  const available=Math.max(0,edge-close.right-12);
  if(!footer.width||filterApply.getBoundingClientRect().width<=available)return;
  filterApplyWord.hidden=true;
  const excess=filterApply.getBoundingClientRect().width-available;
  if(excess>0){
   const style=getComputedStyle(filterApply),left=parseFloat(style.paddingLeft),right=parseFloat(style.paddingRight);
   const padding=Math.max(0,left+right-excess-1),total=left+right;
   filterApply.style.paddingLeft=(total?padding*left/total:0)+'px';
   filterApply.style.paddingRight=(total?padding*right/total:0)+'px';
  }
 }
 const applyFitResize=new ResizeObserver(fitFilterApply);
 for(const node of [filterActions,floatingFilterButton,filterApply?.querySelector('.tdb-review-filter_action-label')])if(node)applyFitResize.observe(node);
 document.fonts?.ready.then(()=>{if(!destroyed)fitFilterApply();});

 let floatingFilterIcon=null,filterHandoffRevision=0,filterHandoffAnimation=null;
 let filterSpinnerReturning=false,filterFeedbackAnimations=[];
 if(floatingFilterButton){
  floatingFilterButton.removeAttribute('id');floatingFilterButton.removeAttribute('data-tdb-filter-toggle');
  floatingFilterButton.classList.add('is-filter-floating');
  floatingFilterIcon=motion.filterToggle(floatingFilterButton);
  for(const type of ['click','keydown'])floatingFilterButton.addEventListener(type,event=>{
   if(type==='keydown'&&!['Enter',' '].includes(event.key))return;
   event.preventDefault();event.stopImmediatePropagation();
   if(filterOpen)filter?.requestClose('toggle');
  },{signal,capture:true});
 }
 function syncFloatingFilterCount(){
  // Both native and floating controls share the same fetch state and artwork.
  const loading=filterOpen&&selectionBusy&&!filterSpinnerReturning&&!destroyed;
  for(const button of [filterButton,floatingFilterButton]){
   if(!button)continue;
   if(loading){button.setAttribute('data-tdb-loading','true');button.setAttribute('aria-busy','true');}
   else{button.removeAttribute('data-tdb-loading');button.removeAttribute('aria-busy');}
  }
  if(!floatingFilterButton)return;
  if(floatingFilterBadge&&filterBadge){
   floatingFilterBadge.textContent=filterBadge.textContent;
   floatingFilterBadge.classList.toggle('is-empty',filterBadge.classList.contains('is-empty'));
  }
  floatingFilterButton.setAttribute('aria-label',filterButton.getAttribute('aria-label'));
 }
 function clearFilterFeedback(){
  for(const animation of filterFeedbackAnimations)animation.cancel();
  filterFeedbackAnimations=[];filterSpinnerReturning=false;
 }
 async function restoreFilterClose(revision){
  const valid=()=>!destroyed&&filterOpen&&revision===applyRevision;
  const buttons=[filterButton,floatingFilterButton].filter(Boolean);
  // Keep the spinner rotating until it is invisible; never reset its angle on screen.
  filterFeedbackAnimations=buttons.flatMap(button=>{
   const indicator=button.querySelector('[data-tdb-loading-indicator]');
   return indicator?[indicator.animate([{opacity:1},{opacity:0}],{duration:reduced.matches?0:motion.defaults.fadeOut,easing:'ease-out',fill:'both'})]:[];
  });
  await Promise.all(filterFeedbackAnimations.map(animation=>animation.finished.catch(()=>{})));
  if(!valid())return false;
  const spinnerAnimations=filterFeedbackAnimations;
  // Install the X's first frame before removing loading, avoiding a one-frame flash.
  filterFeedbackAnimations=buttons.flatMap(button=>{
   const content=button.querySelector('[data-tdb-loading-content]');
   return content?[content.animate([{opacity:0},{opacity:1}],{duration:reduced.matches?0:motion.defaults.fadeIn,easing:'ease-out',fill:'both'})]:[];
  });
  filterSpinnerReturning=true;syncFloatingFilterCount();
  for(const animation of spinnerAnimations)animation.cancel();
  await Promise.all(filterFeedbackAnimations.map(animation=>animation.finished.catch(()=>{})));
  return valid();
 }
 function placeFilterClose(immediate=false){
  if(immediate)for(const animation of filterFeedbackAnimations)animation.finish();
  const token=++filterHandoffRevision;
  if(!floatingFilterButton||!filterActions)return;
  filterHandoffAnimation?.cancel();
  filterHandoffAnimation=null;
  const floating=filterOpen&&!destroyed,duration=immediate||reduced.matches?0:motion.duration(innerWidth);
  syncFloatingFilterCount();
  floatingFilterButton.classList.toggle('is-phone-landscape',landscape);
  readingFooter.classList.remove('is-filter-covered');
  const remove=()=>{
   if(floatingFilterButton.contains(document.activeElement)||filterActions.contains(document.activeElement))filterButton.focus({preventScroll:true});
   floatingFilterButton.remove();floatingFilterButton.style.transform='';
  };
  if(floating){
   const entering=floatingFilterButton.parentNode!==root;
   if(entering)root.append(floatingFilterButton);
   floatingFilterButton.inert=false;floatingFilterButton.removeAttribute('aria-hidden');
   for(const key of ['aria-label','aria-controls','aria-expanded']){const value=filterButton.getAttribute(key);if(value!==null)floatingFilterButton.setAttribute(key,value);}
   floatingFilterButton.classList.add('is-filter-open');
   floatingFilterIcon.set(true,immediate);
   floatingFilterButton.style.transform='';
   fitFilterApply();
   return;
  }
  if(floatingFilterButton.parentNode!==root)return;
  if(floatingFilterButton.contains(document.activeElement)||filterActions.contains(document.activeElement))filterButton.focus({preventScroll:true});
  floatingFilterButton.inert=true;floatingFilterButton.setAttribute('aria-hidden','true');
  floatingFilterButton.classList.remove('is-filter-open');floatingFilterIcon.set(false,immediate);
  if(!duration||destroyed){remove();return;}
  const morphs=[...floatingFilterButton.querySelectorAll('[data-tdb-filter-line]')].flatMap(line=>line.getAnimations());
  (async()=>{
   await Promise.all([...morphs,...filterPanel.getAnimations()].map(animation=>animation.finished.catch(()=>{})));
   if(token!==filterHandoffRevision)return;
   const animation=floatingFilterButton.animate([{opacity:1},{opacity:0}],{duration:motion.defaults.fadeIn,easing:'ease-out',fill:'both'});
   filterHandoffAnimation=animation;
   try{await animation.finished;}catch{return;}
   if(token!==filterHandoffRevision)return;
   remove();animation.cancel();filterHandoffAnimation=null;
  })();
 }
 const setReadingMode=reading.setMode;
 function updateTotal(count,animate=true){totalTicker.update(String(count).padStart(2,'0'),count<shownTotal?-1:1,animate);shownTotal=count;totalNode.setAttribute('aria-label',count+' reviews');}
 function updateFilterApply(count){
  const label=filterReady?'View '+count+' '+(count===1?'review':'reviews'):'View reviews';
  if(filterApplyTicker){
   // The native hidden sizer reserves the full CMS total; filtering never narrows it.
   // Webflow owns its minimum width, tabular numerals, clipping and static words.
   if(filterApplyReserve)filterApplyReserve.textContent=String(Math.max(Number(data.total)||0,count));
   if(filterReady){
    filterApplyTicker.update(String(count),shownApplyCount!==null&&count<shownApplyCount?-1:1,filterOpen&&shownApplyCount!==null);
    shownApplyCount=count;
   }
   filterApplyPlural?.classList.toggle('is-singular',filterReady&&count===1);
   if(!filterOpen)filterApplyTicker.settle();
  }else filterApply.textContent=label; // Older native markup remains usable during rollout.
  filterApply.setAttribute('aria-label',label);
  filterApply.disabled=selectionBusy||!filterReady||!count;
  filterApply.setAttribute('aria-disabled',String(filterApply.disabled));
  filterApply.setAttribute('aria-busy',String(selectionBusy||!filterReady));
  fitFilterApply();
 }
 function cancelDraft(){clearFilterFeedback();clearTimeout(draftTimer);draftController?.abort();draftController=null;draftFlight=null;draftCache=null;applyRevision++;selectionBusy=false;}
 function draftKey(){return JSON.stringify(selection);}
 function fetchDraft(){
  clearTimeout(draftTimer);const key=draftKey();
  if(draftCache?.key===key)return Promise.resolve(draftCache);
  if(draftFlight?.key===key)return draftFlight.promise;
  draftController?.abort();const controller=new AbortController();draftController=controller;
  const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
  const desired=ordered(),flight={key,promise:null};
  flight.promise=data.fetchRecords(desired.slice(0,20).map(record=>record.id),{signal:controller.signal}).then(batch=>{
   const result={key,desired,batch};if(!controller.signal.aborted&&draftKey()===key)draftCache=result;return result;
  }).finally(()=>{signal.removeEventListener('abort',abort);if(draftFlight===flight)draftFlight=null;});draftFlight=flight;return flight.promise;
 }
 function primeSelection(){
  cancelDraft();updateFilterOptions();
  if(filterReady)draftTimer=setTimeout(()=>{fetchDraft().catch(()=>{});},150);
 }
 function hasSelection(){return selection.sort!=='recommended'||selection.rating.length>0||selection.platform.length>0||selection.treatment.length>0||selection.experience.length>0;}
 function updateFilterReset(){
  if(!filterReset)return;
  // Only changed filter values enable Reset; opening headings is not a change.
  // A failed metadata load retains the existing retry action.
  const disabled=selectionBusy||(!hasSelection()&&!filterLoadFailed);
  filterReset.disabled=disabled;filterReset.setAttribute('aria-disabled',String(disabled));
  filterReset.tabIndex=disabled?-1:0;filterReset.classList.toggle('is-disabled',disabled);
 }
 $('[data-tdb-reviews-average]').textContent=data.average.toFixed(2);$('[data-tdb-reviews-total]').textContent=data.total+' reviews';const length=()=>indexMode?matched.length:data.hasMore?data.total:records.length;updateTotal(length(),phase!=='closed');
 function slide(record,index){
  if(slideCache.has(record.id))return slideCache.get(record.id);
  const node=template.cloneNode(true);node.removeAttribute('data-tdb-review-template');node.dataset.tdbReviewId=record.id;node.setAttribute('aria-label',`Review ${index+1} of ${length()}`);
  const field=k=>node.querySelector(`[data-review-render="${k}"]`);
  field('name').textContent=record.name;field('text').textContent=record.text;field('excerpt').textContent=record.excerpts[context]||record.excerpt||'';field('excerpt').style.opacity='0';
  field('date').textContent=record.displayDate;
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
  updateTotal(length(),phase!=='closed');
  [...track.children].forEach((node,i)=>node.setAttribute('aria-label',`Review ${i+1} of ${length()}`));
  swiper?.update();reflectedIndex=-1;reflect();
 }
 function primeMore(){
  if(indexMode){primeFilteredMore();return;}
  if(destroyed||filterOpen||moreFlight||filterFlight||hasSelection()||!data.hasMore||!swiper||records.length-swiper.activeIndex>7)return;
  moreFlight=data.loadMore({signal}).catch(error=>{if(!signal.aborted)root.dispatchEvent(new CustomEvent('tdb:review-error',{bubbles:true,detail:{error}}));}).finally(()=>{moreFlight=null;});
 }
 const originalEasing=track.style.transitionTimingFunction;track.style.transitionTimingFunction=motion.reviews.easing;
 const fadeTime=()=>reduced.matches?0:motion.reviews.fade;
 function hideQuote(){clearTimeout(revealTimer);revealTimer=0;if(shownQuote)fades.to(shownQuote,0,fadeTime());shownQuote=null;}
 function begin(){
  if(!swiper||destroyed||phase==='closed'||phase==='opening')return;
  captureReadingAnchor();
  hideQuote();phase='moving';
  if(readingScroll()?.scrollTop>0)fades.to(mark,0,fadeTime());
 }
 function reflect(){if(!swiper||destroyed||reflectedIndex===swiper.activeIndex)return;const index=swiper.activeIndex;reflectedIndex=index;
  ticker.update(String(filterOpen?1:index+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1);position.setAttribute('aria-label',`Review ${index+1} of ${length()}`);
  for(const [node,disabled] of [[previous,filterOpen||index===0],[next,filterOpen||index===records.length-1&&!canLoadMore()]]){node.classList.toggle('is-disabled',disabled);node.setAttribute('aria-disabled',String(disabled));}
  if(phase!=='closed')primeMore();
 }
 function reveal(delay){
  if(!swiper||destroyed||phase==='closed')return;
  applyReadingAnchor();reading.clear();
  const active=swiper.slides[swiper.activeIndex];
  if(phase==='settled'&&settledSlide===active&&(revealTimer||shownQuote))return;
  clearTimeout(revealTimer);reflect();
  if(settledSlide!==active&&markScrollTop>(readingScroll()?.scrollTop||0))fades.to(mark,0,0);
  syncMarkScroll();
  for(const item of swiper.slides)if(item!==active)item.querySelector('[data-tdb-review-scroll]').scrollTop=0;
  settledSlide=active;phase='settled';
  const show=()=>{revealTimer=0;if(destroyed||phase!=='settled'||swiper.slides[swiper.activeIndex]!==active)return;shownQuote=active.querySelector('[data-review-render="excerpt"]');fades.to(shownQuote,1,fadeTime());fades.to(mark,1,fadeTime());};
  const pause=reduced.matches?0:delay??(swiper.swipeDirection==='prev'?motion.reviews.previousDelay:motion.reviews.nextDelay);
  if(pause)revealTimer=setTimeout(show,pause);else show();
 }
 function createSwiper(index=0){
  swiper=window.TDBSwiper.create(viewport,{init:false,direction:'horizontal',wrapperClass:'tdb-review-drawer_track',slideClass:'tdb-review-drawer_slide',slidesPerView:1,autoHeight:landscape,initialSlide:index,loop:false,preventInteractionOnTransition:false,observer:false,speed:reduced.matches?0:motion.duration(innerWidth),touchStartPreventDefault:false,threshold:10,keyboard:{enabled:false},watchOverflow:true,on:{slideChange(){queueMicrotask(reflect);},sliderFirstMove:begin,beforeTransitionStart:captureReadingAnchor,transitionStart(){begin();applyReadingAnchor();},transitionEnd(){appendRecords();if(phase==='moving')reveal();},touchEnd(){requestAnimationFrame(()=>{if(!destroyed&&phase==='moving'&&!swiper.animating)reveal(motion.reviews.cardDelay);});}}});
  window.TDBCarouselVisibility.bind(swiper,{activeOnly:true});reading.bind();
  swiper.init();
 }
 function build(id){
  reading.clear();
  appendRecords();
  const index=Math.max(0,records.findIndex(r=>r.id===id));
  phase='opening';hideQuote();settledSlide=null;fades.to(mark,1,0);
  if(swiper)swiper.slideTo(index,0);else createSwiper(index);
  readingScroll().scrollTop=0;reveal(motion.reviews.openDelay);
 }
 function navigate(direction){if(filterOpen||!swiper||direction<0&&swiper.isBeginning)return;if(direction>0&&swiper.isEnd){if(canLoadMore()){primeMore();const current=swiper.activeIndex;moreFlight?.then(()=>{if(!destroyed&&phase!=='closed'&&swiper.activeIndex===current&&!swiper.isEnd)navigate(1);});}return;}swiper.swipeDirection=direction<0?'prev':'next';begin();direction<0?swiper.slidePrev():swiper.slideNext();if(!swiper.animating&&phase==='moving')reveal();}
 function action(node,fn){const handle=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();if(node.getAttribute('aria-disabled')!=='true')fn();};node.addEventListener('click',handle,{signal});node.addEventListener('keydown',handle,{signal});}
 window.TDBCarouselControls.bind({root,previous,next,navigate,signal,enabled:()=>!filterOpen&&phase!=='closed'&&drawer.state!=='closing'});

 // Review adapter: CMS selection and result rendering; shared filters own interaction/motion.
 function matching(state=selection){
  return (data.indexReady?data.filterIndex:data.records).filter(record=>(!state.rating.length||state.rating.some(rating=>rating==='unrated'?!record.rating:record.rating===Number(rating)))&&
   (!state.platform.length||state.platform.includes(record.platform))&&state.treatment.every(topic=>record.topics.some(value=>canonical(value)===topic))&&
   state.experience.every(topic=>record.topics.some(value=>canonical(value)===topic)));
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
   const key=option.dataset.tdbFilterGroup,value=option.dataset.tdbFilterValue,selected=chosen(key,value);
   // Ratings and platforms each form a union. Test a single option against
   // other categories so existing selections cannot enable empty alternatives.
   const possible=(key==='rating'||key==='platform')&&value?{...selection,[key]:[value]}:candidate(key,value);
   const unavailable=!filterReady||(key!=='sort'&&!selected&&!matching(possible).length);
   option.disabled=unavailable||selectionBusy;option.tabIndex=option.disabled?-1:0;option.setAttribute('aria-disabled',String(option.disabled));option.setAttribute(multi(key)?'aria-checked':'aria-pressed',String(selected));
   if(multi(key)){option.setAttribute('role','checkbox');option.removeAttribute('aria-pressed');}
   for(const mark of option.querySelectorAll('.tdb-review-filter_mark,.tdb-review-filter_tick'))mark.classList.toggle('is-checked',selected);
   option.classList.toggle('is-selected',selected);option.classList.toggle('is-unavailable',unavailable);
  }
  for(const disclosure of disclosures){
   const key=disclosure.key,seen=new Set(),labels=filterOptions.filter(option=>option.dataset.tdbFilterGroup===key&&chosen(key,option.dataset.tdbFilterValue)).filter(option=>{const value=canonical(option.dataset.tdbFilterValue);if(seen.has(value))return false;seen.add(value);return true;}).map(option=>option.textContent.trim());
   disclosure.summary.textContent=labels.length>1?labels.length+' selected':labels.join(' + ');disclosure.summary.title=labels.join(', ');
  }
  const count=matching().length;
  // Count selected filters, not matching reviews or the sort order.
  const selectedCount=selection.rating.length+selection.platform.length+selection.treatment.length+selection.experience.length;
  filter?.setCount(selectedCount);syncFloatingFilterCount();
  filterStatus.classList.toggle('is-error',!!message);
  if(filterOpen&&filterReady){updateTotal(count);ticker.update(count?'01':'00',-1);position.setAttribute('aria-label','Preview: '+count+' matching reviews');}
  filterStatus.textContent=message||(selectionBusy?'Loading matching reviews…':filterReady?(hasSelection()?count+' matching '+(count===1?'review':'reviews'):'All reviews'):'Preparing review filters…');
  updateFilterApply(count);
  updateFilterReset();
 }
 function renderSelection(chosen){
  if(!chosen.length)return;
  reading.clear();
  const wasOpen=phase!=='closed';hideQuote();
  swiper?.destroy(true,true);swiper=null;records.splice(0,records.length,...chosen);knownCount=data.records.length;pendingAppend=false;
  track.replaceChildren(...records.map(slide));
  [...track.children].forEach((node,i)=>{node.setAttribute('aria-label',`Review ${i+1} of ${length()}`);node.querySelector('[data-tdb-review-scroll]').scrollTop=0;node.querySelector('[data-review-render="excerpt"]').style.opacity='0';});
  updateTotal(length(),phase!=='closed');reflectedIndex=-1;settledSlide=null;
  phase=wasOpen?'opening':'closed';createSwiper();swiper.allowTouchMove=!filterOpen;reflect();
  if(landscape)readingPane.scrollTop=0;
  if(wasOpen)reveal(0);updateFilterOptions();
 }

 function commitFilterSelection(){
  if(!filterOpen||selectionBusy||destroyed)return false;
  // Unchanged filters keep the current review position.
  if(draftKey()===JSON.stringify(appliedSelection))return true;
  return filterReady?replaceSelection():false;
 }
 async function replaceSelection(){
  if(selectionBusy)return false;
  const revision=++applyRevision;selectionBusy=true;updateFilterOptions();
  try{
   const {desired,batch}=await fetchDraft();
   if(destroyed||revision!==applyRevision||!filterOpen)return false;
   queryController?.abort();queryController=new AbortController();queryRevision++;pendingBatch=null;moreFlight=null;
   indexMode=true;matched=desired;appliedSelection=copySelection(selection);
   renderSelection(batch);
   if(!await restoreFilterClose(revision))return false;
   selectionBusy=false;clearFilterFeedback();updateFilterOptions();return true;
  }catch(error){if(!destroyed&&revision===applyRevision&&filterOpen){selectionBusy=false;clearFilterFeedback();updateFilterOptions('Could not load these reviews. Tap View reviews to retry.');}return false;}
 }
 function appendBatch(batch){
  if(destroyed||!indexMode)return;
  const offset=records.length;records.push(...batch);track.append(...batch.map((record,i)=>slide(record,offset+i)));
  [...track.children].forEach((node,i)=>node.setAttribute('aria-label',`Review ${i+1} of ${length()}`));
  swiper?.update();reflectedIndex=-1;reflect();
 }
 function primeFilteredMore(){
  if(destroyed||filterOpen||selectionBusy||moreFlight||pendingBatch||!swiper||!canLoadMore()||records.length-swiper.activeIndex>7)return;
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
  filterLoadFailed=false;updateFilterOptions();filterPanel.setAttribute('aria-busy','true');
  // Runs on drawer-open/filter intent, not during initial page loading. Shares the
  // existing CMS metadata index; review bodies are fetched only for result batches.
  filterFlight=(async()=>{try{
   await data.loadIndex({signal});if(destroyed)return;filterReady=!!data.indexReady;updateFilterOptions();
  }catch(error){if(!signal.aborted){filterLoadFailed=true;updateFilterOptions('Filters could not load. Tap Reset to retry.');}}
  finally{filterFlight=null;filterPanel?.setAttribute('aria-busy','false');}})();
  return filterFlight;
 }
 function reflectFilterState(open,immediate=false){
  if(!open){cancelDraft();updateTotal(length(),phase!=='closed');}filterOpen=open;
  placeFilterClose(immediate);
  if(swiper){swiper.allowTouchMove=!open;reflectedIndex=-1;reflect();}
  if(open)prepareFilters();else updateFilterOptions();
 }
 if(filterPanel){
  filter=window.TDBFilters.mount(filterPanel,{
   toggle:filterButton,backdrop:filterBackdrop,heading:filterPanel.querySelector('[data-tdb-filter-heading]'),badge:filterBadge,
   escapeRoot:drawerRoot,blockedControls:[mainClose],inertTargets:[viewport,readingFooter],insideTargets:[floatingFilterButton].filter(Boolean),disclosures,
   labels:{open:'Filter and sort reviews',close:'Close review filters'},
   onIntent:prepareFilters,beforeClose:commitFilterSelection,onChange:reflectFilterState,onDisclosureChange:updateFilterReset,
   onError:()=>updateFilterOptions('Could not load these reviews. Tap View reviews to retry.')
  });
  filterOptions.forEach(option=>action(option,()=>{if(option.disabled||!filterReady)return;selection=candidate(option.dataset.tdbFilterGroup,option.dataset.tdbFilterValue);primeSelection();}));
  action(filterReset,()=>{if(selectionBusy)return;selection={sort:'recommended',rating:[],platform:[],treatment:[],experience:[]};filter.collapseAll();if(filterReady)primeSelection();else prepareFilters();});
  action(filterApply,()=>{if(!filterApply.disabled)filter.requestClose('apply');});
  updateFilterOptions();
 }
 let preferred='';const drawer=window.TDBDrawer.mount(root.closest('[data-tdb-drawer]'),{hideChrome:true,onOpen(){build(preferred);clearTimeout(filterPrimeTimer);filterPrimeTimer=setTimeout(prepareFilters,250);},onClose(){reading.clear();clearTimeout(filterPrimeTimer);filter?.reset(true);placeFilterClose(true);hideQuote();phase='closed';if(readingScroll()?.scrollTop>0)fades.to(mark,0,fadeTime());ticker.settle();totalTicker.settle();filterApplyTicker?.settle();}});
 setReadingMode();
 // Native Webflow visibility keeps the closed drawer measurable without showing it.
 if(viewport.clientWidth)createSwiper();
 reduced.addEventListener('change',()=>{if(reduced.matches)placeFilterClose(true);if(swiper){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches&&phase!=='closed'){hideQuote();phase='moving';swiper.slideTo(swiper.activeIndex,0);ticker.settle();reveal(0);}}},{signal});
 const api=Object.freeze({async open(trigger,id){
  preferred=id||'';
  // A named CMS quote opens in its editorial context, never an old filter result.
  if(preferred&&(indexMode||selectionBusy)){
   queryController?.abort();queryRevision++;selectionBusy=false;pendingBatch=null;moreFlight=null;
   cancelDraft();selection={sort:'recommended',rating:[],platform:[],treatment:[],experience:[]};appliedSelection=copySelection(selection);indexMode=false;matched=[];
   renderSelection(data.records.slice());
  }
  return drawer.open(trigger);
 },close(){return drawer.close();},destroy(){if(destroyed)return;destroyed=true;applyFitResize.disconnect();restoreApplyFit();cancelDraft();queryController?.abort();clearTimeout(filterPrimeTimer);filter?.destroy();unsubscribe?.();drawer.destroy();reading.destroy();filterOpen=false;placeFilterClose(true);floatingFilterIcon?.destroy();ctrl.abort();clearTimeout(revealTimer);fades.destroy();mark.style.translate=originalMarkTranslate;swiper?.destroy(true,true);track.style.transitionTimingFunction=originalEasing;ticker.destroy();totalTicker.destroy();filterApplyTicker?.destroy();track.replaceChildren();slideCache.clear();instances.delete(root);}});instances.set(root,api);return api;
}
window.TDBReviews=Object.freeze({version:'3.14.0',mount});
window.TDBSwiper?.register('review-drawer',window.TDBReviews);
})();


