/* Chapter progress owns no scroll travel. The shared lock holds one page position. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideScroll) return;
  const clamp = (value) => (value < 1e-8 ? 0 : value > 1 - 1e-8 ? 1 : value);
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
      svgNS = 'http://www.w3.org/2000/svg',
      progress = rim && document.createElementNS(svgNS, 'svg'),
      arc = progress && document.createElementNS(svgNS, 'circle');
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
      chromeAway = false,
      rotating = false,
      suspended = false,
      disposed = false,
      raf = 0,
      resize = true,
      start = 0,
      distance = 312,
      anchor = 0,
      lastY = window.scrollY,
      amount = controls.current() ? (controls.current() + 1) / 5 : 0,
      radius = -1,
      painted = '',
      animation = null,
      touch = null,
      releaseHold = null,
      releaseChrome = null,
      aligning = false,
      releasedAt = null;
    const motionReduced = () => reduced.matches || window.TDBMotion?.reduced?.matches;
    const blocked = () =>
      Boolean(root.closest('[inert]') || (!releaseHold && window.TDBScrollLock?.active));
    const editable = (target) =>
      target?.closest?.(
        'input,textarea,select,[contenteditable="true"],[role="dialog"],[data-tdb-drawer]',
      );
    function paint() {
      if (!arc) return;
      const offset = (100 * (1 - amount)).toFixed(3);
      if (offset === painted) return;
      painted = offset;
      arc.style.strokeDashoffset = offset;
    }
    function selectProgress() {
      const index = Math.max(0, Math.min(4, Math.ceil(amount * 5 - 0.000001) - 1));
      if (controls.current() !== index) controls.select(index);
    }
    function clearChrome(value) {
      if (chromeAway === value) return;
      chromeAway = value;
      root.classList.toggle('is-guide-chrome-away', value);
      if (value) releaseChrome = window.TDBSiteChrome?.acquire();
      else {
        releaseChrome?.();
        releaseChrome = null;
      }
    }
    function release() {
      if (!pinned) return;
      pinned = false;
      root.classList.remove('is-guide-scroll-pinned');
      releaseHold?.();
      releaseHold = null;
      lastY = window.scrollY;
      releasedAt = lastY;
      window.TDBSliderFocus?.release(root);
    }
    function hold() {
      if (pinned || !enabled || blocked() || !window.TDBScrollLock?.acquire) return false;
      // One alignment on entry; no scroll calls during chapter progress or release.
      aligning = true;
      if (window.lenis?.scrollTo) window.lenis.scrollTo(start, { immediate: true, force: true });
      else if (Math.abs(window.scrollY - start) > 0.5)
        window.scrollTo({ top: start, behavior: 'instant' });
      aligning = false;
      anchor = lastY = window.scrollY;
      releasedAt = null;
      releaseHold = window.TDBScrollLock.acquire();
      pinned = true;
      root.classList.add('is-guide-scroll-pinned');
      controls.interact();
      window.TDBSliderFocus?.release(root);
      return true;
    }
    function measure() {
      resize = false;
      const wheel = art.getBoundingClientRect(),
        text = content.getBoundingClientRect(),
        viewport = window.visualViewport,
        gap = innerWidth * 0.05,
        height = Math.min(innerHeight, viewport?.height || innerHeight),
        nextRadius = Math.max(0, wheel.width / 2 - 2.5);
      if (arc && nextRadius !== radius) {
        radius = nextRadius;
        arc.setAttribute('r', String(radius));
      }
      start = wheel.top + window.scrollY - gap;
      distance = Math.max(240, Math.min(480, innerWidth * 0.8));
      enabled =
        wheel.width > 0 &&
        Math.max(wheel.bottom, text.bottom) - wheel.top + gap + 12 <= height &&
        !motionReduced() &&
        (!viewport || viewport.scale <= 1);
      root.classList.toggle('is-guide-scroll-enabled', enabled);
      if (pinned && (!enabled || Math.abs(start - anchor) > 1)) release();
    }
    function update(now) {
      raf = 0;
      if (disposed || suspended || document.hidden || aligning) return;
      if (resize) measure();
      const wheel = art.getBoundingClientRect();
      clearChrome(
        wheel.width > 0 &&
          wheel.top < Math.min(innerHeight, window.visualViewport?.height || innerHeight) &&
          wheel.bottom > 0,
      );
      if (blocked()) animation = null;
      if (animation) {
        const ms = animation.last == null ? 0 : Math.max(0, now - animation.last);
        animation.elapsed += window.TDBMotionProfile?.elapsed(ms) ?? ms;
        animation.last = now;
        const fraction = motionReduced() ? 1 : Math.min(1, animation.elapsed / 480);
        amount =
          animation.from +
          ((animation.to - animation.from) * (1 - Math.cos(Math.PI * fraction))) / 2;
        paint();
        if (fraction === 1) {
          amount = animation.to;
          animation = null;
          paint();
          if (amount === 1) release();
        } else schedule();
      }
    }
    function schedule(needsMeasure = false) {
      if (disposed) return;
      resize ||= needsMeasure;
      if (!raf) raf = requestAnimationFrame(update);
    }
    function onScroll() {
      if (disposed || suspended || document.hidden || aligning) return;
      if (resize) measure();
      const y = window.scrollY,
        previous = lastY;
      lastY = y;
      if (pinned) {
        // Respect anchors, focus navigation and external restoration; never fight them.
        if (Math.abs(y - anchor) > 1) release();
      } else if (releasedAt != null) {
        if (Math.abs(y - releasedAt) > 2) releasedAt = null;
      } else if (enabled && !blocked()) {
        const wheel = art.getBoundingClientRect();
        if (
          wheel.bottom > 0 &&
          wheel.top < innerHeight &&
          ((previous < start && y >= start && amount < 1) ||
            (previous > start && y <= start && amount > 0))
        )
          hold();
      }
      schedule();
    }
    function advance(delta) {
      animation = null;
      amount = clamp(amount + delta);
      paint();
      selectProgress();
      if (pinned && ((delta > 0 && amount === 1) || (delta < 0 && amount === 0))) release();
    }
    function input(delta, event) {
      if (!delta || suspended || document.hidden || blocked() || editable(event.target)) return;
      if (resize) measure();
      if (!pinned && enabled) {
        if (releasedAt != null) return;
        const y = window.scrollY;
        if (delta > 0 && amount < 1 && y <= start && y + delta >= start) {
          const rest = delta - (start - y);
          if (hold()) {
            event.preventDefault();
            advance(rest / (distance * 5));
          }
          return;
        }
        if (delta < 0 && amount > 0 && y >= start && y + delta <= start) {
          const rest = delta - (start - y);
          if (hold()) {
            event.preventDefault();
            advance(rest / (distance * 5));
          }
          return;
        }
      }
      if (!pinned) return;
      event.preventDefault();
      advance(delta / (distance * 5));
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
    root.addEventListener(
      'toggle',
      (event) => {
        if (event.target.open) release();
        schedule(true);
      },
      { capture: true, signal },
    );
    document.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
          return;
        input(
          event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1),
          event,
        );
      },
      { capture: true, passive: false, signal },
    );
    document.addEventListener(
      'touchstart',
      (event) => {
        touch =
          event.touches.length === 1 && !rotating && !editable(event.target)
            ? event.touches[0].clientY
            : null;
      },
      { capture: true, passive: true, signal },
    );
    document.addEventListener(
      'touchmove',
      (event) => {
        if (touch == null || event.touches.length !== 1 || rotating) return;
        const y = event.touches[0].clientY,
          delta = touch - y;
        touch = y;
        input(delta, event);
      },
      { capture: true, passive: false, signal },
    );
    for (const type of ['touchend', 'touchcancel'])
      document.addEventListener(
        type,
        () => {
          touch = null;
        },
        { passive: true, signal },
      );
    document.addEventListener(
      'keydown',
      (event) => {
        if (!pinned || event.defaultPrevented || blocked() || editable(event.target)) return;
        if (event.key === 'Escape') {
          animation = null;
          release();
          return;
        }
        const delta = {
          ArrowDown: 40,
          ArrowUp: -40,
          PageDown: distance,
          PageUp: -distance,
          ' ': event.shiftKey ? -distance : distance,
          Home: -distance * 5,
          End: distance * 5,
        }[event.key];
        if (delta) input(delta, event);
      },
      { signal },
    );
    document.addEventListener(
      'focusin',
      (event) => {
        if (pinned && !root.contains(event.target) && !blocked()) release();
      },
      { signal },
    );
    function suspend() {
      animation = null;
      rotating = false;
      touch = null;
      release();
      clearChrome(false);
    }
    window.addEventListener(
      'pagehide',
      () => {
        suspended = true;
        suspend();
      },
      { signal },
    );
    window.addEventListener(
      'pageshow',
      () => {
        suspended = false;
        lastY = window.scrollY;
        schedule(true);
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) suspend();
        else {
          lastY = window.scrollY;
          schedule(true);
        }
      },
      { signal },
    );
    root.classList.add('is-guide-progress-ready');
    paint();
    schedule(true);
    return {
      get enabled() {
        return enabled;
      },
      get pinned() {
        return pinned;
      },
      manual(index) {
        if (blocked()) return;
        if (index < 4 && !pinned && Math.abs(window.scrollY - start) <= 1) hold();
        animation = { from: amount, to: (index + 1) / 5, elapsed: 0, last: null };
        schedule();
      },
      beginRotation() {
        animation = null;
        rotating = !blocked();
        return rotating;
      },
      rotate(chapters) {
        if (rotating && !blocked()) advance(chapters / 5);
      },
      endRotation() {
        rotating = false;
      },
      destroy() {
        if (disposed) return;
        disposed = true;
        events.abort();
        observer.disconnect();
        cancelAnimationFrame(raf);
        suspend();
        root.classList.remove('is-guide-progress-ready', 'is-guide-scroll-enabled');
        progress?.remove();
      },
    };
  }
  window.TDBTreatmentGuideScroll = Object.freeze({ mount });
})();
