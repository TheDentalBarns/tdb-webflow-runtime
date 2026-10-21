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
      suppressClick = false,
      ignoredClick = null;
    let selected = -1;
    let motionFrame = 0,
      returnOffset = 0,
      returnStarted = 0,
      returnDuration = 500,
      returnIndex = null,
      targetLeft = 0,
      momentum = 0,
      lastFrame = 0,
      momentumElapsed = 0;
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
    function setScroll(value) {
      // Wrap before assigning scrollLeft, so the browser never clamps a drag
      // at a physical end or interrupts its momentum at a recycled cycle.
      const next =
        looped && cycle
          ? cycle / 2 + ((((value - cycle / 2) % cycle) + cycle) % cycle)
          : Math.max(0, Math.min(value, viewport.scrollWidth - viewport.clientWidth));
      viewport.scrollLeft = next;
      if (drag) drag.left += next - value;
    }
    function stopMotion() {
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      momentum = 0;
      returnOffset = 0;
      returnIndex = null;
    }
    function resumeAlignment(index = swiper?.realIndex) {
      if (!automatic || (returnIndex !== null && returnIndex !== index)) {
        stopMotion();
        returnOffset = null;
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
      if (elapsed < 1) motionFrame = requestAnimationFrame(returnStep);
      else returnOffset = 0;
    }
    function align(value) {
      if (!looped)
        value = Math.max(0, Math.min(value, viewport.scrollWidth - viewport.clientWidth));
      targetLeft = value;
      if (returnOffset === null) {
        const difference = viewport.scrollLeft - value;
        returnOffset = cycle
          ? ((((difference + cycle / 2) % cycle) + cycle) % cycle) - cycle / 2
          : difference;
        returnStarted = performance.now();
      }
      if (returnOffset) {
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
      const before = viewport.scrollLeft;
      // Same exponential coast as the logo marquee, with no cruising speed.
      // Integrating the decay keeps distance consistent at 60/120 Hz.
      const decay = Math.exp((-4.2 * dt) / 1000);
      setScroll(before + (momentum * (1 - decay)) / 0.0042);
      if (!looped && viewport.scrollLeft === before) momentum = 0;
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
      const candidate = root.querySelector(':scope > .swiper')?.swiper;
      if (!candidate || candidate === swiper) return;
      swiper = candidate;
      swiper.on('slideChange', change);
      swiper.on('beforeDestroy', dispose);
      selection();
    }
    function change() {
      armLink(null);
      resumeAlignment();
      selection();
    }
    function measure() {
      configureLoop();
      bind();
      const first = items[0].getBoundingClientRect();
      width = first.width;
      offsets = items.map((item) => item.getBoundingClientRect().left - first.left);
      cycle = looped ? copies[items.length].getBoundingClientRect().left - first.left : 0;
      selection();
      return width;
    }
    function paint(index, markerX, trackWidth) {
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
        const overlay = link.querySelector('[data-tdb-stamp-link-overlay]');
        if (overlay) overlay.style.opacity = armed ? '1' : '';
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
        (typeof event.pointerId !== 'number' || event.pointerId === ignored.id)
      ) {
        event.preventDefault();
        return;
      }
      if (activateStamp(link, live)) event.preventDefault();
    }
    function down(event) {
      if (event.button !== 0 || event.isPrimary === false) return;
      const link = event.target.closest?.('[data-tdb-treatment-stamp]');
      pressState = { link, live: liveStamp(link) };
      stopMotion();
      automatic = false;
      suppressClick = false;
      ignoredClick = null;
      drag = {
        id: event.pointerId,
        type: event.pointerType,
        link: event.target.closest?.('[data-tdb-treatment-stamp]'),
        x: event.clientX,
        y: event.clientY,
        left: viewport.scrollLeft,
        samples: [{ x: event.clientX, t: performance.now() }],
      };
    }
    function move(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = event.clientX - drag.x;
      if (!suppressClick && Math.abs(event.clientY - drag.y) > Math.max(6, Math.abs(delta))) {
        drag = null;
        return;
      }
      if (!suppressClick && Math.abs(delta) > 6) {
        pressState = null;
        armLink(null);
        suppressClick = true;
        viewport.setPointerCapture(event.pointerId);
      }
      if (suppressClick) {
        const now = performance.now();
        // Use the recent gesture, not one noisy pointer event. Keep one
        // preceding sample to estimate velocity after a sparse move event.
        drag.samples.push({ x: event.clientX, t: now });
        while (drag.samples.length > 2 && now - drag.samples[1].t > 100) drag.samples.shift();
        setScroll(drag.left - delta);
        event.preventDefault();
      }
    }
    function up(event) {
      if (!drag || event.pointerId !== drag.id) return;
      // Touch starts with implicit capture on the image/link. Its release
      // bubbles when the viewport takes capture; the gesture is still active.
      if (event.type === 'lostpointercapture' && event.target !== viewport) return;
      const id = drag.id;
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
        suppressClick && event.type === 'pointerup'
          ? { id: drag.id, until: performance.now() + 500 }
          : null;
      if (
        suppressClick &&
        event.type === 'pointerup' &&
        performance.now() - drag.samples.at(-1).t < 90 &&
        !window.TDBMotion?.reduced?.matches
      ) {
        const first = drag.samples[0],
          last = drag.samples.at(-1);
        momentum = Math.max(
          -2.8,
          Math.min(2.8, (first.x - last.x) / Math.max(1, last.t - first.t)),
        );
        lastFrame = performance.now();
        momentumElapsed = 0;
        motionFrame = requestAnimationFrame(coast);
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
    function wheel() {
      pressState = null;
      armLink(null);
      stopMotion();
      automatic = false;
    }
    function preventDrag(event) {
      event.preventDefault();
    }
    function key(event) {
      if (event.key === 'Escape') armLink(null);
    }
    function dispose() {
      armLink(null);
      stopMotion();
      for (const [type, fn] of listeners) viewport.removeEventListener(type, fn);
      swiper?.off('slideChange', change);
      swiper?.off('beforeDestroy', dispose);
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
      ['wheel', wheel],
      ['dragstart', preventDrag],
      ['keydown', key],
      ['scroll', normalize],
    ];
    listeners.forEach(([type, fn]) => on(type, fn));
    const controller = { measure, paint, dispose };
    instances.set(root, controller);
    return controller;
  }
  return { version: '1.3.1', prepare };
})();
