(() => {
  'use strict';

  const VERSION = '0.8.2';
  const DEFAULTS = {
    selector: '.logo-slider .partner-featured_component',
    itemSelector: '.partner_logos',
    logoSelector: '.logo_image',
    tooltipImageSelector: '.tooltip2_image',
    speedDesktop: 40,
    speedMobile: 22,
    mobileMedia: '(max-width: 767px)',
    smoothing: 0.18,
    initViewportMargin: 600,
    activeViewportMargin: 200,
    maxMeasureAttempts: 160,
    measureRetryMs: 50,
    dragClickThreshold: 6
  };

  const CONFIG = {
    ...DEFAULTS,
    ...(window.TDBLogoMarqueeConfig || {})
  };
  // MediaQueryList.matches stays live as the viewport changes. Reuse the list
  // rather than creating another one on every animation frame.
  const mobileMediaQuery = window.matchMedia?.(CONFIG.mobileMedia);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 992px)');
  const reduceMotion = () => reduced.matches && !desktop.matches;
  const style = document.createElement('style');
  style.textContent = `.logo-slider .partner_logos{cursor:grab;touch-action:pan-y}.logo-slider .partner_logos:focus-visible,.logo-slider .partner_logos[data-tdb-keyboard-focus]{outline:1px solid #a79b86;outline-offset:-3px}@media(hover:hover) and (pointer:fine){.logo-slider .partner_logos:hover .logo_image{opacity:.8}}`;
  document.head.append(style);

  const INIT_ATTR = 'data-tdb-logo-marquee-init';
  const CLONE_ATTR = 'data-tdb-logo-marquee-clone';
  const instances = new Map();
  const discoveredTracks = new WeakSet();
  let initObserver = null;
  let mutationObserver = null;

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

  function getSpeed() {
    return mobileMediaQuery?.matches
      ? CONFIG.speedMobile
      : CONFIG.speedDesktop;
  }

  function prepareVisibleLogos(track) {
    track.querySelectorAll(CONFIG.logoSelector).forEach(image => {
      image.loading = 'eager';
      image.setAttribute('loading', 'eager');
      image.setAttribute('decoding', 'async');
    });

    track.querySelectorAll(CONFIG.tooltipImageSelector).forEach(image => {
      image.loading = 'lazy';
      image.setAttribute('loading', 'lazy');
      image.setAttribute('decoding', 'async');
    });
  }

  function primeTooltipImage(item) {
    const image = item?.querySelector(CONFIG.tooltipImageSelector);
    if (!image) return;
    image.loading = 'eager';
    image.setAttribute('loading', 'eager');
    image.setAttribute('decoding', 'async');
  }

  function makeClone(original) {
    const clone = original.cloneNode(true);
    clone.setAttribute(CLONE_ATTR, 'true');
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('id');
    clone.setAttribute('tabindex', '-1');

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
    prepareVisibleLogos(track);

    originals.forEach((item, index) => {
      item.dataset.tdbLogoIndex = index;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', (item.querySelector(CONFIG.logoSelector)?.alt || 'Logo ' + (index + 1)) + ': centre and pause; activate again to resume');
      item.querySelectorAll('img').forEach(img => img.draggable = false);
    });
    const fragment = document.createDocumentFragment();
    originals.forEach(original => fragment.appendChild(makeClone(original)));
    track.appendChild(fragment);

    const controller = new AbortController();
    const { signal } = controller;

    let paused = reduceMotion();
    let momentum = 0;
    let coasting = false;
    let samples = [];
    let pageY = window.scrollY;
    let selected = null;
    let startY = 0;
    let startX = 0;
    let horizontal = false;
    const viewport = track.closest('.logo-slider');
    let loopWidth = 0;
    let targetX = 0;
    let currentX = 0;
    let ready = false;
    let active = false;
    let dragging = false;
    let pointerId = null;
    let lastPointerX = 0;
    let suppressNextClick = false;
    let rafId = 0;
    let lastFrameAt = performance.now();
    let measureTimer = 0;
    let measureAttempts = 0;
    let activeObserver = null;
    let resizeObserver = null;

    function setTransform(value) {
      track.style.transform = `translate3d(${value}px, 0, 0)`;
    }

    function measureLoopWidth() {
      const firstOriginal = track.querySelector(
        `${CONFIG.itemSelector}:not([${CLONE_ATTR}])`
      );
      const firstClone = track.querySelector(`${CONFIG.itemSelector}[${CLONE_ATTR}]`);

      if (!firstOriginal || !firstClone) return 0;
      const width = firstClone.offsetLeft - firstOriginal.offsetLeft;
      return width > 0 ? width : 0;
    }

    function startAnimation() {
      if (rafId || !active || document.visibilityState === 'hidden') return;
      lastFrameAt = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function stopAnimation() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
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
      setTransform(wrapX(currentX, loopWidth));
      if (paused && !dragging && !momentum && selected !== null) centre(originals[Number(selected)]);
      startAnimation();
    }

    function scheduleMeasure() {
      clearTimeout(measureTimer);
      measureTimer = window.setTimeout(applyMeasurement, 120);
    }

    function frame(now) {
      rafId = 0;

      if (!document.documentElement.contains(track)) {
        destroy();
        return;
      }

      if (!active || document.visibilityState === 'hidden') return;

      const deltaSeconds = clamp((now - lastFrameAt) / 1000, 0, 0.25);
      lastFrameAt = now;

      if (ready) {
        if (coasting && !dragging) {
          // Carry the throw into the existing automatic speed, without snapping.
          const cruise = -getSpeed();
          const decay = Math.exp(-4.2 * deltaSeconds);
          currentX += cruise * deltaSeconds + (momentum-cruise) * (1-decay) / 4.2;
          momentum = cruise + (momentum-cruise) * decay;
          targetX = currentX;
          if (Math.abs(momentum-cruise) < 2) { coasting = false; momentum = 0; }
        } else if (!dragging) {
          if (!paused && !reduceMotion()) {
            currentX -= getSpeed() * deltaSeconds;
            targetX = currentX;
          } else {
            const frameSmoothing = 1 - Math.pow(1-.11, deltaSeconds * 60);
            currentX += (targetX-currentX) * frameSmoothing;
          }
        }

        if (Math.abs(currentX) > 1000000 || Math.abs(targetX) > 1000000) {
          const wrappedCurrent = wrapX(currentX, loopWidth);
          targetX = wrappedCurrent + shortestDelta(targetX - currentX, loopWidth);
          currentX = wrappedCurrent;
        }

        setTransform(wrapX(currentX, loopWidth));
      }

      if (!rafId && ((!paused && !reduceMotion()) || coasting || Math.abs(targetX-currentX) > .05)) rafId = requestAnimationFrame(frame);
    }

    function centre(item) {
      if (!item || !ready) return;
      paused = true;
      momentum = 0; coasting = false;
      selected = item.dataset.tdbLogoIndex;
      const box = item.getBoundingClientRect();
      const view = viewport.getBoundingClientRect();
      targetX = currentX + shortestDelta(view.left + view.width / 2 - box.left - box.width / 2, loopWidth);
      if (reduceMotion()) { currentX = targetX; setTransform(wrapX(currentX,loopWidth)); }
      startAnimation();
    }
    function select(item) {
      if (!item) return;
      if (paused && selected === item.dataset.tdbLogoIndex) {
        resume();
      } else centre(item);
    }
    function resume() {
      if (dragging) return;
      paused = reduceMotion(); selected = null; momentum = 0; coasting = false;
      targetX = currentX;
      if (!paused) startAnimation();
    }
    function onPointerDown(event) {
      if (!ready || event.button > 0 || event.isPrimary === false || pointerId !== null) return;
      // Catch a moving logo exactly where the finger lands, including mid-settle.
      momentum = 0; coasting = false; targetX = currentX; paused = true; stopAnimation();
      pointerId = event.pointerId;
      startX = lastPointerX = event.clientX; startY = event.clientY;
      samples = [{x:event.clientX,t:event.timeStamp}];
      horizontal = false; dragging = false;
      suppressNextClick = false;
    }
    function onPointerMove(event) {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX-startX, dy = event.clientY-startY;
      if (!horizontal) {
        if (Math.abs(dy) > CONFIG.dragClickThreshold && Math.abs(dy) > Math.abs(dx)) {
          pointerId = null; resume(); return;
        }
        if (Math.abs(dx) <= CONFIG.dragClickThreshold) return;
        horizontal = dragging = true; selected = null;
        try { track.setPointerCapture(pointerId); } catch (_) {}
      }
      event.preventDefault(); suppressNextClick = true;
      const delta = event.clientX-lastPointerX; lastPointerX = event.clientX;
      samples.push({x:event.clientX,t:event.timeStamp});
      while (samples.length > 2 && samples[1].t < event.timeStamp - 100) samples.shift();
      currentX += delta; targetX = currentX;
      setTransform(wrapX(currentX,loopWidth));
    }
    function endPointer(event) {
      if (event.pointerId !== pointerId) return;
      const id = pointerId, moved = horizontal;
      pointerId = null; dragging = false; horizontal = false;
      try { track.releasePointerCapture(id); } catch (_) {}
      if (moved) {
        suppressNextClick = true;
        const first = samples[0], last = samples[samples.length-1];
        const dt = last.t-first.t;
        momentum = !reduceMotion() && event.type === 'pointerup' && event.timeStamp-last.t < 90 && dt > 0
          ? clamp((last.x-first.x) / dt * 1000,-2800,2800) : 0;
        selected = null;
        paused = reduceMotion();
        coasting = !paused;
        targetX = currentX;
        if (coasting) startAnimation();
      } else if (event.type !== 'pointerup') resume();
    }
    function onClick(event) {
      // Pointer capture can retarget the release-click to the track itself.
      if (suppressNextClick) {
        suppressNextClick = false;
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      suppressNextClick = false;
      const item = event.target.closest(CONFIG.itemSelector);
      if (!item) { resume(); return; }
      event.preventDefault(); event.stopImmediatePropagation(); select(item);
    }
    function onOutsideClick(event) {
      if (!track.contains(event.target)) resume();
    }
    function onPageScroll() {
      const nextY = window.scrollY;
      if (Math.abs(nextY-pageY) < 8) return;
      pageY = nextY;
      if (!dragging && (paused || momentum)) resume();
    }
    function onKey(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const item = event.target.closest(CONFIG.itemSelector);
      if (!item) return;
      suppressNextClick = false;
      event.preventDefault(); event.stopImmediatePropagation(); select(item);
    }
    function onReducedChange() {
      momentum = 0; coasting = false; targetX = currentX;
      if (reduceMotion()) { paused = true; stopAnimation(); }
      else resume();
    }

    function onTooltipIntent(event) {
      const item = event.target instanceof Element ? event.target.closest(CONFIG.itemSelector) : null;
      if (!item || !track.contains(item)) return;
      primeTooltipImage(item);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') stopAnimation();
      else startAnimation();
    }

    function destroy() {
      if (!instances.has(track)) return;

      controller.abort();
      stopAnimation();
      clearTimeout(measureTimer);
      activeObserver?.disconnect();
      resizeObserver?.disconnect();

      track.querySelectorAll(`[${CLONE_ATTR}]`).forEach(clone => clone.remove());
      track.removeAttribute(INIT_ATTR);
      track.style.removeProperty('transform');
      track.style.removeProperty('will-change');
      track.style.removeProperty('touch-action');
      instances.delete(track);
    }

    track.addEventListener('focusin', event => {
      const item = event.target.closest(CONFIG.itemSelector);
      if (!item || !item.matches(':focus-visible')) return;
      centre(item);
      selected = null; // Focusing pauses; the first activation selects rather than resumes.
      track.querySelectorAll(CONFIG.itemSelector).forEach(copy => {
        copy.toggleAttribute('data-tdb-keyboard-focus', copy.dataset.tdbLogoIndex === item.dataset.tdbLogoIndex);
      });
    }, { signal });
    track.addEventListener('focusout', () => track.querySelectorAll('[data-tdb-keyboard-focus]').forEach(item => item.removeAttribute('data-tdb-keyboard-focus')), { signal });
    track.addEventListener('keydown', onKey, { signal });
    track.addEventListener('dragstart', event => event.preventDefault(), { signal });
    reduced.addEventListener('change', onReducedChange, { signal });
    desktop.addEventListener('change', onReducedChange, { signal });
    document.addEventListener('click', onOutsideClick, { signal, capture:true });
    window.addEventListener('scroll', onPageScroll, { signal, passive:true });
    track.addEventListener('pointerdown', onPointerDown, { signal });
    track.addEventListener('pointermove', onPointerMove, { signal, passive: false });
    window.addEventListener('pointerup', endPointer, { signal });
    track.addEventListener('pointercancel', endPointer, { signal });
    // Touch starts with implicit capture on the logo/image. Moving capture to
    // the track emits a bubbling lostpointercapture from that child. It is a
    // handoff, not a release: keep following the finger until the track loses it.
    track.addEventListener('lostpointercapture', event => {
      if (event.target === track) endPointer(event);
    }, { signal });
    track.addEventListener('click', onClick, { signal, capture: true });
    track.addEventListener('pointerover', onTooltipIntent, { signal, passive: true });
    track.addEventListener('focusin', onTooltipIntent, { signal });
    track.addEventListener('touchstart', onTooltipIntent, { signal, passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange, { signal });

    if ('IntersectionObserver' in window) {
      activeObserver = new IntersectionObserver(
        ([entry]) => {
          active = Boolean(entry?.isIntersecting);
          if (active) startAnimation();
          else { paused = reduceMotion(); selected = null; momentum = 0; coasting = false; targetX = currentX; stopAnimation(); }
        },
        { rootMargin: `${CONFIG.activeViewportMargin}px 0px` }
      );
      activeObserver.observe(track);
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
        running: Boolean(rafId),
        dragging,
        paused,
        momentum,
        coasting,
        selected,
        loopWidth,
        currentX,
        targetX
      })
    };

    instances.set(track, instance);
    applyMeasurement();
    requestAnimationFrame(() => requestAnimationFrame(scheduleMeasure));
    if (!('IntersectionObserver' in window)) startAnimation();
    return instance;
  }

  function discoverTrack(track) {
    if (!track || discoveredTracks.has(track) || instances.has(track)) return;
    discoveredTracks.add(track);

    if (!('IntersectionObserver' in window)) {
      initTrack(track);
      return;
    }

    initObserver.observe(track);
  }

  function discover(root = document) {
    if (root instanceof Element && root.matches(CONFIG.selector)) discoverTrack(root);
    root.querySelectorAll?.(CONFIG.selector).forEach(discoverTrack);
    return status();
  }

  function refresh() {
    discover(document);
    instances.forEach(instance => instance.refresh());
    return status();
  }

  function destroyAll() {
    initObserver?.disconnect();
    mutationObserver?.disconnect();
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
    if ('IntersectionObserver' in window) {
      initObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            initObserver.unobserve(entry.target);
            initTrack(entry.target);
          });
        },
        { rootMargin: `${CONFIG.initViewportMargin}px 0px` }
      );
    }

    discover(document);

    mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) discover(node);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
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
