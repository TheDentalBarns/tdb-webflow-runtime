(() => {
  'use strict';

  const VERSION = '0.5.0-a11y.1';
  const mobileQuery = matchMedia('(max-width:767px)');
  const desktopQuery = matchMedia('(min-width:768px)');
  const drawer = document.getElementById('tdb-vip-drawer');
  if (!drawer || drawer.dataset.tdbVipUnifiedInit === 'true') return;

  const handle = drawer.querySelector('.tdb-vip-drawer-handle');
  const label = drawer.querySelector('.tdb-vip-drawer-label');
  const body = drawer.querySelector('.tdb-vip-drawer-body');
  if (!handle || !label || !body) return;

  drawer.dataset.tdbVipUnifiedInit = 'true';
  drawer.dataset.tdbVipInit = 'true';
  drawer.dataset.tdbVipDesktopInit = 'true';
  [drawer, body].forEach(node => ['', '-touch', '-wheel', '-vertical'].forEach(suffix => node.setAttribute(`data-lenis-prevent${suffix}`, '')));

  const html = document.documentElement;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const fieldSelector = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="reset"]),textarea,select';
  const norm = value => String(value || '').replace(/Â®|\u00ae/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const isField = node => Boolean(node?.matches?.(fieldSelector));
  const activeField = () => isField(document.activeElement) && drawer.contains(document.activeElement);
  const isVipHash = () => /^#vip/i.test(location.hash || '');
  const nestedConsentOpen = () => Boolean(document.querySelector('#tdb-consent-root.tdb-consent-active'));
  const lenis = method => { try { window.lenis?.[method]?.(); } catch (error) {} };
  const UP_THRESHOLD = 120;
  const DOWN_THRESHOLD = 140;

  const treatments = {
    'composite-bonding': ['Join the Composite Bonding waitlist', ['Composite Bonding']],
    'teeth-whitening': ['Join the Teeth Whitening waitlist', ['Enlighten® Teeth Whitening', 'Teeth Whitening', 'Whitening']],
    'clear-aligners': ['Join the Clear Aligners waitlist', ['Clear Aligners', 'Clear Aligner']],
    invisalign: ['Join the Invisalign® waitlist', ['Invisalign®', 'Invisalign']],
    veneers: ['Join the Veneers waitlist', ['e.max® Porcelain Veneers', 'Porcelain Veneers', 'Veneers']],
  };
  const treatmentSlug = Object.keys(treatments).find(key => location.pathname.toLowerCase().includes(key));
  const treatment = treatmentSlug ? { slug: treatmentSlug, label: treatments[treatmentSlug][0], vals: treatments[treatmentSlug][1] } : null;

  handle.removeAttribute('href');
  handle.removeAttribute('data-vip-open');
  handle.setAttribute('role', 'button');
  handle.tabIndex = 0;
  handle.setAttribute('aria-expanded', 'false');
  label.textContent = treatment ? treatment.label : 'Join VIP';
  handle.setAttribute('aria-label', treatment ? treatment.label : 'Join the VIP waitlist');
  if (treatment) drawer.dataset.treatment = treatment.slug;

  let state = 0;
  let up = 0;
  let down = 0;
  let tick = 0;
  let near = 0;
  let timer = 0;
  let lastY = Math.max(scrollY, html.scrollTop, 0);
  let routeY = lastY;
  let awayLocked = false;
  let openedFromNativeMenu = false;
  let keyboardMoving = false;
  let keyboardTimer = 0;
  let lastWidth = innerWidth;
  let lastMode = mobileQuery.matches ? 'mobile' : 'desktop';

  const pageY = () => Math.max(scrollY, html.scrollTop, 0);

  function setViewportHeight() {
    drawer.style.setProperty('--tdb-vh', `${innerHeight}px`);
  }

  function visualTop() {
    if (!mobileQuery.matches || !window.visualViewport || state !== 2) {
      drawer.style.setProperty('--tdb-vip-visual-top', '0px');
      return;
    }
    const top = Math.max(0, Math.min(window.visualViewport.offsetTop || 0, 72));
    drawer.style.setProperty('--tdb-vip-visual-top', `${top}px`);
  }

  function blurField() {
    const active = document.activeElement;
    if (isField(active) && drawer.contains(active)) active.blur();
  }

  function keyboardGrace(ms = 700) {
    keyboardMoving = true;
    clearTimeout(keyboardTimer);
    keyboardTimer = setTimeout(() => { keyboardMoving = false; }, ms);
  }

  function nativeMenuOpen() {
    const button = document.querySelector('.navbar10_menu-button,.w-nav-button');
    const menu = document.querySelector('.navbar10_menu,.w-nav-menu');
    const overlay = document.querySelector('.w-nav-overlay');
    if (button && (button.classList.contains('w--open') || button.getAttribute('aria-expanded') === 'true')) return true;
    if (menu?.classList.contains('w--open')) return true;
    if (overlay) {
      const rect = overlay.getBoundingClientRect();
      const styles = getComputedStyle(overlay);
      if (styles.display !== 'none' && styles.visibility !== 'hidden' && rect.height > 20) return true;
    }
    return false;
  }

  function setAway(on) {
    if (!mobileQuery.matches) {
      awayLocked = false;
      openedFromNativeMenu = false;
      return;
    }
    if (on) {
      awayLocked = true;
      if (openedFromNativeMenu || nativeMenuOpen()) html.classList.remove('tdb-vip-menu-away');
      else html.classList.add('tdb-vip-menu-away');
      return;
    }
    awayLocked = false;
    openedFromNativeMenu = false;
    html.classList.remove('tdb-vip-menu-away');
  }

  function hideTitle() {
    drawer.querySelectorAll('.tdb-vip-drawer-body .vip-form_top,.tdb-vip-drawer-body .line-divider').forEach(node => node.classList.add('tdb-vip-hidden-title'));
    drawer.querySelectorAll('.tdb-vip-drawer-body *').forEach(node => {
      if (node.matches('input,select,textarea,button')) return;
      const text = norm(node.textContent);
      if (text.length < 140 && /join\s+(our\s+|the\s+)?vip\s+waitlist/.test(text)) {
        node.classList.add('tdb-vip-hidden-title');
        node.closest('.vip-form_top,.text-style-tagline,.text-color-orange')?.classList.add('tdb-vip-hidden-title');
      }
    });
  }

  function fieldStates() {
    drawer.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),select,textarea').forEach(field => {
      const refreshField = () => field.classList.toggle('is-filled', Boolean(String(field.value || '').trim()));
      refreshField();
      if (!field.dataset.tdbVipFill) {
        field.addEventListener('input', refreshField);
        field.addEventListener('change', refreshField);
        field.dataset.tdbVipFill = '1';
      }
    });
  }

  function preselect() {
    if (!treatment) return;
    const select = drawer.querySelector('#Treatment-Of-Interest,select[name="Treatment-Of-Interest"],select[name="Treatment of Interest"],select[id*="Treatment"],select[name*="Treatment"]');
    if (!select) return;
    const values = treatment.vals.map(norm);
    const option = [...select.options].find(item => {
      const value = norm(item.value);
      const text = norm(item.textContent);
      return values.some(target => value === target || text === target || value.includes(target) || text.includes(target));
    });
    if (!option) return;
    select.value = option.value;
    select.classList.add('is-filled');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function refresh() { hideTitle(); fieldStates(); preselect(); }

  function render() {
    drawer.classList.toggle('is-peeking', state === 1);
    drawer.classList.toggle('is-open', state === 2);
    drawer.classList.toggle('is-closing', state === 3);
    handle.setAttribute('aria-expanded', state === 2 ? 'true' : 'false');
    if (desktopQuery.matches) {
      html.classList.toggle('tdb-vip-desktop-open', state === 2 || state === 3);
      html.classList.toggle('tdb-vip-menu-away', state === 2 || state === 3);
    } else {
      html.classList.remove('tdb-vip-desktop-open');
      if (state === 2 || state === 3) setAway(true);
    }
  }

  function reset() {
    clearTimeout(timer); clearTimeout(keyboardTimer);
    state = up = down = 0; tick = 0; keyboardMoving = false; awayLocked = false; openedFromNativeMenu = false;
    drawer.style.setProperty('--tdb-vip-visual-top', '0px');
    drawer.classList.remove('is-peeking', 'is-open', 'is-closing');
    handle.setAttribute('aria-expanded', 'false');
    html.classList.remove('tdb-vip-desktop-open', 'tdb-vip-menu-away');
    lastY = routeY = pageY();
    lenis('start'); lenis('resize');
  }

  function closeDrawer() {
    if (state === 2) { blurField(); state = 3; render(); timer = setTimeout(reset, 540); }
    else reset();
  }

  function peek() { if (!state && !near) { state = 1; render(); } }

  function openDrawer() {
    clearTimeout(timer); lastY = pageY(); state = 2; drawer.scrollTop = 0;
    if (mobileQuery.matches) {
      openedFromNativeMenu = nativeMenuOpen(); render(); visualTop();
      requestAnimationFrame(() => requestAnimationFrame(() => { refresh(); lenis('start'); lenis('resize'); }));
      return;
    }
    render(); lenis('stop');
    requestAnimationFrame(() => requestAnimationFrame(() => { refresh(); drawer.scrollTop = 0; }));
  }

  function restorePageY(y) {
    try { if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }
    catch (error) { scrollTo(0, y); }
  }

  function routeVipHash() {
    if (!desktopQuery.matches || !isVipHash()) return false;
    const y = routeY;
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch (error) {}
    restorePageY(y); lastY = y; openDrawer(); return true;
  }

  function mobileScrollCheck() {
    const y = pageY(), delta = y - lastY;
    if (delta > 0) { up = 0; down += delta; if (down > DOWN_THRESHOLD && state === 1) reset(); }
    else if (delta < 0) { down = 0; up += Math.abs(delta); if (awayLocked && up > 40 && state === 0) setAway(false); if (up > UP_THRESHOLD && y > innerHeight * 0.5 && state === 0 && !near) peek(); }
    if (y <= innerHeight * 0.5) reset(); if (y <= 40 && awayLocked) setAway(false); if (near && state !== 2 && state !== 3) reset(); lastY = y; tick = 0;
  }

  function desktopScrollCheck() {
    if (state === 2 || state === 3) { tick = 0; return; }
    const y = pageY(), delta = y - lastY;
    if (delta > 0) { up = 0; down += delta; if (down > DOWN_THRESHOLD && state === 1) reset(); }
    else if (delta < 0) { down = 0; up += Math.abs(delta); if (up > UP_THRESHOLD && y > innerHeight * 0.5 && state === 0 && !near) peek(); }
    if (y <= innerHeight * 0.5 && state !== 0) reset(); if (near && state !== 0) reset(); lastY = y; tick = 0;
  }

  drawer.addEventListener('transitionend', event => { if (event.target === drawer && event.propertyName === 'transform' && state === 3) reset(); });
  addEventListener('scroll', () => {
    if (desktopQuery.matches) {
      if (!isVipHash() && state !== 2 && state !== 3) routeY = pageY();
      if (state === 2 || tick) return; tick = 1; requestAnimationFrame(desktopScrollCheck); return;
    }
    if (!mobileQuery.matches) return;
    if (state === 2) { if (!activeField() && !keyboardMoving) scrollTo(0, lastY); return; }
    if (tick) return; tick = 1; requestAnimationFrame(mobileScrollCheck);
  }, { passive: true });

  addEventListener('resize', () => { if (mobileQuery.matches && innerWidth !== lastWidth) { lastWidth = innerWidth; setViewportHeight(); } visualTop(); }, { passive: true });
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', visualTop, { passive: true }); window.visualViewport.addEventListener('scroll', visualTop, { passive: true }); }
  ['mousedown', 'touchstart', 'click'].forEach(eventName => body.addEventListener(eventName, event => event.stopPropagation(), { passive: true }));
  ['touchmove', 'wheel'].forEach(eventName => body.addEventListener(eventName, event => event.stopPropagation(), { passive: false }));

  drawer.addEventListener('focusin', event => {
    if (!mobileQuery.matches || !isField(event.target)) return;
    visualTop(); keyboardGrace(isAndroid ? 1100 : 650); if (state !== 2 || isIOS) return;
    setTimeout(() => { visualTop(); if (event.target && drawer.contains(event.target)) { const offset = event.target.getBoundingClientRect().top - drawer.getBoundingClientRect().top; drawer.scrollTo({ top: Math.max(0, drawer.scrollTop + offset - 120), behavior: 'smooth' }); } }, isAndroid ? 250 : 150);
  }, true);
  drawer.addEventListener('focusout', event => { if (mobileQuery.matches && isField(event.target)) keyboardGrace(isAndroid ? 1000 : 700); }, true);
  document.addEventListener('touchstart', event => {
    if (!mobileQuery.matches || state !== 2 || !activeField()) return;
    const keep = event.target.closest?.(`${fieldSelector},input[type="checkbox"],input[type="radio"],label,.w-checkbox,.w-checkbox-input,.w-form-label,button,a,[role="button"]`);
    if (keep) return; blurField(); keyboardGrace(isAndroid ? 1000 : 700);
  }, { passive: true, capture: true });
  document.addEventListener('click', event => { if (!mobileQuery.matches || state !== 2 || nestedConsentOpen() || drawer.contains(event.target)) return; blurField(); keyboardGrace(isAndroid ? 1000 : 700); event.preventDefault(); event.stopPropagation(); closeDrawer(); }, true);
  document.addEventListener('click', event => { const link = event.target.closest?.('a[href]'); if (!link || drawer.contains(link) || !/#vip/i.test(link.getAttribute('href') || '')) return; event.preventDefault(); event.stopPropagation(); if (desktopQuery.matches) routeY = pageY(); openDrawer(); }, true);
  document.addEventListener('click', event => { const target = event.target.closest?.('#tdb-vip-drawer .tdb-vip-drawer-handle'); if (!target) return; event.preventDefault(); event.stopPropagation(); state === 2 ? closeDrawer() : openDrawer(); }, true);
  handle.addEventListener('keydown', event => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); state === 2 ? closeDrawer() : openDrawer(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && state === 2 && !nestedConsentOpen()) closeDrawer(); });
  ['wheel', 'touchmove'].forEach(eventName => document.addEventListener(eventName, event => { if (state === 2 && !nestedConsentOpen() && !drawer.contains(event.target)) event.preventDefault(); }, { passive: false, capture: true }));
  addEventListener('hashchange', routeVipHash);

  const vipSection = [...document.querySelectorAll('#VIP')].find(node => !drawer.contains(node));
  if (vipSection && 'IntersectionObserver' in window) new IntersectionObserver(([entry]) => { near = entry.isIntersecting; if (near && state !== 2 && state !== 3 && state !== 0) reset(); }, { rootMargin: '120px 0px' }).observe(vipSection);

  function syncMode() {
    const mode = mobileQuery.matches ? 'mobile' : 'desktop';
    if (mode !== lastMode) reset(); lastMode = mode;
    if (mobileQuery.matches) { setViewportHeight(); html.classList.remove('tdb-vip-desktop-open'); }
    else { html.classList.remove('tdb-vip-menu-away'); lastY = routeY = pageY(); }
    drawer.classList.add('is-ready'); refresh(); if (desktopQuery.matches) requestAnimationFrame(routeVipHash);
  }

  mobileQuery.addEventListener ? mobileQuery.addEventListener('change', syncMode) : mobileQuery.addListener?.(syncMode);
  desktopQuery.addEventListener ? desktopQuery.addEventListener('change', syncMode) : desktopQuery.addListener?.(syncMode);
  refresh(); setTimeout(hideTitle, 150); setTimeout(hideTitle, 600); syncMode();

  const api = Object.freeze({ version: VERSION, refresh, open: openDrawer, close: closeDrawer, reset, routeVipHash, status: () => ({ state, mode: mobileQuery.matches ? 'mobile' : 'desktop', treatment: treatment ? treatment.slug : null }) });
  window.TDBVIPDrawer = api;
  window.TDBVIPDrawerDesktop = api;
})();
