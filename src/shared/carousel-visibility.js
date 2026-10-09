/* Shared carousel visibility v1.2.1. Cached overflow bounds; Swiper slide geometry. */
(() => {
  'use strict';
  if (window.TDBCarouselVisibility) return;
  const bindings = new WeakMap();
  function bind(swiper, {activeOnly = false, overflowViewport = false} = {}) {
    if (bindings.has(swiper)) return bindings.get(swiper);
    const original = new Map();
    let disposed = false;
    const events = 'init update resize setTranslate slideChange loopFix slidesLengthChange';
    const measurements = 'init update resize breakpoint observerUpdate';
    let bounds = null;
    function measure() {
      if (!overflowViewport || !swiper.isHorizontal()) return;
      const left = swiper.el.getBoundingClientRect().left;
      bounds = {left: -left, right: innerWidth - left};
    }
    const identity = slide => slide.getAttribute('data-swiper-slide-index') || slide;
    const focusable = 'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]';
    function restore(slide, state) {
      if (state.hidden === null) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', state.hidden);
      slide.toggleAttribute('inert', state.inert);
    }
    function update() {
      if (disposed || swiper.destroyed) return;
      const active = swiper.slides[swiper.activeIndex];
      // Native Smile/Instagram intentionally bleed past their one-card viewport.
      // Keep those visible neighbours clickable. Cached slide offsets and sizes
      // avoid a layout read on every drag/translate event.
      const visible = activeOnly ? (active ? [active] : []) : bounds ? [...swiper.slides].filter((slide, index) => {
        const left = slide.swiperSlideOffset + (swiper.rtlTranslate ? -swiper.translate : swiper.translate);
        return left < bounds.right - 1 && left + swiper.slidesSizesGrid[index] > bounds.left + 1;
      }) : Array.from(swiper.visibleSlides || []);
      if (!visible.length && active) visible.push(active);
      const chosen = new Map();
      for (const slide of visible) {
        const key = identity(slide);
        if (!chosen.has(key) || slide === active) chosen.set(key, slide);
      }
      const exposed = new Set(chosen.values());
      const focused = document.activeElement;
      const focusedSlide = [...swiper.slides].find(slide => slide === focused || slide.contains(focused));
      const replacement = focusedSlide && !exposed.has(focusedSlide) ? chosen.get(identity(focusedSlide)) : null;
      for (const slide of swiper.slides) {
        if (!original.has(slide)) original.set(slide, {
          hidden: slide.getAttribute('aria-hidden'), inert: slide.hasAttribute('inert')
        });
        const hidden = !exposed.has(slide);
        if (slide.getAttribute('aria-hidden') !== String(hidden)) slide.setAttribute('aria-hidden', String(hidden));
        if (slide.hasAttribute('inert') !== hidden) slide.toggleAttribute('inert', hidden);
      }
      // Loop correction may exchange physical copies of the same card. Keep
      // keyboard focus on its equivalent control without scrolling the page.
      if (replacement) {
        const index = [...focusedSlide.querySelectorAll(focusable)].indexOf(focused);
        const target = focusedSlide === focused ? replacement : replacement.querySelectorAll(focusable)[index];
        target?.focus({preventScroll: true});
      }
      // Restore retired clones, while retaining state when an entire component
      // is temporarily detached and subsequently destroyed or remounted.
      const current = new Set(swiper.slides);
      for (const [slide, state] of original) if (!current.has(slide)) {
        restore(slide, state); original.delete(slide);
      }
    }
    function destroy(fromSwiper = false) {
      if (disposed) return;
      disposed = true;
      // Swiper iterates listeners directly during destruction; do not splice
      // that array and accidentally skip another component's cleanup.
      if (!fromSwiper) {
        swiper.off(measurements, measure);
        swiper.off(events, update);
        swiper.off('beforeDestroy', beforeDestroy);
      }
      for (const [slide, state] of original) restore(slide, state);
      original.clear();
      bindings.delete(swiper);
    }
    const beforeDestroy = () => destroy(true);
    const api = Object.freeze({update, destroy});
    bindings.set(swiper, api);
    measure();
    swiper.on(measurements, measure);
    swiper.on(events, update);
    swiper.on('beforeDestroy', beforeDestroy);
    update();
    return api;
  }
  window.TDBCarouselVisibility = Object.freeze({version: '1.2.1', bind});
})();
