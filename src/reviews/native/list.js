/* TDB review archive v1.0.0. Native CMS cards; shared selection, filters and motion. */
(() => {
'use strict'; if(window.TDBReviewList)return;
const instances=new WeakMap();
function mount(root){
 if(instances.has(root))return instances.get(root);
 const cms=window.TDBReviewCMS,ctrl=new AbortController(),{signal}=ctrl;
 const feed=root.querySelector('[data-tdb-review-cms]'),grid=feed.querySelector('.review-page_grid');
 const data=cms.fromDocument(document,location.href),template=grid.firstElementChild.cloneNode(true);
 const cache=new Map(),status=root.querySelector('[data-tdb-list-status]'),pagination=feed.querySelector('.w-pagination-wrapper');
 const previous=pagination.querySelector('.w-pagination-previous');
 let next=pagination.querySelector('.w-pagination-next');
 if(!next){next=document.createElement('a');next.className='button w-pagination-next';next.href='/reviews';next.textContent='Load more reviews';pagination.append(next);}
 const nextText=next?.querySelector('div')||next,baseNextText='Load more reviews';
 const panel=document.querySelector('[data-tdb-review-filter-panel]'),toggle=root.querySelector('[data-tdb-filter-toggle]'),backdrop=document.querySelector('[data-tdb-filter-backdrop]');
 const options=[...panel.querySelectorAll('[data-tdb-filter-group]')],apply=panel.querySelector('[data-tdb-filter-apply]'),reset=panel.querySelector('[data-tdb-filter-reset]');
 const applyCount=apply.querySelector('[data-tdb-filter-apply-count]'),countTicker=window.TDBNativeTicker.mount(applyCount);
 const disclosures=[...panel.querySelectorAll('[data-tdb-filter-disclosure]')].map(button=>({key:button.dataset.tdbFilterDisclosure,button,body:button.parentElement.querySelector('.tdb-review-filter_options'),summary:button.querySelector('[data-tdb-filter-selection]'),chevron:button.querySelector('[data-tdb-filter-chevron]')}));
 const defaults=()=>({sort:'recommended',rating:[],platform:[],treatment:[],experience:[]});
 let selection=defaults(),applied=defaults(),filtered=false,matched=[],shown=[],busy=false,destroyed=false,revision=0,raf=0,filter=null,lastCount=data.total,indexFlight=null,prefetch=null;
 const copy=s=>({...s,rating:[...s.rating],platform:[...s.platform],treatment:[...s.treatment],experience:[...s.experience]});
 const normal=(key,value)=>['treatment','experience'].includes(key)?cms.canonicalTopic(value):value;
 const chosen=(key,value)=>key==='sort'?selection.sort===value:!value?!selection[key].length:selection[key].includes(normal(key,value));
 function candidate(key,value){if(key==='sort')return {...selection,sort:value};value=normal(key,value);return {...selection,[key]:!value?[]:selection[key].includes(value)?selection[key].filter(x=>x!==value):[...selection[key],value]};}
 const hasSelection=s=>s.sort!=='recommended'||['rating','platform','treatment','experience'].some(k=>s[k].length);
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
 const dateText=r=>{const date=new Date(r.date);return Number.isNaN(+date)?'':(r.approx?'Approx. ':'')+new Intl.DateTimeFormat('en-GB',r.approx?{month:'long',year:'numeric',timeZone:'UTC'}:{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date);};
 function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 function decorate(el,r){
  const meta=el.querySelector('[data-tdb-list-meta]');meta.replaceChildren();
  const source=node('a','review-page_source');const url=safeURL(r.url);if(url){source.href=url;source.target='_blank';source.rel='noopener noreferrer';}else source.removeAttribute('href');
  const icon=cms.sourceIcon(r.platform,false);icon.className='review-page_icon';source.append(icon);source.setAttribute('aria-label','Read '+r.name+'’s review on '+r.platform);
  const stars=node('span','review-page_stars',r.rating?'★'.repeat(r.rating)+'☆'.repeat(5-r.rating):'');stars.setAttribute('aria-label',r.rating?r.rating+' out of 5 stars':'Unrated');
  meta.append(source,stars);
  const date=el.querySelector('.review-page_date'),clock=panel.querySelector('[data-tdb-filter-disclosure=sort] svg').cloneNode(true);clock.removeAttribute('class');clock.setAttribute('width','16');clock.setAttribute('height','16');clock.setAttribute('aria-hidden','true');const time=node('time','',dateText(r));if(r.date)time.dateTime=r.date;date.replaceChildren(clock,time);
  el.querySelectorAll('[data-tdb-list-response],[data-tdb-list-historic]').forEach(n=>n.remove());
  const card=el.querySelector('.review-page_body');
  if(r.historic){const n=node('p','review-page_note','Historic review of Dr Keely at her previous practice.');n.dataset.tdbListHistoric='';card.append(n);}
  if(r.showResponse&&r.response){const n=node('div','review-page_response');n.dataset.tdbListResponse='';n.append(node('div','review-page_name','Response from The Dental Barns'),node('div','review-page_text',r.response));card.append(n);}
  el.id='review-'+r.id;cache.set(r.id,el);return el;
 }
 function card(r){if(cache.has(r.id))return cache.get(r.id);const el=template.cloneNode(true);el.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));el.querySelector('[data-tdb-review-field="reviewer-display-name"]').textContent=r.name;el.querySelector('[data-tdb-review-field="full-review"]').textContent=r.text;el.querySelector('[data-tdb-review-field="featured-excerpt"]').textContent=r.excerpt;el.setAttribute('data-review-slug',r.id);return decorate(el,r);}
 // Webflow owns columns, gaps and all card dimensions. Runtime only measures
 // natural card heights and assigns grid cells, retaining DOM/ranking order.
 function layout(){raf=0;if(destroyed)return;shown.forEach(el=>{el.style.gridColumn='';el.style.gridRow='';});const style=getComputedStyle(grid),columns=style.gridTemplateColumns.split(' ').length,gap=parseFloat(style.columnGap)||0,heights=shown.map(el=>Math.ceil(el.querySelector('.review-page_card').getBoundingClientRect().height));
  const rows=Array(columns).fill(1);grid.classList.add('is-masonry');shown.forEach((el,i)=>{const col=rows.indexOf(Math.min(...rows)),span=heights[i]+gap;el.style.gridColumn=String(col+1);el.style.gridRow=rows[col]+' / span '+Math.ceil(span);rows[col]+=Math.ceil(span);});
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(layout);};
 const resize=new ResizeObserver(schedule);resize.observe(grid);const observe=el=>resize.observe(el.querySelector('.review-page_card'));
 data.records.forEach((r,i)=>{const el=grid.children[i];if(el){shown.push(decorate(el,r));observe(el);}});
 function updateStatus(message){status.textContent=message||`${data.average.toFixed(2)} / 5 · ${data.total} patient reviews · ${filtered?matched.length+' matching reviews':shown.length+' shown'}`;}
 function updateNext(){if(!next)return;const more=filtered?shown.length<matched.length:(data.hasMore||data.records.length>shown.length);next.classList.toggle('review-page_hidden',!more);next.setAttribute('aria-disabled',String(busy));next.setAttribute('aria-busy',String(busy));nextText.textContent=busy?'Loading reviews…':baseNextText;}
 function append(records){const fragment=document.createDocumentFragment();for(const r of records){const el=card(r);if(shown.includes(el))continue;shown.push(el);fragment.append(el);observe(el);}grid.append(fragment);layout();updateStatus();updateNext();}
 async function prepareIndex(){if(data.indexReady)return;indexFlight||=data.loadIndex({signal}).finally(()=>indexFlight=null);await indexFlight;}
 function updateReset(){const disabled=busy||(!hasSelection(selection)&&!filter?.hasExpandedDisclosures);reset.setAttribute('aria-disabled',String(disabled));reset.classList.toggle('is-disabled',disabled);reset.tabIndex=disabled?-1:0;}
 function updateOptions(){
  const ready=data.indexReady,count=ready?cms.matching(data.filterIndex,selection).length:data.total;
  for(const o of options){const key=o.dataset.tdbFilterGroup,value=o.dataset.tdbFilterValue,selected=chosen(key,value),test=['rating','platform'].includes(key)&&value?{...selection,[key]:[value]}:candidate(key,value);const unavailable=!ready||(key!=='sort'&&!selected&&!cms.matching(data.filterIndex,test).length);o.setAttribute('aria-disabled',String(unavailable||busy));o.tabIndex=unavailable||busy?-1:0;o.setAttribute(key==='sort'?'aria-pressed':'aria-checked',String(selected));if(key!=='sort')o.setAttribute('role','checkbox');o.classList.toggle('is-unavailable',unavailable);o.classList.toggle('is-selected',selected);o.querySelectorAll('.tdb-review-filter_mark,.tdb-review-filter_tick').forEach(n=>n.classList.toggle('is-checked',selected));}
  for(const d of disclosures){const labels=options.filter(o=>o.dataset.tdbFilterGroup===d.key&&chosen(d.key,o.dataset.tdbFilterValue)).map(o=>o.textContent.trim());d.summary.textContent=labels.length>2?labels.length+' selected':labels.join(' + ');}
  countTicker.update(String(count),count<lastCount?-1:1,filter?.isOpen&&ready);lastCount=count;
  const reserve=apply.querySelector('[data-tdb-filter-count-reserve]');if(reserve)reserve.textContent=String(data.total);
  apply.querySelector('[data-tdb-filter-apply-plural]')?.classList.toggle('is-singular',count===1);apply.setAttribute('aria-label','View '+count+' '+(count===1?'review':'reviews'));apply.setAttribute('aria-disabled',String(!ready||busy));
  panel.querySelector('[data-tdb-filter-status]').textContent=ready?count+' matching reviews':'Preparing filters…';
  filter?.setCount(['rating','platform','treatment','experience'].reduce((n,k)=>n+selection[k].length,0));updateReset();
 }
 const landscape=matchMedia('(orientation: landscape) and (max-width: 991px) and (max-height: 500px) and (pointer: coarse)');
 const landscapeNodes=[panel,panel.querySelector('.tdb-review-filter_heading'),panel.querySelector('.tdb-review-filter_actions')];
 const landscapeMode=()=>landscapeNodes.forEach(n=>n.classList.toggle('is-archive-landscape',landscape.matches));landscapeMode();landscape.addEventListener('change',landscapeMode,{signal});
 const queryKey=s=>JSON.stringify(s);
 function prime(){if(!data.indexReady)return;const ids=cms.ordered(data.filterIndex,selection).slice(0,20).map(r=>r.id),key=queryKey(selection);if(prefetch?.key===key)return;const promise=data.fetchRecords(ids,{signal});prefetch={key,promise};promise.catch(()=>{if(prefetch?.promise===promise)prefetch=null;});}
 function urlState(){const params=new URLSearchParams(location.hash.slice(1)),s=defaults();for(const key of ['sort','rating','platform','treatment','experience']){const values=params.get(key)?.split(',')||[];const valid=values.map(v=>normal(key,v)).filter(v=>options.some(o=>o.dataset.tdbFilterGroup===key&&normal(key,o.dataset.tdbFilterValue)===v));if(key==='sort'){if(valid[0])s.sort=valid[0];}else s[key]=[...new Set(valid)];}return s;}
 function writeURL(){const url=new URL(location.href);for(const key of [...url.searchParams.keys()])if(key.endsWith('_page'))url.searchParams.delete(key);const params=new URLSearchParams();for(const key of ['treatment','experience','platform','rating'])if(applied[key].length)params.set(key,applied[key].join(','));if(applied.sort!=='recommended')params.set('sort',applied.sort);url.hash=params.toString();history.pushState(null,'',url);}
 async function commit({write=true,scroll=false}={}){
  const token=++revision,state=copy(selection);busy=true;updateOptions();updateNext();
  try{await prepareIndex();const result=cms.ordered(data.filterIndex,state),key=queryKey(state);const batch=await(prefetch?.key===key?prefetch.promise:data.fetchRecords(result.slice(0,20).map(r=>r.id),{signal}));if(token!==revision||destroyed)return false;
   shown.forEach(el=>resize.unobserve(el.querySelector('.review-page_card')));grid.replaceChildren();shown=[];matched=result;filtered=true;applied=state;append(batch);previous?.classList.add('review-page_hidden');if(write)writeURL();if(scroll){const y=feed.getBoundingClientRect().top+scrollY-100;window.lenis?.scrollTo?lenis.scrollTo(y,{immediate:true,force:true}):window.scrollTo(0,y);}return true;
  }catch(error){if(!signal.aborted){panel.querySelector('[data-tdb-filter-status]').textContent='Could not load these reviews. Please try again.';updateStatus('Could not load these reviews. Your current results are unchanged.');}return false;}
  finally{if(token===revision){busy=false;updateOptions();updateNext();}}
 }
 function action(el,fn){if(!el)return;const run=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();if(el.getAttribute('aria-disabled')==='true')return;fn(e);};el.addEventListener('click',run,{signal});el.addEventListener('keydown',run,{signal});}
 let resumeLenis=false;
 filter=window.TDBFilters.mount(panel,{toggle,backdrop,heading:panel.querySelector('[data-tdb-filter-heading]'),badge:toggle.querySelector('[data-tdb-filter-badge]'),escapeRoot:document,disclosures,inertTargets:[feed,...document.querySelectorAll('.review-page_hero,.review-page_availability,.navbar10_component')],
  onIntent:()=>prepareIndex().then(updateOptions).catch(()=>{}),beforeClose:()=>queryKey(selection)===queryKey(applied)?true:commit(),onDisclosureChange:updateReset,
  onChange:open=>{if(open){resumeLenis=!!window.lenis&&!lenis.isStopped;window.lenis?.stop();prepareIndex().then(updateOptions).catch(()=>{});}else{if(resumeLenis)window.lenis?.start();resumeLenis=false;}},labels:{open:'Filter and sort reviews',close:'Close review filters'}});
 toggle.setAttribute('aria-disabled','false');
 for(const type of ['wheel','touchmove'])document.addEventListener(type,event=>{if(filter.isOpen&&!panel.contains(event.target))event.preventDefault();},{signal,passive:false});
 document.addEventListener('keydown',event=>{if(!filter.isOpen||event.key!=='Tab')return;const nodes=[...panel.querySelectorAll('a[href],[tabindex="0"],button:not([disabled])'),toggle].filter(n=>!n.closest('[inert]')&&n.getAttribute('aria-disabled')!=='true'&&n.getClientRects().length),i=nodes.indexOf(document.activeElement);if(event.shiftKey&&i<=0){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&(i<0||i===nodes.length-1)){event.preventDefault();nodes[0]?.focus();}},{signal});
 options.forEach(o=>action(o,()=>{selection=candidate(o.dataset.tdbFilterGroup,o.dataset.tdbFilterValue);updateOptions();prime();}));
 action(reset,()=>{selection=defaults();filter.collapseAll();updateOptions();prime();});action(apply,()=>filter.requestClose('apply'));
 action(next,async()=>{if(busy)return;busy=true;updateNext();const token=revision;try{if(filtered){const records=await data.fetchRecords(matched.slice(shown.length,shown.length+20).map(r=>r.id),{signal});if(token===revision)append(records);}else{if(data.records.length<=shown.length&&data.hasMore)await data.loadMore({signal});if(token===revision){append(data.records.slice(shown.length,shown.length+20));if(data.nextURL)next.href=data.nextURL;}}}catch{updateStatus('Could not load more reviews. Please try again.');}finally{busy=false;updateNext();}});
 const prefetchObserver=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting)||busy)return;if(filtered){data.fetchRecords(matched.slice(shown.length,shown.length+20).map(r=>r.id),{signal}).catch(()=>{});}else if(data.hasMore)data.loadMore({signal}).catch(()=>{});},{rootMargin:'600px'});if(next)prefetchObserver.observe(next);
 // Background preparation must not make the button disappear before cached cards append.
 const initialHash=urlState();if(hasSelection(initialHash)){selection=initialHash;commit({write:false,scroll:true});}
 addEventListener('popstate',()=>{selection=urlState();commit({write:false});},{signal});addEventListener('hashchange',()=>{if(queryKey(urlState())!==queryKey(applied)){selection=urlState();commit({write:false,scroll:true});}},{signal});
 document.fonts?.ready.then(schedule);layout();updateStatus();updateNext();updateOptions();
 const api={destroy(){if(destroyed)return;destroyed=true;revision++;ctrl.abort();filter.destroy();countTicker.destroy();resize.disconnect();prefetchObserver.disconnect();cancelAnimationFrame(raf);if(resumeLenis)window.lenis?.start();instances.delete(root);},status(){return {shown:shown.length,total:data.total,filtered,matches:matched.length};}};instances.set(root,api);return api;
}
window.TDBReviewList=Object.freeze({version:'1.0.0',mount});
})();
