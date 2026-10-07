/* TDB shared motion v1.17.0. Full-motion policy, timing and reusable effects. */
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
    fadeOut: 120, fadeIn: 350, entryDelay: 100, ticker: 400,
  });
  function duration(width = innerWidth) {
    return matchMedia('(min-width:992px)').matches
      ? Math.round(Math.min(defaults.desktopMax, Math.max(defaults.desktopMin, defaults.base * Math.sqrt(width / defaults.referenceWidth))))
      : defaults.base;
  }

  // One opacity owner per node and one scheduler per scroll root. A visible
  // first paint is retained; scroll, rather than elapsed time, consumes the
  // initial difference. Layout changes and browser restoration rebase it.
  const ddNodes = new Map(), ddRoots = new Map();
  const saveDD = () => window.TDBDDMemory?.save(ddNodes.values());
  window.addEventListener('pagehide', saveDD);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveDD(); });
  const ddClamp = value => Math.max(0, Math.min(1, value));
  function ddOpacity(progress, preset = 'standard') {
    const p = ddClamp(progress);
    if (preset === 'orange') return p < .5 ? .3 + p * 1.4 : p <= .75 ? 1 : 1 - (p - .75) * 2;
    return p < .5 ? p : p <= .75 ? .5 : .5 - (p - .75) * 1.6;
  }
  function ddRoot(root) {
    if (ddRoots.has(root)) return ddRoots.get(root);
    const states = new Set(), events = new AbortController(), { signal } = events;
    const target = root || window, scrollTop = () => root ? root.scrollTop : window.scrollY;
    let frame = 0, layout = true, disposed = false, suspended = false;
    let lastScroll = scrollTop(), inputUntil = -1, pointerHeld = false;
    const schedule = () => {
      if (!frame && !disposed && !suspended && !document.hidden && states.size) frame = requestAnimationFrame(render);
    };
    const refresh = () => { layout = true; schedule(); };
    const input = event => {
      if (event.type === 'keydown' && (!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key) ||
          event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))) return;
      inputUntil = performance.now() + 2000;
      if (event.type === 'pointerdown') pointerHeld = true;
    };
    const pointerEnd = () => { pointerHeld = false; inputUntil = performance.now() + 2000; };
    function retain(state, progress, low = 0, high = 1, range = 1) {
      state.progress = progress;
      state.ceiling = Math.max(state.value, state.preset === 'orange' ? 1 : .5);
      state.desired = state.value;
      state.correction = { anchor: progress, low, high, range, offset: state.value - ddOpacity(progress, state.preset), weight: 1 };
    }
    function render() {
      frame = 0;
      const scroll = scrollTop(), distance = scroll - lastScroll;
      const userScroll = distance !== 0 && (pointerHeld || performance.now() <= inputUntil);
      const height = root ? root.clientHeight : window.innerHeight;
      if (!height) return;
      const origin = root ? root.getBoundingClientRect().top + root.clientTop : 0;
      const measurements = [...states].map(state => {
        const node = state.node, rect = node.getBoundingClientRect();
        const shown = node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
        const total = state.mode === 'region' ? height + rect.height : height;
        const range = state.mode === 'native' ? Math.min(height + rect.height, document.documentElement.scrollHeight) : total;
        const progress = ddClamp((height - (rect.top - origin)) / Math.max(1, range));
        const maximumScroll = Math.max(0, (root ? root.scrollHeight : document.documentElement.scrollHeight) - height);
        const low = ddClamp((height - (rect.top - origin + scroll)) / Math.max(1, range));
        const high = ddClamp((height - (rect.top - origin + scroll) + maximumScroll) / Math.max(1, range));
        return { state, shown, progress, low, high, range, visible: shown && rect.bottom > origin && rect.top < origin + height,
          signature: [rect.top - origin + scroll, rect.height, height, low, high] };
      });
      let moving = false;
      for (const g of measurements) {
        const state = g.state;
        if (!g.shown) { state.geometry = null; continue; }
        const changed = layout || !state.geometry || g.signature.some((v, i) => Math.abs(v - state.geometry[i]) > .5);
        state.geometry = g.signature;
        if (reduced.matches) {
          state.node.style.opacity = state.original;
          state.value = Number.parseFloat(getComputedStyle(state.node).opacity) || 0;
          retain(state, g.progress, g.low, g.high, g.range); continue;
        }
        if (!g.visible && !state.restored && !state.geometrySeen) {
          state.progress = g.progress; state.correction = null;
          state.value = state.desired = ddOpacity(g.progress, state.preset);
          state.ceiling = state.preset === 'orange' ? 1 : .5;
        } else if (changed || (distance !== 0 && !userScroll)) {
          retain(state, g.progress, g.low, g.high, g.range);
        } else if (userScroll) {
          if (!g.visible) {
            state.progress = g.progress; state.correction = null;
            state.value = state.desired = ddOpacity(g.progress, state.preset);
          } else {
            const c = state.correction;
            if (c) {
              // Use reachable endpoints: short case drawers and the page footer
              // may never carry a caption completely outside their viewport.
              const before = c.anchor > c.low ? (g.progress - c.low) / (c.anchor - c.low) : 1;
              const after = c.anchor < c.high ? (c.high - g.progress) / (c.high - c.anchor) : 1;
              const available = (g.progress >= c.anchor ? c.high - c.anchor : c.anchor - c.low) * c.range;
              const travel = Math.max(80, Math.min(height * .5, available));
              c.weight = ddClamp(Math.max(c.weight - Math.abs(distance) / travel, Math.min(c.weight, before, after)));
            }
            state.progress = state.mode === 'viewport' ? g.progress : state.progress + (g.progress - state.progress) * .5;
            const normal = ddOpacity(state.mode === 'viewport' ? g.progress : state.progress, state.preset);
            state.desired = Math.min(state.ceiling, ddClamp(normal + (c ? c.offset * c.weight : 0)));
          }
        } else if (!changed && Math.abs(state.progress - g.progress) >= .0001 && state.mode !== 'viewport') {
          state.progress += (g.progress - state.progress) * .5;
          if (Math.abs(g.progress - state.progress) < .0001) state.progress = g.progress;
          state.desired = Math.min(state.ceiling, ddClamp(ddOpacity(state.progress, state.preset) + (state.correction ? state.correction.offset * state.correction.weight : 0)));
        }
        // Settling is permitted only after a user scroll established a target.
        // It never pays down the startup correction by itself.
        state.value = state.mode === 'viewport' ? state.value + (state.desired - state.value) * .5 : state.desired;
        if (Math.abs(state.desired - state.value) < .0001) state.value = state.desired;
        else moving = true;
        if (Math.abs(state.progress - g.progress) >= .0001) moving = true;
        const opacity = String(ddClamp(state.value));
        if (state.node.style.opacity !== opacity) state.node.style.opacity = opacity;
      }
      for (const state of states) if (state.geometry) state.geometrySeen = true;
      lastScroll = scroll; layout = false;
      if (moving) schedule();
    }
    target.addEventListener('scroll', schedule, { signal, passive: true });
    window.addEventListener('resize', refresh, { signal, passive: true });
    window.addEventListener('load', refresh, { signal });
    window.addEventListener('pagehide', () => { suspended = true; cancelAnimationFrame(frame); frame = 0; }, { signal });
    window.addEventListener('pageshow', () => { suspended = false; pointerHeld = false; inputUntil = -1; lastScroll = scrollTop(); refresh(); }, { signal });
    document.addEventListener('visibilitychange', refresh, { signal });
    for (const name of ['wheel','touchstart','touchmove','pointerdown','keydown'])
      target.addEventListener(name, input, { signal, passive: true, capture: true });
    for (const name of ['pointerup','pointercancel']) window.addEventListener(name, pointerEnd, { signal, passive: true });
    reduced.addEventListener('change', refresh, { signal });
    let resize;
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(refresh); resize.observe(root || document.documentElement);
    }
    document.fonts?.ready.then(() => { if (!disposed) refresh(); });
    const api = { root, states, schedule, refresh, resize, destroy() {
      disposed = true; events.abort(); resize?.disconnect(); cancelAnimationFrame(frame); ddRoots.delete(root);
    }};
    ddRoots.set(root, api); return api;
  }
  function ddText(nodes, { root = null, mode = 'viewport', preset = 'standard' } = {}) {
    const list = [...new Set(nodes)];
    for (const node of list) {
      const existing = ddNodes.get(node);
      if (existing) { existing.clients++; continue; }
      const restored = window.TDBDDMemory?.take(node) || false;
      const owner = ddRoot(root), value = Number.parseFloat(getComputedStyle(node).opacity);
      const state = { node, owner, mode, preset, restored, clients: 1, original: node.style.opacity,
        value: Number.isFinite(value) ? value : 1, desired: Number.isFinite(value) ? value : 1, progress: 0, geometry: null };
      ddNodes.set(node, state); owner.states.add(state); owner.resize?.observe(node); owner.schedule();
    }
    let destroyed = false;
    return Object.freeze({ enter(nodes = list, { atPosition = false } = {}) {
      // A slide entrance is an explicit new visual state, not page restoration.
      for (const node of nodes) {
        const state = ddNodes.get(node);
        if (!state || !list.includes(node)) continue;
        let value = 1;
        if (atPosition) {
          const root = state.owner.root, rect = node.getBoundingClientRect();
          const height = root ? root.clientHeight : window.innerHeight;
          const origin = root ? root.getBoundingClientRect().top + root.clientTop : 0;
          const range = state.mode === 'viewport' ? height : state.mode === 'native'
            ? Math.min(height + rect.height, document.documentElement.scrollHeight) : height + rect.height;
          state.progress = ddClamp((height - (rect.top - origin)) / Math.max(1, range));
          value = ddOpacity(state.progress, state.preset);
        }
        state.value = state.desired = value;
        state.ceiling = Math.max(value, state.preset === 'orange' ? 1 : .5);
        state.restored = false; state.geometry = null; state.geometrySeen = true;
        node.style.opacity = String(value); state.owner.refresh();
      }
    }, refresh() { for (const node of list) ddNodes.get(node)?.owner.refresh(); }, destroy() {
      if (destroyed) return; destroyed = true;
      for (const node of list) {
        const state = ddNodes.get(node);
        if (!state || --state.clients) continue;
        node.style.opacity = state.original; state.owner.resize?.unobserve(node);
        state.owner.states.delete(state); ddNodes.delete(node);
        if (!state.owner.states.size) state.owner.destroy();
      }
    }});
  }
  function ddRegion(nodes, { root = null, preset = 'standard', mode = 'region' } = {}) {
    return ddText(nodes, { root, preset, mode });
  }

  // Scroll effects share one owner. Layout/crop/start states stay in Designer.
  // Opacity-only sections use the same progress, scheduler and reload lifecycle.
  // A visible first frame is retained; only actual scrolling pays down its
  // initial offset. No animation clock, startup tween or trailing rAF loop.
  const pageBreakClients = new Map();
  function pageBreaks(wrappers) {
    const controller = new AbortController(), { signal } = controller;
    const states = [], owned = [];
    const memory = window.TDBPageBreakMemory;
    const remember = () => memory?.save(states);
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
    function retain(state, progress, target, alpha) {
      state.correction = Math.abs(state.y - target) < 0.001 && Math.abs(state.alpha - alpha) < 0.001 ? null : {
        anchor: progress, offset: state.y - target, alpha: state.alpha - alpha, weight: 1,
      };
    }
    function curveAt(points, progress) {
      for (let i = 1; i < points.length; i++) {
        if (progress <= points[i][0]) {
          const [x, y] = points[i - 1], [nextX, nextY] = points[i];
          return y + (nextY - y) * clamp((progress - x) / (nextX - x), 0, 1);
        }
      }
      return points[points.length - 1][1];
    }
    function geometry(state) {
      const box = state.wrapper.getBoundingClientRect();
      const image = state.opacityOnly ? box : state.node.getBoundingClientRect();
      const view = window.innerHeight;
      // Subtract our translation when measuring crop. Never measure progress
      // against the moving image (which would feed back into its own progress).
      const top = image.top - state.y, bottom = image.bottom - state.y;
      const cropLow = Math.min(0, box.bottom - bottom);
      const cropHigh = Math.max(0, box.top - top);
      const pixels = value => value[0] * (value[1] === '%' ? image.height / 100 : value[1] === 'vh' ? view / 100 : 1);
      const from = clamp(pixels(state.from), cropLow, cropHigh), to = clamp(pixels(state.to), cropLow, cropHigh);
      const low = Math.min(from, to), high = Math.max(from, to);
      const progressHeight = state.imageProgress ? image.height : box.height;
      // Optional exit timing uses the native sticky frame's stable height.
      // Example: darken while 1.3 -> 1 frame-heights of the section remain.
      const frameHeight = state.exitFrame ? state.exitFrame.getBoundingClientRect().height : view;
      const progress = state.exitRange
        ? clamp((state.exitRange[0] * frameHeight - box.bottom) / Math.max(1, (state.exitRange[0] - state.exitRange[1]) * frameHeight), 0, 1)
        : clamp((view - box.top) / (view + progressHeight), 0, 1);
      return { low, high, progress, target: from + (to - from) * progress,
        alpha: state.curve ? curveAt(state.curve, progress) : state.fade ? 1 - clamp((progress - state.fade[0]) / (state.fade[1] - state.fade[0]), 0, 1) : 1,
        visible: box.bottom > 0 && box.top < view && box.height > 0,
        signature: [box.top + window.scrollY, box.height, image.height, view, low, high, frameHeight],
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
          // The browser may restore scroll after this first render. Keep the
          // prepaint snapshot until that happens or the user starts scrolling.
          if (!state.restored || userScroll) { state.y = g.target; state.alpha = g.alpha; }
          state.correction = null;
        } else if (changed || (distance !== 0 && !userScroll)) {
          // Resize/layout movement and browser scroll restoration are not a
          // user's first scroll pass. Rebase at the currently painted position.
          retain(state, g.progress, g.target, g.alpha);
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
          state.alpha = clamp(g.alpha + (correction ? correction.alpha * correction.weight : 0), 0, 1);
          // Near an exit the available distance can be tiny. Cap visible speed;
          // any last fraction is aligned on the first fully off-screen frame.
          const step = Math.abs(distance) * 0.15;
          state.y = clamp(clamp(desired, previous - step, previous + step), g.low, g.high);
          if (correction && correction.weight === 0 && Math.abs(state.y - g.target) < 0.001) state.correction = null;
        }
        if (reduced.matches) { state.y = clamp(0, g.low, g.high); state.correction = null; state.alpha = 1; }
        state.progress = g.progress;
        state.visible = g.visible;
        if (g.visible || userScroll) state.restored = false;
      }
      for (const state of states) {
        const value = `translate3d(0, ${state.y.toFixed(4)}px, 0)`;
        if (!state.opacityOnly && state.node.style.transform !== value) state.node.style.transform = value;
        state.fadeTargets.forEach((target, i) => {
          const alpha = state.fadeEnds[i] + (state.fadeFrom[i] - state.fadeEnds[i]) * state.alpha;
          const value = state.fadeProperties[i] === 'backgroundColor' ? `rgba(0, 0, 0, ${alpha})` : String(alpha);
          if (target.style[state.fadeProperties[i]] !== value) target.style[state.fadeProperties[i]] = value;
        });
      }
      lastScroll = scroll;
      layout = false;
    }
    for (const wrapper of new Set(wrappers)) {
      const existing = pageBreakClients.get(wrapper);
      if (existing) { existing.clients++; owned.push(existing); continue; }
      const opacityOnly = wrapper.getAttribute?.('data-tdb-parallax-mode') === 'opacity';
      const node = opacityOnly ? wrapper : wrapper.querySelector('[data-tdb-page-break-image]') || wrapper.querySelector('img');
      if (!node) continue;
      const distance = (name, fallback) => {
        const match = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(vh|%|px)$/.exec(wrapper.getAttribute?.(name)?.trim() || fallback);
        return match && Number.isFinite(+match[1]) ? [+match[1], match[2]] : distance('', fallback);
      };
      const fadeStart = Number.parseFloat(wrapper.getAttribute?.('data-tdb-parallax-fade-start'));
      const fadeEnd = Number.parseFloat(wrapper.getAttribute?.('data-tdb-parallax-fade-end'));
      const fade = fadeStart >= 0 && fadeEnd <= 1 && fadeEnd > fadeStart ? [fadeStart, fadeEnd] : null;
      const points = (wrapper.getAttribute?.('data-tdb-parallax-fade-curve') || '').split(',').map(pair => pair.split(':').map(Number));
      const curve = points.length > 1 && points.every((point, i) => point.length === 2 &&
        point.every(value => Number.isFinite(value) && value >= 0 && value <= 1) &&
        (!i || point[0] > points[i - 1][0])) ? points : null;
      const fadeTargets = fade || curve ? [...wrapper.querySelectorAll('[data-tdb-parallax-fade]')] : [];
      const fadeEnds = fadeTargets.map(target => {
        const value = Number.parseFloat(target.getAttribute('data-tdb-parallax-fade'));
        return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
      });
      const fadeFrom = fadeTargets.map(target => {
        const value = Number.parseFloat(target.getAttribute('data-tdb-parallax-fade-from'));
        return Number.isFinite(value) ? clamp(value, 0, 1) : 1;
      });
      const fadeProperties = fadeTargets.map(target => target.getAttribute('data-tdb-parallax-fade-property') === 'black' ? 'backgroundColor' : 'opacity');
      const painted = fadeTargets.length ? getComputedStyle(fadeTargets[0])[fadeProperties[0]] : '1';
      const initial = fadeProperties[0] === 'backgroundColor' ? (painted.startsWith('rgba') ? Number.parseFloat(painted.split(',')[3]) : 1) : Number.parseFloat(painted);
      const snapshot = memory?.take(node);
      const exitStart = Number.parseFloat(wrapper.getAttribute?.('data-tdb-parallax-exit-start'));
      const exitEnd = Number.parseFloat(wrapper.getAttribute?.('data-tdb-parallax-exit-end'));
      const exitRange = wrapper.getAttribute?.('data-tdb-parallax-progress') === 'exit' &&
        Number.isFinite(exitStart) && exitStart > exitEnd && exitEnd >= 0 ? [exitStart, exitEnd] : null;
      const state = { wrapper, node, opacityOnly, y: opacityOnly ? 0 : yOf(node), original: snapshot ? snapshot.original : node.style.transform,
        restored: Boolean(snapshot), correction: null, fade, curve, fadeTargets, fadeEnds, fadeFrom, fadeProperties,
        exitRange, exitFrame: exitRange ? wrapper.querySelector('[data-tdb-parallax-frame]') : null,
        imageProgress: wrapper.getAttribute?.('data-tdb-parallax-progress') === 'image',
        alpha: fadeTargets.length && fadeEnds[0] !== fadeFrom[0] ? clamp((initial - fadeEnds[0]) / (fadeFrom[0] - fadeEnds[0]), 0, 1) : 1,
        originalOpacity: snapshot?.originalOpacity || fadeTargets.map((target, i) => target.style[fadeProperties[i]]),
        from: opacityOnly ? [0, 'px'] : distance('data-tdb-parallax-from', '-2vh'),
        to: opacityOnly ? [0, 'px'] : distance('data-tdb-parallax-to', '2vh') };
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
      window.addEventListener('pagehide', () => { remember(); suspended = true; cancelAnimationFrame(frame); frame = 0; }, { signal });
      for (const event of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'])
        window.addEventListener(event, input, { capture: true, passive: true, signal });
      for (const event of ['pointerup', 'pointercancel']) window.addEventListener(event, pointerEnd, { passive: true, signal });
      document.addEventListener('visibilitychange', () => { if (document.hidden) remember(); else refresh(); }, { signal });
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
      if (!state.opacityOnly) state.node.style.transform = state.original;
      state.fadeTargets.forEach((target, i) => { target.style[state.fadeProperties[i]] = state.originalOpacity[i]; });
      if (!states.length) { disposed = true; controller.abort(); resize?.disconnect(); cancelAnimationFrame(frame); frame = 0; }
    }
    for (const state of states) pageBreakClients.get(state.wrapper).release = () => release(state);
    return Object.freeze({
      refresh: () => { if (!released) for (const owner of owned) owner.refresh(); },
      status: () => states.map(state => ({ progress: state.progress, y: state.y, alpha: state.alpha, visible: state.visible, correcting: Boolean(state.correction) })),
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
  window.TDBMotion = Object.freeze({ version: '1.17.0', reduced, defaults, carousel, duration, ddText, ddRegion, ddOpacity, pageBreaks, reviews, fadeController, filterToggle, bindSwiper });
})();
