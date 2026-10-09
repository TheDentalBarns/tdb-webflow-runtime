/* Shared carousel visibility v1.0.0. Reuse Swiper geometry; no layout reads. */
(() => {
  'use strict';
  if (window.TDBCarouselVisibility) return;
  const bindings = new WeakMap();
  function bind(swiper) {
    if (bindings.has(swiper)) return bindings.get(swiper);
    const original = new Map();
    const events = 'init update resize setTranslate slideChange loopFix slidesLengthChange';
    function update() {
      const active = swiper.slides[swiper.activeIndex];
      const visible = Array.from(swiper.visibleSlides || []);
      if (!visible.length && active) visible.push(active);
      const chosen = new Map();
      for (const slide of visible) {
        const key = slide.getAttribute('data-swiper-slide-index') || slide;
        if (!chosen.has(key) || slide === active) chosen.set(key, slide);
      }
      const exposed = new Set(chosen.values());
      for (const slide of swiper.slides) {
        if (!original.has(slide)) original.set(slide, {
          hidden: slide.getAttribute('aria-hidden'), inert: slide.hasAttribute('inert')
        });
        const hidden = !exposed.has(slide);
        if (slide.getAttribute('aria-hidden') !== String(hidden)) slide.setAttribute('aria-hidden', String(hidden));
        if (slide.hasAttribute('inert') !== hidden) slide.toggleAttribute('inert', hidden);
      }
      // Breakpoint loop recreation detaches old clones; do not retain them.
      for (const slide of original.keys()) if (!slide.isConnected) original.delete(slide);
    }
    function destroy() {
      swiper.off(events, update);
      swiper.off('beforeDestroy', destroy);
      for (const [slide, state] of original) {
        if (state.hidden === null) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', state.hidden);
        slide.toggleAttribute('inert', state.inert);
      }
      original.clear();
      bindings.delete(swiper);
    }
    const api = Object.freeze({update, destroy});
    bindings.set(swiper, api);
    swiper.on(events, update);
    swiper.on('beforeDestroy', destroy);
    update();
    return api;
  }
  window.TDBCarouselVisibility = Object.freeze({version: '1.0.0', bind});
})();
