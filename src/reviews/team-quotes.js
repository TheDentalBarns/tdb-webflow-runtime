/* Team quotes: approved CMS wording, exclusive page assignment, shared slider feel. */
(function () {
  'use strict';
  const routes = {
    home: '/', 'first-visit': '/first-visit', contact: '/contact', location: '/location',
    cosmetic: '/services/cosmetic-dentist', nervous: '/services/nervous-patient-care',
    'nervous-patient-care': '/services/nervous-patient-care',
    restorative: '/services/general-dentistry', hygiene: '/services/hygiene-care',
    'signature-assessment': '/services/signature-assessment', 'smile-design': '/services/smile-design',
    local: '/services/dentist-near-me', 'dentist-near-me': '/services/dentist-near-me',
    'facial-aesthetics': '/services/facial-aesthetics'
  };
  function path(value) { return String(value || '/').trim().toLowerCase().replace(/\/+$/, '') || '/'; }
  function assignedPage(record) {
    if (record.page && record.page.trim()) return path(record.page);
    const tag = (record.tags || []).find(t => routes[t]);
    return tag ? routes[tag] : null;
  }
  function chooseTeamQuotes(records, pathname) {
    const seen = new Set();
    return records.filter(r => r.active !== false && r.text && r.author)
      .sort((a,b) => (Number(a.rank) || 999) - (Number(b.rank) || 999) || a.id.localeCompare(b.id))
      .filter(r => {
        const key = r.text.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key); return true;
      })
      .filter(r => assignedPage(r) === path(pathname)).slice(0,3);
  }
  function opacityAtProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    return p < .5 ? p : p <= .75 ? .5 : .5 - (p - .75) * 1.6;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { chooseTeamQuotes, assignedPage }; return;
  }
  if (location.hostname !== 'dentalbarns.webflow.io' || window.TDBTeamQuotes) return;
  const css = document.createElement('style');
  css.dataset.tdbTeamQuoteStyles = '1.0.0'; css.textContent = __TEAM_QUOTES_CSS__; document.head.append(css);
  const animated = [];
  let frame = 0;
  function fade() {
    frame = 0; let pending = false;
    animated.forEach(item => {
      const target = opacityAtProgress((innerHeight - item.el.getBoundingClientRect().top) / innerHeight);
      item.opacity += (target - item.opacity) * .5;
      if (Math.abs(target - item.opacity) < .002) item.opacity = target; else pending = true;
      item.el.style.opacity = item.opacity.toFixed(3);
    });
    if (pending) frame = requestAnimationFrame(fade);
  }
  function scheduleFade() { if (!frame) frame = requestAnimationFrame(fade); }
  function element(tag, className, text) {
    const el = document.createElement(tag); el.className = className || '';
    if (text !== undefined) el.textContent = text; return el;
  }
  function readFeed(feed) {
    const records = [];
    feed.querySelectorAll('.w-dyn-item').forEach(item => {
      const author = item.querySelector('[data-tdb-team-author]')?.textContent.trim();
      const role = item.querySelector('[data-tdb-team-role]')?.textContent.trim() || '';
      const content = item.querySelector('[data-tdb-team-quote-content]');
      if (!author || !content || author.includes('{{wf')) return;
      let record;
      content.querySelectorAll('h3,blockquote,p').forEach(node => {
        if (node.tagName === 'P' && node.closest('blockquote')) return;
        const text = node.textContent.trim();
        if (node.tagName === 'H3') {
          record = {id:author + ':' + text, label:text, author, role, text:'', tags:[], page:'', rank:999, active:true};
          records.push(record);
        } else if (record && node.tagName === 'BLOCKQUOTE') record.text = text;
        else if (record && node.tagName === 'P') {
          const match = text.match(/^(Tags|Page|Rank|Active):\s*(.*)$/i);
          if (!match) return;
          const key = match[1].toLowerCase(), value = match[2].trim();
          if (key === 'tags') record.tags = value.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
          if (key === 'page') record.page = value;
          if (key === 'rank') record.rank = Number(value) || 999;
          if (key === 'active') record.active = !/^(no|false|off|0)$/i.test(value);
        }
      });
    });
    return records;
  }
  function mount(old, records, section) {
    const root = element('div','tdb-review-carousel tdb-team-quotes');
    root.setAttribute('role','region'); root.setAttribute('aria-label','From our team'); root.setAttribute('aria-roledescription','carousel');
    root.dataset.tdbTeamQuotes = '1.0.0'; root.dataset.quoteCount = records.length;
    const viewport = element('div','tdb-rc-viewport'), dots = element('div','tdb-rc-dots');
    viewport.tabIndex = 0; viewport.setAttribute('aria-label','Team quotes. Use left and right arrow keys to change quote.');
    let active=0, timer=0, reveal=0, moving=null, gesture=null, inView=false, hover=false, focused=false, paused=false;
    const slides = records.map((record,i) => {
      const card = element('div','tdb-rc-card'); card.dataset.quoteId = record.id;
      card.setAttribute('role','group'); card.setAttribute('aria-roledescription','slide'); card.setAttribute('aria-label',(i+1)+' of '+records.length);
      const content = element('div','tdb-rc-open');
      content.append(element('p','tdb-rc-quote text-size-large',record.text));
      const name = element('div','tdb-rc-name text-style-tagline-restored',record.author + (record.role ? ', ' + record.role : ''));
      name.style.opacity='0'; content.append(name); animated.push({el:name,opacity:0});
      card.append(content); viewport.append(card); return card;
    });
    const controls = records.map((record,i) => {
      const button=element('button','tdb-rc-dot'); button.type='button'; button.setAttribute('aria-label','Show team quote '+(i+1)+' of '+records.length); button.append(element('span'));
      button.addEventListener('click',()=>{const current=moving?moving.target:active;go(i,i<current?-1:1);}); dots.append(button); return button;
    });
    const pause=element('button','tdb-rc-pause tdb-review-sr-only','Pause rotating quotes'); pause.type='button';
    pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume rotating quotes':'Pause rotating quotes';schedule();});
    root.append(viewport); if (records.length>1) root.append(dots,pause);
    function paint() {
      slides.forEach((node,i)=>{node.inert=i!==active;node.setAttribute('aria-hidden',String(i!==active));node.style.transform='translateX('+(i===active?0:100)+'%)';node.style.visibility=i===active?'visible':'hidden';});
      controls.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===active)));
      scheduleFade();
    }
    function settle(delay=100) {
      clearTimeout(reveal); const target=active;
      reveal=setTimeout(()=>{if(!moving&&!gesture&&active===target)slides[target].classList.add('is-settled');},delay);
    }
    function schedule() {
      clearTimeout(timer);
      if (records.length>1&&inView&&!hover&&!focused&&!paused&&!document.hidden) timer=setTimeout(()=>{
        if(document.querySelector('[data-tdb-review-overlay]:not([hidden])')){schedule();return;}
        go((active+1)%slides.length,1);
      },5000);
    }
    function finish() { if(!moving)return;const state=moving;moving=null;state.animations.forEach(a=>a.cancel());active=state.target;paint(); }
    function go(target,direction=1,offset=0) {
      clearTimeout(reveal); clearTimeout(timer); finish();
      if(target===active){paint();settle();schedule();return;}
      const from=slides[active],to=slides[target],width=viewport.clientWidth;
      slides.forEach(n=>n.classList.remove('is-settled')); to.style.visibility='visible';to.inert=true;
      const duration=Math.max(120,400*(1-Math.min(Math.abs(offset)/width,.8)));
      const animations=[from.animate([{transform:'translateX('+offset+'px)'},{transform:'translateX('+(-direction*width)+'px)'}],{duration,easing:'ease',fill:'forwards'}),to.animate([{transform:'translateX('+(direction*width+offset)+'px)'},{transform:'translateX(0px)'}],{duration,easing:'ease',fill:'forwards'})];
      const state=moving={target,animations};
      Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(moving!==state)return;finish();settle(direction<0?140:100);schedule();});
    }
    viewport.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0||records.length<2)return;
      finish();clearTimeout(timer);clearTimeout(reveal);gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false};
    });
    viewport.addEventListener('pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.horizontal){
        if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;paint();settle();schedule();return;}
        if(Math.abs(dx)<12)return;
        gesture.horizontal=true;viewport.setPointerCapture(event.pointerId);slides.forEach(n=>n.classList.remove('is-settled'));
      }
      event.preventDefault();gesture.dx=dx;
      const direction=dx<0?1:-1,target=(active+direction+slides.length)%slides.length;
      slides.forEach((node,i)=>{if(i!==active&&i!==target)node.style.visibility='hidden';});
      slides[active].style.transform='translateX('+dx+'px)';slides[target].style.visibility='visible';slides[target].style.transform='translateX('+(direction*viewport.clientWidth+dx)+'px)';
    },{passive:false});
    function end(event,cancel) {
      if(!gesture||gesture.id!==event.pointerId)return;
      const previous=gesture;gesture=null;if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
      const direction=previous.dx<0?1:-1;
      if(previous.horizontal&&!cancel&&Math.abs(previous.dx)>40)go((active+direction+slides.length)%slides.length,direction,previous.dx);
      else {paint();settle(60);schedule();}
    }
    viewport.addEventListener('pointerup',event=>end(event,false));viewport.addEventListener('pointercancel',event=>end(event,true));
    root.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const direction=event.key==='ArrowRight'?1:-1;finish();go((active+direction+slides.length)%slides.length,direction);}});
    root.addEventListener('mouseenter',()=>{hover=true;clearTimeout(timer);});root.addEventListener('mouseleave',()=>{hover=false;schedule();});
    root.addEventListener('focusin',()=>{focused=true;clearTimeout(timer);});root.addEventListener('focusout',()=>requestAnimationFrame(()=>{focused=root.contains(document.activeElement);schedule();}));
    document.addEventListener('visibilitychange',schedule);
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.25}).observe(root);
    old.replaceWith(root);section.removeAttribute('data-tdb-team-quote-pending');
    const ornament=root.parentElement.querySelector('.testimonial_wrapper .icon-embed-medium');
    function centre(){if(!ornament)return;root.style.setProperty('--tdb-rc-star-gap',Math.max(0,root.getBoundingClientRect().top-ornament.getBoundingClientRect().bottom)+'px');}
    centre();new ResizeObserver(centre).observe(root.parentElement);document.fonts?.ready.then(centre);
    paint();settle(0);
  }
  function init() {
    document.querySelectorAll('.section_standard-testimonial').forEach(section=>{
      if(section.querySelector('.testimonial15_rating-wrapper')){section.removeAttribute('data-tdb-team-quote-pending');return;}
      const old=section.querySelector('.testimonial_slider.w-slider');if(!old)return;
      // Webflow's CMS field bindings resolve at page scope, outside components.
      const feed=document.querySelector('[data-tdb-team-quote-feed]');if(!feed)return;
      const all=readFeed(feed);
      if(!all.length){section.removeAttribute('data-tdb-team-quote-pending');return;}
      const records=chooseTeamQuotes(all,location.pathname);
      if(!records.length){section.hidden=true;section.dataset.tdbTeamQuotesEmpty='';return;}
      mount(old,records,section);
    });
  }
  addEventListener('scroll',scheduleFade,{passive:true});addEventListener('resize',scheduleFade,{passive:true});addEventListener('pageshow',scheduleFade);
  window.TDBTeamQuotes=Object.freeze({version:'1.0.0'});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
