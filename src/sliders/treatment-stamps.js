/* Native CMS stamps: independent scrolling, with selection following image progress. */
window.TDBTreatmentStamps ||= (() => {
  const instances = new WeakMap();
  function prepare(root) {
    if (!root.hasAttribute('data-tdb-treatment-postage')) return null;
    if (instances.has(root)) return instances.get(root);
    const layout = root.closest('[data-tdb-treatment-layout]') || root;
    const strip = layout.querySelector('[data-tdb-treatment-stamps]');
    const viewport = strip?.querySelector('.tdb-treatment-controls');
    const links = Array.from(strip?.querySelectorAll('[data-tdb-treatment-stamp]') || []);
    if (!viewport || !links.length) return null;
    const items = links.map((link) => link.closest('.tdb-treatment-card'));
    const track = items[0].parentElement;
    const translateBefore = track.style.getPropertyValue('translate');
    const translatePriority = track.style.getPropertyPriority('translate');
    const sliderViewport = root.querySelector(':scope > .swiper');
    const mobile = matchMedia('(max-width: 767px)');
    const confirmLinks = strip.getAttribute('data-tdb-stamp-link-mode') === 'confirm';
    let armedIndex = null,
      pressState = null;
    const labelsBefore = new Map(links.map((link) => [link, link.getAttribute('aria-label')]));
    let looped = false,
      cycle = 0,
      copies = [],
      allLinks = links;
    let swiper,
      automatic = true,
      offsets = [],
      width = 0,
      drag = null,
      touchId = null,
      suppressClick = false,
      ignoredClick = null;
    let selected = -1;
    let maxScroll = null,
      disposed = false;
    let motionFrame = 0,
      returnOffset = 0,
      returnEdge = 0,
      returnStarted = 0,
      returnDuration = 500,
      returnIndex = null,
      targetLeft = 0,
      momentum = 0,
      coastPosition = 0,
      lastFrame = 0,
      momentumElapsed = 0;
    let edgeOffset = 0,
      edgeLimit = 80,
      edgeStart = 0,
      edgeVelocity = 0,
      edgeStarted = 0;
    let dragFrame = 0,
      pendingScroll = null,
      edgeDirty = false,
      renderedEdge = 0;
    const animations = new Map();
    const opacityBefore = new Map(items.map((item) => [item, item.style.opacity]));
    const transitionBefore = new Map(items.map((item) => [item, item.style.transitionDuration]));
    const states = new WeakMap();
    const on = (type, listener, options) => viewport.addEventListener(type, listener, options);
    links.forEach((link, index) => {
      link.dataset.tdbStampIndex = String(index);
    });
    function configureLoop() {
      const enabled =
        mobile.matches &&
        root.getAttribute('data-tdb-treatment-loop') === 'true' &&
        links.length > 1;
      if (enabled === looped) return;
      armLink(null);
      stopMotion();
      copies.forEach((node) => {
        animations.get(node)?.cancel();
        animations.delete(node);
        node.remove();
      });
      copies = [];
      looped = enabled;
      maxScroll = null;
      if (enabled) {
        const copy = (item) => {
          const node = item.cloneNode(true);
          node.setAttribute('aria-hidden', 'true');
          node.removeAttribute('id');
          node.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
          node.querySelectorAll('a').forEach((link) => (link.tabIndex = -1));
          return node;
        };
        const before = items.map(copy),
          after = items.map(copy);
        track.prepend(...before);
        track.append(...after);
        copies = [...before, ...after];
      }
      allLinks = [...track.querySelectorAll('[data-tdb-treatment-stamp]')];
      selected = -1;
      automatic = true;
      drag = null;
    }
    function normalize() {
      if (!looped || !cycle) return;
      const before = viewport.scrollLeft;
      const after = cycle / 2 + ((((before - cycle / 2) % cycle) + cycle) % cycle);
      if (Math.abs(after - before) < 0.5) return;
      setScroll(before);
    }
    function writeScroll(value) {
      if (viewport.scrollLeft !== value) viewport.scrollLeft = value;
    }
    function flushDrag() {
      if (dragFrame) cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      const value = pendingScroll;
      pendingScroll = null;
      if (value !== null) writeScroll(value);
      if (edgeDirty) {
        edgeDirty = false;
        writeEdge(edgeOffset);
      }
    }
    function scheduleDrag() {
      if (!dragFrame) dragFrame = requestAnimationFrame(flushDrag);
    }
    function setScroll(value, deferred = false) {
      // Wrap before assigning scrollLeft, so the browser never clamps a drag
      // at a physical end or interrupts its momentum at a recycled cycle.
      const next =
        looped && cycle
          ? cycle / 2 + ((((value - cycle / 2) % cycle) + cycle) % cycle)
          : Math.max(0, Math.min(value, scrollLimit()));
      if (deferred) {
        pendingScroll = next;
        scheduleDrag();
      } else {
        pendingScroll = null;
        writeScroll(next);
      }
      if (drag && looped) drag.left += next - value;
    }
    function scrollLimit() {
      if (maxScroll === null) {
        flushDrag();
        // Translated overflow must not become a new scroll boundary on resize
        // or re-grab. Geometry is read once, with the track at its resting pose.
        const edge = edgeOffset;
        setEdge(0);
        const width = viewport.clientWidth;
        maxScroll = Math.max(0, viewport.scrollWidth - width);
        edgeLimit = Math.min(80, width * 0.2);
        setEdge(edge);
      }
      return maxScroll;
    }
    function invalidate() {
      maxScroll = null;
    }
    function writeEdge(value) {
      if (renderedEdge === value) return;
      renderedEdge = value;
      if (value) track.style.setProperty('translate', `${value}px 0`);
      else if (translateBefore)
        track.style.setProperty('translate', translateBefore, translatePriority);
      else track.style.removeProperty('translate');
    }
    function setEdge(value, deferred = false) {
      const changed = edgeOffset !== value;
      edgeOffset = value;
      if (deferred) {
        if (changed) {
          edgeDirty = true;
          scheduleDrag();
        }
      } else {
        edgeDirty = false;
        writeEdge(value);
      }
    }
    function pull(value) {
      const limit = scrollLimit();
      const bounded = Math.max(0, Math.min(value, limit));
      if (!limit || !edgeLimit || track === viewport) {
        setScroll(bounded, true);
        setEdge(0, true);
        drag.left += bounded - value;
        return;
      }
      const excess = bounded - value;
      const previous = excess * edgeOffset > 0 ? Math.abs(edgeOffset) : 0;
      const extra = Math.abs(excess) - previous;
      // Outward pulls get progressively firmer; reversing follows the finger
      // immediately, without having to repay a long invisible over-drag.
      const offset =
        extra <= 0
          ? Math.abs(excess)
          : edgeLimit -
            (edgeLimit - previous) /
              (1 + (extra * 0.5 * (edgeLimit - previous)) / (edgeLimit * edgeLimit));
      setScroll(bounded, true);
      setEdge(Math.sign(excess) * offset, true);
      drag.left += bounded - edgeOffset - value;
    }
    function edgeStep(now) {
      motionFrame = 0;
      const t = Math.max(0, now - edgeStarted) / 1000;
      // Analytic, critically damped return: same feel at different frame rates,
      // no oscillation and no permanent animation loop once it has settled.
      const offset = (edgeStart + (edgeVelocity + 14 * edgeStart) * t) * Math.exp(-14 * t);
      if (window.TDBMotion?.reduced?.matches || (t >= 0.1 && Math.abs(offset) < 0.1) || t >= 1) {
        setEdge(0);
      } else {
        setEdge(offset);
        motionFrame = requestAnimationFrame(edgeStep);
      }
    }
    function settleEdge(velocity = 0, started = performance.now()) {
      flushDrag();
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      momentum = 0;
      edgeStart = edgeOffset;
      edgeVelocity = velocity;
      edgeStarted = started;
      if (window.TDBMotion?.reduced?.matches) setEdge(0);
      else if (edgeStart || velocity) edgeStep(performance.now());
    }
    function stopMotion(resetEdge = true) {
      flushDrag();
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      momentum = 0;
      returnOffset = 0;
      returnEdge = 0;
      returnIndex = null;
      if (resetEdge) setEdge(0);
    }
    function resumeAlignment(index = swiper?.realIndex) {
      if (!automatic || (returnIndex !== null && returnIndex !== index)) {
        stopMotion(false);
        returnOffset = null;
        returnEdge = edgeOffset;
        returnIndex = index;
        returnDuration = window.TDBMotion?.reduced?.matches
          ? 0
          : window.TDBMotion?.duration?.(viewport.clientWidth) || 500;
      }
      automatic = true;
    }
    function returnStep(now) {
      motionFrame = 0;
      const elapsed = returnDuration ? Math.min(1, (now - returnStarted) / returnDuration) : 1;
      setScroll(targetLeft + returnOffset * Math.pow(1 - elapsed, 3));
      setEdge(returnEdge * Math.pow(1 - elapsed, 3));
      if (elapsed < 1) motionFrame = requestAnimationFrame(returnStep);
      else returnOffset = returnEdge = 0;
    }
    function align(value) {
      if (!looped) value = Math.max(0, Math.min(value, scrollLimit()));
      targetLeft = value;
      if (returnOffset === null) {
        const difference = viewport.scrollLeft - value;
        returnOffset = cycle
          ? ((((difference + cycle / 2) % cycle) + cycle) % cycle) - cycle / 2
          : difference;
        returnStarted = performance.now();
      }
      if (returnOffset || returnEdge) {
        // Progress sampling and return easing share a single writer. Updating
        // the target must not repaint/cancel the same frame a second time.
        if (!motionFrame) motionFrame = requestAnimationFrame(returnStep);
      } else setScroll(value);
    }
    function coast(now) {
      motionFrame = 0;
      const dt = Math.min(250, Math.max(0, now - lastFrame));
      lastFrame = now;
      momentumElapsed += dt;
      // Same exponential coast as the logo marquee, with no cruising speed.
      // Retain the fractional position like its transform-driven track: reading
      // rounded scrollLeft back each frame can prematurely kill a mobile throw.
      const decay = Math.exp((-4.2 * dt) / 1000);
      const previous = coastPosition;
      coastPosition += (momentum * (1 - decay)) / 0.0042;
      setScroll(coastPosition);
      if (!looped && (coastPosition <= 0 || coastPosition >= scrollLimit())) {
        const boundary = coastPosition <= 0 ? 0 : scrollLimit();
        // Hand the velocity at impact into a small edge spring. Solve the
        // impact time so a delayed frame cannot create a larger bounce.
        const impactDecay = Math.max(0.0001, 1 - ((boundary - previous) * 0.0042) / momentum);
        const impactMs = Math.max(0, Math.min(dt, -Math.log(impactDecay) / 0.0042));
        if (scrollLimit() && track !== viewport)
          settleEdge(-momentum * impactDecay * 350, now - dt + impactMs);
        else momentum = 0;
        return;
      }
      momentum *= decay;
      if (Math.abs(momentum) > 0.002 && momentumElapsed < 2000)
        motionFrame = requestAnimationFrame(coast);
      else momentum = 0;
    }
    function dim(item, active, heading = false) {
      if (!item) return;
      if (states.get(item) === active) return;
      states.set(item, active);
      if (!heading) {
        // Designer owns the opacity transition. Keep one stable target instead
        // of cancelling/replacing a filled animation on every selection.
        item.style.transitionDuration = window.TDBMotion?.reduced?.matches
          ? '0s'
          : transitionBefore.get(item) || '';
        item.style.opacity = active ? '1' : '0.5';
        return;
      }
      const property = heading ? 'color' : 'opacity';
      const current = getComputedStyle(item)[property];
      const target = heading ? (active ? '#ffffff' : 'rgba(255,255,255,0.5)') : active ? 1 : 0.5;
      animations.get(item)?.cancel();
      animations.set(
        item,
        item.animate([{ [property]: current }, { [property]: target }], {
          duration: window.TDBMotion?.reduced?.matches ? 0 : 200,
          fill: 'forwards',
        }),
      );
    }
    function selection() {
      if (!swiper || selected === swiper.realIndex) return;
      selected = swiper.realIndex;
      allLinks.forEach((link) => {
        const active = Number(link.dataset.tdbStampIndex) === selected;
        active ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
        dim(link.closest('.tdb-treatment-card'), active);
      });
      Array.from(swiper.slides || []).forEach((slide, index) => {
        const realIndex = Number(slide.getAttribute('data-swiper-slide-index') ?? index);
        dim(slide.querySelector('.tdb-treatment-title'), realIndex === selected, true);
      });
    }
    function bind() {
      const candidate = sliderViewport?.swiper;
      if (disposed || !candidate || candidate.destroyed || candidate === swiper) return;
      swiper?.off('slideChange', change);
      swiper?.off('beforeDestroy', beforeDestroy);
      swiper = candidate;
      swiper.on('slideChange', change);
      swiper.on('beforeDestroy', beforeDestroy);
      selection();
    }
    function change() {
      armLink(null);
      resumeAlignment();
      selection();
    }
    function measure() {
      if (disposed) return 0;
      flushDrag();
      configureLoop();
      invalidate();
      scrollLimit();
      bind();
      const first = items[0].getBoundingClientRect();
      width = first.width;
      offsets = items.map((item) => item.getBoundingClientRect().left - first.left);
      cycle = looped ? copies[items.length].getBoundingClientRect().left - first.left : 0;
      selection();
      return width;
    }
    function paint(index, markerX, trackWidth) {
      if (disposed) return;
      bind();
      if (!automatic || !offsets.length || drag) return;
      const last = links.length - 1;
      if (returnIndex !== null) {
        // Manual browsing hands back to one fixed destination. Following the
        // moving image progress as well would send an already-aligned stamp
        // away and back while the main slide catches up.
        const marker = last ? (returnIndex * (trackWidth - width)) / last : 0;
        align((looped ? cycle : 0) + offsets[returnIndex] - marker);
        if (!motionFrame && !swiper?.animating && Math.abs(index - returnIndex) < 0.001)
          returnIndex = null;
        return;
      }
      if (looped && cycle > 0) {
        const value = ((index % links.length) + links.length) % links.length;
        const lower = Math.floor(value),
          fraction = value - lower;
        const next = lower === last ? cycle : offsets[lower + 1];
        const offset = offsets[lower] + (next - offsets[lower]) * fraction;
        // Across the seam continue forward into the next CMS copy. Recycling
        // a whole cycle is visually identical, including during a native drag.
        const marker = lower === last ? (trackWidth - width) * (1 - fraction) : markerX;
        align(cycle + offset - marker);
        return;
      }
      // The loop's duplicated images cross the seam; stamps remain a finite list.
      const value = Math.min(last, Math.max(0, index));
      const lower = Math.floor(value),
        upper = Math.min(last, lower + 1);
      const offset = offsets[lower] + (offsets[upper] - offsets[lower]) * (value - lower);
      const alignedMarker = index > last ? trackWidth - width : markerX;
      align(offset - alignedMarker);
    }
    function selectStamp(link) {
      if (!link || !viewport.contains(link)) return false;
      bind();
      if (!swiper) {
        window.TDBSwiper?.mount('parallax', root);
        bind();
      }
      if (!swiper) return false; // Keep the native CMS link fallback.
      const index = Number(link.dataset.tdbStampIndex);
      if (!Number.isInteger(index) || index < 0 || index >= links.length) return false;
      resumeAlignment(index);
      if (swiper.params?.loop) swiper.slideToLoop(index);
      else swiper.slideTo(index);
      const progress = root.querySelector('[data-tdb-native-progress]');
      const trackWidth = progress.getBoundingClientRect().width;
      if (swiper.realIndex === index && !swiper.animating) {
        measure();
        paint(
          index,
          links.length < 2 ? 0 : (index * (trackWidth - width)) / (links.length - 1),
          trackWidth,
        );
      }
      return true;
    }
    function armLink(index) {
      if (!confirmLinks || armedIndex === index) return;
      armedIndex = index;
      allLinks.forEach((link) => {
        const armed = Number(link.dataset.tdbStampIndex) === index;
        link.toggleAttribute('data-tdb-stamp-link-ready', armed);
        const title =
          link.querySelector('.tdb-treatment-title')?.textContent.trim() || link.textContent.trim();
        if (armed) link.setAttribute('aria-label', `Open ${title} treatment`);
        else {
          const previous = labelsBefore.get(link);
          if (previous) link.setAttribute('aria-label', previous);
          else link.removeAttribute('aria-label');
        }
      });
    }
    function linkReady(link) {
      return (
        confirmLinks && armedIndex !== null && Number(link?.dataset.tdbStampIndex) === armedIndex
      );
    }
    function liveStamp(link) {
      return Boolean(
        swiper &&
          Number(link?.dataset.tdbStampIndex) === swiper.realIndex &&
          !swiper.animating &&
          !motionFrame &&
          automatic,
      );
    }
    function activateStamp(link, live = liveStamp(link)) {
      // Selecting or returning a stamp only highlights it. Link preview is a
      // separate activation once the selected image and strip have settled.
      if (confirmLinks && live) {
        automatic = true;
        if (linkReady(link)) return false;
        armLink(Number(link.dataset.tdbStampIndex));
        return true;
      }
      armLink(null);
      if (
        confirmLinks &&
        swiper?.animating &&
        Number(link?.dataset.tdbStampIndex) === swiper.realIndex
      )
        return true;
      return selectStamp(link); // Preserve the unenhanced CMS link fallback.
    }
    function choose(event) {
      const link = event.target.closest('[data-tdb-treatment-stamp]');
      if (
        !link ||
        !viewport.contains(link) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const ignored = ignoredClick;
      ignoredClick = null;
      const live = pressState?.link === link ? pressState.live : liveStamp(link);
      pressState = null;
      // Ignore only the follow-up click for a handled touch or drag, never a
      // new tap, a keyboard activation, or a permanently missing click.
      if (
        ignored &&
        event.detail > 0 &&
        performance.now() < ignored.until &&
        (ignored.id === null ||
          typeof event.pointerId !== 'number' ||
          event.pointerId === ignored.id)
      ) {
        event.preventDefault();
        return;
      }
      if (activateStamp(link, live)) event.preventDefault();
    }
    function down(event) {
      if (touchId !== null && !event.nativeTouch) return;
      if (event.button !== 0 || event.isPrimary === false) return;
      invalidate();
      const link = event.target.closest?.('[data-tdb-treatment-stamp]');
      pressState = { link, live: liveStamp(link) };
      stopMotion(false);
      automatic = false;
      suppressClick = false;
      ignoredClick = null;
      drag = {
        id: event.pointerId,
        type: event.pointerType,
        touch: event.nativeTouch === true,
        link: event.target.closest?.('[data-tdb-treatment-stamp]'),
        x: event.clientX,
        y: event.clientY,
        left: viewport.scrollLeft - edgeOffset,
        samples: [{ x: event.clientX, t: event.timeStamp }],
      };
    }
    function move(event) {
      if (!drag || event.pointerId !== drag.id || drag.touch !== (event.nativeTouch === true))
        return;
      const delta = event.clientX - drag.x;
      if (!suppressClick && Math.abs(event.clientY - drag.y) > Math.max(6, Math.abs(delta))) {
        drag = null;
        settleEdge();
        return;
      }
      if (!suppressClick && Math.abs(delta) > 6) {
        pressState = null;
        armLink(null);
        suppressClick = true;
        if (drag.touch) {
          window.TDBSliderFocus?.focus(strip, () => Boolean(drag?.touch && suppressClick));
        } else {
          try {
            viewport.setPointerCapture(event.pointerId);
          } catch (_) {}
        }
      }
      if (suppressClick) {
        // Use input timestamps, as the marquee does. Main-thread delays must
        // not turn a fresh finger release into a stale, motionless gesture.
        const now = event.timeStamp;
        // Use the recent gesture, not one noisy pointer event. Keep one
        // preceding sample to estimate velocity after a sparse move event.
        drag.samples.push({ x: event.clientX, t: now });
        while (drag.samples.length > 2 && now - drag.samples[1].t > 100) drag.samples.shift();
        // Keep every input sample and resistance calculation, but commit only
        // the latest visual pose in the next display frame.
        if (looped) setScroll(drag.left - delta, true);
        else pull(drag.left - delta);
        event.preventDefault();
      }
    }
    function up(event) {
      if (!drag || event.pointerId !== drag.id || drag.touch !== (event.nativeTouch === true))
        return;
      // Touch starts with implicit capture on the image/link. Its release
      // bubbles when the viewport takes capture; the gesture is still active.
      if (event.type === 'lostpointercapture' && event.target !== viewport) return;
      flushDrag();
      // Touch identifiers and PointerEvent pointer IDs are different namespaces.
      const id = drag.touch ? null : drag.id;
      const tap =
        drag.type === 'touch' &&
        event.type === 'pointerup' &&
        !suppressClick &&
        Math.abs(event.clientX - drag.x) <= 8 &&
        Math.abs(event.clientY - drag.y) <= 8 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        drag.link;
      ignoredClick =
        suppressClick && event.type === 'pointerup' ? { id, until: performance.now() + 500 } : null;
      if (edgeOffset) settleEdge();
      else if (
        suppressClick &&
        event.type === 'pointerup' &&
        event.timeStamp - drag.samples.at(-1).t < 90 &&
        !window.TDBMotion?.reduced?.matches
      ) {
        const first = drag.samples[0],
          last = drag.samples.at(-1),
          elapsed = last.t - first.t;
        momentum = elapsed > 0 ? Math.max(-2.8, Math.min(2.8, (first.x - last.x) / elapsed)) : 0;
        coastPosition = viewport.scrollLeft;
        lastFrame = performance.now();
        momentumElapsed = 0;
        if (momentum) motionFrame = requestAnimationFrame(coast);
      }
      drag = null;
      suppressClick = false;
      // A clean touch release is the activation. Mobile browsers may withhold
      // their later click after scrolling; waiting for it loses the first tap.
      const live = pressState?.link === tap && pressState.live;
      const followLink = tap && live && linkReady(tap);
      if (tap && (followLink || activateStamp(tap, live))) {
        event.preventDefault();
        // As with selection, do not depend on a compatibility click after a
        // touch scroll. Native click preserves CMS URL, target and link semantics.
        if (followLink) tap.click();
        ignoredClick = { id, until: performance.now() + 500 };
        window.TDBSliderFocus?.resume({ y: window.scrollY, click: { target: tap } });
        pressState = null;
      }
    }
    function touchPoint(event, point, type) {
      return {
        type,
        nativeTouch: true,
        target: point.target || event.target,
        button: 0,
        pointerType: 'touch',
        pointerId: point.identifier,
        clientX: point.clientX,
        clientY: point.clientY,
        timeStamp: event.timeStamp,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        preventDefault: () => event.preventDefault(),
      };
    }
    function cancelTouch(event) {
      if (drag?.touch) up(touchPoint(event, { identifier: touchId }, 'pointercancel'));
      touchId = null;
      pressState = null;
    }
    function touchStart(event) {
      if (event.touches.length !== 1) return cancelTouch(event);
      const point = event.touches[0];
      // Browsers commonly emit pointerdown before touchstart. Adopt that press
      // without losing its selected-link state or interrupting its resting pose.
      if (drag?.type === 'touch') {
        drag.touch = true;
        drag.id = point.identifier;
      } else down(touchPoint(event, point, 'pointerdown'));
      touchId = point.identifier;
    }
    function touchMove(event) {
      if (touchId === null) return;
      if (event.touches.length !== 1) return cancelTouch(event);
      const point = Array.from(event.changedTouches).find((touch) => touch.identifier === touchId);
      if (!point || !drag?.touch) return;
      const horizontal =
        suppressClick || Math.abs(point.clientX - drag.x) > Math.abs(point.clientY - drag.y);
      // Own horizontal motion from the first touchmove, before Safari commits
      // to native scrolling and cancels its pointer stream. Vertical gestures
      // and multiple fingers remain available to the browser.
      if (horizontal) {
        if (!event.cancelable) return cancelTouch(event);
        event.preventDefault();
      }
      move(touchPoint(event, point, 'pointermove'));
    }
    function touchEnd(event) {
      if (event.touches.length) return cancelTouch(event);
      const point = Array.from(event.changedTouches).find((touch) => touch.identifier === touchId);
      if (!point) return;
      up(touchPoint(event, point, event.type === 'touchend' ? 'pointerup' : 'pointercancel'));
      touchId = null;
    }
    function wheel() {
      pressState = null;
      armLink(null);
      stopMotion();
      drag = touchId = pressState = null;
      automatic = false;
    }
    function preventDrag(event) {
      event.preventDefault();
    }
    function key(event) {
      if (event.key === 'Escape') armLink(null);
    }
    function beforeDestroy() {
      dispose(true);
    }
    function dispose(fromSwiper = false) {
      if (disposed) return;
      disposed = true;
      armLink(null);
      stopMotion();
      drag = touchId = pressState = null;
      for (const [type, fn] of listeners) viewport.removeEventListener(type, fn);
      if (!fromSwiper) {
        swiper?.off('slideChange', change);
        swiper?.off('beforeDestroy', beforeDestroy);
      }
      animations.forEach((animation) => animation.cancel());
      opacityBefore.forEach((opacity, item) => {
        item.style.opacity = opacity;
        item.style.transitionDuration = transitionBefore.get(item);
      });
      copies.forEach((node) => node.remove());
      links.forEach((link) => {
        delete link.dataset.tdbStampIndex;
      });
      instances.delete(root);
    }
    const listeners = [
      ['click', choose],
      ['pointerdown', down],
      ['pointermove', move],
      ['pointerup', up],
      ['pointercancel', up],
      ['lostpointercapture', up],
      ['touchstart', touchStart, { passive: true }],
      ['touchmove', touchMove, { passive: false }],
      ['touchend', touchEnd, { passive: false }],
      ['touchcancel', touchEnd, { passive: true }],
      ['wheel', wheel],
      ['dragstart', preventDrag],
      ['keydown', key],
      ['scroll', normalize],
    ];
    listeners.forEach(([type, fn, options]) => on(type, fn, options));
    const controller = { measure, paint, invalidate, dispose };
    instances.set(root, controller);
    return controller;
  }
  return { version: '1.4.2', prepare };
})();
