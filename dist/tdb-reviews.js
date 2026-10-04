/* TDB native reviews v3.8.0. Native Webflow layout; original quote choreography. */
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
 const closeInitial={inert:mainClose.inert,tabindex:mainClose.getAttribute('tabindex'),disabled:mainClose.getAttribute('aria-disabled')};
 function blockMainClose(block){
  mainClose.classList.toggle('is-filter-blocked',block);mainClose.inert=block||closeInitial.inert;
  for(const [key,value] of [['tabindex',block?'-1':closeInitial.tabindex],['aria-disabled',block?'true':closeInitial.disabled]]){if(value===null)mainClose.removeAttribute(key);else mainClose.setAttribute(key,value);}
 }
 const filter=motion.filterToggle(filterButton,{onChange:setFilterOpen});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),context=cms.contextForPath(location.pathname);
 const records=data.records.slice(),slideCache=new Map();let knownCount=records.length;
 const position=$('[data-tdb-reviews-position]'),previous=$('[data-tdb-reviews-prev]'),next=$('[data-tdb-reviews-next]');
 const totalNode=$('[data-tdb-reviews-length]'),totalTicker=window.TDBNativeTicker.mount(totalNode);let shownTotal=Number(totalNode.textContent)||0;
 const ticker=window.TDBNativeTicker.mount(position),fades=motion.fadeController();let swiper=null,moreFlight=null,pendingAppend=false,destroyed=false,phase='closed',revealTimer=0,shownQuote=null,settledSlide=null,reflectedIndex=-1;

 let selection={sort:'recommended',rating:'',platform:'',treatment:[],experience:[]};
 let filterOpen=false,filterAnimation=null,backdropAnimation=null,filterRevision=0,filterFlight=null,filterReady=!!data.indexReady,filterPrimeTimer=0;
 let indexMode=false,matched=[],queryController=null,queryRevision=0,selectionBusy=false,pendingBatch=null;
 const canLoadMore=()=>indexMode?records.length<matched.length:data.hasMore;
 const filterOptions=filterPanel?[...filterPanel.querySelectorAll('[data-tdb-filter-group]')]:[];
 const filterStatus=filterPanel?.querySelector('[data-tdb-filter-status]'),filterApply=filterPanel?.querySelector('[data-tdb-filter-apply]');
 const canonical=topic=>cms.canonicalTopic(topic),multi=key=>key==='treatment'||key==='experience';
 const chosen=(key,value)=>multi(key)?value?selection[key].includes(canonical(value)):!selection[key].length:selection[key]===value;
 function candidate(key,value){
  if(!multi(key))return {...selection,[key]:value};
  value=canonical(value);const current=selection[key];
  return {...selection,[key]:!value?[]:current.includes(value)?current.filter(item=>item!==value):[...current,value]};
 }
 const copySelection=state=>({...state,treatment:[...state.treatment],experience:[...state.experience]});
 let appliedSelection=copySelection(selection),draftController=null,draftFlight=null,draftCache=null,draftTimer=0,applyRevision=0;
 const disclosures=[];
 function updateTotal(count,animate=true){totalTicker.update(String(count).padStart(2,'0'),count<shownTotal?-1:1,animate);shownTotal=count;totalNode.setAttribute('aria-label',count+' reviews');}
 function cancelDraft(){clearTimeout(draftTimer);draftController?.abort();draftController=null;draftFlight=null;draftCache=null;applyRevision++;selectionBusy=false;}
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
 function hasSelection(){return selection.sort!=='recommended'||!!selection.rating||!!selection.platform||selection.treatment.length>0||selection.experience.length>0;}
 $('[data-tdb-reviews-average]').textContent=data.average.toFixed(2);$('[data-tdb-reviews-total]').textContent=data.total+' reviews';const length=()=>indexMode?matched.length:data.hasMore?data.total:records.length;updateTotal(length(),phase!=='closed');
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
  hideQuote();phase='moving';
  const scroll=mark.closest('[data-tdb-review-scroll]');
  if(scroll?.scrollTop>0){fades.to(mark,0,fadeTime());return;}
  mark.classList.add('is-stationary');staticLayer.append(mark);
 }
 function reflect(){if(!swiper||destroyed||reflectedIndex===swiper.activeIndex)return;const index=swiper.activeIndex;reflectedIndex=index;
  for(const [i,item] of [...swiper.slides].entries()){const inactive=i!==index;if(item.inert!==inactive)item.inert=inactive;if(item.getAttribute('aria-hidden')!==String(inactive))item.setAttribute('aria-hidden',String(inactive));}
  ticker.update(String(filterOpen?1:index+1).padStart(2,'0'),swiper.swipeDirection==='prev'?-1:1);position.setAttribute('aria-label',`Review ${index+1} of ${length()}`);
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
   (!state.platform||record.platform===state.platform)&&state.treatment.every(topic=>record.topics.some(value=>canonical(value)===topic))&&
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
   const unavailable=!filterReady||(key!=='sort'&&!selected&&!matching(candidate(key,value)).length);
   option.disabled=unavailable||selectionBusy;option.tabIndex=option.disabled?-1:0;option.setAttribute('aria-disabled',String(option.disabled));option.setAttribute(multi(key)?'aria-checked':'aria-pressed',String(selected));
   if(multi(key)){option.setAttribute('role','checkbox');option.removeAttribute('aria-pressed');}
   for(const mark of option.querySelectorAll('.tdb-review-filter_mark,.tdb-review-filter_tick'))mark.classList.toggle('is-checked',selected);
   option.classList.toggle('is-selected',selected);option.classList.toggle('is-unavailable',unavailable);
  }
  for(const disclosure of disclosures){
   const key=disclosure.key,seen=new Set(),labels=filterOptions.filter(option=>option.dataset.tdbFilterGroup===key&&chosen(key,option.dataset.tdbFilterValue)).filter(option=>{const value=canonical(option.dataset.tdbFilterValue);if(seen.has(value))return false;seen.add(value);return true;}).map(option=>option.textContent.trim());
   disclosure.summary.textContent=labels.length>2?labels.length+' selected':labels.join(' + ');disclosure.summary.title=labels.join(', ');
  }
  const count=matching().length;
  // Count selected filters, not matching reviews or the sort order.
  const selectedCount=Number(!!selection.rating)+Number(!!selection.platform)+selection.treatment.length+selection.experience.length;
  if(filterBadge){filterBadge.textContent=String(selectedCount);filterBadge.classList.toggle('is-empty',!selectedCount);}
  filterButton.setAttribute('aria-label',(filterOpen?'Close review filters':'Filter and sort reviews')+(selectedCount?', '+selectedCount+' selected':''));
  filterStatus.classList.toggle('is-error',!!message);
  if(filterOpen&&filterReady){updateTotal(count);ticker.update(count?'01':'00',-1);position.setAttribute('aria-label','Preview: '+count+' matching reviews');}
  filterStatus.textContent=message||(selectionBusy?'Loading matching reviews…':filterReady?(hasSelection()?count+' matching '+(count===1?'review':'reviews'):'All reviews'):'Preparing review filters…');
  filterApply.textContent=filterReady?'View '+count+' '+(count===1?'review':'reviews'):'View reviews';filterApply.disabled=selectionBusy||!filterReady||!count;filterApply.setAttribute('aria-disabled',String(filterApply.disabled));
 }
 function renderSelection(chosen){
  if(!chosen.length)return;
  const wasOpen=phase!=='closed';hideQuote();staticLayer.append(mark);mark.classList.add('is-stationary');
  swiper?.destroy(true,true);swiper=null;records.splice(0,records.length,...chosen);knownCount=data.records.length;pendingAppend=false;
  track.replaceChildren(...records.map(slide));
  [...track.children].forEach((node,i)=>{node.setAttribute('aria-label',`Review ${i+1} of ${length()}`);node.querySelector('[data-tdb-review-scroll]').scrollTop=0;node.querySelector('[data-review-render="excerpt"]').style.opacity='0';});
  updateTotal(length(),phase!=='closed');reflectedIndex=-1;settledSlide=null;
  phase=wasOpen?'opening':'closed';createSwiper();swiper.allowTouchMove=!filterOpen;reflect();
  if(wasOpen)reveal(0);updateFilterOptions();
 }

 function requestFilterClose(){
  if(!filterOpen||selectionBusy)return;
  // Reopening and closing unchanged filters must keep the current review position.
  if(draftKey()===JSON.stringify(appliedSelection)){filter.set(false);return;}
  if(filterReady)replaceSelection();
 }
 async function replaceSelection(){
  if(selectionBusy)return;
  const revision=++applyRevision;selectionBusy=true;updateFilterOptions();
  try{
   const {desired,batch}=await fetchDraft();
   if(destroyed||revision!==applyRevision||!filterOpen)return;
   queryController?.abort();queryController=new AbortController();queryRevision++;pendingBatch=null;moreFlight=null;
   indexMode=true;matched=desired;appliedSelection=copySelection(selection);selectionBusy=false;
   renderSelection(batch);filter.set(false);
  }catch(error){if(!destroyed&&revision===applyRevision&&filterOpen){selectionBusy=false;updateFilterOptions('Could not load these reviews. Tap View reviews to retry.');}}
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
  if(!filterPanel)return;if(!open){cancelDraft();updateTotal(length(),phase!=='closed');}filterOpen=open;const revision=++filterRevision;
  filterButton.classList.toggle('is-filter-open',open);blockMainClose(open);
  const from=filterAnimation?getComputedStyle(filterPanel).transform:open?'translateY(100%)':'translateY(0)';
  const backdropFrom=backdropAnimation?getComputedStyle(filterBackdrop).opacity:open?0:1;backdropAnimation?.cancel();backdropAnimation=null;
  filterAnimation?.cancel();filterAnimation=null;
  filterButton.setAttribute('aria-expanded',String(open));filterButton.setAttribute('aria-label',open?'Close review filters':'Filter and sort reviews');
  filterPanel.setAttribute('aria-hidden',String(!open));filterPanel.inert=!open;viewport.inert=open;
  if(swiper){swiper.allowTouchMove=!open;reflectedIndex=-1;reflect();}
  if(open){filterBackdrop?.classList.remove('is-closed');filterPanel.classList.remove('is-closed');prepareFilters();filterPanel.querySelector('[data-tdb-filter-heading]').focus({preventScroll:true});}
  else{updateFilterOptions();if(filterPanel.contains(document.activeElement))filterButton.focus({preventScroll:true});}
  const finish=()=>{if(revision!==filterRevision)return;if(!open){filterPanel.classList.add('is-closed');filterBackdrop?.classList.add('is-closed');}filterAnimation?.cancel();filterAnimation=null;backdropAnimation?.cancel();backdropAnimation=null;};
  const duration=immediate||reduced.matches?0:motion.duration(innerWidth);
  if(!duration){finish();return;}
  const animation=filterPanel.animate([{transform:from},{transform:open?'translateY(0)':'translateY(100%)'}],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
  if(filterBackdrop){backdropAnimation=filterBackdrop.animate([{opacity:backdropFrom},{opacity:open?1:0}],{duration:Math.min(duration,300),fill:'both'});backdropAnimation.finished.catch(()=>{});}
  filterAnimation=animation;animation.finished.then(finish).catch(()=>{});
 }
 if(filterPanel){
  // Match Smile Gallery: consume the entire outside pointer gesture, including
  // its later click after the panel has closed. Nothing underneath can activate.
  let outsidePointer=null,swallowClick=false;
  const outside=target=>!filterPanel.contains(target)&&!filterButton.contains(target);
  const consume=event=>{event.preventDefault();event.stopImmediatePropagation();};
  window.addEventListener('pointerdown',event=>{
   outsidePointer=null;swallowClick=false;
   if((filterOpen||filterAnimation)&&outside(event.target)){outsidePointer=event.pointerId;swallowClick=true;consume(event);requestFilterClose();}
  },{signal,capture:true,passive:false});
  window.addEventListener('pointerup',event=>{if(swallowClick&&event.pointerId===outsidePointer)consume(event);},{signal,capture:true,passive:false});
  window.addEventListener('pointercancel',event=>{if(event.pointerId===outsidePointer){outsidePointer=null;swallowClick=false;}},{signal,capture:true});
  const outsideClick=event=>{
   if(swallowClick||(filterOpen||filterAnimation)&&outside(event.target)){swallowClick=false;outsidePointer=null;consume(event);requestFilterClose();}
  };
  window.addEventListener('click',outsideClick,{signal,capture:true});
  window.addEventListener('auxclick',outsideClick,{signal,capture:true});
  // Closing uses the same apply path as View reviews, before the shared visual
  // toggle can flip the icon. A failed request leaves choices intact for retry.
  for(const type of ['click','keydown'])filterButton.addEventListener(type,event=>{
   if(!filterOpen||type==='keydown'&&!['Enter',' '].includes(event.key))return;
   consume(event);requestFilterClose();
  },{signal,capture:true});
  filterPanel.id='tdb-review-filters-'+Math.random().toString(36).slice(2,9);filterPanel.inert=true;
  filterButton.setAttribute('aria-controls',filterPanel.id);filterButton.setAttribute('aria-expanded','false');filterButton.setAttribute('aria-label','Filter and sort reviews');
  for(const event of ['pointerenter','focus','pointerdown'])filterButton.addEventListener(event,prepareFilters,{signal,passive:true});
  for(const button of filterPanel.querySelectorAll('[data-tdb-filter-disclosure]')){
   const key=button.dataset.tdbFilterDisclosure,body=button.parentElement.querySelector('.tdb-review-filter_options'),summary=button.querySelector('[data-tdb-filter-selection]'),chevron=button.querySelector('[data-tdb-filter-chevron]');
   if(!body||!summary)continue;
   body.id=filterPanel.id+'-'+key;button.setAttribute('aria-controls',body.id);body.inert=true;
   const group=button.parentElement;
   const entry={key,summary,open:false,animations:[],set(open,immediate=false){
    const running=entry.animations.some(animation=>animation.effect?.target===body),fromOpacity=running?getComputedStyle(body).opacity:0,fromTransform=running?getComputedStyle(body).transform:'translateY(-20px)';
    const fromSpace=getComputedStyle(group).paddingBottom,fromTurn=chevron?getComputedStyle(chevron).transform:'none';
    entry.animations.forEach(animation=>animation.cancel());entry.animations=[];entry.open=open;
    button.setAttribute('aria-expanded',String(open));body.setAttribute('aria-hidden',String(!open));body.inert=!open;
    body.classList.toggle('is-collapsed',!open);group.classList.toggle('is-expanded',open);
    if(chevron)chevron.style.transform='rotate('+(open?180:0)+'deg)';
    if(immediate||reduced.matches)return;
    const run=(node,frames,duration,easing)=>{
     const animation=node.animate(frames,{duration,easing,fill:'both'});entry.animations.push(animation);
     animation.finished.then(()=>{animation.cancel();const index=entry.animations.indexOf(animation);if(index!==-1)entry.animations.splice(index,1);}).catch(()=>{});
    };
    // Match native FAQ/Price DD: auto-height immediately; independent fade,
    // outQuart movement and spacer. Do not stretch or tween the option rows.
    const outQuart='cubic-bezier(.165,.84,.44,1)';
    run(group,[{paddingBottom:fromSpace},{paddingBottom:open?'20px':'0px'}],300,outQuart);
    if(open){run(body,[{opacity:fromOpacity},{opacity:1}],300,'linear');run(body,[{transform:fromTransform},{transform:'translateY(0)'}],400,outQuart);}
    if(chevron)run(chevron,[{transform:fromTurn},{transform:chevron.style.transform}],400,'ease');
   },destroy(){entry.animations.forEach(animation=>animation.cancel());entry.animations=[];body.classList.add('is-collapsed');group.classList.remove('is-expanded');body.inert=true;body.setAttribute('aria-hidden','true');button.setAttribute('aria-expanded','false');if(chevron)chevron.style.removeProperty('transform');}};
   disclosures.push(entry);action(button,()=>{const open=!entry.open;for(const other of disclosures)if(other!==entry&&other.open)other.set(false);entry.set(open);});
  }
  filterOptions.forEach(option=>action(option,()=>{if(option.disabled||!filterReady)return;selection=candidate(option.dataset.tdbFilterGroup,option.dataset.tdbFilterValue);primeSelection();}));
  action(filterPanel.querySelector('[data-tdb-filter-reset]'),()=>{if(selectionBusy)return;selection={sort:'recommended',rating:'',platform:'',treatment:[],experience:[]};if(filterReady)primeSelection();else prepareFilters();});
  action(filterApply,()=>{if(!filterApply.disabled)requestFilterClose();});
  drawerRoot.addEventListener('keydown',event=>{if(filterOpen&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();requestFilterClose();}},{signal,capture:true});
  reduced.addEventListener('change',()=>{if(filterAnimation)setFilterOpen(filterOpen,true);for(const entry of disclosures)entry.set(entry.open,true);},{signal});
  updateFilterOptions();
 }
 let preferred='';const drawer=window.TDBDrawer.mount(root.closest('[data-tdb-drawer]'),{onOpen(){build(preferred);clearTimeout(filterPrimeTimer);filterPrimeTimer=setTimeout(prepareFilters,250);},onClose(){clearTimeout(filterPrimeTimer);filter.reset(true);hideQuote();phase='closed';if(mark.closest('[data-tdb-review-scroll]')?.scrollTop>0)fades.to(mark,0,fadeTime());ticker.settle();totalTicker.settle();}});
 // Native Webflow visibility keeps the closed drawer measurable without showing it.
 if(viewport.clientWidth)createSwiper();
 const resize=new ResizeObserver(()=>{if(swiper&&!swiper.animating){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);swiper.update();}});resize.observe(viewport);
 reduced.addEventListener('change',()=>{if(swiper){swiper.params.speed=reduced.matches?0:motion.duration(innerWidth);if(reduced.matches&&phase!=='closed'){hideQuote();phase='moving';swiper.slideTo(swiper.activeIndex,0);ticker.settle();reveal(0);}}},{signal});
 const api=Object.freeze({async open(trigger,id){
  preferred=id||'';
  // A named CMS quote opens in its editorial context, never an old filter result.
  if(preferred&&(indexMode||selectionBusy)){
   queryController?.abort();queryRevision++;selectionBusy=false;pendingBatch=null;moreFlight=null;
   cancelDraft();selection={sort:'recommended',rating:'',platform:'',treatment:[],experience:[]};appliedSelection=copySelection(selection);indexMode=false;matched=[];
   renderSelection(data.records.slice());
  }
  return drawer.open(trigger);
 },close(){return drawer.close();},destroy(){if(destroyed)return;destroyed=true;cancelDraft();disclosures.forEach(entry=>entry.destroy());queryController?.abort();clearTimeout(filterPrimeTimer);filterAnimation?.cancel();backdropAnimation?.cancel();filterBackdrop?.classList.add('is-closed');filterPanel?.classList.add('is-closed');filterPanel?.setAttribute('aria-hidden','true');if(filterPanel)filterPanel.inert=true;viewport.inert=false;blockMainClose(false);filterButton?.classList.remove('is-filter-open');filterBadge?.classList.add('is-empty');filter.destroy();unsubscribe?.();drawer.destroy();ctrl.abort();resize.disconnect();clearTimeout(revealTimer);fades.destroy();staticLayer.append(mark);mark.classList.add('is-stationary');swiper?.destroy(true,true);track.style.transitionTimingFunction=originalEasing;ticker.destroy();totalTicker.destroy();track.replaceChildren();slideCache.clear();instances.delete(root);}});instances.set(root,api);return api;
}
window.TDBReviews=Object.freeze({version:'3.8.0',mount});
})();

