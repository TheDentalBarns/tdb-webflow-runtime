/* TDB Patient Reviews v1.8.0 — staging-only, shared reviews and treatment-style mobile cards. */
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
    return list;
  }
  function safeURL(url) { try { const u=new URL(url);return u.protocol==='https:'?u.href:'';} catch (_) { return ''; } }
  if(typeof module==='object'&&module.exports){module.exports={chooseReviews,safeURL};return;}
  if(location.hostname!=='dentalbarns.webflow.io'||window.TDBReviewDrawer)return;
  const api=window.TDBPowerSnippets;
  if(!api)return;
  const style=document.createElement('style');style.dataset.tdbReviewDrawerStyles='1.8.0';style.textContent=__DRAWER_CSS__;document.head.append(style);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(label,cls,action)=>{const b=el('button',cls);b.type='button';b.setAttribute('aria-label',label);if(action)b.addEventListener('click',action);return b;};
  const arrow=()=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 16 16');s.setAttribute('aria-hidden','true');s.innerHTML='<path fill="currentColor" d="M12.6893 7.25L6.96967 1.53033L8.03033 0.469666L15.5607 8L8.03033 15.5303L6.96967 14.4697L12.6893 8.75H0.5V7.25H12.6893Z"/>';return s;};
  const clock=()=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 256 256');s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');s.innerHTML='<path fill="currentColor" d="M128 28a100 100 0 1 0 100 100A100.11 100.11 0 0 0 128 28m0 192a92 92 0 1 1 92-92a92.1 92.1 0 0 1-92 92m60-92a4 4 0 0 1-4 4h-56a4 4 0 0 1-4-4V72a4 4 0 0 1 8 0v52h52a4 4 0 0 1 4 4"/>';return s;};
  let dataPromise,data,overlay,panel,track,closeBtn,prev,next,position,quoteTimer=0;
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
  function reviewExcerpt(r,reviewContext=context){
    const selection=api.preview.contexts[reviewContext];
    if(selection?.id===r.id)return selection.excerpt;
    return r.excerpts[reviewContext]||r.excerpt;
  }
  function dateLabel(r){
    if(!r.date)return '';
    const d=new Date(r.date);if(Number.isNaN(d.getTime()))return '';
    return (r.approx?'Approx. ':'')+d.toLocaleDateString('en-GB',r.approx?{month:'long',year:'numeric'}:{day:'numeric',month:'short',year:'numeric'});
  }
  function makeSlide(r,options={}){
    const slide=el('article','tdb-rv-slide');slide.tabIndex=0;slide.dataset.reviewId=r.id;slide.setAttribute('aria-label','Review by '+r.name);slide.setAttribute('data-lenis-prevent','');
    const quote=el('div','tdb-rv-quote-layer'),mark=el('div','tdb-rv-mark');mark.innerHTML=api.quoteMark;mark.setAttribute('aria-hidden','true');quote.append(mark,el('blockquote','tdb-rv-quote-text',reviewExcerpt(r,options.context)));
    const by=el('div','tdb-rv-by'),identity=el('div','tdb-rv-identity'),date=el('div','tdb-rv-date'),time=el('time','',dateLabel(r));if(r.date)time.dateTime=r.date;date.append(clock(),time);identity.append(el('div','tdb-rv-name',r.name),date);
    const source=button(r.platform==='Doctify'?'About these Doctify reviews':'Open '+r.platform+' source','tdb-rv-source',()=>openSource(r,options.noteHost));const icon=api.sourceIcon(r.platform,false);icon.className='tdb-rv-platform-icon';icon.title=r.platform;source.append(icon,el('span','tdb-review-sr-only',r.platform),stars(r.rating,r.platform));by.append(identity,source);
    const body=el('div','tdb-rv-body');body.id=(options.embedded?'tdb-ri-body-':'tdb-rv-body-')+r.id;body.setAttribute('aria-label','Full review by '+r.name);body.append(el('p','',r.text));
    if(options.embedded){
      // The page card is a fixed preview; complete reviews remain in the shared drawer.
      slide.removeAttribute('tabindex');slide.removeAttribute('data-lenis-prevent');
      body.setAttribute('aria-label','Review preview by '+r.name);
      if(r.historic)identity.append(el('div','tdb-ri-historic','Dr Keely · previous practice'));
      const more=button('Read the full review by '+r.name,'tdb-ri-read-more',async()=>{
        if(options.isMoving?.())return;
        more.disabled=true;
        try{await open(more,r.id);}finally{more.disabled=false;}
      });
      more.textContent='Read more';more.setAttribute('aria-haspopup','dialog');more.setAttribute('aria-expanded','false');
      slide.append(quote,by,body,more);return slide;
    }
    slide.append(quote,by);if(r.historic)slide.append(el('div','tdb-rv-historic','Dr Keely · review from a previous practice'));slide.append(body);
    if(r.showResponse&&r.response){const response=el('aside','tdb-rv-response');response.setAttribute('aria-label','The Dental Barns response');response.append(el('p','',r.response));slide.append(response);}

    body.tabIndex=0;body.setAttribute('role',r.platform==='Doctify'?'button':'link');body.setAttribute('aria-label',r.platform==='Doctify'?'Read about this Doctify review':'Open '+r.platform+' source for this review');
    let start=null;body.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};},{passive:true});
    body.addEventListener('click',e=>{if(transition||options.isMoving?.()||window.getSelection()?.toString()||start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>10)return;openSource(r,options.noteHost);});
    body.addEventListener('keydown',e=>{if(e.key==='Enter'||r.platform==='Doctify'&&e.key===' '){e.preventDefault();openSource(r,options.noteHost);}});

    return slide;
  }
  let sourceNote;
  function openSource(r,noteHost=panel){
    if(r.platform!=='Doctify'){
      const url=safeURL(r.url)||(r.platform==='Facebook'?'https://www.facebook.com/thedentalbarns/reviews/':r.platform==='Google'?'https://maps.app.goo.gl/pNwZ1zif6LhHUfr1A':'');
      if(url)window.open(url,'_blank','noopener,noreferrer');return;
    }
    if(!sourceNote){
      sourceNote=el('dialog','tdb-rv-note');sourceNote.setAttribute('aria-labelledby','tdb-rv-note-title');
      const heading=el('h3','','About these Doctify reviews');heading.id='tdb-rv-note-title';
      sourceNote.append(heading,el('p','','These reviews are from genuine patients and were SMS-verified by Doctify. We’re proud of the feedback Dr Keely received.'),
        el('p','','Dr Keely chose not to renew her Doctify subscription, so these historic reviews are not currently published there. Copies are available on request.'),
        el('p','tdb-rv-note-small','This feedback relates to care Dr Keely provided at previous practices.'));
      const done=button('Close review information','tdb-rv-note-close',()=>sourceNote.close());done.textContent='Close';sourceNote.append(done);
      sourceNote.addEventListener('keydown',e=>e.stopPropagation());
      sourceNote.addEventListener('click',e=>{if(e.target===sourceNote){const b=sourceNote.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)sourceNote.close();}});
    }
    (noteHost||document.body).append(sourceNote);
    sourceNote.showModal();
  }
  function rememberScroll(){if(current)scrollPositions.set(current.dataset.reviewId,current.scrollTop);}
  function hideQuoteText(){clearTimeout(quoteTimer);current?.querySelector('.tdb-rv-quote-text')?.classList.remove('is-visible');}
  function showQuoteText(delay=100){hideQuoteText();const text=current?.querySelector('.tdb-rv-quote-text');quoteTimer=setTimeout(()=>{if(!closing&&text)text.classList.add('is-visible');},delay);}
  function setCurrent(slide,delay=100){track.replaceChildren(slide);current=slide;slide.style.removeProperty('transform');slide.inert=false;slide.removeAttribute('aria-hidden');slide.scrollTop=scrollPositions.get(slide.dataset.reviewId)||0;track.removeAttribute('aria-busy');updatePosition();showQuoteText(delay);}
  function updatePosition(){position.textContent=list.length?(index+1)+' / '+list.length:'0 reviews';prev.disabled=index<=0;next.disabled=index>=list.length-1;}
  function cancelSlide(){if(!transition)return;transition.animations.forEach(a=>a.cancel());transition=null;drag=null;if(current)setCurrent(current);}
  function beginSlide(direction){
    if(closing||transition||!list[index+direction])return null;
    hideQuoteText();rememberScroll();const width=track.clientWidth,incoming=makeSlide(list[index+direction]);incoming.inert=true;incoming.setAttribute('aria-hidden','true');incoming.style.transform='translate3d('+(direction*width)+'px,0,0)';track.append(incoming);incoming.scrollTop=scrollPositions.get(incoming.dataset.reviewId)||0;track.setAttribute('aria-busy','true');
    transition={from:current,to:incoming,direction,width,offset:0,animations:[],settling:false};return transition;
  }
  function translate(t,offset){t.offset=offset;t.from.style.transform='translate3d('+offset+'px,0,0)';t.to.style.transform='translate3d('+(t.direction*t.width+offset)+'px,0,0)';}
  async function settle(commit){
    const t=transition;if(!t||t.settling)return;t.settling=true;
    const dest=commit?-t.direction*t.width:0,duration=Math.max(120,Math.min(400,400*Math.abs(dest-t.offset)/t.width));
    if(duration){t.animations=[t.from.animate([{transform:'translate3d('+t.offset+'px,0,0)'},{transform:'translate3d('+dest+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'}),t.to.animate([{transform:'translate3d('+(t.direction*t.width+t.offset)+'px,0,0)'},{transform:'translate3d('+(t.direction*t.width+dest)+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'})];await Promise.all(t.animations.map(a=>a.finished.catch(()=>{})));}
    if(transition!==t)return;transition=null;t.animations.forEach(a=>a.cancel());if(commit)index+=t.direction;
    if(t.from.contains(document.activeElement))closeBtn.focus({preventScroll:true});setCurrent(commit?t.to:t.from,commit?(t.direction<0?140:100):60);
  }
  function step(direction){
    drag=null;if(closing)return;
    if(transition){const t=transition;transition=null;t.animations.forEach(a=>a.cancel());index+=t.direction;setCurrent(t.to);}
    if(beginSlide(direction))settle(true);
  }
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
    const summary=el('div','tdb-rv-summary'),scoreStars=stars(5,'Combined');scoreStars.setAttribute('aria-label',data.average.toFixed(2)+' out of 5');summary.append(el('strong','',data.average.toFixed(2)),scoreStars,el('span','tdb-rv-total',data.total+' reviews'));header.append(top,summary);
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
      overlay.classList.toggle('is-desktop',matchMedia('(min-width:768px)').matches&&new URLSearchParams(location.search).get('review-preview')!=='mobile');
      sourceTrigger=trigger;context=api.contextForPath(location.pathname)||'default';preferredId=reviewId||'';refresh();
      overlay.hidden=false;if(current)current.scrollTop=scrollPositions.get(current.dataset.reviewId)||0;hideQuoteText();sourceTrigger?.setAttribute('aria-expanded','true');hideChrome();lockPage();closeBtn.focus({preventScroll:true});
      requestAnimationFrame(()=>requestAnimationFrame(()=>{if(overlay.hidden||closing)return;overlay.classList.add('is-open','is-controls-visible');animateDismiss(true);showQuoteText(500);}));
    }finally{opening=false;}
  }
  function close(){
    if(!overlay||overlay.hidden||closing)return;closing=true;clearTimeout(vipTimer);cancelSlide();hideQuoteText();rememberScroll();drag=null;
    window.TDBVIPDrawer?.reset?.();lock?.lenis?.stop();document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(n=>n.click());
    overlay.classList.remove('is-open','is-controls-visible');overlay.classList.add('is-closing');animateDismiss(false);sourceTrigger?.setAttribute('aria-expanded','false');
    const desktop=overlay.classList.contains('is-desktop');
    closeTimer=setTimeout(()=>{overlay.hidden=true;overlay.classList.remove('is-closing');dismissAnimations.forEach(a=>a.cancel());dismissAnimations=[];unlockPage();closing=false;sourceTrigger?.focus({preventScroll:true});if(desktop)releaseChrome();else if(chrome)Object.assign(chrome,{waiting:true,y:scrollY,up:0,down:0});},desktop?420:600);
  }
  // Embedded previews share content with the drawer and open the exact selected review.
  // Keep only the visible cards and their neighbours in the DOM.
  async function mountEmbedded(root){
    if(root.dataset.reviewMounted)return;
    const snapshot=await getData();
    const reviewContext=api.contextForPath(location.pathname)||'default';
    const records=chooseReviews(snapshot.records,{context:reviewContext});
    if(!records.length)throw Error('No reviews available.');
    root.dataset.reviewMounted='true';root.removeAttribute('aria-busy');
    const viewport=el('div','tdb-ri-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Patient review cards');
    const nav=el('div','tdb-ri-navigation'),count=el('div','tdb-ri-position'),arrows=el('div','swiper-buttons-wrapper');
    count.setAttribute('role','status');count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');
    const previous=button('Previous patient reviews','slider-arrow swiper-btn-prev is-dark',()=>move(-1));
    const following=button('Next patient reviews','slider-arrow swiper-btn-next is-dark',()=>move(1));
    previous.append(arrow());following.append(arrow());arrows.append(previous,following);nav.append(count,arrows);
    root.replaceChildren(viewport,nav);
    const cells=new Map();
    let active=0,perView=1,stride=0,width=0,height=0,centre=0,compact=false,moving=null,dragging=null,reveal=0,suppressUntil=0;
    const recordIndex=i=>(i%records.length+records.length)%records.length;
    const last=()=>Math.max(0,records.length-perView);
    const isMoving=()=>Boolean(moving||dragging?.horizontal)||performance.now()<suppressUntil;
    function cell(i){
      if(cells.has(i))return cells.get(i);
      const wrapper=el('div','tdb-ri-cell swiper-slide');
      wrapper.setAttribute('role','group');wrapper.setAttribute('aria-roledescription','slide');wrapper.setAttribute('aria-label',(recordIndex(i)+1)+' of '+records.length);
      const card=makeSlide(records[recordIndex(i)],{embedded:true,context:reviewContext,noteHost:root,isMoving});card.classList.add('tdb-ri-card');
      wrapper.append(card);viewport.append(wrapper);cells.set(i,wrapper);return wrapper;
    }
    function around(from,to=from){
      const low=compact?Math.min(from,to)-1:Math.max(0,Math.min(from,to)-1),high=compact?Math.max(from,to)+1:Math.min(records.length-1,Math.max(from,to)+perView);
      for(let i=low;i<=high;i++)cell(i);
      cells.forEach((n,i)=>{if(i<low||i>high){n.remove();cells.delete(i);}});
    }
    function revealQuotes(delay=100){
      clearTimeout(reveal);reveal=setTimeout(()=>cells.forEach((n,i)=>n.querySelector('.tdb-rv-quote-text').classList.toggle('is-visible',compact||i>=active&&i<active+perView)),delay);
    }
    function hideQuotes(){clearTimeout(reveal);if(!compact)cells.forEach(n=>n.querySelector('.tdb-rv-quote-text').classList.remove('is-visible'));}
    function markCurrent(target){cells.forEach((n,i)=>n.classList.toggle('is-current',i>=target&&i<target+perView));}
    function updateArrows(target){previous.disabled=compact?records.length<2:target===0;following.disabled=compact?records.length<2:target===last();}
    function fitPreview(n){
      const body=n.querySelector('.tdb-rv-body'),text=body.firstElementChild;
      n.style.setProperty('--ri-body-lines',Math.max(1,Math.floor(body.clientHeight/parseFloat(getComputedStyle(text).lineHeight))));
      const quote=n.querySelector('.tdb-rv-quote-layer'),mark=quote.firstElementChild,copy=quote.lastElementChild,css=getComputedStyle(quote);
      const available=quote.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-mark.getBoundingClientRect().height-parseFloat(css.rowGap);
      n.style.setProperty('--ri-quote-lines',Math.max(1,Math.min(6,Math.floor(available/parseFloat(getComputedStyle(copy).lineHeight)))));
    }
    function paint(){
      around(active);
      cells.forEach((n,i)=>{const visible=i>=active&&i<active+perView;n.style.width=width+'px';n.style.transform='translate3d('+((i-active)*stride+centre)+'px,0,0)';n.inert=!visible;n.setAttribute('aria-hidden',String(!visible));});
      markCurrent(active);
      cells.forEach(fitPreview);
      const first=recordIndex(active),end=Math.min(records.length,first+perView);
      count.textContent=String(first+1).padStart(2,'0')+(perView>1?'–'+String(end).padStart(2,'0'):'')+' / '+records.length;
      updateArrows(active);
    }
    function finish(){
      if(!moving)return;
      const m=moving;moving=null;m.animations.forEach(a=>a.cancel());active=m.target;paint();revealQuotes(60);
    }
    function go(target,offset=0){
      finish();if(!compact)target=Math.max(0,Math.min(last(),target));
      if(target===active&&!offset){revealQuotes(60);return;}
      around(active,target);hideQuotes();
      if(cells.get(active)?.contains(document.activeElement)&&target!==active)viewport.focus({preventScroll:true});
      const direction=target<active?-1:1;
      const duration=Math.max(120,Math.min(400,400*Math.abs((target-active)*stride-offset)/Math.max(1,stride)));
      const animations=[];
      cells.forEach((n,i)=>{n.style.width=width+'px';n.inert=true;fitPreview(n);animations.push(n.animate([{transform:'translate3d('+((i-active)*stride+centre+offset)+'px,0,0)'},{transform:'translate3d('+((i-target)*stride+centre)+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'}));});
      markCurrent(target);
      // Allow another arrow press before this transition finishes.
      updateArrows(target);
      const state=moving={target,animations};
      Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(moving!==state)return;finish();revealQuotes(direction<0?140:100);});
    }
    function move(direction){finish();go(active+direction);}
    function measure(){
      const measured=viewport.clientWidth,measuredHeight=viewport.clientHeight,nextCompact=root.clientWidth<=767,nextPerView=nextCompact?1:measured>=1000?3:measured>=680?2:1;
      const gap=nextCompact?measured*.02:parseFloat(getComputedStyle(root).getPropertyValue('--ri-gap'))||20;
      const nextWidth=nextCompact?root.clientWidth:(measured-gap*(nextPerView-1))/nextPerView,nextCentre=nextCompact?(measured-nextWidth)/2:0;
      if(nextCompact===compact&&nextPerView===perView&&Math.abs(nextWidth-width)<.5&&Math.abs(measuredHeight-height)<.5&&Math.abs(nextCentre-centre)<.5)return;
      finish();dragging=null;compact=nextCompact;root.classList.toggle('is-compact',compact);perView=nextPerView;width=nextWidth;height=measuredHeight;centre=nextCentre;stride=width+gap;active=compact?recordIndex(active):Math.min(recordIndex(active),last());paint();revealQuotes(0);
    }
    viewport.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||e.target.closest('button,a,dialog'))return;finish();dragging={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,time:e.timeStamp,horizontal:false};});
    viewport.addEventListener('pointermove',e=>{
      const g=dragging;if(!g||g.id!==e.pointerId)return;
      let dx=e.clientX-g.x;const dy=e.clientY-g.y;
      if(!g.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){dragging=null;return;}if(Math.abs(dx)<12||Math.abs(dx)<1.3*Math.abs(dy))return;g.horizontal=true;viewport.setPointerCapture(e.pointerId);hideQuotes();}
      e.preventDefault();if(!compact&&(active===0&&dx>0||active===last()&&dx<0))dx*=.2;
      g.dx=Math.max(-stride,Math.min(stride,dx));cells.forEach((n,i)=>n.style.transform='translate3d('+((i-active)*stride+centre+g.dx)+'px,0,0)');
      if(compact)markCurrent(active+Math.round(-g.dx/stride));
    },{passive:false});
    function end(e,cancel){
      const g=dragging;if(!g||g.id!==e.pointerId)return;dragging=null;
      if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
      if(!g.horizontal){if(compact&&!cancel){const x=e.clientX-viewport.getBoundingClientRect().left;if(x<centre)go(active-1);else if(x>centre+width)go(active+1);}return;}suppressUntil=performance.now()+600;
      const distance=Math.abs(g.dx),elapsed=Math.max(1,e.timeStamp-g.time);
      const commit=!cancel&&(distance>Math.max(40,.13*stride)||distance>20&&distance/elapsed>.45);
      go(active+(commit?(g.dx<0?1:-1):0),g.dx);
    }
    viewport.addEventListener('pointerup',e=>end(e,false));viewport.addEventListener('pointercancel',e=>end(e,true));
    root.addEventListener('keydown',e=>{if(e.target.closest('dialog'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
    new ResizeObserver(measure).observe(viewport);measure();document.fonts?.ready.then(()=>cells.forEach(fitPreview));
  }
  addEventListener('scroll',()=>{if(!chrome?.waiting||overlay&&!overlay.hidden)return;const dy=scrollY-chrome.y;chrome.y=scrollY;if(dy>0){chrome.up=0;chrome.down+=dy;}else if(dy<0){chrome.down=0;chrome.up-=dy;}if(chrome.up>120||chrome.down>140||scrollY<=40&&dy<0)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(overlay.hidden)releaseChrome();}));},{passive:true});
  document.addEventListener('focusin',e=>{if(chrome?.waiting&&e.target.closest?.('.navbar10_component,#tdb-vip-drawer'))releaseChrome();});
  addEventListener('click',e=>{if(chrome?.waiting&&/#vip/i.test(e.target.closest?.('a[href]')?.getAttribute('href')||''))releaseChrome();},true);
  window.TDBReviewDrawer=Object.freeze({version:'1.8.0',open,close,mountEmbedded});
})();
