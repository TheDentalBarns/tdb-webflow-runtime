/* Seasonal hero v1.0.0. Native content, bounded gestures and local compositor motion. */
(() => {
  'use strict';
  if (window.TDBCampaignHero) return;

  // Native sticky media and normal-flow campaign copy own the layout. Touch
  // previews and completes a local panel flight, then returns to native flow.
  const campaignHeroes = new WeakMap();
  function campaignHero(root) {
    const motion = window.TDBMotion;
    if (!motion?.frames) return null;
    const { reduced, time, duration, touchViewport } = motion;
    const {
      snapshot: frameMeasurements,
      request: requestMotionFrame,
      cancel: cancelMotionFrame,
    } = motion.frames;
    if (campaignHeroes.has(root)) return campaignHeroes.get(root);
    const panel = root.querySelector('[data-tdb-campaign-panel]');
    const opening = root.querySelector('[data-tdb-campaign-opening]');
    const copyWrapper = opening?.querySelector('[data-vimeo-hero-content]');
    // The native foreground already sits above the video. Transforming its
    // unpositioned padding parent traps that foreground behind the media,
    // even when the transform is zero on an untouched page.
    const copy = copyWrapper?.querySelector('.hero-vimeo_content') || copyWrapper;
    if (!panel || !opening || !copy) return null;
    const campaignCopy = panel.querySelector('.tdb-campaign-copy');
    const openingControls = opening.querySelector('[data-vimeo-controls-layer]');
    const controller = new AbortController(),
      { signal } = controller;
    const rail = root.querySelector('[data-tdb-campaign-rail]');
    const links = [...root.querySelectorAll('[data-tdb-campaign-step]')];
    const markers = links.map((link) => link.firstElementChild);
    const nodes = [copy, campaignCopy, openingControls, panel, rail, ...links, ...markers].filter(
      Boolean,
    );
    const styles = nodes.map((node) => node.getAttribute('style'));
    const current = links.map((link) => link.getAttribute('aria-current'));
    const openingInert = opening.inert;
    const railInert = rail?.inert;
    const panelTransform = panel.style.transform;
    let disposed = false,
      suspended = false,
      active = 0,
      progress = 0,
      layout = null;
    const clamp = (value) => Math.max(0, Math.min(1, value));
    function measure(frame) {
      if (layout) return layout;
      frame ||= frameMeasurements();
      const box = frame.rect(root),
        first = frame.rect(opening);
      // These are document anchors, not moving viewport rectangles. Scrolling
      // changes their screen position but not this geometry. Invalidate on
      // real layout changes instead of forcing a layout read every slide frame.
      return (layout = {
        start: frame.scroll + box.top,
        // The native panel is a direct child of this positioned root. offsetTop
        // stays stable while the mobile carousel translates the visual panel.
        end: frame.scroll + box.top + panel.offsetTop,
        bottom: frame.scroll + box.bottom,
        height: first.height,
      });
    }
    const style = (node, property, value) => {
      if (node.style[property] !== value) node.style[property] = value;
    };
    function read(frame) {
      if (disposed || suspended || document.hidden) return;
      const box = measure(frame),
        slide = nativeSlide,
        phase = slide ? clamp((performance.now() - slide.started) / slide.milliseconds) : 0,
        scroll = slide
          ? slide.from + (box[slide.destination] - slide.from) * slideEase(phase)
          : (previewScroll ?? frame.scroll);
      const travelled = clamp((scroll - box.start) / Math.max(1, box.height));
      if (!snapping && previewScroll === null) {
        if (Math.abs(frame.scroll - box.start) <= 3) lastAnchor = 'start';
        else if (Math.abs(frame.scroll - box.end) <= 3) lastAnchor = 'end';
      }
      const hintPhase = clamp((performance.now() - hintStarted) / Math.max(1, time(160)));
      if (!snapping) openingHint = hintFrom + (hintTarget - hintFrom) * slideEase(hintPhase);
      // Carry the opening hint into the cover continuously. Reversals begin
      // at the current endpoint rather than adding a sudden pressure offset.
      const markerProgress = clamp(travelled + (1 - travelled) * openingHint);
      const leaving = clamp((box.bottom - scroll - frame.height * 0.5) / (frame.height * 0.5));
      const y = Math.min(Math.max(0, scroll - box.start), box.height);
      return () => {
        // Native scrolling and its foreground use one shared frame. Keeping a
        // second rAF loop made the copy/pills trail the media by a frame.
        if (slide) window.scrollTo({ top: scroll, behavior: 'instant' });
        if (previewScroll !== null)
          style(panel, 'transform', `translate3d(0,${frame.scroll - previewScroll}px,0)`);
        progress = travelled;
        active = box.end - scroll <= frame.height * 0.5 ? 1 : 0;
        style(copy, 'translate', `0 ${-y}px`);
        style(copy, 'opacity', String(1 - travelled));
        if (openingControls) style(openingControls, 'translate', `0 ${-y}px`);
        // The incoming foreground catches up from a quarter-screen offset.
        // Incoming media and its playback control keep their native positions
        // inside the moving panel. Normal scrolling starts at zero copy offset.
        if (campaignCopy)
          style(campaignCopy, 'translate', `0 ${(1 - travelled) * box.height * 0.25}px`);
        const covered = openingInert || box.end - scroll <= 1;
        if (opening.inert !== covered) opening.inert = covered;
        if (rail) {
          style(rail, 'opacity', String(leaving));
          const hidden = railInert || leaving === 0;
          if (rail.inert !== hidden) rail.inert = hidden;
        }
        markers.forEach((marker, index) => {
          if (!marker) return;
          const weight = index === 0 ? 1 - markerProgress : markerProgress;
          // The rail stays fixed. Compositor transforms reproduce the About Us
          // long/short pill animation without changing layout or clipping.
          style(links[index], 'transform', `translate3d(0,${14 - 28 * markerProgress}px,0)`);
          style(marker, 'transform', `scaleY(${(28 + 56 * weight) / 84})`);
          style(marker, 'opacity', String(0.4 + 0.6 * weight));
          if (index === active) {
            if (links[index].getAttribute('aria-current') !== 'step')
              links[index].setAttribute('aria-current', 'step');
          } else if (links[index].hasAttribute('aria-current'))
            links[index].removeAttribute('aria-current');
        });
        if (slide && nativeSlide === slide) {
          if (phase < 1) schedule();
          else slide.finish();
        } else if (!snapping && hintPhase < 1 && openingHint !== hintTarget) schedule();
      };
    }
    const schedule = () => {
      if (!disposed && !suspended && !document.hidden && !carousel) requestMotionFrame(read);
    };
    const invalidate = () => {
      layout = null;
      schedule();
    };
    // Only the first visit needs about two wheel scrolls to advance the opening.
    // After a chapter settles, either hero is ready for a one-gesture reversal.
    // Before the initial threshold only the pills respond.
    // The second hero releases forward scrolling back to the normal page.
    let settleTimer = 0,
      nativeSlide = null,
      carousel = null,
      previewScroll = null,
      gestureStart = null,
      touchRecovery = null,
      lastAnchor = 'start',
      recoverNative = true,
      held = false,
      snapping = false,
      hasSettledChapter = false,
      lastTravelDirection = 0,
      pressure = 0,
      openingHint = 0,
      hintFrom = 0,
      hintTarget = 0,
      hintStarted = 0,
      quietUntil = 0,
      touchGesture = null,
      viewportWidth = innerWidth;
    const scrollDistance = () => Math.max(120, innerHeight * (2 / 3));
    // A full-height touch transition needs more time than the site's short
    // mobile UI movements. Keep the established desktop wheel timing intact.
    const slideDuration = () => (touchViewport() || innerWidth < 992 ? time(800) : duration());
    // Spread the movement across the duration instead of racing to an almost
    // finished position and keeping input locked through a long easing tail.
    const slideEase = (p) => p * p * (3 - 2 * p);
    const carouselAvailable = () =>
      (touchViewport() || innerWidth < 992) && !window.lenis?.scrollTo && !!panel.animate;
    function restorePanel() {
      if (panelTransform) panel.style.transform = panelTransform;
      else panel.style.removeProperty('transform');
      if (!panel.style.length && styles[nodes.indexOf(panel)] === null)
        panel.removeAttribute('style');
    }
    function cancelCarousel() {
      const moving = carousel;
      carousel = null;
      moving?.animations.forEach((animation) => animation.cancel());
      if (moving || previewScroll !== null) restorePanel();
      previewScroll = null;
    }
    function startCarousel(destination, visualFrom, finish, returning) {
      const box = measure(),
        physical = window.scrollY,
        to = box[destination];
      // An early native scroll may precede this deferred owner. It can settle
      // from between the chapter anchors using the same local transforms.
      if (!carouselAvailable() || physical < box.start - 3 || physical > box.end + 3) return false;
      const span = Math.max(1, box.end - box.start),
        fromProgress = clamp((visualFrom - box.start) / span),
        toProgress = destination === 'end' ? 1 : 0,
        // An uncommitted drag has its own soft return. Distance-scaling the
        // full slide made short releases snap back too abruptly.
        milliseconds = returning
          ? time(400)
          : slideDuration() * Math.max(0.22, Math.abs(to - visualFrom) / span),
        options = {
          duration: milliseconds,
          easing: returning ? 'cubic-bezier(0.22,1,0.36,1)' : 'cubic-bezier(0.333333,0,0.666667,1)',
          fill: 'both',
        },
        animations = [];
      // Native transform animations run between frames on the browser's
      // compositor. The document scrolls once, at the completed landing.
      const animate = (node, frames) => {
        const animation = node.animate(frames, options);
        if (document.timeline?.currentTime != null)
          animation.startTime = document.timeline.currentTime;
        animations.push(animation);
        return animation;
      };
      const moving = {
        animations,
        started: performance.now(),
        milliseconds,
        finish() {
          if (carousel !== moving) return;
          carousel = null;
          previewScroll = null;
          restorePanel();
          layout = null;
          const target = measure()[destination];
          window.scrollTo({ top: target, behavior: 'instant' });
          // Set the native landing underneath the animation before releasing
          // its fill, so the normal page takes over without a visible jump.
          read(frameMeasurements())?.();
          animations.forEach((animation) => animation.cancel());
          finish();
        },
      };
      carousel = moving;
      cancelMotionFrame(read);
      const panelAnimation = animate(panel, [
        { transform: `translate3d(0,${physical - visualFrom}px,0)` },
        { transform: `translate3d(0,${physical - to}px,0)` },
      ]);
      animate(
        copy,
        [fromProgress, toProgress].map((p) => ({
          translate: `0 ${-p * box.height}px`,
          opacity: String(1 - p),
        })),
      );
      if (openingControls)
        animate(
          openingControls,
          [fromProgress, toProgress].map((p) => ({
            translate: `0 ${-p * box.height}px`,
          })),
        );
      if (campaignCopy)
        animate(
          campaignCopy,
          [fromProgress, toProgress].map((p) => ({
            translate: `0 ${(1 - p) * box.height * 0.25}px`,
          })),
        );
      const fromMarker = clamp(fromProgress + (1 - fromProgress) * openingHint);
      links.forEach((link) =>
        animate(link, [
          { transform: `translate3d(0,${14 - 28 * fromMarker}px,0)` },
          { transform: `translate3d(0,${14 - 28 * toProgress}px,0)` },
        ]),
      );
      markers.forEach((marker, index) => {
        if (!marker) return;
        animate(
          marker,
          [fromMarker, toProgress].map((p) => {
            const weight = index === 0 ? 1 - p : p;
            return {
              transform: `scaleY(${(28 + 56 * weight) / 84})`,
              opacity: String(0.4 + 0.6 * weight),
            };
          }),
        );
      });
      panelAnimation.onfinish = moving.finish;
      return true;
    }
    const blocked = () =>
      disposed ||
      suspended ||
      document.hidden ||
      window.TDBScrollLock?.active ||
      window.TDBSmoothScroll?.nativeAutoscroll ||
      document.querySelector('.navbar10_menu-button.w--open') ||
      document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
    function resetGesture() {
      clearTimeout(settleTimer);
      cancelCarousel();
      settleTimer = 0;
      nativeSlide = null;
      gestureStart = null;
      touchRecovery = null;
      held = false;
      snapping = false;
      pressure = 0;
      openingHint = hintFrom = hintTarget = 0;
      quietUntil = 0;
      touchGesture = null;
    }
    function navigate(top, origin = window.scrollY) {
      const feedback = openingHint,
        visualFrom = previewScroll ?? window.scrollY,
        direction = Math.sign(top - origin),
        touch = touchGesture,
        box = measure(),
        destination = Math.abs(top - box.start) < Math.abs(top - box.end) ? 'start' : 'end';
      resetGesture();
      touchGesture = touch;
      held = Boolean(touch);
      openingHint = hintFrom = hintTarget = feedback;
      lastTravelDirection = direction;
      snapping = true;
      const finish = () => {
        nativeSlide = null;
        snapping = false;
        lastAnchor = destination;
        if (direction) hasSettledChapter = true;
        pressure = 0;
        openingHint = hintFrom = hintTarget = 0;
        quietUntil = performance.now() + 180;
        schedule();
      };
      if (!reduced.matches && startCarousel(destination, visualFrom, finish, direction === 0))
        return;
      if (window.lenis?.scrollTo)
        window.lenis.scrollTo(top, {
          duration: slideDuration() / 1000,
          easing: slideEase,
          lock: true,
          force: true,
          onComplete: finish,
        });
      else if (reduced.matches) {
        window.scrollTo({ top, behavior: 'instant' });
        finish();
      } else {
        // Native smooth-scroll has a browser-chosen duration. Phones use a
        // finite animation with the same duration and easing as this Lenis slide.
        nativeSlide = {
          from: window.scrollY,
          started: performance.now(),
          milliseconds: slideDuration(),
          destination,
          finish,
        };
        schedule();
      }
    }
    function settle() {
      settleTimer = 0;
      // A delayed native scroll must not discard a finger that is still down.
      if (held) return;
      if (gestureStart === null || blocked()) return resetGesture();
      if (window.lenis?.isScrolling && Math.abs(window.lenis.velocity) > 1.5) {
        settleTimer = setTimeout(settle, 80);
        return;
      }
      const y = window.scrollY,
        { start, end } = measure(),
        distance = end - start;
      if (y <= start + 2 || y >= end - 2 || distance <= 0) return resetGesture();
      if (touchRecovery) {
        const origin = touchRecovery.origin === 'end' ? end : start;
        const advance = Math.abs(y - origin) >= touchRecovery.threshold;
        return navigate(advance ? (origin === start ? end : start) : origin, origin);
      }
      const travel = y - gestureStart,
        threshold = Math.min(64, distance * 0.08);
      let destination = y - start < distance / 2 ? start : end;
      if (Math.abs(gestureStart - start) < 4 && travel > threshold) destination = end;
      if (Math.abs(gestureStart - end) < 4 && travel < -threshold) destination = start;
      navigate(destination);
    }
    function queueRecovery() {
      if (snapping || held || blocked()) return;
      const y = window.scrollY,
        box = measure();
      if (Math.abs(y - box.start) <= 3) lastAnchor = 'start';
      else if (Math.abs(y - box.end) <= 3) lastAnchor = 'end';
      // Android can hand a stroke to native scrolling, including before our
      // first touchstart. Recover every unowned partial landing, not just the
      // one sampled at mount. Keyboard/restoration and outer-edge gestures opt out.
      if (
        gestureStart === null &&
        recoverNative &&
        (touchViewport() || innerWidth < 992) &&
        y > box.start + 3 &&
        y < box.end - 3
      ) {
        gestureStart = box[lastAnchor];
        touchRecovery = { origin: lastAnchor, threshold: Math.min(innerHeight, box.height) * 0.2 };
      }
      if (gestureStart !== null) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, 160);
      }
    }
    function captureStep(delta, event) {
      if (!delta) return false;
      const consume = () => {
        if (!event) return;
        event.preventDefault();
        // Lenis deliberately does not consult defaultPrevented. Use its
        // nested-scroll handoff flag so it cannot also apply this gesture.
        event.lenisStopPropagation = true;
      };
      // Suppress the old gesture's momentum, never a deliberate reversal once
      // settled. This also keeps the opening ready after returning from below.
      if (
        snapping ||
        (performance.now() < quietUntil && Math.sign(delta) === lastTravelDirection)
      ) {
        consume();
        quietUntil = performance.now() + 180;
        return true;
      }
      quietUntil = 0;
      const y = window.scrollY,
        { start, end } = measure(),
        first = Math.abs(y - start) <= 3,
        second = Math.abs(y - end) <= 3;
      // The second hero has no additional runway: one upward gesture returns
      // to the opening, while a downward gesture continues into the page.
      if (second && delta < 0) {
        consume();
        navigate(start);
        return true;
      }
      if (first && (delta > 0 || pressure > 0)) {
        consume();
        const limit = scrollDistance();
        pressure =
          hasSettledChapter && delta > 0 ? limit : Math.max(0, Math.min(limit, pressure + delta));
        if (pressure >= limit) navigate(end);
        else {
          hintFrom = openingHint;
          hintTarget = (pressure / limit) * 0.12;
          hintStarted = performance.now();
          schedule();
        }
        return true;
      }
      // A native return from the body lands on the second hero first.
      if (delta < 0 && y > end && y + delta <= end) {
        consume();
        navigate(end);
        return true;
      }
      pressure = 0;
      if (y > start + 3 && y < end - 3) {
        consume();
        navigate(delta > 0 ? end : start);
        return true;
      }
      return false;
    }
    function touchHint(value) {
      hintFrom = openingHint;
      hintTarget = value;
      hintStarted = performance.now();
      schedule();
    }
    function touchInput(event) {
      if (event.touches.length !== 1) {
        recoverNative = false;
        touchRecovery = null;
        touchGesture = null;
        held = false;
        gestureStart = null;
        clearTimeout(settleTimer);
        if (!snapping) {
          cancelCarousel();
          touchHint(0);
        }
        return;
      }
      const point = event.touches[0],
        x = point.clientX ?? innerWidth / 2,
        y = point.clientY;
      const box = measure(),
        physical = window.scrollY;
      const between = physical >= box.start - 3 && physical <= box.end + 3;
      const adopting = event.type === 'touchmove' && !touchGesture && recoverNative && between;
      if (event.type === 'touchstart' || adopting) {
        // Preserve native edge navigation and multi-finger zoom gestures.
        if (x < 24 || x > innerWidth - 24) {
          recoverNative = false;
          touchGesture = null;
          held = false;
          return;
        }
        clearTimeout(settleTimer);
        gestureStart = null;
        held = true;
        if (!snapping) quietUntil = pressure = 0;
        recoverNative = true;
        const origin =
          Math.abs(box.start - physical) <= 3
            ? 'start'
            : Math.abs(box.end - physical) <= 3
              ? 'end'
              : between
                ? lastAnchor
                : null;
        const anchor = origin ? box[origin] : physical;
        const threshold = Math.max(1, Math.min(innerHeight, box.height)) * 0.2;
        touchRecovery = origin ? { origin, threshold } : null;
        touchGesture = {
          x,
          y: y + physical - anchor,
          lastY: y,
          // Capture the visible height once. Browser chrome must not change
          // the release threshold halfway through a finger gesture.
          threshold,
          scroll: anchor,
          origin: origin === 'start' ? 0 : origin === 'end' ? 1 : -1,
          axis: null,
          distance: 0,
          target: null,
          committed: snapping,
        };
        if (!adopting) return;
      }
      const touch = touchGesture;
      if (!touch) return;
      const consume = () => {
        if (!event.cancelable) return;
        event.preventDefault();
        event.lenisStopPropagation = true;
      };
      // A long finger stroke must never advance twice or run beyond a landing.
      if (snapping || touch.committed) {
        consume();
        return;
      }
      const dx = x - touch.x,
        dy = touch.y - y,
        delta = touch.lastY - y;
      touch.lastY = y;
      touch.distance = dy;
      if (!touch.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
        touch.axis = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'native';
        if (touch.axis === 'native') {
          recoverNative = false;
          touchRecovery = null;
        }
      }
      if (touch.axis === 'native') return;
      if (!event.cancelable) {
        touch.axis = 'native';
        cancelCarousel();
        schedule();
        if (gestureStart === null) gestureStart = touch.scroll;
        return;
      }
      const target =
        touch.origin === 0 && dy > 0 ? panel : touch.origin === 1 && dy < 0 ? root : null;
      touch.target = target;
      if (target) {
        consume();
        if (!touch.axis) return;
        // Touch follows the panel locally, like a vertical carousel. The page
        // stays at its chapter anchor until the released slide has landed.
        if (carouselAvailable()) {
          const box = measure();
          previewScroll = Math.max(box.start, Math.min(box.end, touch.scroll + dy));
          schedule();
        } else if (touch.origin === 0) touchHint(clamp(dy / touch.threshold) * 0.12);
        return;
      }
      // The second hero releases a forward swipe to native page scrolling.
      // Returning from the body still lands on the second chapter first.
      if (previewScroll !== null) {
        cancelCarousel();
        schedule();
      }
      if (hintTarget) touchHint(0);
      if (touch.axis === 'vertical') {
        if (captureStep(delta, event)) {
          touch.committed = snapping;
          return;
        }
        if (gestureStart === null) gestureStart = touch.scroll;
      }
    }
    function input(event) {
      if (
        blocked() ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.target?.closest?.('input,textarea,select,[contenteditable="true"]') ||
        (event.target?.closest?.('nav') && !event.target.closest('[data-tdb-campaign-rail]')) ||
        (event.type === 'wheel' && Math.abs(event.deltaX) >= Math.abs(event.deltaY))
      )
        return;
      if (event.type === 'touchstart' || event.type === 'touchmove') return touchInput(event);
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (captureStep(delta, event)) return;
      if (gestureStart === null) gestureStart = window.scrollY;
      clearTimeout(settleTimer);
      if (!held) settleTimer = setTimeout(settle, 160);
    }
    document.addEventListener('touchstart', input, { passive: true, capture: true, signal });
    for (const name of ['wheel', 'touchmove'])
      document.addEventListener(name, input, { passive: false, capture: true, signal });
    document.addEventListener(
      'keydown',
      () => {
        if (!snapping) {
          resetGesture();
          recoverNative = false;
          schedule();
        }
      },
      { signal },
    );
    for (const name of ['touchend', 'touchcancel'])
      window.addEventListener(
        name,
        (event) => {
          const touch = touchGesture;
          touchGesture = null;
          held = false;
          if (event.type === 'touchcancel' || event.touches?.length) {
            // Native touch cancellation can still leave momentum in the
            // document. Retain its origin until that movement has settled.
            if (event.touches?.length) recoverNative = false;
            if (!recoverNative) gestureStart = null;
            clearTimeout(settleTimer);
            if (!snapping) {
              cancelCarousel();
              touchHint(0);
            }
            queueRecovery();
            return;
          }
          if (
            !snapping &&
            !blocked() &&
            touch?.target &&
            !touch.committed &&
            touch.axis === 'vertical' &&
            Math.abs(touch.distance) >= touch.threshold
          )
            // A finger-follow preview transforms the panel's visible rectangle.
            // Navigate to its native anchor, regardless of how far it was dragged.
            navigate(measure()[touch.target === panel ? 'end' : 'start'], touch.scroll);
          else if (!snapping) {
            if (previewScroll !== null && touch && !blocked()) navigate(touch.scroll, touch.scroll);
            else {
              cancelCarousel();
              touchHint(0);
            }
          }
          queueRecovery();
        },
        { passive: true, capture: true, signal },
      );
    window.addEventListener('scroll', queueRecovery, { passive: true, signal });
    window.addEventListener(
      'resize',
      () => {
        const widthChanged = Math.abs(innerWidth - viewportWidth) > 1;
        viewportWidth = innerWidth;
        // A compositor flight has no intermediate document scroll to preserve.
        // Settle its chosen chapter against the resized native layout atomically.
        if (carousel) return carousel.finish();
        invalidate();
        // Height-only browser chrome changes are not new gestures. The next
        // slide frame remeasures the invalidated destination after rotation too.
        if (
          (snapping && !window.lenis?.scrollTo) ||
          (!widthChanged && (touchGesture || touchRecovery))
        ) {
          queueRecovery();
          return;
        }
        resetGesture();
        queueRecovery();
      },
      { passive: true, signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        // Background tabs can suspend rAF. Retain the in-flight destination
        // so the next frame catches up instead of abandoning a half slide.
        if (
          carousel &&
          !document.hidden &&
          performance.now() - carousel.started >= carousel.milliseconds
        )
          return carousel.finish();
        if (!snapping) resetGesture();
        if (!document.hidden) {
          invalidate();
          queueRecovery();
        }
      },
      { signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        const link = event.target.closest?.('[data-tdb-campaign-step]');
        const index = links.indexOf(link);
        if (
          index < 0 ||
          event.defaultPrevented ||
          event.button ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          rail?.inert
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (carousel) return;
        const target = index === 0 ? root : panel;
        const top = window.scrollY + target.getBoundingClientRect().top;
        navigate(top);
      },
      { capture: true, signal },
    );
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('load', invalidate, { signal });
    window.addEventListener(
      'pagehide',
      () => {
        suspended = true;
        recoverNative = false;
        resetGesture();
        cancelMotionFrame(read);
      },
      { signal },
    );
    window.addEventListener(
      'pageshow',
      (event) => {
        suspended = false;
        if (event.persisted) recoverNative = false;
        invalidate();
      },
      { signal },
    );
    document.addEventListener('visibilitychange', schedule, { signal });
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(invalidate) : null;
    resize?.observe(root);
    resize?.observe(opening);
    resize?.observe(panel);
    const api = Object.freeze({
      refresh: invalidate,
      status: () => ({ ready: !disposed, active, progress }),
      destroy() {
        if (disposed) return;
        disposed = true;
        controller.abort();
        resetGesture();
        resize?.disconnect();
        cancelMotionFrame(read);
        nodes.forEach((node, i) =>
          styles[i] === null
            ? node.removeAttribute('style')
            : node.setAttribute('style', styles[i]),
        );
        links.forEach((link, i) =>
          current[i] === null
            ? link.removeAttribute('aria-current')
            : link.setAttribute('aria-current', current[i]),
        );
        opening.inert = openingInert;
        if (rail) rail.inert = railInert;
        campaignHeroes.delete(root);
      },
    });
    campaignHeroes.set(root, api);
    // User input can arrive before this deferred module. Recover a partial
    // opening scroll after input settles; a continuing touch is adopted above.
    const initial = measure();
    if (window.scrollY > initial.start + 3 && window.scrollY < initial.end - 3) {
      touchRecovery = { origin: 'start', threshold: Math.min(innerHeight, initial.height) * 0.2 };
      gestureStart = initial.start;
      settleTimer = setTimeout(settle, 160);
    }
    schedule();
    return api;
  }

  window.TDBCampaignHero = Object.freeze({ version: '1.0.0', mount: campaignHero });
})();
