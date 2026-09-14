/* Entry-page controls run in the initial batch; Swiper remains demand-loaded. */
(() => {
  'use strict';
  if (window.TDBParallaxControls) return;
  const controllers = new WeakMap();
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const entry = path === '/' || path === '/location';
  function configure(component) {
    if (!entry) return;
    const mobile = matchMedia('(max-width:767px) and (orientation:portrait)').matches;
    document.documentElement.classList.toggle('tdb-slider-next', mobile);
    document.documentElement.classList.toggle('tdb-slider-desktop', matchMedia('(min-width:768px)').matches);
    const swiper = component.querySelector(':scope > .swiper');
    const controls = component.querySelector(':scope > .swiper_functions-btm.hide');
    if (mobile && swiper && controls) swiper.appendChild(controls);
    component.querySelectorAll('.swiper-btn-prev,.swiper-btn-next').forEach(button => {
      button.tabIndex = 0;
      button.setAttribute('role', 'button');
      button.setAttribute('aria-label', button.matches('.swiper-btn-prev') ? 'Previous slide' : 'Next slide');
    });
  }
  // Keep the CMS links as the source of truth, but give each entry-page
  // carousel one stationary, keyboard-accessible call to action.
  function prepareParallaxCTA(component, swiperEl) {
    if (!/^\/(?:location\/?)?$/.test(window.location.pathname)) return null;
    const slides = Array.from(swiperEl.querySelectorAll('.swiper-slide'));
    const sources = slides.map(slide => {
      const link = slide.querySelector('.service-card-button-wrap a[href]');
      return link && {
        href: link.getAttribute('href'),
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel'),
        label: link.textContent.replace(/\s+/g, ' ').trim(),
        title: slide.querySelector('.service-card-mobile-title')?.textContent.trim() || ''
      };
    });
    const sourceButton = swiperEl.querySelector('.service-card-button-wrap a[href]');
    if (!sourceButton) return null;

    // Keep visual state with this history entry, including a rebuilt Back page.
    // Preserve any state owned by Webflow or another site module.
    const key = path + ':' + [...document.querySelectorAll('.parallax-swiper_component')].indexOf(component);
    const historyReturn = performance.getEntriesByType?.('navigation')[0]?.type === 'back_forward';
    const stored = historyReturn ? history.state?.tdbParallax?.[key] : null;
    const storedIndex = !stored?.href ? -1 : Number.isInteger(stored.index) && sources[stored.index]?.href === stored.href
      ? stored.index : sources.findIndex(source => source?.href === stored.href);
    const initialIndex = storedIndex >= 0 ? storedIndex : 0;
    const restored = storedIndex >= 0;
    if (initialIndex) swiperEl.style.setProperty('--tdb-parallax-initial-index', String(initialIndex));

    const button = sourceButton.cloneNode(true);
    button.removeAttribute('aria-hidden');
    button.removeAttribute('tabindex');
    button.removeAttribute('data-fade-slide');
    button.classList.remove('fade', 'animate');
    button.setAttribute('data-tdb-parallax-cta', '');
    if (restored && stored.held) button.classList.add('is-touch-held');
    [button, ...button.querySelectorAll('[id]')].forEach(node => node.removeAttribute('id'));
    const layer = document.createElement('div');
    layer.className = 'tdb-parallax-cta-layer';
    if (window.location.pathname.replace(/\/$/, '') === '/location') layer.classList.add('is-location');
    layer.appendChild(button);

    const removed = [];
    slides.forEach((slide, index) => {
      slide.setAttribute('data-tdb-parallax-cta-index', String(index));
      // Location also has obsolete button copies outside the canonical wrapper.
      slide.querySelectorAll('.showcase-content_btm a.button').forEach(node => {
        removed.push({ node, parent: node.parentNode, next: node.nextSibling });
        node.remove();
      });
    });
    component.classList.add('has-static-parallax-cta');
    swiperEl.appendChild(layer);

    let swiper = null;
    let busy = false;
    let destroyed = false;
    let pendingDirection = null;
    let pendingLoad = null;
    let interacted = false;
    let touch = null;
    let pressed = false;
    let scrollStart = window.scrollY;
    let scrollIntent = false;
    function persist() {
      const state = history.state;
      // Do not replace non-object history state owned by another integration.
      if (state != null && (typeof state !== 'object' || Array.isArray(state))) return;
      const slide = swiper?.slides[swiper.activeIndex];
      const index = slide ? Number(slide.getAttribute('data-tdb-parallax-cta-index')) : initialIndex;
      const source = sources[index];
      if (!source?.href) return;
      try {
        history.replaceState({ ...state, tdbParallax: { ...state?.tdbParallax,
          [key]: { index, href: source.href, held: button.classList.contains('is-touch-held') }
        } }, '');
      } catch (_) { /* Feedback still works if history writes are unavailable. */ }
    }
    function resetTouchFeedback() {
      if (!button.classList.contains('is-touch-held')) return;
      button.classList.remove('is-touch-held');
      persist();
    }
    function resetScrollIntent() { scrollIntent = false; touch = null; pressed = false; }
    function onPageHide() { persist(); resetScrollIntent(); }
    function onTouchStart(event) {
      const point = event.touches[0];
      touch = point ? { x: point.clientX, y: point.clientY } : null;
      scrollStart = window.scrollY;
      scrollIntent = false;
    }
    function onTouchMove(event) {
      const point = event.touches[0];
      if (!touch || !point) return;
      const x = Math.abs(point.clientX - touch.x), y = Math.abs(point.clientY - touch.y);
      if (y > 8 && y > x) {
        scrollIntent = true;
        onScroll(); // Composited mobile scroll can precede touchmove delivery.
      }
    }
    function onWheel(event) {
      if (!event.deltaY) return;
      scrollStart = window.scrollY;
      scrollIntent = true;
    }
    function onScroll() {
      if (!scrollIntent || Math.abs(window.scrollY - scrollStart) < 2) return;
      scrollIntent = false;
      resetTouchFeedback();
    }
    function onPointerDown(event) {
      pressed = button.contains(event.target) && !busy &&
        button.getAttribute('aria-disabled') !== 'true';
      if (event.pointerType === 'touch') {
        if (pressed) button.classList.add('is-touch-held');
      } else resetTouchFeedback();
    }
    function onPointerUp() { pressed = false; }
    function onPointerCancel() {
      // A navigation can cancel pointers after click; keep the latched feedback.
      if (pressed && scrollIntent) resetTouchFeedback();
      pressed = false;
    }
    function onKeyDown() {
      resetTouchFeedback();
    }
    function sync() {
      const slide = swiper?.slides[swiper.activeIndex] || slides[initialIndex];
      const index = slide?.getAttribute('data-tdb-parallax-cta-index');
      const source = index == null ? null : sources[Number(index)];
      if (!source?.href) {
        button.removeAttribute('href');
        button.setAttribute('aria-disabled', 'true');
        button.tabIndex = -1;
        return;
      }
      button.setAttribute('href', source.href);
      for (const key of ['target', 'rel']) {
        if (source[key]) button.setAttribute(key, source[key]);
        else button.removeAttribute(key);
      }
      // Reuse the original button's text node container and arrow artwork.
      if (button.firstElementChild) button.firstElementChild.textContent = source.label;
      button.setAttribute('aria-label', source.title ? `${source.label}: ${source.title}` : source.label);
      if (busy) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
      button.tabIndex = busy ? -1 : 0;
    }
    function onClick(event) {
      if (busy || button.getAttribute('aria-disabled') === 'true') event.preventDefault();
      else persist();
    }
    function runPendingNavigation() {
      if (!pendingDirection || pendingLoad || !window.TDBSliderLoader || destroyed) return;
      pendingLoad = window.TDBSliderLoader.load().then(() => {
        if (destroyed || !component.isConnected) return;
        window.TDBSliders?.activate(component);
        if (!swiper) throw new Error('Parallax controls did not bind');
        const direction = pendingDirection;
        pendingDirection = null;
        component.querySelectorAll('.swiper-btn-prev,.swiper-btn-next').forEach(control => {
          control.classList.toggle('is-selected', control.matches(direction === 'prev' ? '.swiper-btn-prev' : '.swiper-btn-next'));
        });
        if (direction === 'prev') swiper.slidePrev();
        else if (direction === 'next') swiper.slideNext();
      }).catch(() => { pendingDirection = null; }).finally(() => {
        pendingLoad = null;
        component.removeAttribute('aria-busy');
      });
    }
    function onNavigationIntent(event) {
      const control = event.target.closest?.('.swiper-btn-prev,.swiper-btn-next');
      if (!control || swiper || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
      event.preventDefault();
      event.stopPropagation();
      interacted = true;
      pendingDirection = control.matches('.swiper-btn-prev') ? 'prev' : 'next';
      component.setAttribute('aria-busy', 'true');
      runPendingNavigation();
    }
    function destroy() {
      destroyed = true;
      controllers.delete(component);
      swiper?.off('slideChange', sync);
      button.removeEventListener('click', onClick);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('keydown', onKeyDown, true);
      button.removeEventListener('pointercancel', onPointerCancel);
      component.removeEventListener('click', onNavigationIntent, true);
      component.removeEventListener('keydown', onNavigationIntent, true);
      window.removeEventListener('tdb:slider-loader-ready', runPendingNavigation);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', resetScrollIntent);
      layer.remove();
      component.classList.remove('has-static-parallax-cta');
      swiperEl.style.removeProperty('--tdb-parallax-initial-index');
      slides.forEach(slide => slide.removeAttribute('data-tdb-parallax-cta-index'));
      removed.slice().reverse().forEach(({ node, parent, next }) => {
        parent.insertBefore(node, next?.parentNode === parent ? next : null);
      });
    }
    button.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    document.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
    document.addEventListener('keydown', onKeyDown, true);
    button.addEventListener('pointercancel', onPointerCancel);
    component.addEventListener('click', onNavigationIntent, true);
    component.addEventListener('keydown', onNavigationIntent, true);
    window.addEventListener('tdb:slider-loader-ready', runPendingNavigation);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', resetScrollIntent);
    sync();
    return {
      initialIndex,
      get skipEntry() { return restored || interacted; },
      bind(instance) {
        if (swiper === instance) return;
        swiper = instance;
        swiper.on('slideChange', sync);
        swiper.on('beforeDestroy', destroy);
        sync();
      },
      setBusy(value) { busy = value; sync(); }
    };
  }

  function prepare(component, swiperEl = component.querySelector(':scope > .swiper')) {
    if (!entry || !swiperEl) return null;
    if (controllers.has(component)) return controllers.get(component);
    configure(component);
    const controller = prepareParallaxCTA(component, swiperEl);
    if (controller) controllers.set(component, controller);
    return controller;
  }
  function start() {
    if (entry) document.querySelectorAll('.parallax-swiper_component').forEach(component => prepare(component));
  }
  window.TDBParallaxControls = Object.freeze({ version: '1.0.0', prepare });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
