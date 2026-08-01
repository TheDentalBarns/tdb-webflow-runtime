(() => {
  'use strict';

  const VERSION = '0.5.1';
  const DEFAULTS = {
    selector: '.logo-slider .partner-featured_component',
    itemSelector: '.partner_logos',
    speedDesktop: 40,
    speedMobile: 22,
    mobileMedia: '(max-width: 767px)',
    smoothing: 0.18,
    viewportMargin: 200,
    maxMeasureAttempts: 160,
    measureRetryMs: 50,
    dragClickThreshold: 6
  };

  const CONFIG = {
    ...DEFAULTS,
    ...(window.TDBLogoMarqueeConfig || {})
  };

  const INIT_ATTR = 'data-tdb-logo-marquee-init';
  const CLONE_ATTR = 'data-tdb-logo-marquee-clone';
  const instances = new Map();

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

  function wrapX(value, width) {
    if (!width) return 0;
    const wrapped = modulo(value, width);
    return wrapped === 0 ? 0 : wrapped - width;
  }

  function shortestDelta(delta, width) {
    if (!width) return delta;
    return modulo(delta + width / 2, width) - width / 2;
  }

  function isNearViewport(element, margin = CONFIG.viewportMargin) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.bottom > -margin && rect.top < window.innerHeight + margin;
  }

  function getSpeed() {
    return window.matchMedia?.(CONFIG.mobileMedia)?.matches
      ? CONFIG.speedMobile
      : CONFIG.speedDesktop;
  }

  function makeClone(original) {
    const clone = original.cloneNode(true);
    clone.setAttribute(CLONE_ATTR, 'true');
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('id');

    clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    clone
      .querySelectorAll('a, button, input, select, textarea, [tabindex]')
      .forEach(element => element.setAttribute('tabindex', '-1'));

    return clone;
  }

  function initTrack(track) {
    if (!track || instances.has(track) || track.getAttribute(INIT_ATTR) === VERSION) {
      return instances.get(track) || null;
    }

    const originals = Array.from(
      track.querySelectorAll(`${CONFIG.itemSelector}:not([${CLONE_ATTR}])`)
    );

    if (!originals.length) return null;

    track.setAttribute(INIT_ATTR, VERSION);
    track.style.willChange = 'transform';
    track.style.touchAction = 'pan-y';

    track.querySelectorAll('img').forEach(image => {
      image.loading = 'eager';
      image.setAttribute('loading', 'eager');
      image.setAttribute('decoding', 'async');
    });

    const fragment = document.createDocumentFragment();
    originals.forEach(original => fragment.appendChild(makeClone(original)));
    track.appendChild(fragment);

    const controller = new AbortController();
    const { signal } = controller;

    let loopWidth = 0;
    let targetX = 0;
    let currentX = 0;
    let ready = false;
    let active = isNearViewport(track);
    let dragging = false;
    let pointerId = null;
    let lastPointerX = 0;
    let dragDistance = 0;
    let suppressNextClick = false;
    let rafId = 0;
    let lastFrameAt = performance.now();
    let measureTimer = 0;
    let measureAttempts = 0;
    let intersectionObserver = null;
    let resizeObserver = null;

    function setTransform(value) {
      track.style.transform = `translate3d(${value}px, 0, 0)`;
    }

    function measureLoopWidth() {
      const firstOriginal = track.querySelector(
        `${CONFIG.itemSelector}:not([${CLONE_ATTR}])`
      );
      const firstClone = track.querySelector(
        `${CONFIG.itemSelector}[${CLONE_ATTR}]`
      );

      if (!firstOriginal || !firstClone) return 0;
      const width = firstClone.offsetLeft - firstOriginal.offsetLeft;
      return width > 0 ? width : 0;
    }

    function applyMeasurement() {
      const nextWidth = measureLoopWidth();

      if (!nextWidth) {
        ready = false;
        if (measureAttempts++ < CONFIG.maxMeasureAttempts) {
          clearTimeout(measureTimer);
          measureTimer = window.setTimeout(applyMeasurement, CONFIG.measureRetryMs);
        }
        return;
      }

      const gap = loopWidth
        ? shortestDelta(targetX - currentX, loopWidth)
        : targetX - currentX;

      loopWidth = nextWidth;
      currentX = wrapX(currentX, loopWidth);
      targetX = currentX + shortestDelta(gap, loopWidth);
      measureAttempts = 0;
      ready = true;
      active = isNearViewport(track);
      setTransform(wrapX(currentX, loopWidth));
    }

    function scheduleMeasure() {
      clearTimeout(measureTimer);
      measureTimer = window.setTimeout(applyMeasurement, 120);
    }

    function frame(now) {
      if (!document.documentElement.contains(track)) {
        destroy();
        return;
      }

      const deltaSeconds = clamp((now - lastFrameAt) / 1000, 0, 0.25);
      lastFrameAt = now;

      if (ready && active && document.visibilityState !== 'hidden') {
        targetX -= getSpeed() * deltaSeconds;

        const frameSmoothing = 1 - Math.pow(1 - CONFIG.smoothing, deltaSeconds * 60);
        currentX += (targetX - currentX) * frameSmoothing;

        if (Math.abs(currentX) > 1000000 || Math.abs(targetX) > 1000000) {
          const wrappedCurrent = wrapX(currentX, loopWidth);
          targetX = wrappedCurrent + shortestDelta(targetX - currentX, loopWidth);
          currentX = wrappedCurrent;
        }

        setTransform(wrapX(currentX, loopWidth));
      }

      rafId = requestAnimationFrame(frame);
    }

    function onPointerDown(event) {
      if (!ready || event.button > 0) return;

      dragging = true;
      pointerId = event.pointerId;
      lastPointerX = event.clientX;
      dragDistance = 0;
      suppressNextClick = false;

      try {
        track.setPointerCapture(pointerId);
      } catch (error) {
        // Pointer capture is optional.
      }
    }

    function onPointerMove(event) {
      if (!dragging || event.pointerId !== pointerId) return;

      const deltaX = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      dragDistance += Math.abs(deltaX);
      targetX += deltaX;

      if (dragDistance > CONFIG.dragClickThreshold) {
        suppressNextClick = true;
        event.preventDefault();
      }
    }

    function endPointer(event) {
      if (!dragging || (event && event.pointerId !== pointerId)) return;

      try {
        track.releasePointerCapture(pointerId);
      } catch (error) {
        // The browser may already have released it.
      }

      dragging = false;
      pointerId = null;
    }

    function onClick(event) {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function destroy() {
      if (!instances.has(track)) return;

      controller.abort();
      cancelAnimationFrame(rafId);
      clearTimeout(measureTimer);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();

      track.querySelectorAll(`[${CLONE_ATTR}]`).forEach(clone => clone.remove());
      track.removeAttribute(INIT_ATTR);
      track.style.removeProperty('transform');
      track.style.removeProperty('will-change');
      track.style.removeProperty('touch-action');
      instances.delete(track);
    }

    track.addEventListener('pointerdown', onPointerDown, { signal });
    track.addEventListener('pointermove', onPointerMove, { signal, passive: false });
    track.addEventListener('pointerup', endPointer, { signal });
    track.addEventListener('pointercancel', endPointer, { signal });
    track.addEventListener('lostpointercapture', endPointer, { signal });
    track.addEventListener('click', onClick, { signal, capture: true });

    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          active = Boolean(entry?.isIntersecting);
        },
        { rootMargin: `${CONFIG.viewportMargin}px` }
      );
      intersectionObserver.observe(track);
    } else {
      active = true;
    }

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(track);
      track.querySelectorAll(CONFIG.itemSelector).forEach(item => resizeObserver.observe(item));
    } else {
      window.addEventListener('resize', scheduleMeasure, { signal, passive: true });
    }

    track.querySelectorAll('img').forEach(image => {
      if (image.complete) return;
      image.addEventListener('load', scheduleMeasure, { signal, once: true });
      image.addEventListener('error', scheduleMeasure, { signal, once: true });
    });

    window.addEventListener('load', scheduleMeasure, { signal, once: true });
    window.addEventListener('orientationchange', scheduleMeasure, {
      signal,
      passive: true
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleMeasure).catch(() => {});
    }

    const instance = {
      version: VERSION,
      refresh: applyMeasurement,
      destroy,
      status: () => ({
        ready,
        active,
        dragging,
        loopWidth,
        currentX,
        targetX
      })
    };

    instances.set(track, instance);
    applyMeasurement();
    requestAnimationFrame(() => requestAnimationFrame(scheduleMeasure));
    rafId = requestAnimationFrame(frame);
    return instance;
  }

  function refresh() {
    document.querySelectorAll(CONFIG.selector).forEach(initTrack);
    return status();
  }

  function destroyAll() {
    Array.from(instances.values()).forEach(instance => instance.destroy());
  }

  function status() {
    return {
      version: VERSION,
      selector: CONFIG.selector,
      instances: Array.from(instances.values()).map(instance => instance.status())
    };
  }

  function boot() {
    refresh();

    const observer = new MutationObserver(mutations => {
      const mayContainTrack = mutations.some(mutation =>
        Array.from(mutation.addedNodes).some(node =>
          node instanceof Element &&
          (node.matches(CONFIG.selector) || node.querySelector(CONFIG.selector))
        )
      );

      if (mayContainTrack) refresh();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.TDBLogoMarquee = Object.freeze({
    version: VERSION,
    refresh,
    destroy: destroyAll,
    status
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
