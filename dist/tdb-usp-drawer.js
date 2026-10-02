/* TDB USP drawer v1.1.0. Continuous navigation, width-aware motion and shared hover cadence. */
(function () {
  'use strict';
  if (window.TDBUSPDrawer) return;
  const style = document.createElement('style');
  style.dataset.tdbUspStyles = '1.1.0'; style.textContent = "/* TDB USP drawer v1.1.0 — review controls, Smile Gallery header. */\n.banner-feature_item[data-tdb-usp-ready]>.modal1_component{display:none!important}\n.banner-feature_item-content[data-tdb-usp-trigger]{cursor:pointer;transition:opacity 300ms ease!important}\n.tdb-usp-launch{display:flex;align-items:center;justify-content:center;flex:0 0 3rem;width:3rem;height:3rem;min-width:44px;min-height:44px;box-sizing:border-box;margin:.25rem auto 0;padding:0;border:1px solid var(--base-color-brand--orange-3,#d6cab4);border-radius:50%;color:var(--base-color-brand--orange-3,#d6cab4);background:transparent;cursor:pointer;touch-action:manipulation;transition:background-color 300ms ease,color 300ms ease}\n.tdb-usp-launch svg{display:block;width:1rem;height:1rem;transform:rotate(0deg);transform-origin:center;transition:transform 300ms var(--tdb-vip-drawer-ease,ease)!important}\n.tdb-usp-launch[aria-expanded=\"true\"] svg{transform:rotate(180deg)}\n@media(hover:hover) and (pointer:fine){.tdb-usp-launch:hover{background:var(--base-color-brand--orange-3,#d6cab4);color:#fff}}\n.tdb-usp-launch:active{background:var(--base-color-brand--orange-3,#d6cab4);color:#fff;transition-duration:0s}\n.tdb-usp-launch:focus-visible{outline:2px solid currentColor;outline-offset:5px}\n.tdb-usp-overlay{--usp-paper:var(--base-color-brand--orange-1,#f9f2e6);--usp-cream:var(--base-color-brand--orange-3,#d6cab4);--usp-charcoal:var(--base-color-neutral--neutral-darker,#222);position:fixed;inset:0;z-index:2147483500;color:#222;font:inherit;isolation:isolate}\n.tdb-usp-overlay[hidden]{display:none!important}\n.tdb-usp-overlay::before{content:\"\";position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;transition:opacity var(--usp-duration,420ms) ease}\n.tdb-usp-overlay.is-open::before{opacity:1}\n.tdb-usp-panel{--usp-gutter:2.5rem;--usp-footer:6rem;--usp-header:calc(12rem + env(safe-area-inset-top,0px));position:absolute;inset:0 0 0 auto;width:min(60rem,94vw);height:100%;height:100dvh;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:var(--usp-header) minmax(0,1fr) calc(var(--usp-footer) + env(safe-area-inset-bottom,0px));background:var(--usp-paper);overflow:hidden;box-shadow:-1rem 0 4rem #0002;container:tdb-usp / size;transform:translate3d(100%,0,0);transition:transform var(--usp-duration,420ms) cubic-bezier(.4,0,.2,1)}\n.tdb-usp-overlay.is-open .tdb-usp-panel{transform:translate3d(0,0,0)}\n.tdb-usp-header{position:relative;display:flex;align-items:center;justify-content:center;padding:calc(1rem + env(safe-area-inset-top,0px)) var(--usp-gutter) 1rem;background:var(--usp-charcoal);color:var(--usp-cream);box-sizing:border-box;min-height:0}\n.tdb-usp-brand{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);align-items:center;gap:2.75rem;width:100%;max-width:36rem}\n.tdb-usp-logo{display:block;width:10rem;max-width:100%;height:auto;max-height:7rem;object-fit:contain;justify-self:end}\n.tdb-usp-rule{height:6rem;width:1px;flex:0 0 1px;background:var(--usp-cream);opacity:.7}\n.tdb-usp-title{min-width:0;font:inherit;font-size:.875rem;font-weight:400;line-height:1.5;letter-spacing:.1em;text-transform:uppercase;margin:0;width:100%;max-width:100%;color:var(--usp-cream)}\n.tdb-usp-title[data-tdb-ticker]{display:block;white-space:normal;height:3em}\n.tdb-usp-title .tdb-tick-value{display:flex;align-items:center;white-space:normal}\n.tdb-usp-title .tdb-tick-size{display:none}\n.tdb-usp-dismiss,.tdb-usp-arrow{display:grid;place-items:center;box-sizing:border-box;width:3rem;height:3rem;min-width:44px;min-height:44px;border:1px solid #ffffff80;border-radius:50%;padding:0;color:#ffffff80;background:#ffffff1a;cursor:pointer;transition:background-color 300ms ease,color 300ms ease,border-color 300ms ease;touch-action:manipulation}\n.tdb-usp-dismiss{position:absolute;top:calc(1.5rem + env(safe-area-inset-top,0px));right:var(--usp-gutter)}\n.tdb-usp-dismiss svg{width:24px;height:24px;display:block}\n.tdb-usp-dismiss:is(:hover,:active),.tdb-usp-arrow:not(:disabled):is(:hover,:active){color:var(--usp-paper);background:#ebe2d240;border-color:var(--usp-cream)}\n.tdb-usp-overlay :is(button,a,[tabindex]):focus-visible{outline:2px solid currentColor;outline-offset:3px}\n.tdb-usp-frame{position:relative;min-width:0;min-height:0;overflow:hidden;touch-action:pan-y pinch-zoom;background:var(--usp-paper)}\n.tdb-usp-slide{position:absolute;inset:0;box-sizing:border-box;padding:2.5rem var(--usp-gutter);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y pinch-zoom;scrollbar-width:none;overflow-anchor:none;background:var(--usp-paper);outline-offset:-3px!important}\n.tdb-usp-slide::-webkit-scrollbar{display:none}\n.tdb-usp-content{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:2.5rem;min-height:100%;color:#222}\n.tdb-usp-content>img{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:cover}\n.tdb-usp-copy{min-width:0;font:inherit;font-size:1rem;line-height:1.7}\n.tdb-usp-copy p{font:inherit;color:inherit;margin:0 0 1rem}\n.tdb-usp-copy p:last-child{margin-bottom:0}\n.tdb-usp-navigation{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;box-sizing:border-box;padding:0 var(--usp-gutter) env(safe-area-inset-bottom,0px);background:color-mix(in srgb,var(--usp-charcoal) 94%,transparent);color:var(--usp-paper);-webkit-backdrop-filter:saturate(150%) blur(20px);backdrop-filter:saturate(150%) blur(20px)}\n.tdb-usp-position{font-size:.875rem;letter-spacing:.15em;color:#ffffff80}\n.tdb-usp-arrows{display:flex;gap:1rem}\n.tdb-usp-arrow svg{width:1rem;height:1rem;display:block}\n.tdb-usp-arrow.is-prev svg{transform:rotate(180deg)}\n.tdb-usp-arrow:disabled{opacity:.35;cursor:default}\nhtml.tdb-usp-chrome-away .navbar10_component{transform:translateY(calc(-1 * var(--tdb-usp-native-away,100%)))!important;pointer-events:none!important;transition:transform 420ms cubic-bezier(.4,0,.2,1)!important}\nhtml.tdb-usp-chrome-away .navbar-bg_layer{transform:translateY(-100%)!important;pointer-events:none!important;transition:transform 420ms cubic-bezier(.4,0,.2,1)!important}\nhtml.tdb-usp-chrome-away #tdb-vip-drawer{transform:translate3d(0,100%,0)!important;pointer-events:none!important;transition:transform 420ms cubic-bezier(.4,0,.2,1)!important}\nhtml.tdb-usp-chrome-away :is(.tdb-announcement,#tdb-elfsight-timer-shell,.elfsight-app-4fa0f002-95b0-40d5-b89d-0f5e97471efb,.eapps-countdown-timer-position-bar){transform:translateY(-120%)!important;pointer-events:none!important;transition:transform 420ms cubic-bezier(.4,0,.2,1)!important}\n@media(max-width:767px){.tdb-usp-panel{width:100%;box-shadow:none}html.tdb-usp-locked,html.tdb-usp-locked body{overflow:hidden!important;overscroll-behavior:none}}\n@container tdb-usp (max-width:600px){.tdb-usp-header,.tdb-usp-slide,.tdb-usp-navigation{--usp-gutter:1.25rem}.tdb-usp-brand{gap:1.5rem}.tdb-usp-logo{width:8.5rem;max-width:100%}.tdb-usp-rule{height:5rem}.tdb-usp-title{font-size:.8rem;max-width:100%}.tdb-usp-dismiss{right:1.25rem;top:calc(1.25rem + env(safe-area-inset-top,0px))}.tdb-usp-slide{padding-top:1.5rem;padding-bottom:2rem}.tdb-usp-content{grid-template-columns:minmax(0,1fr);gap:1.5rem;align-content:start;min-height:0}.tdb-usp-copy{font-size:.96rem}}\n@media(max-width:767px){.tdb-usp-panel{--usp-footer:6rem}}\n@media(max-height:600px){.tdb-usp-panel{--usp-footer:6rem}.tdb-usp-header{padding-top:2.5rem;padding-bottom:1rem}.tdb-usp-rule{height:3.5rem}.tdb-usp-logo{max-height:4rem}}\n\n/* A maximum of three larger barn icons per mobile row, with the final pair centred. */\n@media(max-width:767px){\n .banner-featured_component[data-tdb-usp-list]{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:2rem 1rem}\n .banner-featured_component[data-tdb-usp-list]>.banner-feature_item{order:0;flex:0 0 calc((100% - 2rem)/3);width:calc((100% - 2rem)/3);min-width:0;max-width:calc((100% - 2rem)/3)}\n .banner-featured_component[data-tdb-usp-list] .banner-feature_item-content{width:100%;min-width:0}\n .banner-featured_component[data-tdb-usp-list] .feature-item_door-image{width:clamp(3rem,12vw,4rem);max-width:100%;height:auto}\n .banner-featured_component[data-tdb-usp-list] .text-style-tagline-restored{width:100%;min-height:3em;display:flex;align-items:center;justify-content:center}\n}\n";
  const root = document.documentElement;
  const el = (tag, cls, text) => { const node = document.createElement(tag); node.className = cls || ''; if (text !== undefined) node.textContent = text; return node; };
  const button = (label, cls, action) => { const node = el('button', cls); node.type = 'button'; node.setAttribute('aria-label', label); if (action) node.addEventListener('click', action); return node; };
  const icon = (kind) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('aria-hidden', 'true'); node.setAttribute('focusable', 'false');
    node.setAttribute('viewBox', kind === 'close' ? '0 0 24 24' : '0 0 16 16');
    const paths = {
      left: 'M3.31066 8.75001L9.03033 14.4697L7.96967 15.5303L0.439339 8.00001L7.96967 0.469676L9.03033 1.53034L3.31066 7.25001L15.5 7.25L15.5 8.75L3.31066 8.75001Z',
      right: 'M12.6893 7.25L6.96967 1.53033L8.03033 0.469666L15.5607 8L8.03033 15.5303L6.96967 14.4697L12.6893 8.75H0.5V7.25H12.6893Z',
      close: 'M4.3536 3.6464 12 11.2929 19.6464 3.6464 20.3536 4.3536 12.7071 12 20.3536 19.6464 19.6464 20.3536 12 12.7071 4.3536 20.3536 3.6464 19.6464 11.2929 12 3.6464 4.3536Z'
    };
    node.innerHTML = '<path fill="currentColor" d="' + paths[kind] + '"/>'; return node;
  };
  let overlay, panel, frame, heading, count, prev, next, dismiss, records = [], slides = [];
  let index = 0, target = 0, source, lock, closing = false, animations = [], revision = 0, vipTimer = 0, drag;
  const scrollPositions = new Map();
  const logical = slot => ((slot % records.length) + records.length) % records.length;
  const duration = width => matchMedia('(min-width:992px)').matches ? Math.round(Math.min(950, Math.max(650, 400 * Math.sqrt(width / 375)))) : 400;
  const stop = () => { revision++; animations.forEach(a => a.cancel()); animations = []; };
  function position(direction = 1) {
    const active = logical(target), record = records[active];
    if (window.TDBTicker) {
      window.TDBTicker.count(count, active + 1, records.length, direction);
      window.TDBTicker.update(heading, record.title, target, direction);
    } else { heading.textContent = record.title; count.textContent = String(active + 1).padStart(2, '0') + ' — ' + String(records.length).padStart(2, '0'); }
    prev.disabled = next.disabled = records.length < 2;
  }
  function finish() {
    index = target;
    const current = slides.find(slide => Number(slide.dataset.slot) === index);
    if (!current) return;
    slides.forEach(slide => { if (slide !== current) slide.remove(); }); slides = [current];
    current.style.transform = 'translate3d(0,0,0)'; current.inert = false; current.setAttribute('aria-hidden','false');
    frame.removeAttribute('aria-busy');
  }
  function step(direction) {
    if (closing || !overlay || overlay.hidden || records.length < 2) return;
    const destination = target + direction;
    // Read actual in-flight positions before cancelling: every rapid tap or reversal starts there.
    const poses = slides.map(slide => ({slide, slot:Number(slide.dataset.slot), x:new DOMMatrixReadOnly(getComputedStyle(slide).transform).m41}));
    const outgoing = slides.find(slide => Number(slide.dataset.slot) === target);
    if (outgoing) scrollPositions.set(logical(target), outgoing.scrollTop);
    stop(); const token = revision; target = destination;
    const width = frame.clientWidth;
    if (!poses.some(p => p.slot === destination)) {
      const slide = makeSlide(destination), anchor = poses[0];
      frame.append(slide); slide.scrollTop = scrollPositions.get(logical(destination)) || 0;
      slides.push(slide); poses.push({slide,slot:destination,x:anchor.x + (destination-anchor.slot)*width});
    }
    if (frame.contains(document.activeElement)) dismiss.focus({ preventScroll: true });
    frame.setAttribute('aria-busy', 'true'); slides.forEach(slide => { slide.inert = true; slide.setAttribute('aria-hidden', 'true'); });
    position(direction);
    animations = poses.map(({slide,slot,x}) => slide.animate([{ transform: 'translate3d(' + x + 'px,0,0)' }, { transform: 'translate3d(' + ((slot - target) * width) + 'px,0,0)' }], { duration: duration(window.innerWidth), easing: 'ease', fill: 'forwards' }));
    Promise.all(animations.map(a => a.finished.catch(() => {}))).then(() => {
      if (token !== revision) return;
      finish(); stop();
    });
  }
  function makeSlide(slot) {
    const record = records[logical(slot)], slide = el('article', 'tdb-usp-slide'), content = el('div', 'tdb-usp-content'), copy = el('div', 'tdb-usp-copy');
    slide.dataset.slot = String(slot); slide.tabIndex = 0; slide.setAttribute('aria-label', record.title); slide.setAttribute('data-lenis-prevent', '');
    const image = record.body.querySelector('img')?.cloneNode(true);
    if (image) { image.removeAttribute('class'); image.sizes = '(max-width:767px) 100vw, 28rem'; image.draggable = false; image.loading = 'eager'; content.append(image); }
    for (const child of record.body.children) if (child.tagName !== 'IMG') copy.append(child.cloneNode(true));
    content.append(copy); content.querySelectorAll('[id],[data-w-id]').forEach(n => { n.removeAttribute('id'); n.removeAttribute('data-w-id'); });
    slide.append(content); return slide;
  }
  function create() {
    overlay = el('div', 'tdb-usp-overlay'); overlay.id = 'tdb-usp-drawer'; overlay.hidden = true;
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'tdb-usp-title'); overlay.setAttribute('data-lenis-prevent', '');
    panel = el('div', 'tdb-usp-panel');
    // The same container rules can be inspected at a narrow width on staging.
    if (location.hostname === 'dentalbarns.webflow.io' && new URLSearchParams(location.search).get('usp-preview') === 'mobile') {
      panel.style.width = 'min(390px,100%)'; panel.style.height = 'min(844px,100dvh)'; panel.style.setProperty('--usp-footer', '6rem');
    }
    const header = el('header', 'tdb-usp-header'), brand = el('div', 'tdb-usp-brand');
    const logo = records[0].logo.cloneNode(true); logo.className = 'tdb-usp-logo'; logo.alt = 'The Dental Barns'; logo.loading = 'eager';
    const rule = el('span', 'tdb-usp-rule'); rule.setAttribute('aria-hidden', 'true');
    heading = el('h2', 'tdb-usp-title'); heading.id = 'tdb-usp-title';
    brand.append(logo, rule, heading);
    dismiss = button('Close practice highlights', 'tdb-usp-dismiss', close); dismiss.append(icon('close')); header.append(brand, dismiss);
    frame = el('div', 'tdb-usp-frame'); frame.setAttribute('role', 'group'); frame.setAttribute('aria-roledescription', 'carousel'); frame.setAttribute('aria-label', 'Why patients choose The Dental Barns');
    const footer = el('footer', 'tdb-usp-navigation'), arrows = el('div', 'tdb-usp-arrows');
    footer.setAttribute('aria-label', 'Practice highlight navigation');
    count = el('div', 'tdb-usp-position'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite'); count.setAttribute('aria-atomic', 'true');
    prev = button('Previous practice highlight', 'tdb-usp-arrow is-prev', () => step(-1)); next = button('Next practice highlight', 'tdb-usp-arrow', () => step(1));
    prev.append(icon('right')); next.append(icon('right')); arrows.append(prev, next); footer.append(count, arrows);
    panel.append(header, frame, footer); overlay.append(panel); document.body.append(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); }
      if (e.key === 'Tab') {
        const focusable = [...overlay.querySelectorAll('button,a[href],[tabindex="0"]')].filter(n => !n.disabled && !n.closest('[inert]') && n.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    frame.addEventListener('pointerdown', e => { if (e.isPrimary && !closing && !e.target.closest('a,button') && (e.pointerType !== 'mouse' || e.button === 0)) drag = { id:e.pointerId, x:e.clientX, y:e.clientY }; }, { passive:true });
    frame.addEventListener('pointermove', e => { if (drag && drag.id === e.pointerId && Math.abs(e.clientY - drag.y) > 20 && Math.abs(e.clientY - drag.y) > Math.abs(e.clientX - drag.x)) drag = null; }, { passive:true });
    frame.addEventListener('pointerup', e => { const d = drag; drag = null; if (!d || d.id !== e.pointerId || window.getSelection()?.toString()) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) > 45 && Math.abs(dx) > 1.3 * Math.abs(dy)) step(dx < 0 ? 1 : -1); });
    frame.addEventListener('pointercancel', () => { drag = null; });
    new ResizeObserver(() => { if (overlay.hidden) return; stop(); finish(); overlay.style.setProperty('--usp-duration', duration(window.innerWidth) + 'ms'); }).observe(frame);
  }
  function lockPage() {
    const nav = document.querySelector('.navbar10_component');
    lock = { x:scrollX, y:scrollY, lenis:window.lenis, resume:!!window.lenis && !window.lenis.isStopped, nav,
      away:nav?.style.getPropertyValue('--tdb-usp-native-away') || '', priority:nav?.style.getPropertyPriority('--tdb-usp-native-away') || '',
      siblings:[...document.body.children].filter(n => n !== overlay && !['SCRIPT','STYLE','LINK'].includes(n.tagName)).map(n => [n,n.inert]) };
    if (nav) { const top = nav.getBoundingClientRect().top, parts = [nav,...nav.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')]; nav.style.setProperty('--tdb-usp-native-away', Math.max(nav.offsetHeight,...parts.filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect().bottom - top)) + 'px'); }
    if (document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking')) { window.TDBVIPDrawer?.close?.(); vipTimer = setTimeout(() => lock?.lenis?.stop(), 560); }
    lock.siblings.forEach(([n]) => { n.inert = true; }); lock.lenis?.stop();
    root.classList.add('tdb-usp-chrome-away', 'tdb-usp-locked');
    window.addEventListener('wheel', guard, { capture:true, passive:false }); window.addEventListener('touchmove', guard, { capture:true, passive:false }); window.addEventListener('scroll', pin, { passive:true });
  }
  function guard(e) { if (lock && !panel.contains(e.target) && e.cancelable) e.preventDefault(); }
  function pin() { if (lock && (Math.abs(scrollY-lock.y)>1 || Math.abs(scrollX-lock.x)>1)) window.scrollTo(lock.x,lock.y); }
  function unlockPage() {
    const saved = lock; if (!saved) return; lock = null;
    window.removeEventListener('wheel', guard, true); window.removeEventListener('touchmove', guard, true); window.removeEventListener('scroll', pin);
    saved.siblings.forEach(([n,inert]) => { n.inert = inert; }); root.classList.remove('tdb-usp-chrome-away', 'tdb-usp-locked');
    if (saved.nav) { if (saved.away) saved.nav.style.setProperty('--tdb-usp-native-away', saved.away, saved.priority); else saved.nav.style.removeProperty('--tdb-usp-native-away'); }
    window.scrollTo(saved.x,saved.y); if (saved.resume) saved.lenis?.start();
  }
  function open(i, trigger) {
    if (closing || overlay && !overlay.hidden) return;
    if (!overlay) create();
    source = trigger; target = index = i; stop();
    slides = [makeSlide(i)]; frame.replaceChildren(slides[0]); finish(); position();
    overlay.style.setProperty('--usp-duration', duration(window.innerWidth) + 'ms');
    overlay.hidden = false; slides[0].scrollTop = scrollPositions.get(i) || 0;
    source.setAttribute('aria-expanded','true'); lockPage(); dismiss.focus({ preventScroll:true });
    requestAnimationFrame(() => requestAnimationFrame(() => { if (!overlay.hidden && !closing) overlay.classList.add('is-open'); }));
  }
  function close() {
    if (!overlay || overlay.hidden || closing) return;
    closing = true; clearTimeout(vipTimer); stop(); finish(); drag = null;
    if (slides[0]) scrollPositions.set(logical(target), slides[0].scrollTop);
    const closeDuration = duration(window.innerWidth); overlay.style.setProperty('--usp-duration', closeDuration + 'ms');
    window.TDBVIPDrawer?.reset?.(); lock?.lenis?.stop();
    document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click(); document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(n => n.click());
    overlay.classList.remove('is-open'); source?.setAttribute('aria-expanded','false');
    setTimeout(() => { overlay.hidden = true; unlockPage(); closing = false; source?.focus({ preventScroll:true }); }, closeDuration);
  }
  function start() {
    document.querySelectorAll('.banner-feature_item').forEach(item => {
      const trigger = item.querySelector('.banner-feature_item-content'), modal = item.querySelector('.modal1_component');
      const body = modal?.querySelector('.modal-content-split'), logo = modal?.querySelector('.usp-logo_top-image'), title = modal?.querySelector('.usp-logo_top-wrapper .text-style-tagline')?.textContent.trim();
      if (!trigger || !body || !logo || !title) return;
      const i = records.length, launch = button('Discover ' + title, 'tdb-usp-launch'); launch.append(icon('left'));
      launch.setAttribute('aria-haspopup','dialog'); launch.setAttribute('aria-expanded','false'); launch.setAttribute('aria-controls','tdb-usp-drawer');
      trigger.append(launch); trigger.dataset.tdbUspTrigger = String(i); item.dataset.tdbUspReady = '';
      item.closest('.banner-featured_component')?.setAttribute('data-tdb-usp-list','');
      modal.removeAttribute('fs-scrolldisable-element'); modal.hidden = true; modal.inert = true;
      records.push({ title, body, logo, launch });
    });
    if (!records.length) return;
    document.head.append(style);
    // Stop the retired IX2 modal click at capture, before its bubbling handlers.
    document.addEventListener('click', e => {
      const trigger = e.target.closest('[data-tdb-usp-trigger]'); if (!trigger) return;
      e.preventDefault(); e.stopImmediatePropagation(); const i = Number(trigger.dataset.tdbUspTrigger); open(i, records[i].launch);
    }, true);
    window.TDBUSPDrawer = Object.freeze({ version:'1.1.0', close });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
