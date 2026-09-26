/* TDB Power Snippets v1.1.0 — staging design preview, no carousel. */
(function () {
  'use strict';
  function contextForPath(path) {
    path = path.toLowerCase().replace(/\/+$/, '') || '/';
    if (/facial-aesthetics/.test(path)) return null;
    if (path === '/location') return 'location';
    if (/nervous/.test(path)) return 'nervous';
    if (/invisalign/.test(path)) return 'invisalign';
    if (/clear-aligners/.test(path)) return 'clear-aligners';
    if (/composite-bonding/.test(path)) return 'bonding';
    if (/veneers/.test(path)) return 'veneers';
    if (/whitening/.test(path)) return 'whitening';
    if (/hygiene/.test(path)) return 'hygiene';
    if (/signature-assessment|fast-track|first-visit/.test(path)) return 'assessment';
    if (/general-dentistry|restorative/.test(path)) return 'restorative';
    if (/smile-design/.test(path)) return 'smile-design';
    if (/cosmetic/.test(path)) return 'cosmetic';
    if (/^\/vip\//.test(path)) return 'vip';
    return 'default';
  }
  // Matches the existing IX2 “DD - Text Effect” opacity keyframes.
  function opacityAtProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    return p < .5 ? p : p <= .75 ? .5 : .5 - (p - .75) * 1.6;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { contextForPath, opacityAtProgress };
    return;
  }
  // A later production publication must not enable this draft preview.
  if (!['dentalbarns.webflow.io','thedentalbarns.com','www.thedentalbarns.com','thedentalbarns.co.uk','www.thedentalbarns.co.uk'].includes(location.hostname) || window.TDBPowerSnippets) return;
  const version = '1.2.0';
  const platformIcons = __PLATFORM_ICONS__;
  const dataNode = document.querySelector('[data-tdb-review-preview-data]');
  if (!dataNode) return;
  let data;
  try { data = JSON.parse(dataNode.textContent); } catch (_) { return; }
  if (data.mode !== 'staging-snapshot') return;
  // Bundled critical CSS is installed before any review DOM becomes visible.
  // The Webflow embed runs this inline during parsing, with no CDN round trip.
  const css = document.createElement('style');
  css.dataset.tdbReviewStyles = version;
  css.textContent = __CRITICAL_CSS__;
  document.head.append(css);
  const QUOTE_MARK = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" role=\"img\" class=\"iconify iconify--bx\" width=\"100%\" height=\"100%\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M6.5 10c-.223 0-.437.034-.65.065c.069-.232.14-.468.254-.68c.114-.308.292-.575.469-.844c.148-.291.409-.488.601-.737c.201-.242.475-.403.692-.604c.213-.21.492-.315.714-.463c.232-.133.434-.28.65-.35l.539-.222l.474-.197l-.485-1.938l-.597.144c-.191.048-.424.104-.689.171c-.271.05-.56.187-.882.312c-.318.142-.686.238-1.028.466c-.344.218-.741.4-1.091.692c-.339.301-.748.562-1.05.945c-.33.358-.656.734-.909 1.162c-.293.408-.492.856-.702 1.299c-.19.443-.343.896-.468 1.336c-.237.882-.343 1.72-.384 2.437c-.034.718-.014 1.315.028 1.747c.015.204.043.402.063.539l.025.168l.026-.006A4.5 4.5 0 1 0 6.5 10zm11 0c-.223 0-.437.034-.65.065c.069-.232.14-.468.254-.68c.114-.308.292-.575.469-.844c.148-.291.409-.488.601-.737c.201-.242.475-.403.692-.604c.213-.21.492-.315.714-.463c.232-.133.434-.28.65-.35l.539-.222l.474-.197l-.485-1.938l-.597.144c-.191.048-.424.104-.689.171c-.271.05-.56.187-.882.312c-.317.143-.686.238-1.028.467c-.344.218-.741.4-1.091.692c-.339.301-.748.562-1.05.944c-.33.358-.656.734-.909 1.162c-.293.408-.492.856-.702 1.299c-.19.443-.343.896-.468 1.336c-.237.882-.343 1.72-.384 2.437c-.034.718-.014 1.315.028 1.747c.015.204.043.402.063.539l.025.168l.026-.006A4.5 4.5 0 1 0 17.5 10z\" fill=\"currentColor\"></path></svg>";
  const DOCTIFY_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 42 42\" fill=\"#fff\" width=\"100%\" height=\"100%\" aria-hidden=\"true\" focusable=\"false\">\n    <path d=\"M27.888 5.277c-4.948-.517-7.311 3.558-9.925 4.379a8.437 8.437 0 0 1-.914.021c.014.005.028.012.042.016 2.73.236 6.145-1.23 9.742 1.73 6.453 5.312 2.005 15.359-9.25 19.367a28.16 28.16 0 0 0 2.295.697c1.538.397 3.192.024 4.496-.888C38.28 20.855 38.076 6.347 27.888 5.277z\" fill=\"#00E5D0\" />\n    <path d=\"M27.888 5.277c-4.948-.517-7.311 3.558-9.925 4.379a8.437 8.437 0 0 1-.914.021c.014.005.028.012.042.016 2.73.236 6.145-1.23 9.742 1.73 6.453 5.312 2.005 15.359-9.25 19.367a28.16 28.16 0 0 0 2.295.697c1.538.397 3.192.024 4.496-.888C38.28 20.855 38.076 6.347 27.888 5.277z\" fill=\"url(#a)\" />\n    <path d=\"M7.321 5.277c4.947-.517 7.311 3.558 9.925 4.379.296.026.601.028.913.021-.014.005-.027.012-.041.016-2.73.236-6.146-1.23-9.742 1.73-6.453 5.312-2.005 15.359 9.249 19.367-.735.259-1.501.492-2.294.697-1.538.397-3.192.024-4.497-.888C-3.07 20.855-2.867 6.347 7.321 5.277z\" fill=\"url(#b)\" />\n    <path d=\"M17.585 30.79a30.87 30.87 0 0 1-2.399.737C7.493 27.925 3.303 21.452 5.312 16.469c-.677 5.202 3.962 11.402 12.273 14.321z\" fill=\"url(#c)\" />\n    <path d=\"M26.833 11.423c-3.597-2.961-7.013-1.494-9.742-1.73-.014-.005-.028-.012-.042-.016-2.56-.056-5.622-.93-8.828 1.711-6.471 5.33-1.973 15.422 9.36 19.402 11.257-4.008 15.705-14.055 9.252-19.367z\" fill=\"url(#d)\" />\n    <path d=\"M12.872 3.953c-1.505-.842-1.694-2.681-.199-2.979a5.078 5.078 0 0 1 3.755.72c1.9 1.232 2.391 4.324 1.49 6.197-.192.398-.715.372-.979.019-1.119-1.503-2.563-3.114-4.067-3.957z\" fill=\"url(#e)\" />\n    <defs>\n        <radialGradient id=\"a\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"rotate(-33.658 34.068 -24.922) scale(22.8641 23.0496)\">\n            <stop offset=\".537\" stop-color=\"#1CDFCD\" />\n            <stop offset=\"1\" stop-color=\"#00AA9C\" />\n        </radialGradient>\n        <radialGradient id=\"b\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"rotate(178.58 9 5.763) scale(18.1446 18.2918)\">\n            <stop stop-color=\"#1DDFCE\" />\n            <stop offset=\".992\" stop-color=\"#2B5AE0\" />\n        </radialGradient>\n        <radialGradient id=\"d\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"rotate(-151.073 18.22 8.492) scale(25.7248 25.9335)\">\n            <stop offset=\".088\" stop-color=\"#2B59E0\" />\n            <stop offset=\".797\" stop-color=\"#1DDFCE\" />\n        </radialGradient>\n        <radialGradient id=\"e\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"matrix(6.88307 4.5002 -4.353 6.65794 13.462 3.598)\">\n            <stop offset=\".192\" stop-color=\"#2B59E0\" />\n            <stop offset=\".793\" stop-color=\"#1DDFCE\" />\n        </radialGradient>\n        <linearGradient id=\"c\" x1=\"15.396\" y1=\"30.976\" x2=\"5.758\" y2=\"21.463\" gradientUnits=\"userSpaceOnUse\">\n            <stop stop-color=\"#2B59E0\" />\n            <stop offset=\"1\" stop-color=\"#071037\" stop-opacity=\"0\" />\n        </linearGradient>\n    </defs>\n</svg>";
  let svgSerial = 0;
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function sourceIcon(platform, grayscale) {
    const icon = element('span', 'tdb-review-source-icon' + (grayscale ? ' is-grayscale' : ''));
    icon.setAttribute('aria-hidden', 'true');
    let svg;
    if (platform === 'Doctify') {
      const template = document.createElement('template');
      template.innerHTML = DOCTIFY_SVG;
      svg = template.content.firstElementChild;
    } else {
      // Reuse the actual coloured SVG already drawn in the review badge.
      const originals = [...document.querySelectorAll('.button.is-review .vendor svg')];
      const original = originals.find(el => (el.getAttribute('data-src') || '').includes('-' + platform.toLowerCase() + '-'));
      svg = original?.cloneNode(true);
      if(!svg&&platformIcons[platform]){const template=document.createElement('template');template.innerHTML=platformIcons[platform];svg=template.content.firstElementChild;}
    }
    if (svg) {
      // Preserve gradients while avoiding duplicate IDs in cloned SVGs.
      const prefix = 'tdb-review-svg-' + (++svgSerial) + '-';
      const ids = new Map([...svg.querySelectorAll('[id]')].map(el => [el.id, prefix + el.id]));
      svg.querySelectorAll('*').forEach(el => {
        for (const attr of [...el.attributes]) {
          let value = attr.value;
          ids.forEach((replacement, old) => {
            value = value.split('url(#' + old + ')').join('url(#' + replacement + ')');
            if ((attr.name === 'href' || attr.name === 'xlink:href') && value === '#' + old) value = '#' + replacement;
          });
          if (attr.name === 'id' && ids.has(value)) value = ids.get(value);
          if (value !== attr.value) el.setAttribute(attr.name, value);
        }
      });
      svg.removeAttribute('id');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
      icon.append(svg);
    } else {
      icon.textContent = platform;
    }
    return icon;
  }
  const animated = [];
  let frame = 0;
  function updateFade() {
    frame = 0;
    let settling = false;
    animated.forEach(state => {
      if (!state.el.getClientRects().length) return;
      const rect = state.el.getBoundingClientRect();
      const target = opacityAtProgress((innerHeight - rect.top) / innerHeight);
      state.opacity = state.opacity + (target - state.opacity) * .5;
      state.el.style.opacity = state.opacity.toFixed(3);
      if (Math.abs(target - state.opacity) > .001) settling = true;
    });
    if (settling) frame = requestAnimationFrame(updateFade);
  }
  function setInitialFade() {
    animated.forEach(state => {
      state.opacity = opacityAtProgress((innerHeight - state.el.getBoundingClientRect().top) / innerHeight);
      state.el.style.opacity = state.opacity.toFixed(3);
    });
  }
  function scheduleFade() { if (!frame) frame = requestAnimationFrame(updateFade); }
  function updateBadge(badge) {
    if (badge.dataset.tdbReviewUpdated) return;
    const vendorRow = [...badge.children].find(el => el.querySelector('.vendor'));
    const score = [...badge.children].find(el => /^\d(?:\.\d+)?$/.test(el.textContent.trim()));
    const tally = [...badge.children].find(el => /^\(\d+\)$/.test(el.textContent.trim()));
    if (!vendorRow || !score || !tally) return;
    score.textContent = data.average.toFixed(2);
    tally.textContent = '(' + data.total + ')';
    const doctify = element('span', 'testimonial15_rating-icon vendor');
    doctify.title = 'Doctify';
    const doctifyIcon = sourceIcon('Doctify', false);
    doctifyIcon.className = 'icon-embed-xsmall yellow vendor';
    doctify.append(doctifyIcon);
    vendorRow.append(doctify);
    // Existing component is aria-hidden; make the new tally available to AT.
    badge.removeAttribute('aria-hidden');
    badge.setAttribute('role', 'button');
    badge.tabIndex = 0;
    badge.setAttribute('aria-haspopup', 'dialog');
    badge.setAttribute('aria-expanded', 'false');
    badge.dataset.tdbReviewOpen = '';
    badge.addEventListener('click', () => openDrawer(badge));
    badge.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDrawer(badge); } });
    badge.setAttribute('aria-label', 'Read ' + data.total + ' patient reviews. Combined rating ' + data.average.toFixed(2) + ' out of 5.');
    badge.dataset.tdbReviewUpdated = version;
  }
  function render(slot) {
    const host = slot.closest('[data-tdb-power-snippet]');
    if (!host || host.hasAttribute('data-tdb-review-ready')) return;
    const context = contextForPath(location.pathname);
    const review = context && data.contexts[context];
    if (!review?.excerpt || !review.reviewer) return;
    const figure = element('figure', 'tdb-power-quote');
    const ornament = element('div', 'tdb-power-quote-mark icon-embed-medium text-color-orange');
    ornament.setAttribute('aria-hidden', 'true');
    ornament.innerHTML = QUOTE_MARK;
    const quote = element('blockquote', 'tdb-power-quote-body');
    quote.append(element('p', 'text-size-large', review.excerpt));
    const caption = element('figcaption', 'tdb-power-quote-attribution text-style-tagline-restored');
    caption.append(sourceIcon(review.platform, true), element('span', '', review.reviewer));
    caption.append(element('span', 'tdb-review-sr-only', ' — ' + review.platform));
    figure.append(ornament, quote, caption);
    if (review.historic) figure.append(element('p', 'tdb-review-history', 'Review of Dr Keely at a previous practice · ' + review.platform));
    figure.setAttribute('role', 'button');
    figure.tabIndex = 0;
    figure.setAttribute('aria-haspopup', 'dialog');
    figure.setAttribute('aria-expanded', 'false');
    figure.setAttribute('aria-label', 'Read the full review by ' + review.reviewer);
    figure.dataset.tdbReviewOpen = review.id;
    figure.addEventListener('click', () => openDrawer(figure, review.id));
    figure.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDrawer(figure, review.id); } });
    slot.replaceChildren(figure);
    host.dataset.tdbReviewContext = context;
    host.dataset.tdbReviewId = review.id;
    host.dataset.tdbReviewReady = version;
    animated.push({ el: caption, opacity: 0 });
  }
  // Home and Location include both section padding and heading margin above its subhero.
  // Match that combined distance below the attribution without changing templates.
  function matchOuterSpacing() {
    if (!['', '/location'].includes(location.pathname.replace(/\/+$/, ''))) return;
    const host = document.querySelector('[data-tdb-power-snippet][data-tdb-review-ready]');
    const root = host?.parentElement;
    const section = root?.closest('section');
    const heading = root?.querySelector('h2');
    if (!section || !heading || !host.getClientRects().length) return;
    const gap = heading.getBoundingClientRect().top - section.getBoundingClientRect().top;
    if (gap > 0 && Math.abs((parseFloat(root.style.marginBottom) || 0) - gap) > .5) root.style.marginBottom = gap + 'px';
  }
  let drawerPromise;
  function loadDrawer() {
    if (window.TDBReviewDrawer) return Promise.resolve(window.TDBReviewDrawer);
    if (!drawerPromise) drawerPromise = new Promise((resolve, reject) => {
      if (!data.drawerScript) { reject(new Error('Review drawer is unavailable.')); return; }
      const script = document.createElement('script');
      script.src = data.drawerScript; script.crossOrigin = 'anonymous';
      if (data.drawerIntegrity) script.integrity = data.drawerIntegrity;
      script.onload = () => window.TDBReviewDrawer ? resolve(window.TDBReviewDrawer) : reject(new Error('Review drawer did not load.'));
      script.onerror = () => { script.remove(); reject(new Error('Please try opening the reviews again.')); };
      document.head.append(script);
    }).catch(error => { drawerPromise = null; throw error; });
    return drawerPromise;
  }
  async function openDrawer(trigger, reviewId) {
    if (trigger.getAttribute('aria-busy') === 'true') return;
    trigger.setAttribute('aria-busy', 'true');
    try { document.querySelector('[data-tdb-review-error]')?.remove(); await (await loadDrawer()).open(trigger, reviewId); }
    catch (error) {
      let status = document.querySelector('[data-tdb-review-error]');
      if (!status) { status = element('p', 'tdb-review-load-error'); status.dataset.tdbReviewError = ''; status.setAttribute('role', 'status'); trigger.insertAdjacentElement('afterend', status); }
      status.textContent = 'The reviews could not load. Please tap again.';
    } finally { trigger.removeAttribute('aria-busy'); }
  }
  function start() {
    document.querySelectorAll('.button.is-review').forEach(updateBadge);
    document.querySelectorAll('[data-tdb-review-quote]').forEach(render);
    matchOuterSpacing();
    setInitialFade();
    document.querySelectorAll('[data-tdb-review-open]').forEach(trigger => {
      trigger.addEventListener('pointerenter', () => loadDrawer().catch(() => {}), {once:true});
      trigger.addEventListener('focus', () => loadDrawer().catch(() => {}), {once:true});
    });
    document.fonts?.ready.then(matchOuterSpacing);
    addEventListener('resize', matchOuterSpacing, { passive: true });
    addEventListener('pageshow', matchOuterSpacing);
    addEventListener('scroll', scheduleFade, { passive: true });
    addEventListener('resize', scheduleFade, { passive: true });
    addEventListener('pageshow', setInitialFade);
  }

  function initReviewCarousels(){
    const context=contextForPath(location.pathname)||'default';
    const records=data.carousels?.[context]||data.carousels?.default;
    if(!records?.length)return;
    document.querySelectorAll('.testimonial_slider.w-slider').forEach(old=>{
      if(!old.parentElement.querySelector('.testimonial15_rating-wrapper')||!old.querySelector('.w-slider-nav'))return;
      const root=element('div','tdb-review-carousel');root.setAttribute('role','region');root.setAttribute('aria-label','Featured patient reviews');root.setAttribute('aria-roledescription','carousel');
      root.dataset.reviewContext=context;
      const viewport=element('div','tdb-rc-viewport'),dots=element('div','tdb-rc-dots');
      let active=0,timer=0,reveal=0,moving=null,gesture=null,suppressUntil=0,inView=false,hover=false,focused=false,paused=false;
      const slides=records.map((r,i)=>{
        const card=element('div','tdb-rc-card');card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',(i+1)+' of '+records.length);
        const quote=element('div','tdb-rc-open');quote.tabIndex=0;quote.setAttribute('role','button');quote.setAttribute('aria-haspopup','dialog');quote.setAttribute('aria-label','Read the full review by '+r.name);quote.dataset.tdbReviewOpen=r.id;
        quote.append(element('p','tdb-rc-quote text-size-large',r.excerpt));
        const name=element('div','tdb-rc-name text-style-tagline-restored');name.append(sourceIcon(r.platform,true),element('span','',r.name));quote.append(name);animated.push({el:name,opacity:0});
        quote.addEventListener('click',()=>{if(performance.now()>suppressUntil&&!moving)openDrawer(quote,r.id);});
        quote.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDrawer(quote,r.id);}});
        card.append(quote);viewport.append(card);return card;
      });
      const controls=records.map((r,i)=>{
        const b=element('button','tdb-rc-dot');b.type='button';b.setAttribute('aria-label','Show patient review '+(i+1)+' of '+records.length);b.append(element('span'));
        b.addEventListener('click',()=>go(i,i<active?-1:1));dots.append(b);return b;
      });
      const pause=element('button','tdb-rc-pause tdb-review-sr-only','Pause rotating reviews');pause.type='button';pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume rotating reviews':'Pause rotating reviews';schedule();});
      root.append(viewport,dots,pause);
      function paint(){
        slides.forEach((n,i)=>{n.inert=i!==active;n.setAttribute('aria-hidden',String(i!==active));n.style.transform='translateX('+(i===active?0:100)+'%)';n.style.visibility=i===active?'visible':'hidden';});
        controls.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===active)));
      }
      function schedule(){clearTimeout(timer);if(inView&&!hover&&!focused&&!paused&&!document.hidden)timer=setTimeout(()=>{if(document.querySelector('[data-tdb-review-overlay]:not([hidden])')){schedule();return;}go((active+1)%slides.length,1);},5000);}
      function finish(){if(!moving)return;const m=moving;moving=null;m.animations.forEach(a=>a.cancel());active=m.target;paint();}
      function go(target,direction=1,offset=0){
        if(moving)finish();if(target===active){schedule();return;}
        clearTimeout(reveal);clearTimeout(timer);
        const from=slides[active],to=slides[target];slides.forEach(n=>n.classList.remove('is-settled'));
        to.style.visibility='visible';to.inert=true;const width=viewport.clientWidth;
        const duration=Math.max(120,400*(1-Math.min(Math.abs(offset)/width,.8)));
        const animations=[from.animate([{transform:'translateX('+offset+'px)'},{transform:'translateX('+(-direction*width)+'px)'}],{duration,easing:'ease',fill:'forwards'}),to.animate([{transform:'translateX('+(direction*width+offset)+'px)'},{transform:'translateX(0px)'}],{duration,easing:'ease',fill:'forwards'})];
        const state=moving={target,animations};
        Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(moving!==state)return;finish();reveal=setTimeout(()=>slides[active].classList.add('is-settled'),direction<0?140:100);schedule();});
      }
      viewport.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;finish();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};clearTimeout(timer);});
      viewport.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;schedule();return;}if(Math.abs(dx)<12)return;gesture.horizontal=true;viewport.setPointerCapture(e.pointerId);slides[active].classList.remove('is-settled');}
        e.preventDefault();gesture.dx=dx;const dir=dx<0?1:-1,target=(active+dir+slides.length)%slides.length;slides[active].style.transform='translateX('+dx+'px)';slides[target].style.visibility='visible';slides[target].style.transform='translateX('+(dir*viewport.clientWidth+dx)+'px)';
      },{passive:false});
      function end(e,cancel){if(!gesture||e.pointerId!==gesture.id)return;const g=gesture;gesture=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(g.horizontal){suppressUntil=performance.now()+600;const dir=g.dx<0?1:-1;if(!cancel&&Math.abs(g.dx)>40)go((active+dir+slides.length)%slides.length,dir,g.dx);else{paint();reveal=setTimeout(()=>slides[active].classList.add('is-settled'),60);schedule();}}else schedule();}
      viewport.addEventListener('pointerup',e=>end(e,false));viewport.addEventListener('pointercancel',e=>end(e,true));
      root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const dir=e.key==='ArrowRight'?1:-1;if(moving)finish();go((active+dir+slides.length)%slides.length,dir);}});
      root.addEventListener('mouseenter',()=>{hover=true;clearTimeout(timer);});root.addEventListener('mouseleave',()=>{hover=false;schedule();});
      root.addEventListener('focusin',()=>{focused=true;clearTimeout(timer);});root.addEventListener('focusout',()=>{requestAnimationFrame(()=>{focused=root.contains(document.activeElement);schedule();});});
      document.addEventListener('visibilitychange',schedule);
      new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.25}).observe(root);
      old.replaceWith(root);
      const fixedStars=root.parentElement.querySelector('.testimonial15_rating-wrapper');
      function centre(){if(!fixedStars)return;const gap=Math.max(0,root.getBoundingClientRect().top-fixedStars.getBoundingClientRect().bottom);root.style.setProperty('--tdb-rc-star-gap',gap+'px');}
      centre();new ResizeObserver(centre).observe(root.parentElement);
      paint();slides[0].classList.add('is-settled');setInitialFade();
    });
  }
  function ensureNervousCarousel(){
    if(contextForPath(location.pathname)!=='nervous'||document.querySelector('.tdb-review-carousel'))return;
    const original=document.querySelector('.section_standard-testimonial');
    if(!original)return;
    const copy=original.cloneNode(true);
    copy.querySelectorAll('[id],[data-w-id]').forEach(n=>{n.removeAttribute('id');n.removeAttribute('data-w-id');});
    const ornament=copy.querySelector('.testimonial_wrapper');
    const stars=element('div','testimonial15_rating-wrapper');
    const native=document.querySelector('.button.is-review .testimonial15_rating-icon:not(.vendor)');
    if(!ornament||!native)return;
    for(let i=0;i<5;i++)stars.append(native.cloneNode(true));
    const gap=element('div','margin-bottom margin-xlarge');gap.append(stars);ornament.replaceChildren(gap);
    original.before(copy);initReviewCarousels();
  }
  // Replace only the five-star patient testimonial component, before Webflow initialises it.
  const carouselObserver=new MutationObserver(initReviewCarousels);
  carouselObserver.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initReviewCarousels();ensureNervousCarousel();carouselObserver.disconnect();},{once:true});
  else{initReviewCarousels();ensureNervousCarousel();carouselObserver.disconnect();}
  window.TDBPowerSnippets = Object.freeze({ version, mode: data.mode, capturedOn: data.capturedOn, sourceIcon, quoteMark: QUOTE_MARK, contextForPath, preview: data, loadDrawer });
  // The quote slot and its preceding badge already exist at this script position.
  // Populate their final layout now, not at DOMContentLoaded or after a download.
  start();
})();
