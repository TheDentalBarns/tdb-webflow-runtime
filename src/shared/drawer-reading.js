/* Shared drawer reading v1.1.0. Native styles own portrait/landscape layout. */
(() => {
  'use strict';
  if (window.TDBDrawerReading) return;
  // Preserve the existing short touch-landscape rule for both reading panes.
  const landscapeQuery = matchMedia(
    '(orientation: landscape) and (max-width: 991px) and (max-height: 500px) and (pointer: coarse)',
  );
  function mount({
    pane,
    footer,
    viewport,
    track,
    nodes,
    slideScroll,
    swiper: currentSwiper,
    active,
    onMode = () => {},
    onRestore = () => {},
    durationRoot,
    durationProperty,
  }) {
    const controller = new AbortController(),
      { signal } = controller;
    const originalHeight = track.style.height;
    let landscape = false,
      anchor = null,
      width = viewport.clientWidth,
      bound = null,
      frame = 0,
      pending = false,
      destroyed = false,
      stopSettled;
    const scroll = () => (landscape ? pane : slideScroll());
    function capture() {
      if (!landscape || anchor || !active()) return;
      const top = pane.scrollTop,
        bottom = Math.max(0, pane.scrollHeight - pane.clientHeight - top);
      anchor = { top, bottom, atFoot: bottom <= footer.offsetHeight };
    }
    function apply() {
      if (!landscape || !anchor) return;
      const max = Math.max(0, pane.scrollHeight - pane.clientHeight);
      pane.scrollTop = Math.max(0, Math.min(max, anchor.atFoot ? max - anchor.bottom : anchor.top));
    }
    function duration() {
      const swiper = currentSwiper();
      if (destroyed || !swiper || swiper.destroyed || busy(swiper)) return;
      const value = window.TDBMotion.reduced.matches ? 0 : window.TDBMotion.duration(innerWidth);
      swiper.params.speed = value;
      swiper.originalParams.speed = value;
      if (
        durationProperty &&
        durationRoot.style.getPropertyValue(durationProperty) !== value + 'ms'
      )
        durationRoot.style.setProperty(durationProperty, value + 'ms');
    }
    function bind() {
      const swiper = currentSwiper();
      if (swiper === bound) return;
      stopSettled?.();
      bound?.off('resize', requestResize);
      bound = swiper;
      bound?.on('resize', requestResize);
      stopSettled = swiper
        ? window.TDBSwiper.onSettled(swiper, () => {
            duration();
            if (pending) requestResize();
          })
        : null;
      duration();
    }
    function setMode(enabled = landscapeQuery.matches) {
      if (enabled === landscape) return;
      const offset = scroll()?.scrollTop || 0;
      anchor = null;
      landscape = enabled;
      for (const node of nodes()) node?.classList.toggle('is-phone-landscape', landscape);
      onMode(landscape);
      const swiper = currentSwiper();
      if (!landscape) track.style.height = originalHeight;
      if (swiper && !destroyed) {
        swiper.params.autoHeight = landscape;
        swiper.update();
      }
      pane.scrollTop = 0;
      if (scroll()) scroll().scrollTop = offset;
      onRestore();
      duration();
    }
    const busy = (swiper) => swiper.animating || swiper.touchEventsData?.isTouched;
    function resize() {
      frame = 0;
      const swiper = currentSwiper();
      if (destroyed || !swiper || swiper.destroyed || document.hidden || busy(swiper)) return;
      pending = false;
      const nextWidth = viewport.clientWidth,
        changed = Math.abs(nextWidth - width) > 0.5;
      if (!nextWidth) return;
      width = nextWidth;
      duration();
      // Auto-height is output, not a reason to restart the moving slide.
      if (!landscape || changed) {
        const index = swiper.activeIndex;
        swiper.update();
        if (swiper.activeIndex !== index) swiper.slideTo(index, 0, false);
      }
      apply();
    }
    function requestResize() {
      if (destroyed) return;
      pending = true;
      const swiper = currentSwiper();
      if (!frame && swiper && !swiper.destroyed && !document.hidden && !busy(swiper))
        frame = requestAnimationFrame(resize);
    }
    // Both native drawers use Swiper's existing observer. Their adapters disable
    // its default full update so a resize has one owner and waits for settlement.
    document.addEventListener(
      'visibilitychange',
      () => {
        if (pending) requestResize();
      },
      { signal },
    );
    landscapeQuery.addEventListener('change', () => setMode(), { signal });
    window.addEventListener('resize', duration, { passive: true, signal });
    return Object.freeze({
      scroll,
      capture,
      apply,
      setMode,
      bind,
      clear() {
        anchor = null;
      },
      get landscape() {
        return landscape;
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(frame);
        frame = 0;
        controller.abort();
        stopSettled?.();
        bound?.off('resize', requestResize);
        setMode(false);
        if (durationProperty) durationRoot.style.removeProperty(durationProperty);
      },
    });
  }
  window.TDBDrawerReading = Object.freeze({ version: '1.1.0', mount });
})();
