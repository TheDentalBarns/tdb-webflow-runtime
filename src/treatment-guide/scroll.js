/* Native sticky travel. Read geometry first, then paint once per animation frame. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideScroll) return;
  function mount(root, controls) {
    if (!root.hasAttribute('data-tdb-guide-scroll')) return null;
    const layout = root.querySelector('.treatment-guide_layout'),
      art = root.querySelector('.treatment-guide_dial-art'),
      centre = root.querySelector('.treatment-guide_centre'),
      content = root.querySelector('.treatment-guide_content'),
      rim = root.querySelector('.treatment-guide_rim');
    if (!layout || !art || !content) return null;
    const events = new AbortController(),
      { signal } = events,
      reduced = matchMedia('(prefers-reduced-motion: reduce)'),
      coarse = matchMedia('(pointer: coarse)'),
      track = document.createElement('div');
    track.className = 'tdb-guide-scroll-track';
    layout.before(track);
    track.append(layout);
    // Designer owns the resting 5px rim. Only the moving fill is enhancement paint.
    const horizontal = Boolean(controls.horizontal);
    const svgNS = 'http://www.w3.org/2000/svg';
    const progress =
      rim && (horizontal ? document.createElement('div') : document.createElementNS(svgNS, 'svg'));
    const arc = progress && (horizontal ? progress : document.createElementNS(svgNS, 'circle'));
    if (progress) {
      progress.setAttribute(
        'class',
        horizontal ? 'tdb-guide-linear-progress' : 'tdb-guide-scroll-progress',
      );
      progress.setAttribute('aria-hidden', 'true');
      progress.setAttribute('focusable', 'false');
      if (!horizontal)
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
      if (!horizontal) progress.append(arc);
      rim.append(progress);
    }
    let enabled = false,
      pinned = false,
      chromeAway = false,
      rotating = false,
      rotationY = 0,
      rotationPending = false,
      suspended = false,
      disposed = false,
      raf = 0,
      resize = true,
      pinTop = 0,
      cardHeight = 0,
      wheelOffset = 0,
      wheelSize = 0,
      measuredWidth = 0,
      canArm = false,
      distance = 0,
      runway = 0,
      start = 0,
      lastIndex = -1,
      radius = -1,
      painted = '',
      shownFraction = 0,
      animation = null,
      lenis = null,
      unbindLenis = null,
      releaseChrome = null;
    function paintProgress(fraction) {
      shownFraction = Math.max(0, Math.min(1, fraction));
      if (!arc) return;
      const offset = (100 * (1 - shownFraction)).toFixed(3);
      if (offset === painted) return;
      painted = offset;
      if (horizontal) arc.style.transform = `scaleX(${shownFraction.toFixed(5)})`;
      else arc.style.strokeDashoffset = offset;
    }
    function bindLenis() {
      if (lenis === window.lenis) return;
      unbindLenis?.();
      lenis = window.lenis;
      unbindLenis = lenis?.on?.('scroll', onScroll);
    }
    function onScroll() {
      // Native and Lenis events may both arrive in one frame. Neither writes layout.
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
      } else {
        window.TDBSliderFocus?.release(root);
      }
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
    function disable() {
      if (!enabled) return;
      // Removing the extra travel must not throw a rotated phone past the card.
      const travelled = Math.max(0, Math.min(runway, window.scrollY - start));
      hold(false);
      rotating = false;
      rotationPending = false;
      animation = null;
      enabled = false;
      root.classList.remove('is-guide-scroll-enabled');
      paintProgress((controls.current() + 1) / 5);
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
      if (arc && !horizontal && nextRadius !== radius) {
        radius = nextRadius;
        arc.setAttribute('r', String(radius));
      }
      const eligible =
        wheelBox.width > 0 &&
        !reduced.matches &&
        !window.TDBMotion?.reduced?.matches &&
        (!viewport || viewport.scale <= 1);
      // Mobile browser bars resize only the viewport height. Keep the established
      // range; removing/reinserting it mid-swipe moves every following section.
      const fits =
        eligible &&
        (needed <= height || (enabled && coarse.matches && measuredWidth === innerWidth));
      canArm = fits;
      measuredWidth = innerWidth;
      if (!fits) return disable();
      // Do not insert scroll travel above a restored reading position.
      if (!enabled && wheelBox.top < gap) return;
      const fraction = enabled ? Math.max(0, Math.min(5, (window.scrollY - start) / distance)) : 0;
      const oldDistance = distance;
      const oldPinTop = pinTop;
      const margin = getComputedStyle(layout).marginBottom;
      cardHeight = cardBox.height;
      wheelOffset = offset;
      wheelSize = horizontal
        ? Math.max(
            wheelBox.height,
            (centre?.getBoundingClientRect().bottom || wheelBox.bottom) - wheelBox.top,
          )
        : wheelBox.height;
      pinTop = gap - offset;
      distance = Math.max(240, Math.min(480, innerWidth * 0.8));
      runway = distance * 5;
      const styles = {
        '--tdb-guide-pin-top': pinTop + 'px',
        '--tdb-guide-scroll-travel': runway + 'px',
        '--tdb-guide-background-start': (horizontal ? 0 : offset + wheelBox.height / 2) + 'px',
        height: cardHeight + runway + 'px',
      };
      for (const [name, value] of Object.entries(styles))
        if (track.style.getPropertyValue(name) !== value) track.style.setProperty(name, value);
      if (!enabled) track.style.marginBottom = margin;
      root.classList.add('is-guide-scroll-enabled');
      enabled = true;
      start = track.getBoundingClientRect().top + window.scrollY - pinTop;
      if (pinned && (oldDistance !== distance || oldPinTop !== pinTop)) {
        animation = null;
        scrollTo(start + fraction * distance);
      }
    }
    function update(now) {
      raf = 0;
      if (disposed || suspended || document.hidden) {
        animation = null;
        hold(false);
        clearChrome(false);
        return;
      }
      bindLenis();
      if (resize) measure();
      const viewHeight = Math.min(innerHeight, window.visualViewport?.height || innerHeight);
      if (!enabled) {
        const wheelBox = art.getBoundingClientRect();
        const headerBottom = horizontal
          ? centre?.getBoundingClientRect().bottom || wheelBox.bottom
          : wheelBox.bottom;
        clearChrome(wheelBox.width > 0 && wheelBox.top < viewHeight && headerBottom > 0);
        if (canArm && wheelBox.top >= innerWidth * 0.05) measure();
      }
      // All geometry reads precede any scroll/paint writes. Sticky wheel position
      // is derived from this one track rect and the cached dimensions.
      const trackTop = enabled ? track.getBoundingClientRect().top + window.scrollY : 0;
      if (enabled) start = trackTop - pinTop;
      if (window.TDBScrollLock?.active || root.closest('[inert]')) {
        animation = null;
        rotationPending = false;
      }
      const destination = animation?.index;
      if (rotationPending && enabled) {
        rotationPending = false;
        scrollTo(rotationY);
      } else if (animation) {
        const ms = animation.last == null ? 0 : Math.max(0, now - animation.last);
        animation.elapsed += window.TDBMotionProfile?.elapsed(ms) ?? ms;
        animation.last = now;
        const fraction =
          reduced.matches || window.TDBMotion?.reduced?.matches
            ? 1
            : Math.min(1, animation.elapsed / 480);
        const ease = (1 - Math.cos(Math.PI * fraction)) / 2;
        const value = animation.from + (animation.to - animation.from) * ease;
        if (animation.scroll) scrollTo(value);
        else paintProgress(value);
        if (fraction === 1) animation = null;
        else schedule();
      }
      if (!enabled) return;
      const wheelTop =
        Math.min(Math.max(pinTop, trackTop - window.scrollY), trackTop + runway - window.scrollY) +
        wheelOffset;
      clearChrome(wheelTop < viewHeight && wheelTop + wheelSize > 0);
      const progress = window.scrollY - start;
      const inside = progress >= -1 && progress < runway - 1;
      const wasPinned = pinned;
      if (inside || wasPinned) paintProgress(runway - progress <= 1 ? 1 : progress / runway);
      hold(inside);
      if (window.TDBScrollLock?.active) return;
      // A divider belongs to the chapter just completed; allow native pixel rounding.
      const index =
        destination ?? Math.max(0, Math.min(4, Math.ceil((progress - 0.5) / distance) - 1));
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
    const interrupt = () => {
      animation = null;
    };
    for (const type of ['wheel', 'touchstart', 'pointerdown'])
      window.addEventListener(type, interrupt, { capture: true, passive: true, signal });
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
        if (
          ['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(
            event.key,
          )
        )
          interrupt();
        if (event.key !== 'Escape' || !pinned || window.TDBScrollLock?.active) return;
        scrollTo(start + runway + 1);
        schedule();
      },
      { capture: true, signal },
    );
    window.addEventListener(
      'pagehide',
      () => {
        suspended = true;
        animation = null;
        hold(false);
        clearChrome(false);
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
        if (document.hidden) {
          animation = null;
          hold(false);
          clearChrome(false);
        } else schedule(true);
      },
      { signal },
    );
    root.classList.add('is-guide-progress-ready');
    paintProgress(controls.current() ? (controls.current() + 1) / 5 : 0);
    schedule(true);
    return {
      get enabled() {
        return enabled;
      },
      get pinned() {
        return pinned;
      },
      manual(index) {
        if (window.TDBScrollLock?.active || root.closest('[inert]')) return;
        const linked =
          enabled && window.scrollY >= start - 1 && window.scrollY <= start + runway + 1;
        lastIndex = index;
        animation = {
          index,
          scroll: linked,
          from: linked ? window.scrollY : shownFraction,
          to: linked ? start + (index + 1) * distance : (index + 1) / 5,
          elapsed: 0,
          last: null,
        };
        schedule();
      },
      beginRotation() {
        animation = null;
        rotationPending = false;
        if (resize) measure();
        rotating =
          enabled &&
          window.scrollY >= start - 1 &&
          window.scrollY <= start + runway + 1 &&
          !window.TDBScrollLock?.active;
        rotationY = window.scrollY;
        return rotating;
      },
      rotate(chapters) {
        if (!rotating || !enabled || window.TDBScrollLock?.active) return;
        rotationY = Math.max(start, Math.min(start + runway, rotationY + chapters * distance));
        rotationPending = true;
        schedule();
      },
      endRotation() {
        rotating = false;
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
        clearChrome(false);
        root.classList.remove('is-guide-progress-ready');
        progress?.remove();
        track.replaceWith(layout);
      },
    };
  }
  window.TDBTreatmentGuideScroll = Object.freeze({ mount });
})();
