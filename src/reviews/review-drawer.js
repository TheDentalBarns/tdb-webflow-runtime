/* TDB Patient Reviews v1.1.0 — staging-only, based on Smile Gallery v24 motion. */
(function () {
  'use strict';
  const TOPICS = [['all','All experiences'],['nervous','Nervous care'],['cosmetic','Cosmetic dentistry'],['invisalign','Invisalign'],['clear-aligners','Clear aligners'],['bonding','Composite bonding'],['veneers','Veneers'],['whitening','Whitening'],['hygiene','Hygiene'],['location','Location'],['restorative','Restorative care'],['assessment','Listening & planning'],['smile-design','Smile Design']];
  function chooseReviews(records, options) {
    const { topic='all', platform='all', sort='relevant', context='default', preferredId='' } = options;
    const list=records.filter(r=>(topic==='all'||r.topics.includes(topic))&&(platform==='all'||r.platform===platform));
    const relevance=r=>context==='nervous'?r.nRank:context==='invisalign'?r.iRank:context==='location'?r.lRank:r.rank;
    list.sort((a,b)=>{
      if(sort==='newest') return (Date.parse(b.date)||0)-(Date.parse(a.date)||0)||a.rank-b.rank||a.id.localeCompare(b.id);
      const preferred=(b.id===preferredId)-(a.id===preferredId); if(preferred)return preferred;
      const match=Number(b.topics.includes(context))-Number(a.topics.includes(context)); if(match)return match;
      return (relevance(a)||999)-(relevance(b)||999)||a.rank-b.rank||a.id.localeCompare(b.id);
    });
    const seen=new Set();
    return list.filter(r=>{const key=r.duplicate||r.id;if(seen.has(key))return false;seen.add(key);return true;});
  }
  function safeURL(url) { try { const u=new URL(url);return u.protocol==='https:'?u.href:'';} catch (_) { return ''; } }
  if(typeof module==='object'&&module.exports){module.exports={chooseReviews,safeURL};return;}
  if(location.hostname!=='dentalbarns.webflow.io'||window.TDBReviewDrawer)return;
  const api=window.TDBPowerSnippets;
  if(!api)return;
  const style=document.createElement('style');style.dataset.tdbReviewDrawerStyles='1.1.0';style.textContent=__DRAWER_CSS__;document.head.append(style);
  const fallback={Google:'https://maps.app.goo.gl/pNwZ1zif6LhHUfr1A',Facebook:'https://www.facebook.com/thedentalbarns/',Doctify:'https://www.doctify.com/uk/specialist/keely-thorne#reviews'};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(label,cls,action)=>{const b=el('button',cls);b.type='button';b.setAttribute('aria-label',label);if(action)b.addEventListener('click',action);return b;};
  const arrow=()=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 16 16');s.setAttribute('aria-hidden','true');s.innerHTML='<path fill="currentColor" d="M12.6893 7.25L6.96967 1.53033L8.03033 0.469666L15.5607 8L8.03033 15.5303L6.96967 14.4697L12.6893 8.75H0.5V7.25H12.6893Z"/>';return s;};
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dataPromise,data,overlay,panel,track,closeBtn,prev,next,position,topicSelect,sortSelect,platformSelect,filterButton,filterPanel,details,summary,contextNote;
  let list=[],index=0,current,sourceTrigger,lock,chrome,opening=false,closing=false,drag=null,transition=null,openTimer=0,closeTimer=0,vipTimer=0;
  let context='default',preferredId='',topic='all',platform='all',sort='relevant';
  function getData(){
    if(!dataPromise)dataPromise=(async()=>{
      const node=document.querySelector('[data-tdb-review-drawer-data]');
      if(!node)throw Error('Review data is unavailable.');
      if(node.dataset.encoding!=='gzip-base64')return JSON.parse(node.textContent);
      if(typeof DecompressionStream!=='function')throw Error('This browser cannot open the review preview.');
      const bytes=Uint8Array.from(atob(node.textContent.trim()),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    })().catch(e=>{dataPromise=null;throw e;});
    return dataPromise;
  }
  function stars(rating,platformName){
    const row=el('span','tdb-rv-stars');
    if(!rating){row.append(el('span','tdb-rv-unrated','Rating not supplied'));return row;}
    row.setAttribute('role','img');row.setAttribute('aria-label',platformName==='Facebook'?'Facebook recommendation, shown as five stars':rating+' out of 5 stars');
    const native=document.querySelector('.button.is-review .testimonial15_rating-icon:not(.vendor) svg');
    for(let i=0;i<5;i++){const box=el('span',i<rating?'':'is-empty');box.setAttribute('aria-hidden','true');if(native)box.append(native.cloneNode(true));else box.textContent='★';row.append(box);}
    return row;
  }
  function reviewExcerpt(r){
    const selection=api.preview.contexts[context];
    if(selection?.id===r.id)return selection.excerpt;
    return r.excerpts[topic==='all'?context:topic]||r.excerpt;
  }
  function dateLabel(r){
    if(!r.date)return '';
    const d=new Date(r.date);if(Number.isNaN(d.getTime()))return '';
    return (r.approx?'Approx. ':'')+d.toLocaleDateString('en-GB',r.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  }
  function makeSlide(r){
    const slide=el('article','tdb-rv-slide');slide.tabIndex=-1;slide.dataset.reviewId=r.id;slide.setAttribute('aria-label','Review by '+r.name);
    const source=el('div','tdb-rv-source');const icon=api.sourceIcon(r.platform,false);icon.className='tdb-rv-platform-icon';icon.title=r.platform;source.append(icon,stars(r.rating,r.platform));
    const quote=el('div','tdb-rv-snippet');const mark=el('div','tdb-rv-mark');mark.innerHTML=api.quoteMark;mark.setAttribute('aria-hidden','true');const excerpt=el('blockquote','',reviewExcerpt(r));quote.append(mark,excerpt);
    const by=el('div','tdb-rv-by');by.append(el('div','tdb-rv-name',r.name),el('div','tdb-rv-date',dateLabel(r)+(r.platform==='Facebook'?' · Recommends The Dental Barns':'')));
    if(r.historic)by.append(el('div','tdb-rv-historic','Dr Keely · review from a previous practice'));
    const body=el('div','tdb-rv-body');body.id='tdb-rv-body-'+r.id;body.tabIndex=0;body.setAttribute('aria-label','Full review by '+r.name);body.setAttribute('data-lenis-prevent','');body.append(el('p','',r.text));
    const more=button('Read full review','tdb-rv-more',()=>{const expanded=slide.classList.toggle('is-expanded');more.textContent=expanded?'Read less':'Read more';more.setAttribute('aria-expanded',String(expanded));more.setAttribute('aria-label',expanded?'Collapse full review':'Read full review');body.scrollTop=0;if(expanded)body.focus({preventScroll:true});});more.textContent='Read more';more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls',body.id);
    const sourceRow=el('div','tdb-rv-source-link');const href=safeURL(r.url||fallback[r.platform]||'');
    if(href){const a=el('a','',r.direct?'See original review':'View on '+r.platform);a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.append(el('span','',' ↗'));a.setAttribute('aria-label',a.textContent+' (opens in a new tab)');sourceRow.append(a);}else sourceRow.append(el('span','tdb-rv-date','Source link not yet available'));
    slide.append(source,quote,by,body,more,sourceRow);
    return slide;
  }
  function checkOverflow(slide){if(!slide||slide.classList.contains('is-expanded'))return;const body=slide.querySelector('.tdb-rv-body'),more=slide.querySelector('.tdb-rv-more');const long=body.scrollHeight>body.clientHeight+2;more.style.visibility=long?'visible':'hidden';more.disabled=!long;body.classList.toggle('is-truncated',long);}
  function setCurrent(slide){track.replaceChildren(slide);current=slide;slide.style.removeProperty('transform');slide.inert=false;slide.removeAttribute('aria-hidden');track.removeAttribute('aria-busy');checkOverflow(slide);updatePosition();}
  function updatePosition(){position.textContent=list.length?(index+1)+' / '+list.length:'0 reviews';prev.disabled=index<=0;next.disabled=index>=list.length-1;contextNote.textContent=topic!=='all'?TOPICS.find(t=>t[0]===topic)[1]+' · '+list.length+' reviews':sort==='newest'?'Newest reviews first':TOPICS.some(t=>t[0]===context)?TOPICS.find(t=>t[0]===context)[1]+' reviews first':'Selected patient experiences';}
  function cancelSlide(){if(!transition)return;transition.animations.forEach(a=>a.cancel());transition=null;drag=null;if(current)setCurrent(current);}
  function beginSlide(direction){
    if(closing||transition||!list[index+direction])return null;
    const width=track.clientWidth,incoming=makeSlide(list[index+direction]);incoming.inert=true;incoming.setAttribute('aria-hidden','true');incoming.style.transform='translate3d('+(direction*width)+'px,0,0)';track.append(incoming);checkOverflow(incoming);track.setAttribute('aria-busy','true');
    transition={from:current,to:incoming,direction,width,offset:0,animations:[],settling:false};return transition;
  }
  function translate(t,offset){t.offset=offset;t.from.style.transform='translate3d('+offset+'px,0,0)';t.to.style.transform='translate3d('+(t.direction*t.width+offset)+'px,0,0)';}
  async function settle(commit){
    const t=transition;if(!t||t.settling)return;t.settling=true;
    const dest=commit?-t.direction*t.width:0,duration=reduced()?0:Math.max(120,Math.min(400,400*Math.abs(dest-t.offset)/t.width));
    if(duration){t.animations=[t.from.animate([{transform:'translate3d('+t.offset+'px,0,0)'},{transform:'translate3d('+dest+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'}),t.to.animate([{transform:'translate3d('+(t.direction*t.width+t.offset)+'px,0,0)'},{transform:'translate3d('+(t.direction*t.width+dest)+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'})];await Promise.all(t.animations.map(a=>a.finished.catch(()=>{})));}
    if(transition!==t)return;transition=null;t.animations.forEach(a=>a.cancel());if(commit)index+=t.direction;
    if(t.from.contains(document.activeElement))closeBtn.focus({preventScroll:true});setCurrent(commit?t.to:t.from);
  }
  function step(direction){drag=null;if(beginSlide(direction))settle(true);}
  function refresh(){
    cancelSlide();list=chooseReviews(data.records,{topic,platform,sort,context,preferredId});index=0;
    if(list.length)setCurrent(makeSlide(list[0]));else{current=null;track.replaceChildren(el('div','tdb-rv-empty','No reviews match these filters. Try another experience or source.'));updatePosition();}
    filterButton.classList.toggle('has-filter',platform!=='all');
  }
  function setFiltersOpen(on){filterPanel.hidden=!on;filterButton.setAttribute('aria-expanded',String(on));if(on)platformSelect.focus();}
  function field(label,options,action){const wrap=el('label','tdb-rv-select');const caption=el('span','tdb-review-sr-only',label),select=el('select');select.setAttribute('aria-label',label);options.forEach(([value,text])=>{const o=el('option','',text);o.value=value;select.append(o);});select.addEventListener('change',()=>action(select.value));wrap.append(caption,select);return{wrap,select};}
  function create(){
    if(overlay)return;
    overlay=el('div','tdb-rv-overlay');overlay.hidden=true;overlay.setAttribute('data-tdb-review-overlay','');overlay.setAttribute('data-lenis-prevent','');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','tdb-rv-title');
    panel=el('div','tdb-rv-panel');
    // Staging-only narrow-width visual QA, using the same responsive container rules.
    if(new URLSearchParams(location.search).get('review-preview')==='mobile'){panel.style.width='min(390px,100%)';panel.style.height='min(844px,100dvh)';panel.style.setProperty('--rv-footer','5rem');}
    const header=el('header','tdb-rv-header'),top=el('div','tdb-rv-heading');const title=el('h2','','Patient reviews');title.id='tdb-rv-title';
    closeBtn=button('Close reviews','tdb-rv-dismiss',close);const lines=el('span','tdb-rv-dismiss-lines');for(let i=0;i<3;i++)lines.append(el('span'));closeBtn.append(lines);top.append(title,closeBtn);
    summary=el('div','tdb-rv-summary');summary.append(el('strong','',data.average.toFixed(2)),stars(5,'Combined'),el('span','',data.total+' reviews'));
    const info=button('About this score','tdb-rv-info',()=>{details.hidden=!details.hidden;info.setAttribute('aria-expanded',String(!details.hidden));});info.textContent='i';info.setAttribute('aria-expanded','false');summary.append(info);
    const filters=el('div','tdb-rv-filters');const a=field('Review topic',TOPICS,v=>{topic=v;refresh();}),b=field('Review order',[['relevant','Most relevant'],['newest','Newest']],v=>{sort=v;refresh();});topicSelect=a.select;sortSelect=b.select;
    filterButton=button('Filter by review source','tdb-rv-filter-button',()=>setFiltersOpen(filterPanel.hidden));filterButton.setAttribute('aria-expanded','false');filterButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6m6 4v6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';filters.append(a.wrap,b.wrap,filterButton);
    contextNote=el('div','tdb-rv-context');header.append(top,summary,filters,contextNote);
    filterPanel=el('div','tdb-rv-filter-panel');filterPanel.hidden=true;const sources=field('Review source',[['all','All sources'],['Google','Google'],['Facebook','Facebook'],['Yell','Yell'],['Doctify','Doctify']],v=>{platform=v;refresh();});platformSelect=sources.select;const done=button('Apply source filter','tdb-rv-filter-done',()=>{setFiltersOpen(false);filterButton.focus();});done.textContent='Done';const reset=button('Clear review filters','tdb-rv-filter-done',()=>{topic=platform='all';topicSelect.value=platformSelect.value='all';refresh();setFiltersOpen(false);filterButton.focus();});reset.textContent='Clear';filterPanel.append(sources.wrap,reset,done);
    details=el('div','tdb-rv-details');details.hidden=true;details.append(el('strong','','About these reviews'),el('p','','83 reviews collected on 25 September 2026: 55 Google, 23 Doctify, 3 Facebook and 2 Yell. Doctify feedback relates to Dr Keely at previous practices.'),el('p','','The combined score uses 81 rated entries, including the one-star Google rating. Facebook recommendations are counted as 5/5; Yell reviews without a confirmed rating are excluded from the average.'),el('p','','Cross-posted reviews appear once in All sources. One Google review is not republished here; its rating remains included. Source profiles provide the platform’s current reviews.'));
    const hideInfo=button('Close score information','tdb-rv-filter-done',()=>{details.hidden=true;info.setAttribute('aria-expanded','false');info.focus();});hideInfo.textContent='Close';details.append(hideInfo);
    const frame=el('div','tdb-rv-frame');track=el('div','tdb-rv-track');track.setAttribute('aria-roledescription','carousel');track.setAttribute('aria-label','Patient reviews');frame.append(track);
    const nav=el('footer','tdb-rv-navigation');nav.setAttribute('aria-label','Review navigation');position=el('div','tdb-rv-position');position.setAttribute('role','status');position.setAttribute('aria-live','polite');position.setAttribute('aria-atomic','true');const arrows=el('div','tdb-rv-arrows');prev=button('Previous review','tdb-rv-arrow is-prev',()=>step(-1));next=button('Next review','tdb-rv-arrow',()=>step(1));prev.append(arrow());next.append(arrow());arrows.append(prev,next);nav.append(position,arrows);
    panel.append(frame,header,filterPanel,details,nav);overlay.append(panel);document.body.append(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();if(!details.hidden){details.hidden=true;info.setAttribute('aria-expanded','false');info.focus();}else if(!filterPanel.hidden){setFiltersOpen(false);filterButton.focus();}else close();return;}
      if(!e.target.closest('select,input,textarea')){if(e.key==='ArrowRight'){e.preventDefault();step(1);}if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}}
      if(e.key==='Tab'){const focusable=[...overlay.querySelectorAll('button,a[href],select,[tabindex="0"]')].filter(n=>!n.disabled&&!n.closest('[hidden],[inert]')&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    });
    track.addEventListener('pointerdown',e=>{if(closing||transition||!current||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0)||e.target.closest('button,a,select,input')||current.classList.contains('is-expanded'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,horizontal:false};});
    track.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(Math.abs(dx)<12||Math.abs(dx)<1.3*Math.abs(dy))return;drag.horizontal=true;if(!beginSlide(dx<0?1:-1)){drag=null;return;}track.setPointerCapture?.(e.pointerId);}if(transition&&!transition.settling){e.preventDefault();const t=transition;translate(t,-t.direction*Math.max(0,Math.min(.95*t.width,-dx*t.direction)));}},{passive:false});
    const end=(e,cancel)=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(track.hasPointerCapture?.(e.pointerId))track.releasePointerCapture(e.pointerId);if(!d.horizontal||!transition)return;const distance=Math.abs(transition.offset),elapsed=Math.max(1,e.timeStamp-d.time);settle(!cancel&&(distance>Math.max(45,.13*transition.width)||(distance>20&&distance/elapsed>.45)));};track.addEventListener('pointerup',e=>end(e,false));track.addEventListener('pointercancel',e=>end(e,true));
    addEventListener('resize',()=>{cancelSlide();checkOverflow(current);});
  }
  function hideChrome(){
    if(chrome){chrome.waiting=false;return;}
    const root=document.documentElement,nav=document.querySelector('.navbar10_component');
    chrome={nav,value:nav?.style.getPropertyValue('--tdb-sg-native-away')||'',priority:nav?.style.getPropertyPriority('--tdb-sg-native-away')||'',owned:!root.classList.contains('tdb-sg-chrome-away')};
    if(nav){const top=nav.getBoundingClientRect().top,parts=[nav,...nav.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')];nav.style.setProperty('--tdb-sg-native-away',Math.max(nav.offsetHeight,...parts.filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect().bottom-top))+'px');}
    if(document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking')){window.TDBVIPDrawer?.close?.();vipTimer=setTimeout(()=>lock?.lenis?.stop(),560);}
    root.classList.add('tdb-sg-chrome-away','tdb-rv-chrome-away');
  }
  function releaseChrome(){if(!chrome)return;const {nav,value,priority,owned}=chrome;if(nav){if(value)nav.style.setProperty('--tdb-sg-native-away',value,priority);else nav.style.removeProperty('--tdb-sg-native-away');}if(owned)document.documentElement.classList.remove('tdb-sg-chrome-away');document.documentElement.classList.remove('tdb-rv-chrome-away');chrome=null;}
  function lockPage(){if(lock)return;const siblings=[...document.body.children].filter(n=>n!==overlay&&!['SCRIPT','STYLE','LINK'].includes(n.tagName));lock={siblings:siblings.map(n=>[n,n.inert]),x:scrollX,y:scrollY,lenis:window.lenis,resume:!!window.lenis&&!window.lenis.isStopped,sgLocked:document.documentElement.classList.contains('tdb-sg-locked')};siblings.forEach(n=>n.inert=true);lock.lenis?.stop();document.documentElement.classList.add('tdb-sg-locked','tdb-rv-locked');}
  function unlockPage(){if(!lock)return;const saved=lock;lock=null;saved.siblings.forEach(([n,inert])=>n.inert=inert);document.documentElement.classList.remove('tdb-rv-locked');if(!saved.sgLocked)document.documentElement.classList.remove('tdb-sg-locked');if(Math.abs(scrollY-saved.y)>1||Math.abs(scrollX-saved.x)>1)window.scrollTo(saved.x,saved.y);if(saved.resume)saved.lenis?.start();}
  async function open(trigger,reviewId){
    if(opening||closing||overlay&&!overlay.hidden)return;
    opening=true;
    try{
      data=await getData();if(!data?.records?.length)throw Error('No reviews available.');create();
      sourceTrigger=trigger;context=api.contextForPath(location.pathname)||'default';preferredId=reviewId||api.preview.contexts[context]?.id||'';topic=platform='all';sort='relevant';topicSelect.value=platformSelect.value='all';sortSelect.value='relevant';filterPanel.hidden=details.hidden=true;filterButton.setAttribute('aria-expanded','false');summary.querySelector('.tdb-rv-info').setAttribute('aria-expanded','false');refresh();
      overlay.hidden=false;checkOverflow(current);sourceTrigger?.setAttribute('aria-expanded','true');hideChrome();lockPage();closeBtn.focus({preventScroll:true});
      requestAnimationFrame(()=>requestAnimationFrame(()=>{if(overlay.hidden||closing)return;overlay.classList.add('is-open');openTimer=setTimeout(()=>{if(!closing){overlay.classList.add('is-controls-visible');checkOverflow(current);}},reduced()?0:420);}));
    }finally{opening=false;}
  }
  function close(){
    if(!overlay||overlay.hidden||closing)return;closing=true;clearTimeout(openTimer);clearTimeout(vipTimer);cancelSlide();drag=null;
    window.TDBVIPDrawer?.reset?.();lock?.lenis?.stop();document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(n=>n.click());
    overlay.classList.remove('is-open','is-controls-visible');overlay.classList.add('is-closing');sourceTrigger?.setAttribute('aria-expanded','false');
    closeTimer=setTimeout(()=>{overlay.hidden=true;overlay.classList.remove('is-closing');unlockPage();closing=false;sourceTrigger?.focus({preventScroll:true});if(chrome)Object.assign(chrome,{waiting:true,y:scrollY,up:0,down:0});},reduced()?0:600);
  }
  addEventListener('scroll',()=>{if(!chrome?.waiting||overlay&&!overlay.hidden)return;const dy=scrollY-chrome.y;chrome.y=scrollY;if(dy>0){chrome.up=0;chrome.down+=dy;}else if(dy<0){chrome.down=0;chrome.up-=dy;}if(chrome.up>120||chrome.down>140||scrollY<=40&&dy<0)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(overlay.hidden)releaseChrome();}));},{passive:true});
  document.addEventListener('focusin',e=>{if(chrome?.waiting&&e.target.closest?.('.navbar10_component,#tdb-vip-drawer'))releaseChrome();});
  addEventListener('click',e=>{if(chrome?.waiting&&/#vip/i.test(e.target.closest?.('a[href]')?.getAttribute('href')||''))releaseChrome();},true);
  window.TDBReviewDrawer=Object.freeze({version:'1.1.0',open,close});
})();
