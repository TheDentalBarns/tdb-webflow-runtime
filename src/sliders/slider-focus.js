/* TDB slider focus v1.2.0: page chrome focus with an optional navbar participant. */
(() => {
  'use strict';
  const html = document.documentElement;
  if (html.dataset.tdbSliderFocusReady) return;
  html.dataset.tdbSliderFocusReady = '1.2.0';

  const SLIDERS = '.highlight-swiper_component,.parallax-swiper_component,.swiper,.w-slider';
  const CONTROLS = '.swiper-btn-prev,.swiper-btn-next,.swiper-bullet,.swiper-pagination-bullet,.w-slider-arrow-left,.w-slider-arrow-right,.w-slider-dot';
  const FIELDS = 'input,textarea,select,[contenteditable="true"]';
  const GALLERY = '[data-tdb-sg-overlay],.tdb-sg-filter-dock';
  let state = null, gesture = null, releaseFrame = 0, menuTimer = 0, retryTimer = 0;
  let scrollFrame = 0;
  const scrollTop = () => Math.max(window.scrollY || html.scrollTop || 0, 0);

  // Navbar pages keep their existing scroll controller. Only pages without it
  // need this temporary observer, using the same directional release thresholds.
  function updateFocusScroll() {
    scrollFrame = 0;
    if (!state || state.controller) return;
    const y = scrollTop(), delta = y - state.y;
    state.y = y;
    if (gesture?.horizontal) state.up = state.down = 0;
    else if (delta > 0) { state.up = 0; state.down += delta; }
    else if (delta < 0) { state.down = 0; state.up -= delta; }
    if (state.up > 120 || state.down > 140 || (y <= 40 && delta < 0)) scheduleRelease();
  }

  function requestFocusScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateFocusScroll);
  }

  function stopFocusScroll() {
    window.removeEventListener('scroll', requestFocusScroll);
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  }

  const rootFor = target => target?.closest?.('.logo-slider') ? null : target?.closest?.(SLIDERS);
  const unavailable = target => target?.closest?.('[disabled],[aria-disabled="true"],[hidden],[inert]');
  const galleryOwnsChrome = () => html.classList.contains('tdb-sg-chrome-away') || html.classList.contains('tdb-sg-locked');

  function cancelRelease() {
    if (releaseFrame) cancelAnimationFrame(releaseFrame);
    releaseFrame = 0;
  }

  function release() {
    cancelRelease();
    clearTimeout(menuTimer); clearTimeout(retryTimer);
    stopFocusScroll();
    state?.controller?.release();
    if (html.classList.contains('tdb-slider-focus')) html.classList.remove('tdb-slider-focus');
    if (state?.nav) {
      if (state.value) state.nav.style.setProperty('--tdb-slider-nav-away', state.value, state.priority);
      else state.nav.style.removeProperty('--tdb-slider-nav-away');
    }
    state = null;
  }

  function closeNativeMenus() {
    if (!state || galleryOwnsChrome()) return;
    document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();
    document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(button => button.click());
  }

  function focusSlider(slider) {
    if (!slider || unavailable(slider) || galleryOwnsChrome()) return;
    cancelRelease();
    if (!state) {
      const nav = document.querySelector('.navbar10_component');
      state = { nav, value: nav?.style.getPropertyValue('--tdb-slider-nav-away') || '', priority: nav?.style.getPropertyPriority('--tdb-slider-nav-away') || '' };
      if (nav) {
        const top = nav.getBoundingClientRect().top;
        const parts = [nav, ...nav.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')];
        const distance = Math.max(nav.offsetHeight, ...parts.filter(part => part.getClientRects().length && getComputedStyle(part).visibility !== 'hidden').map(part => part.getBoundingClientRect().bottom - top));
        nav.style.setProperty('--tdb-slider-nav-away', distance + 'px');
      }
      const vip = document.getElementById('tdb-vip-drawer');
      if (vip?.matches('.is-open,.is-peeking')) window.TDBVIPDrawer?.close?.();
      menuTimer = setTimeout(closeNativeMenus, 430);
      // Respect the native menu's short opening guard.
      retryTimer = setTimeout(closeNativeMenus, 680);
    }
    state.slider = slider;
    state.controller = window.TDBNavScroll || null;
    stopFocusScroll();
    if (state.controller) state.controller.focus(scheduleRelease, () => Boolean(gesture?.horizontal));
    else {
      state.y = scrollTop(); state.up = state.down = 0;
      window.addEventListener('scroll', requestFocusScroll, { passive: true });
    }
    if (!html.classList.contains('tdb-slider-focus')) html.classList.add('tdb-slider-focus');
  }

  function controlFor(target) {
    const control = target?.closest?.(CONTROLS);
    return control && !unavailable(control) ? rootFor(control) : null;
  }

  function onPointerDown(event) {
    gesture = null;
    if (event.button !== 0 || event.isPrimary === false || event.target.closest?.(FIELDS + ',' + GALLERY)) return;
    const slider = rootFor(event.target);
    if (!slider || unavailable(event.target)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, slider, horizontal: false };
    if (controlFor(event.target)) focusSlider(slider);
  }
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });

  function onPointerMove(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const x = Math.abs(event.clientX - gesture.x), y = Math.abs(event.clientY - gesture.y);
    if (!gesture.horizontal && y > 10 && y > x) { gesture = null; return; }
    if (!gesture.horizontal && x > 8 && x > y * 1.2) {
      gesture.horizontal = true;
      focusSlider(gesture.slider);
    }
  }
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });

  const endGesture = event => {
    if (gesture?.id !== event.pointerId) return;
    if (gesture.horizontal && state) focusSlider(gesture.slider);
    gesture = null;
  };
  document.addEventListener('pointerup', endGesture, { capture: true, passive: true });
  document.addEventListener('pointercancel', endGesture, { capture: true, passive: true });

  function onClick(event) {
    if (event.target.closest?.(GALLERY + ',' + FIELDS)) return;
    const slider = controlFor(event.target);
    if (slider) { focusSlider(slider); return; }
    // Tapping a smile card's details is also deliberate slider interaction.
    if (!event.target.closest?.('a,button,[role="button"]') && event.target.closest?.('.swiper-slide,.w-slide')) {
      focusSlider(rootFor(event.target));
    }
  }
  document.addEventListener('click', onClick, { capture: true, passive: true });

  function onKeyDown(event) {
    if (event.target.closest?.(FIELDS + ',' + GALLERY)) return;
    if (event.key === 'Escape' && state) { release(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) return;
    const control = controlFor(event.target);
    if (control) { focusSlider(control); return; }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const local = rootFor(event.target);
    if (local) { focusSlider(local); return; }
    // Swiper's existing keyboard navigation can be active with body focus.
    if (event.target !== document.body && event.target !== html) return;
    const slider = [...document.querySelectorAll('.swiper')].find(element => {
      if (!rootFor(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0 && rect.right > 0 && rect.left < innerWidth && !unavailable(element);
    });
    if (slider) focusSlider(slider);
  }
  document.addEventListener('keydown', onKeyDown, { capture: true, passive: true });

  function scheduleRelease() {
    if (releaseFrame) return;
    // Let the existing nav, timer and VIP scroll handlers settle first.
    releaseFrame = requestAnimationFrame(() => {
      releaseFrame = requestAnimationFrame(() => { releaseFrame = 0; release(); });
    });
  }

  const explicitChromeIntent = event => {
    if (!state) return;
    if (event.target.closest?.('.navbar10_component,#tdb-vip-drawer,a[href*="#vip"],[data-tdb-vip-open]')) release();
  };
  document.addEventListener('focusin', explicitChromeIntent);
  document.addEventListener('pointerdown', explicitChromeIntent, { capture: true, passive: true });
  window.addEventListener('resize', () => { gesture = null; release(); }, { passive: true });
  window.addEventListener('pagehide', () => { gesture = null; release(); });
  new MutationObserver(() => { if (state && galleryOwnsChrome()) release(); }).observe(html, { attributes: true, attributeFilter: ['class'] });
  // Resume only the latest focus gesture if its module was still downloading.
  // This invokes focus bookkeeping; it never replays clicks or slide commands.
  window.TDBSliderFocus = Object.freeze({
    resume(seed) {
      if (!seed || Math.abs(window.scrollY - seed.y) > 8) return;
      const target = (seed.click || seed.key || seed.down)?.target;
      if (!target?.isConnected) return;
      if (seed.down) onPointerDown(seed.down);
      if (seed.move) onPointerMove(seed.move);
      if (seed.end) endGesture(seed.end);
      if (seed.click) onClick(seed.click);
      if (seed.key) onKeyDown(seed.key);
    },
  });
})();
