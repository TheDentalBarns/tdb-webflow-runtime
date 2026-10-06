/* TDB shared motion v1.8.0. Full-motion policy, timing and reusable effects. */
(() => {
  'use strict';
  if (window.TDBMotion) return;

  // Standalone consumers share the same full-motion default as the early site policy.
  const reduced = window.TDBMotionPolicy?.reduced || Object.freeze({
    matches: false, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
  });

  const defaults = Object.freeze({
    base: 400, desktopMin: 650, desktopMax: 950, referenceWidth: 375,
    fadeOut: 120, fadeIn: 350, entryDelay: 100, ticker: 400, ddStartup: 250,
  });
  function duration(width = innerWidth) {
    return matchMedia('(min-width:992px)').matches
      ? Math.round(Math.min(defaults.desktopMax, Math.max(defaults.desktopMin, defaults.base * Math.sqrt(width / defaults.referenceWidth))))
      : defaults.base;
  }

  // Every DD mount uses this startup transition. Components supply their nodes;
  // this module does not discover pages, fetch code or decide consent permission.
  const ddNodes = new Map();
  let ddFrame = 0, ddController = null, ddReduced = null;
  function ddOpacity(progress) {
    const p = Math.max(0, Math.min(1, progress));
    return p < 0.5 ? p : p <= 0.75 ? 0.5 : 0.5 - (p - 0.75) * 1.6;
  }
  function ddSchedule() {
    if (!ddFrame && !document.hidden && ddNodes.size) ddFrame = requestAnimationFrame(ddRender);
  }
  function ddRender() {
    // An rAF timestamp can predate a busy startup frame by hundreds of ms.
    // Start from the actual first update so that frame cannot consume the fade.
    const time = performance.now();
    ddFrame = 0;
    let moving = false;
    for (const [node, state] of ddNodes) {
      if (ddReduced.matches) {
        node.style.opacity = state.original;
        state.value = Number.parseFloat(getComputedStyle(node).opacity);
        state.startup = null;
        continue;
      }
      const target = ddOpacity((innerHeight - node.getBoundingClientRect().top) / innerHeight);
      if (state.startup) {
        const startup = state.startup;
        startup.start ??= time;
        const progress = Math.min(1, (time - startup.start) / defaults.ddStartup);
        const eased = 1 - Math.pow(1 - progress, 3);
        state.value = startup.from + (target - startup.from) * eased;
        if (progress < 1) moving = true;
        else state.startup = null;
      } else {
        state.value += (target - state.value) * 0.5;
        if (Math.abs(target - state.value) < 0.001) state.value = target;
        else moving = true;
      }
      node.style.opacity = String(state.value);
    }
    if (moving) ddSchedule();
  }
  function ddText(nodes) {
    if (!ddController) {
      ddController = new AbortController();
      const { signal } = ddController;
      ddReduced = reduced;
      for (const event of ['scroll', 'resize']) window.addEventListener(event, ddSchedule, { signal, passive: true });
      document.addEventListener('visibilitychange', ddSchedule, { signal });
      ddReduced.addEventListener('change', ddSchedule, { signal });
    }
    const list = [...nodes];
    for (const node of list) {
      const state = ddNodes.get(node);
      if (state) { state.clients++; continue; }
      const original = node.style.opacity;
      const value = Number.parseFloat(getComputedStyle(node).opacity);
      ddNodes.set(node, { original, value, clients: 1, startup: ddReduced.matches ? null : { from: value, start: null } });
    }
    ddSchedule();
    let destroyed = false;
    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const node of list) {
          const state = ddNodes.get(node);
          if (state && !--state.clients) {
            node.style.opacity = state.original;
            ddNodes.delete(node);
          }
        }
        if (!ddNodes.size) {
          cancelAnimationFrame(ddFrame);
          ddFrame = 0;
          ddController.abort();
          ddController = null;
          ddReduced = null;
        }
      },
    };
  }

  // Gallery text uses view progress including the element height, and may live
  // inside a vertically scrolling case. Keep that existing curve distinct from
  // the viewport-heading curve, with one observer and frame per scrolling root.
  function ddRegion(nodes, { root = null } = {}) {
    const list = [...nodes], visible = new Set(), values = new WeakMap();
    const original = new Map(list.map(node => [node, node.style.opacity]));
    const events = new AbortController(), target = root || window;
    let frame = 0, observer = null, destroyed = false;
    const top = () => root ? root.getBoundingClientRect().top + root.clientTop : 0;
    function render() {
      frame = 0;
      if (destroyed || reduced.matches || document.hidden) return;
      const height = root ? root.clientHeight : document.documentElement.clientHeight;
      if (!height) return;
      const origin = top();
      let moving = false;
      for (const node of visible) {
        if (!node.getClientRects().length) continue;
        const rect = node.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (height - (rect.top - origin)) / (height + rect.height)));
        const previous = values.get(node) ?? 0;
        const value = Math.abs(progress - previous) < .0001 ? progress : previous + .5 * (progress - previous);
        values.set(node, value);
        node.style.opacity = String(ddOpacity(value));
        if (Math.abs(progress - value) >= .0001) moving = true;
      }
      if (moving) frame = requestAnimationFrame(render);
    }
    function schedule() {
      if (!destroyed && !reduced.matches && !document.hidden && visible.size && !frame) frame = requestAnimationFrame(render);
    }
    function reset() {
      cancelAnimationFrame(frame); frame = 0; observer?.disconnect(); visible.clear();
      list.forEach(node => { node.style.opacity = original.get(node); values.delete(node); });
      if (destroyed || reduced.matches || !window.IntersectionObserver) return;
      observer = new IntersectionObserver(entries => {
        const origin = top();
        for (const {target: node, isIntersecting} of entries) {
          if (isIntersecting) visible.add(node);
          else {
            visible.delete(node);
            const value = node.getClientRects().length && node.getBoundingClientRect().bottom <= origin ? 1 : 0;
            values.set(node, value); node.style.opacity = String(ddOpacity(value));
          }
        }
        schedule();
      }, {root});
      list.forEach(node => observer.observe(node));
    }
    const {signal} = events;
    target.addEventListener('scroll', schedule, {signal, passive: true});
    window.addEventListener('resize', schedule, {signal, passive: true});
    document.addEventListener('visibilitychange', schedule, {signal});
    reduced.addEventListener('change', reset, {signal});
    reset();
    return Object.freeze({destroy() {
      if (destroyed) return; destroyed = true; events.abort(); observer?.disconnect();
      cancelAnimationFrame(frame); visible.clear();
      list.forEach(node => { node.style.opacity = original.get(node); });
    }});
  }

  // Page-break images have one transform owner. Layout/crop stay in Designer.
  // A visible first frame is retained; only actual scrolling pays down its
  // initial offset. No animation clock, startup tween or trailing rAF loop.
  const pageBreakClients = new Map();
  function pageBreaks(wrappers) {
    const controller = new AbortController(), { signal } = controller;
    const states = [], owned = [];
    let frame = 0, layout = true, suspended = false, disposed = false, released = false;
    let lastScroll = window.scrollY, inputUntil = 0, pointerHeld = false;
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    const yOf = node => {
      const transform = getComputedStyle(node).transform;
      return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    };
    const schedule = () => {
      if (!frame && !disposed && !suspended && !document.hidden) frame = requestAnimationFrame(render);
    };
    const refresh = () => { layout = true; schedule(); };
    const input = event => {
      if (event.type === 'keydown' && (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) ||
          event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))) return;
      inputUntil = performance.now() + 2000;
      if (event.type === 'pointerdown') pointerHeld = true;
    };
    const pointerEnd = () => { pointerHeld = false; inputUntil = performance.now() + 2000; };
    function retain(state, progress, target) {
      state.correction = Math.abs(state.y - target) < 0.001 ? null : {
        anchor: progress, offset: state.y - target, weight: 1,
      };
    }
    function geometry(state) {
      const box = state.wrapper.getBoundingClientRect();
      const image = state.node.getBoundingClientRect();
      const view = window.innerHeight;
      // Subtract our translation when measuring crop. Never measure progress
      // against the moving image (which would feed back into its own progress).
      const top = image.top - state.y, bottom = image.bottom - state.y;
      const cropLow = Math.min(0, box.bottom - bottom);
      const cropHigh = Math.max(0, box.top - top);
      const low = Math.max(-view * 0.02, cropLow), high = Math.min(view * 0.02, cropHigh);
      const progress = clamp((view - box.top) / (view + box.height), 0, 1);
      return { low, high, progress, target: low + (high - low) * progress,
        visible: box.bottom > 0 && box.top < view && box.height > 0,
        signature: [box.top + window.scrollY, box.height, image.height, view, low, high],
      };
    }
    function render() {
      frame = 0;
      const scroll = window.scrollY, distance = scroll - lastScroll;
      const userScroll = distance !== 0 && (pointerHeld || performance.now() <= inputUntil);
      // Read every rect first, then write. Each wrapper is independent.
      const measurements = states.map(state => [state, geometry(state)]);
      for (const [state, g] of measurements) {
        const changed = layout || !state.geometry || g.signature.some((n, i) => Math.abs(n - state.geometry[i]) > 0.5);
        const previous = state.y;
        state.geometry = g.signature;
        state.y = clamp(state.y, g.low, g.high);
        if (!g.visible) {
          state.y = g.target;
          state.correction = null;
        } else if (changed || (distance !== 0 && !userScroll)) {
          // Resize/layout movement and browser scroll restoration are not a
          // user's first scroll pass. Rebase at the currently painted position.
          retain(state, g.progress, g.target);
        } else if (userScroll) {
          const correction = state.correction;
          if (correction) {
            // The envelope only shrinks. Reversing through the original anchor
            // never restores consumed offset or causes a discontinuity.
            const before = correction.anchor > 0 ? g.progress / correction.anchor : 1;
            const after = correction.anchor < 1 ? (1 - g.progress) / (1 - correction.anchor) : 1;
            correction.weight = clamp(Math.min(correction.weight, before, after), 0, 1);
          }
          const desired = g.target + (correction ? correction.offset * correction.weight : 0);
          // Near an exit the available distance can be tiny. Cap visible speed;
          // any last fraction is aligned on the first fully off-screen frame.
          const step = Math.abs(distance) * 0.15;
          state.y = clamp(clamp(desired, previous - step, previous + step), g.low, g.high);
          if (correction && correction.weight === 0 && Math.abs(state.y - g.target) < 0.001) state.correction = null;
        }
        if (reduced.matches) { state.y = clamp(0, g.low, g.high); state.correction = null; }
        state.progress = g.progress;
        state.visible = g.visible;
      }
      for (const state of states) {
        const value = `translate3d(0, ${state.y.toFixed(4)}px, 0)`;
        if (state.node.style.transform !== value) state.node.style.transform = value;
      }
      lastScroll = scroll;
      layout = false;
    }
    for (const wrapper of new Set(wrappers)) {
      const existing = pageBreakClients.get(wrapper);
      if (existing) { existing.clients++; owned.push(existing); continue; }
      const node = wrapper.querySelector('[data-tdb-page-break-image]') || wrapper.querySelector('img');
      if (!node) continue;
      const state = { wrapper, node, y: yOf(node), original: node.style.transform, correction: null };
      states.push(state);
      const owner = { clients: 1, wrapper, release: null, refresh };
      pageBreakClients.set(wrapper, owner);
      owned.push(owner);
    }
    let resize;
    if (states.length) {
      window.addEventListener('scroll', schedule, { passive: true, signal });
      window.addEventListener('resize', refresh, { passive: true, signal });
      window.addEventListener('pageshow', () => { suspended = false; lastScroll = window.scrollY; refresh(); }, { signal });
      window.addEventListener('pagehide', () => { suspended = true; cancelAnimationFrame(frame); frame = 0; }, { signal });
      for (const event of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'])
        window.addEventListener(event, input, { capture: true, passive: true, signal });
      for (const event of ['pointerup', 'pointercancel']) window.addEventListener(event, pointerEnd, { passive: true, signal });
      document.addEventListener('visibilitychange', refresh, { signal });
      window.addEventListener('load', refresh, { signal });
      reduced.addEventListener('change', refresh, { signal });
      if (typeof ResizeObserver !== 'undefined') {
        resize = new ResizeObserver(refresh);
        resize.observe(document.documentElement);
        if (document.body) resize.observe(document.body);
        for (const state of states) { resize.observe(state.wrapper); resize.observe(state.node); }
      }
      for (const state of states) state.node.addEventListener('load', refresh, { signal });
      document.fonts?.ready.then(() => { if (!disposed) refresh(); });
      // Apply synchronously: visible images keep their current translation;
      // off-screen images are positioned before the next paint.
      render();
    }
    function release(state) {
      const index = states.indexOf(state);
      if (index !== -1) states.splice(index, 1);
      state.node.removeEventListener('load', refresh);
      resize?.unobserve(state.wrapper); resize?.unobserve(state.node);
      state.node.style.transform = state.original;
      if (!states.length) { disposed = true; controller.abort(); resize?.disconnect(); cancelAnimationFrame(frame); frame = 0; }
    }
    for (const state of states) pageBreakClients.get(state.wrapper).release = () => release(state);
    return Object.freeze({
      refresh: () => { if (!released) for (const owner of owned) owner.refresh(); },
      status: () => states.map(state => ({ progress: state.progress, y: state.y, visible: state.visible, correcting: Boolean(state.correction) })),
      destroy() {
        if (released) return;
        released = true;
        for (const owner of owned) if (!--owner.clients) { owner.release(); pageBreakClients.delete(owner.wrapper); }
      },
    });
  }

  // Components select the appropriate choreography. These values preserve the
  // established review fades, including forward/backward and cancelled drags.
  const carousel = Object.freeze({ nextDelay: 100, previousDelay: 140, settleDelay: 60, entryStart: 120, entryRetry: 100, entryFallback: 300 });
  const reviews = Object.freeze({ fade: 400, openDelay: 500, nextDelay: carousel.nextDelay, previousDelay: carousel.previousDelay, cardDelay: carousel.settleDelay, initialDelay: 100, easing: 'ease' });
  function fadeController() {
    const states = new Map();
    function to(node, target, milliseconds = reviews.fade) {
      if (!node) return;
      const old = states.get(node);
      if (old?.target === target && (milliseconds !== 0 || !old.animation)) return;
      const from = Number.parseFloat(getComputedStyle(node).opacity) || 0;
      const original = old ? old.original : node.style.opacity;
      old?.animation?.cancel();
      node.style.opacity = String(target);
      const state = { target, original, animation: null };
      states.set(node, state);
      if (milliseconds > 0 && Math.abs(from - target) > 0.001 && node.animate) {
        const animation = node.animate([{ opacity: from }, { opacity: target }], { duration: milliseconds, easing: 'ease-out' });
        state.animation = animation;
        animation.onfinish = () => { if (states.get(node) === state) state.animation = null; };
      }
    }
    return Object.freeze({
      to,
      destroy() {
        states.forEach((state, node) => { state.animation?.cancel(); node.style.opacity = state.original; });
        states.clear();
      },
    });
  }

  // Filter-to-X visual toggle. Native SVG lines/styles define the starting artwork.
  // The consumer decides whether a filter panel exists; this helper owns only the icon.
  let filterMaskSequence = 0;
  function filterToggle(button, { onChange } = {}) {
    const lines = button ? ['top', 'middle', 'bottom'].map(part => button.querySelector('[data-tdb-filter-line="' + part + '"]')) : [];
    if (lines.length !== 3 || lines.some(line => !line)) return { set() {}, reset() {}, destroy() {} };
    const controller = new AbortController(), { signal } = controller;
    const svg = lines[0].ownerSVGElement, mask = svg.querySelector('[data-tdb-filter-mask]'), paint = svg.querySelector('[data-tdb-filter-paint]');
    // Paint currentColor once through the union of opaque strokes, avoiding alpha buildup.
    const maskId = mask?.id, paintMask = paint?.getAttribute('mask');
    if (mask && paint) { mask.id = 'tdb-filter-shape-live-' + (++filterMaskSequence); paint.setAttribute('mask', 'url(#' + mask.id + ')'); }
    const view = svg.viewBox.baseVal;
    const cx = view.x + view.width / 2, cy = view.y + view.height / 2, length = Math.min(view.width, view.height) * 0.8;
    const targets = lines.map((line, index) => {
      const x1 = +line.getAttribute('x1'), x2 = +line.getAttribute('x2');
      const y1 = +line.getAttribute('y1'), y2 = +line.getAttribute('y2');
      return index === 1 ? 'scaleX(0)' : 'translate(' + (cx - (x1 + x2) / 2) + 'px,' + (cy - (y1 + y2) / 2) + 'px) rotate(' + (index === 0 ? 45 : -45) + 'deg) scaleX(' + length / Math.hypot(x2 - x1, y2 - y1) + ')';
    });
    let pressed = false, animations = [];
    function set(value, immediate = false) {
      const current = lines.map((line, index) => {
        const transform = getComputedStyle(line).transform;
        // Keep the middle line as a scale function: a zero-width matrix is singular
        // and cannot interpolate smoothly back to the identity matrix.
        return { transform: index === 1 ? 'scaleX(' + (transform === 'none' ? 1 : new DOMMatrix(transform).a) + ')' : transform };
      });
      animations.forEach(animation => animation.cancel());
      const changed = pressed !== value;
      pressed = value; button.setAttribute('aria-pressed', String(value));
      animations = lines.map((line, index) => line.animate([current[index], {
        transform: value ? targets[index] : index === 1 ? 'scaleX(1)' : 'none'
      }], { duration: immediate || reduced.matches ? 0 : 300, easing: 'ease-in-out', fill: 'both' }));
      if (changed) onChange?.(value, immediate);
    }
    const toggle = event => {
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (button.getAttribute('aria-disabled') !== 'true') set(!pressed);
    };
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', toggle, { signal });
    button.addEventListener('keydown', toggle, { signal });
    reduced.addEventListener('change', () => set(pressed, true), { signal });
    return {
      set,
      reset(immediate = false) { if (pressed) set(false, immediate); },
      destroy() { controller.abort(); animations.forEach(animation => animation.cancel()); button.setAttribute('aria-pressed', 'false'); if (mask && paint) { mask.id = maskId; if (paintMask === null) paint.removeAttribute('mask'); else paint.setAttribute('mask', paintMask); } }
    };
  }

  // Compatibility for older immutable tdb-sliders.js pins during migration.
  // All Swiper behaviour is implemented once, inside the custom Swiper asset.
  function bindSwiper(swiper) {
    if (!window.TDBSwiper) throw Error('TDB Swiper behaviour must load before binding a slider');
    return window.TDBSwiper.bindSwiper(swiper);
  }
  window.TDBMotion = Object.freeze({ version: '1.8.0', reduced, defaults, carousel, duration, ddText, ddRegion, ddOpacity, pageBreaks, reviews, fadeController, filterToggle, bindSwiper });
})();
