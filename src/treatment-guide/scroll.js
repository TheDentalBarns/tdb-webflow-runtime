/* Opt-in chapter pinning. Native scrolling owns travel; no wheel/touch lock. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideScroll) return;
  function mount(root, controls) {
    if (!root.hasAttribute('data-tdb-guide-scroll')) return null;
    const layout = root.querySelector('.treatment-guide_layout'),
      art = root.querySelector('.treatment-guide_dial-art'),
      content = root.querySelector('.treatment-guide_content'),
      rim = root.querySelector('.treatment-guide_rim');
    if (!layout || !art || !content) return null;
    const events = new AbortController(),
      { signal } = events,
      reduced = matchMedia('(prefers-reduced-motion: reduce)'),
      track = document.createElement('div');
    track.className = 'tdb-guide-scroll-track';
    layout.before(track);
    track.append(layout);
    // Designer owns the resting 5px rim. Only the moving fill is enhancement paint.
    const svgNS = 'http://www.w3.org/2000/svg';
    const progress = rim && document.createElementNS(svgNS, 'svg');
    const arc = progress && document.createElementNS(svgNS, 'circle');
    if (progress) {
      progress.setAttribute('class', 'tdb-guide-scroll-progress');
      progress.setAttribute('aria-hidden', 'true');
      progress.setAttribute('focusable', 'false');
      for (const [name, value] of Object.entries({
        cx: '50%',
        cy: '50%',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '5',
        pathLength: '100',
        'stroke-dasharray': '100 100',
        'stroke-dashoffset': '100',
        'stroke-linecap': 'butt',
      }))
        arc.setAttribute(name, value);
      progress.append(arc);
      rim.append(progress);
    }
    let enabled = false,
      pinned = false,
      suspended = false,
      disposed = false,
      raf = 0,
      resize = true,
      pinTop = 0,
      distance = 0,
      runway = 0,
      start = 0,
      lastIndex = -1,
      radius = -1,
      painted = '',
      lenis = null,
      unbindLenis = null,
      releaseChrome = null;
    function paintProgress(fraction) {
      if (!arc) return;
      const offset = (100 * (1 - Math.max(0, Math.min(1, fraction)))).toFixed(3);
      if (offset === painted) return;
      painted = offset;
      arc.style.strokeDashoffset = offset;
    }
    function bindLenis() {
      if (lenis === window.lenis) return;
      unbindLenis?.();
      lenis = window.lenis;
      unbindLenis = lenis?.on?.('scroll', onScroll);
    }
    function onScroll() {
      bindLenis();
      // Sample rendered travel in the scroll owner's event, without another
      // animation frame or easing curve between the input and the ring.
      if (enabled && !suspended && !document.hidden)
        paintProgress((window.scrollY - start) / runway);
      schedule();
    }
    function scrollTo(top) {
      if (window.lenis?.scrollTo) window.lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo({ top, behavior: 'instant' });
    }
    function hold(value) {
      if (pinned === value) return;
      pinned = value;
      root.classList.toggle('is-guide-scroll-pinned', value);
      if (value) {
        controls.interact();
        window.TDBSliderFocus?.release(root);
        releaseChrome = window.TDBSiteChrome?.acquire();
      } else {
        releaseChrome?.();
        releaseChrome = null;
        window.TDBSliderFocus?.release(root);
      }
    }
    function disable() {
      if (!enabled) return;
      // Removing the extra travel must not throw a rotated phone past the card.
      const travelled = Math.max(0, Math.min(runway, window.scrollY - start));
      hold(false);
      enabled = false;
      root.classList.remove('is-guide-scroll-enabled');
      paintProgress(0);
      track.removeAttribute('style');
      if (travelled) scrollTo(window.scrollY - travelled);
      lastIndex = -1;
    }
    function measure() {
      resize = false;
      const cardBox = layout.getBoundingClientRect(),
        wheelBox = art.getBoundingClientRect(),
        contentBox = content.getBoundingClientRect(),
        viewport = window.visualViewport,
        height = Math.min(innerHeight, viewport?.height || innerHeight),
        gap = innerWidth * 0.05,
        offset = wheelBox.top - cardBox.top,
        needed = Math.max(wheelBox.bottom, contentBox.bottom) - wheelBox.top + gap + 12;
      const nextRadius = Math.max(0, wheelBox.width / 2 - 2.5);
      if (arc && nextRadius !== radius) {
        radius = nextRadius;
        arc.setAttribute('r', String(radius));
      }
      const fits =
        wheelBox.width > 0 &&
        needed <= height &&
        !reduced.matches &&
        !window.TDBMotion?.reduced?.matches &&
        (!viewport || viewport.scale <= 1);
      if (!fits) return disable();
      // Do not insert scroll travel above a restored reading position.
      if (!enabled && wheelBox.top < gap) return;
      const fraction = enabled ? Math.max(0, Math.min(5, (window.scrollY - start) / distance)) : 0;
      const oldDistance = distance;
      const oldPinTop = pinTop;
      const margin = getComputedStyle(layout).marginBottom;
      pinTop = gap - offset;
      distance = Math.max(240, Math.min(480, innerWidth * 0.8));
      runway = distance * 5;
      track.style.setProperty('--tdb-guide-pin-top', pinTop + 'px');
      track.style.setProperty('--tdb-guide-scroll-travel', runway + 'px');
      track.style.height = cardBox.height + runway + 'px';
      if (!enabled) track.style.marginBottom = margin;
      root.classList.add('is-guide-scroll-enabled');
      enabled = true;
      start = track.getBoundingClientRect().top + window.scrollY - pinTop;
      if (pinned && (oldDistance !== distance || oldPinTop !== pinTop))
        scrollTo(start + fraction * distance);
    }
    function update() {
      raf = 0;
      if (disposed || suspended || document.hidden) return hold(false);
      bindLenis();
      if (resize) measure();
      if (!enabled) {
        // A restored page can arm on its next approach from above.
        if (art.getBoundingClientRect().top >= innerWidth * 0.05) measure();
        if (!enabled) return;
      }
      start = track.getBoundingClientRect().top + window.scrollY - pinTop;
      const progress = window.scrollY - start;
      paintProgress(progress / runway);
      const inside = progress >= -0.5 && progress < runway;
      const wasPinned = pinned;
      hold(inside);
      if (window.TDBScrollLock?.active) return;
      const index = Math.max(0, Math.min(4, Math.floor(Math.max(0, progress) / distance)));
      if ((inside || wasPinned) && (lastIndex !== index || controls.current() !== index)) {
        lastIndex = index;
        controls.select(index);
      }
      if (!inside) lastIndex = -1;
    }
    function schedule(needsMeasure = false) {
      if (disposed) return;
      resize ||= needsMeasure;
      if (!raf) raf = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(() => schedule(true));
    observer.observe(layout);
    observer.observe(art);
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    window.addEventListener('resize', () => schedule(true), { passive: true, signal });
    window.visualViewport?.addEventListener('resize', () => schedule(true), {
      passive: true,
      signal,
    });
    reduced.addEventListener('change', () => schedule(true), { signal });
    root.addEventListener('toggle', () => schedule(true), { capture: true, signal });
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape' || !pinned || window.TDBScrollLock?.active) return;
        scrollTo(start + runway + 1);
        schedule();
      },
      { signal },
    );
    window.addEventListener(
      'pagehide',
      () => {
        suspended = true;
        hold(false);
      },
      { signal },
    );
    window.addEventListener(
      'pageshow',
      () => {
        suspended = false;
        schedule(true);
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) hold(false);
        else schedule(true);
      },
      { signal },
    );
    schedule(true);
    return {
      get enabled() {
        return enabled;
      },
      get pinned() {
        return pinned;
      },
      manual(index) {
        if (!pinned) return;
        lastIndex = index;
        scrollTo(start + (index + 0.15) * distance);
        schedule();
      },
      destroy() {
        if (disposed) return;
        disposed = true;
        events.abort();
        unbindLenis?.();
        observer.disconnect();
        cancelAnimationFrame(raf);
        disable();
        progress?.remove();
        track.replaceWith(layout);
      },
    };
  }
  window.TDBTreatmentGuideScroll = Object.freeze({ mount });
})();
