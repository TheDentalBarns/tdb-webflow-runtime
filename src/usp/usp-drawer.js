/* TDB USP drawer v1.0.0. Webflow owns the five content records; this owns their shared presentation. */
(function () {
  'use strict';
  if (window.TDBUSPDrawer) return;
  const style = document.createElement('style');
  style.dataset.tdbUspStyles = '1.0.0'; style.textContent = __USP_CSS__;
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
  const duration = width => matchMedia('(min-width:992px)').matches ? Math.round(Math.min(950, Math.max(650, 400 * Math.sqrt(width / 375)))) : 400;
  const stop = () => { revision++; animations.forEach(a => a.cancel()); animations = []; };
  function position(animate = true, direction = 1) {
    const record = records[target];
    if (window.TDBTicker) {
      window.TDBTicker.count(count, target + 1, records.length, direction);
      window.TDBTicker.update(heading, record.title, target, direction);
    } else { heading.textContent = record.title; count.textContent = String(target + 1).padStart(2, '0') + ' — ' + String(records.length).padStart(2, '0'); }
    prev.disabled = target === 0; next.disabled = target === records.length - 1;
  }
  function finish() {
    index = target;
    slides.forEach((slide, i) => { slide.style.transform = 'translate3d(' + ((i - index) * 100) + '%,0,0)'; slide.inert = i !== index; slide.setAttribute('aria-hidden', String(i !== index)); });
    frame.removeAttribute('aria-busy');
  }
  function step(direction) {
    const destination = Math.max(0, Math.min(records.length - 1, target + direction));
    if (closing || !overlay || overlay.hidden || destination === target) return;
    // Read actual in-flight positions before cancelling: every rapid tap or reversal starts there.
    const poses = slides.map(slide => new DOMMatrixReadOnly(getComputedStyle(slide).transform).m41);
    stop(); const token = revision; target = destination;
    if (frame.contains(document.activeElement)) dismiss.focus({ preventScroll: true });
    frame.setAttribute('aria-busy', 'true'); slides.forEach(slide => { slide.inert = true; slide.setAttribute('aria-hidden', 'true'); });
    position(true, direction);
    const width = frame.clientWidth;
    animations = slides.map((slide, i) => slide.animate([{ transform: 'translate3d(' + poses[i] + 'px,0,0)' }, { transform: 'translate3d(' + ((i - target) * width) + 'px,0,0)' }], { duration: duration(window.innerWidth), easing: 'ease', fill: 'forwards' }));
    Promise.all(animations.map(a => a.finished.catch(() => {}))).then(() => {
      if (token !== revision) return;
      finish(); stop();
    });
  }
  function create() {
    overlay = el('div', 'tdb-usp-overlay'); overlay.id = 'tdb-usp-drawer'; overlay.hidden = true;
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'tdb-usp-title'); overlay.setAttribute('data-lenis-prevent', '');
    panel = el('div', 'tdb-usp-panel');
    // The same container rules can be inspected at a narrow width on staging.
    if (location.hostname === 'dentalbarns.webflow.io' && new URLSearchParams(location.search).get('usp-preview') === 'mobile') {
      panel.style.width = 'min(390px,100%)'; panel.style.height = 'min(844px,100dvh)'; panel.style.setProperty('--usp-footer', '5rem');
    }
    const header = el('header', 'tdb-usp-header'), brand = el('div', 'tdb-usp-brand');
    const logo = records[0].logo.cloneNode(true); logo.className = 'tdb-usp-logo'; logo.alt = 'The Dental Barns'; logo.loading = 'eager';
    const rule = el('span', 'tdb-usp-rule'); rule.setAttribute('aria-hidden', 'true');
    heading = el('h2', 'tdb-usp-title'); heading.id = 'tdb-usp-title';
    brand.append(logo, rule, heading);
    dismiss = button('Close practice highlights', 'tdb-usp-dismiss', close); dismiss.append(icon('close')); header.append(brand, dismiss);
    frame = el('div', 'tdb-usp-frame'); frame.setAttribute('role', 'group'); frame.setAttribute('aria-roledescription', 'carousel'); frame.setAttribute('aria-label', 'Why patients choose The Dental Barns');
    slides = records.map((record, i) => {
      const slide = el('article', 'tdb-usp-slide'), content = el('div', 'tdb-usp-content'), copy = el('div', 'tdb-usp-copy');
      slide.tabIndex = 0; slide.setAttribute('aria-label', record.title); slide.setAttribute('data-lenis-prevent', '');
      const image = record.body.querySelector('img')?.cloneNode(true);
      if (image) { image.removeAttribute('class'); image.sizes = '(max-width:767px) 100vw, 28rem'; image.draggable = false; content.append(image); }
      for (const child of record.body.children) if (child.tagName !== 'IMG') copy.append(child.cloneNode(true));
      // Cloned authored content must not register another Webflow animation or DOM ID.
      content.append(copy); content.querySelectorAll('[id],[data-w-id]').forEach(n => { n.removeAttribute('id'); n.removeAttribute('data-w-id'); });
      slide.append(content); frame.append(slide); return slide;
    });
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
    new ResizeObserver(() => { if (overlay.hidden) return; stop(); finish(); }).observe(frame);
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
    source = trigger; target = index = i; stop(); finish(); position(false);
    overlay.hidden = false; slides[i].querySelector('img')?.setAttribute('loading', 'eager');
    source.setAttribute('aria-expanded','true'); lockPage(); dismiss.focus({ preventScroll:true });
    requestAnimationFrame(() => requestAnimationFrame(() => { if (!overlay.hidden && !closing) overlay.classList.add('is-open'); }));
  }
  function close() {
    if (!overlay || overlay.hidden || closing) return;
    closing = true; clearTimeout(vipTimer); stop(); finish(); drag = null;
    window.TDBVIPDrawer?.reset?.(); lock?.lenis?.stop();
    document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click(); document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(n => n.click());
    overlay.classList.remove('is-open'); source?.setAttribute('aria-expanded','false');
    setTimeout(() => { overlay.hidden = true; unlockPage(); closing = false; source?.focus({ preventScroll:true }); }, 420);
  }
  function start() {
    document.querySelectorAll('.banner-feature_item').forEach(item => {
      const trigger = item.querySelector('.banner-feature_item-content'), modal = item.querySelector('.modal1_component');
      const body = modal?.querySelector('.modal-content-split'), logo = modal?.querySelector('.usp-logo_top-image'), title = modal?.querySelector('.usp-logo_top-wrapper .text-style-tagline')?.textContent.trim();
      if (!trigger || !body || !logo || !title) return;
      const i = records.length, launch = button('Discover ' + title, 'tdb-usp-launch'); launch.append(icon('left'));
      launch.setAttribute('aria-haspopup','dialog'); launch.setAttribute('aria-expanded','false'); launch.setAttribute('aria-controls','tdb-usp-drawer');
      trigger.append(launch); trigger.dataset.tdbUspTrigger = String(i); item.dataset.tdbUspReady = '';
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
    window.TDBUSPDrawer = Object.freeze({ version:'1.0.0', close });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
