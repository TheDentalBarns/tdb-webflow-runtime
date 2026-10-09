/* Shared drawer reading v1.0.0. Native styles own portrait/landscape layout. */
(() => {
  'use strict';
  if (window.TDBDrawerReading) return;
  // Preserve the existing short touch-landscape rule for both reading panes.
  const landscapeQuery = matchMedia('(orientation: landscape) and (max-width: 991px) and (max-height: 500px) and (pointer: coarse)');
  function mount({pane, footer, viewport, track, nodes, slideScroll, swiper: currentSwiper,
    active, onMode = () => {}, onRestore = () => {}, durationRoot, durationProperty}) {
    const controller = new AbortController(), {signal} = controller;
    const originalHeight = track.style.height;
    let landscape = false, anchor = null, width = viewport.clientWidth, bound = null, stopSettled;
    const scroll = () => landscape ? pane : slideScroll();
    function capture() {
      if (!landscape || anchor || !active()) return;
      const top = pane.scrollTop, bottom = Math.max(0, pane.scrollHeight - pane.clientHeight - top);
      anchor = {top, bottom, atFoot: bottom <= footer.offsetHeight};
    }
    function apply() {
      if (!landscape || !anchor) return;
      const max = Math.max(0, pane.scrollHeight - pane.clientHeight);
      pane.scrollTop = Math.max(0, Math.min(max, anchor.atFoot ? max - anchor.bottom : anchor.top));
    }
    function duration() {
      const swiper = currentSwiper();
      if (!swiper || swiper.destroyed || swiper.animating) return;
      const value = window.TDBMotion.reduced.matches ? 0 : window.TDBMotion.duration(innerWidth);
      swiper.params.speed = value;
      swiper.originalParams.speed = value;
      if (durationProperty) durationRoot.style.setProperty(durationProperty, value + 'ms');
    }
    function bind() {
      const swiper = currentSwiper();
      if (swiper === bound) return;
      stopSettled?.(); bound = swiper;
      stopSettled = swiper ? window.TDBSwiper.onSettled(swiper, duration) : null;
      duration();
    }
    function setMode(enabled = landscapeQuery.matches) {
      if (enabled === landscape) return;
      const offset = scroll()?.scrollTop || 0;
      anchor = null; landscape = enabled;
      for (const node of nodes()) node?.classList.toggle('is-phone-landscape', landscape);
      onMode(landscape);
      const swiper = currentSwiper();
      if (swiper) {
        swiper.params.autoHeight = landscape;
        if (!landscape) track.style.height = originalHeight;
        swiper.update();
      }
      pane.scrollTop = 0;
      if (scroll()) scroll().scrollTop = offset;
      onRestore(); duration();
    }
    function resize() {
      const nextWidth = viewport.clientWidth, changed = Math.abs(nextWidth - width) > .5;
      width = nextWidth;
      const swiper = currentSwiper();
      duration();
      // Auto-height is output, not a reason to restart the moving slide.
      if (swiper && !swiper.animating && (!landscape || changed)) swiper.update();
      apply();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    landscapeQuery.addEventListener('change', () => setMode(), {signal});
    window.addEventListener('resize', duration, {passive: true, signal});
    return Object.freeze({scroll, capture, apply, setMode, bind, clear() {anchor = null;},
      get landscape() {return landscape;},
      destroy() {
        observer.disconnect(); controller.abort(); stopSettled?.(); setMode(false);
        if (durationProperty) durationRoot.style.removeProperty(durationProperty);
      }
    });
  }
  window.TDBDrawerReading = Object.freeze({version: '1.0.0', mount});
})();
