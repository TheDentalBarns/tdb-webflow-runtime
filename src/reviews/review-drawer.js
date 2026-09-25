/* TDB Patient Reviews v1.2.0 — staging-only, Smile Gallery motion and continuous reading. */
(function () {
  'use strict';
  function chooseReviews(records, options) {
    const { topic='all', platform='all', sort='relevant', context='default', preferredId='' } = options;
    const list=records.filter(r=>(topic==='all'||r.topics.includes(topic))&&(platform==='all'||r.platform===platform));
    const effectiveContext=topic==='all'?context:topic;
    const relevance=r=>effectiveContext==='nervous'?r.nRank:effectiveContext==='invisalign'?r.iRank:effectiveContext==='location'?r.lRank:r.rank;
    list.sort((a,b)=>{
      if(sort==='newest') return (Date.parse(b.date)||0)-(Date.parse(a.date)||0)||a.rank-b.rank||a.id.localeCompare(b.id);
      const preferred=topic==='all'?(b.id===preferredId)-(a.id===preferredId):0; if(preferred)return preferred;
      const match=Number(b.topics.includes(effectiveContext))-Number(a.topics.includes(effectiveContext)); if(match)return match;
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
  const style=document.createElement('style');style.dataset.tdbReviewDrawerStyles='1.2.0';style.textContent=__DRAWER_CSS__;document.head.append(style);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(label,cls,action)=>{const b=el('button',cls);b.type='button';b.setAttribute('aria-label',label);if(action)b.addEventListener('click',action);return b;};
  const arrow=()=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 16 16');s.setAttribute('aria-hidden','true');s.innerHTML='<path fill="currentColor" d="M12.6893 7.25L6.96967 1.53033L8.03033 0.469666L15.5607 8L8.03033 15.5303L6.96967 14.4697L12.6893 8.75H0.5V7.25H12.6893Z"/>';return s;};
  const clock=()=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 256 256');s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');s.innerHTML='<path fill="currentColor" d="M128 28a100 100 0 1 0 100 100A100.11 100.11 0 0 0 128 28m0 192a92 92 0 1 1 92-92a92.1 92.1 0 0 1-92 92m60-92a4 4 0 0 1-4 4h-56a4 4 0 0 1-4-4V72a4 4 0 0 1 8 0v52h52a4 4 0 0 1 4 4"/>';return s;};
  let dataPromise,data,overlay,panel,track,closeBtn,prev,next,position;
  let list=[],index=0,current,sourceTrigger,lock,chrome,opening=false,closing=false,drag=null,transition=null,closeTimer=0,vipTimer=0;
  let context='default',preferredId='',dismissAnimations=[];
  const scrollPositions=new Map();
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
    return r.excerpts[context]||r.excerpt;
  }
  function dateLabel(r){
    if(!r.date)return '';
    const d=new Date(r.date);if(Number.isNaN(d.getTime()))return '';
    return (r.approx?'Approx. ':'')+d.toLocaleDateString('en-GB',r.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  }
  function makeSlide(r){
    const slide=el('article','tdb-rv-slide');slide.tabIndex=0;slide.dataset.reviewId=r.id;slide.setAttribute('aria-label','Review by '+r.name);slide.setAttribute('data-lenis-prevent','');
    const quote=el('div','tdb-rv-snippet');const mark=el('div','tdb-rv-mark');mark.innerHTML=api.quoteMark;mark.setAttribute('aria-hidden','true');const excerpt=el('blockquote','',reviewExcerpt(r));quote.append(mark,excerpt);
    const by=el('div','tdb-rv-by'),identity=el('div','tdb-rv-identity'),date=el('div','tdb-rv-date'),time=el('time','',dateLabel(r));if(r.date)time.dateTime=r.date;date.append(clock(),time);identity.append(el('div','tdb-rv-name',r.name),date);
    const source=el('div','tdb-rv-source');const icon=api.sourceIcon(r.platform,true);icon.className='tdb-rv-platform-icon';icon.title=r.platform;source.append(icon,el('span','tdb-review-sr-only',r.platform),stars(r.rating,r.platform));by.append(identity,source);
    const body=el('div','tdb-rv-body');body.id='tdb-rv-body-'+r.id;body.setAttribute('aria-label','Full review by '+r.name);body.append(el('p','',r.text));
    slide.append(quote,by);if(r.historic)slide.append(el('div','tdb-rv-historic','Dr Keely · review from a previous practice'));slide.append(body);
    return slide;
  }
  function rememberScroll(){if(current)scrollPositions.set(current.dataset.reviewId,current.scrollTop);}
  function setCurrent(slide){track.replaceChildren(slide);current=slide;slide.style.removeProperty('transform');slide.inert=false;slide.removeAttribute('aria-hidden');slide.scrollTop=scrollPositions.get(slide.dataset.reviewId)||0;track.removeAttribute('aria-busy');updatePosition();}
  function updatePosition(){position.textContent=list.length?(index+1)+' / '+list.length:'0 reviews';prev.disabled=index<=0;next.disabled=index>=list.length-1;}
  function cancelSlide(){if(!transition)return;transition.animations.forEach(a=>a.cancel());transition=null;drag=null;if(current)setCurrent(current);}
  function beginSlide(direction){
    if(closing||transition||!list[index+direction])return null;
    rememberScroll();const width=track.clientWidth,incoming=makeSlide(list[index+direction]);incoming.inert=true;incoming.setAttribute('aria-hidden','true');incoming.style.transform='translate3d('+(direction*width)+'px,0,0)';track.append(incoming);incoming.scrollTop=scrollPositions.get(incoming.dataset.reviewId)||0;track.setAttribute('aria-busy','true');
    transition={from:current,to:incoming,direction,width,offset:0,animations:[],settling:false};return transition;
  }
  function translate(t,offset){t.offset=offset;t.from.style.transform='translate3d('+offset+'px,0,0)';t.to.style.transform='translate3d('+(t.direction*t.width+offset)+'px,0,0)';}
  async function settle(commit){
    const t=transition;if(!t||t.settling)return;t.settling=true;
    const dest=commit?-t.direction*t.width:0,duration=Math.max(120,Math.min(400,400*Math.abs(dest-t.offset)/t.width));
    if(duration){t.animations=[t.from.animate([{transform:'translate3d('+t.offset+'px,0,0)'},{transform:'translate3d('+dest+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'}),t.to.animate([{transform:'translate3d('+(t.direction*t.width+t.offset)+'px,0,0)'},{transform:'translate3d('+(t.direction*t.width+dest)+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'})];await Promise.all(t.animations.map(a=>a.finished.catch(()=>{})));}
    if(transition!==t)return;transition=null;t.animations.forEach(a=>a.cancel());if(commit)index+=t.direction;
    if(t.from.contains(document.activeElement))closeBtn.focus({preventScroll:true});setCurrent(commit?t.to:t.from);
  }
  function step(direction){drag=null;if(beginSlide(direction))settle(true);}
  function refresh(){
    cancelSlide();list=chooseReviews(data.records,{context,preferredId});index=0;
    if(list.length)setCurrent(makeSlide(list[0]));else{current=null;track.replaceChildren(el('div','tdb-rv-empty','No reviews available.'));updatePosition();}
  }
  // The Gallery's separate 400/600ms quintic movement and rotation, always animated.
  function animateDismiss(open){
    const lines=[...closeBtn.querySelectorAll('.tdb-rv-dismiss-lines span')],outer=[lines[0],lines[2]],middle=lines[1];
    const start=outer.map(n=>{const m=new DOMMatrixReadOnly(getComputedStyle(n).transform);return{y:m.m42,angle:180*Math.atan2(m.b,m.a)/Math.PI};}),width=parseFloat(getComputedStyle(middle).width);
    dismissAnimations.forEach(a=>a.cancel());dismissAnimations=[];
    const ease=t=>t<.5?16*t*t*t*t*t:1+16*Math.pow(t-1,5);
    outer.forEach((n,i)=>{const y=open?(i===0?8:-8):0,angle=open?(i===0?-45:45):0;n.style.transform='translateY('+y+'px) rotate('+angle+'deg)';const frames=Array.from({length:61},(_,j)=>{const ms=j*10,move=ease(Math.min(1,ms/(open?400:600))),rotate=ease(Math.min(1,ms/(open?600:400)));return{transform:'translateY('+(start[i].y+(y-start[i].y)*move)+'px) rotate('+(start[i].angle+(angle-start[i].angle)*rotate)+'deg)',offset:j/60};});dismissAnimations.push(n.animate(frames,{duration:600,easing:'linear',fill:'both'}));});
    const target=open?0:24;middle.style.width=target+'px';dismissAnimations.push(middle.animate(Array.from({length:21},(_,j)=>({width:width+(target-width)*ease(j/20)+'px',offset:j/20})),{duration:200,delay:open?0:400,easing:'linear',fill:'both'}));
  }
  function create(){
    if(overlay)return;
    overlay=el('div','tdb-rv-overlay');overlay.hidden=true;overlay.setAttribute('data-tdb-review-overlay','');overlay.setAttribute('data-lenis-prevent','');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','tdb-rv-title');
    panel=el('div','tdb-rv-panel');
    // Staging-only narrow-width visual QA, using the same responsive container rules.
    if(new URLSearchParams(location.search).get('review-preview')==='mobile'){panel.style.width='min(390px,100%)';panel.style.height='min(844px,100dvh)';panel.style.setProperty('--rv-footer','5rem');}
    const header=el('header','tdb-rv-header'),top=el('div','tdb-rv-heading');const title=el('h2','','Patient reviews');title.id='tdb-rv-title';
    closeBtn=button('Close reviews','tdb-rv-dismiss',close);const lines=el('span','tdb-rv-dismiss-lines');for(let i=0;i<3;i++)lines.append(el('span'));closeBtn.append(lines);top.append(title,closeBtn);
    const summary=el('div','tdb-rv-summary'),scoreStars=stars(5,'Combined');scoreStars.setAttribute('aria-label',data.average.toFixed(2)+' out of 5');summary.append(el('strong','',data.average.toFixed(2)),scoreStars,el('span','',data.total+' reviews'));header.append(top,summary);
    const frame=el('div','tdb-rv-frame');track=el('div','tdb-rv-track');track.setAttribute('role','group');track.setAttribute('aria-roledescription','carousel');track.setAttribute('aria-label','Patient reviews');frame.append(track);
    const nav=el('footer','tdb-rv-navigation');nav.setAttribute('aria-label','Review navigation');position=el('div','tdb-rv-position');position.setAttribute('role','status');position.setAttribute('aria-live','polite');position.setAttribute('aria-atomic','true');const arrows=el('div','tdb-rv-arrows');prev=button('Previous review','tdb-rv-arrow is-prev',()=>step(-1));next=button('Next review','tdb-rv-arrow',()=>step(1));prev.append(arrow());next.append(arrow());arrows.append(prev,next);nav.append(position,arrows);
    panel.append(header,frame,nav);overlay.append(panel);document.body.append(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(!e.target.closest('select,input,textarea')){if(e.key==='ArrowRight'){e.preventDefault();step(1);}if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}}
      if(e.key==='Tab'){const focusable=[...overlay.querySelectorAll('button,a[href],select,[tabindex="0"]')].filter(n=>!n.disabled&&!n.closest('[hidden],[inert]')&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    });
    track.addEventListener('pointerdown',e=>{if(closing||transition||!current||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0)||e.target.closest('button,a,select,input'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,horizontal:false};});
    track.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(Math.abs(dx)<12||Math.abs(dx)<1.3*Math.abs(dy))return;drag.horizontal=true;if(!beginSlide(dx<0?1:-1)){drag=null;return;}track.setPointerCapture?.(e.pointerId);}if(transition&&!transition.settling){e.preventDefault();const t=transition;translate(t,-t.direction*Math.max(0,Math.min(.95*t.width,-dx*t.direction)));}},{passive:false});
    const end=(e,cancel)=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(track.hasPointerCapture?.(e.pointerId))track.releasePointerCapture(e.pointerId);if(!d.horizontal||!transition)return;const distance=Math.abs(transition.offset),elapsed=Math.max(1,e.timeStamp-d.time);settle(!cancel&&(distance>Math.max(45,.13*transition.width)||(distance>20&&distance/elapsed>.45)));};track.addEventListener('pointerup',e=>end(e,false));track.addEventListener('pointercancel',e=>end(e,true));
    addEventListener('resize',()=>{cancelSlide();});
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
      sourceTrigger=trigger;context=api.contextForPath(location.pathname)||'default';preferredId=reviewId||'';refresh();
      overlay.hidden=false;if(current)current.scrollTop=scrollPositions.get(current.dataset.reviewId)||0;sourceTrigger?.setAttribute('aria-expanded','true');hideChrome();lockPage();closeBtn.focus({preventScroll:true});
      requestAnimationFrame(()=>requestAnimationFrame(()=>{if(overlay.hidden||closing)return;overlay.classList.add('is-open','is-controls-visible');animateDismiss(true);}));
    }finally{opening=false;}
  }
  function close(){
    if(!overlay||overlay.hidden||closing)return;closing=true;clearTimeout(vipTimer);cancelSlide();rememberScroll();drag=null;
    window.TDBVIPDrawer?.reset?.();lock?.lenis?.stop();document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(n=>n.click());
    overlay.classList.remove('is-open','is-controls-visible');overlay.classList.add('is-closing');animateDismiss(false);sourceTrigger?.setAttribute('aria-expanded','false');
    closeTimer=setTimeout(()=>{overlay.hidden=true;overlay.classList.remove('is-closing');dismissAnimations.forEach(a=>a.cancel());dismissAnimations=[];unlockPage();closing=false;sourceTrigger?.focus({preventScroll:true});if(chrome)Object.assign(chrome,{waiting:true,y:scrollY,up:0,down:0});},600);
  }
  addEventListener('scroll',()=>{if(!chrome?.waiting||overlay&&!overlay.hidden)return;const dy=scrollY-chrome.y;chrome.y=scrollY;if(dy>0){chrome.up=0;chrome.down+=dy;}else if(dy<0){chrome.down=0;chrome.up-=dy;}if(chrome.up>120||chrome.down>140||scrollY<=40&&dy<0)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(overlay.hidden)releaseChrome();}));},{passive:true});
  document.addEventListener('focusin',e=>{if(chrome?.waiting&&e.target.closest?.('.navbar10_component,#tdb-vip-drawer'))releaseChrome();});
  addEventListener('click',e=>{if(chrome?.waiting&&/#vip/i.test(e.target.closest?.('a[href]')?.getAttribute('href')||''))releaseChrome();},true);
  window.TDBReviewDrawer=Object.freeze({version:'1.2.0',open,close});
})();
