/* TDB shared motion v1.4.0. Timing, DD text and reusable opacity fades. */
(() => {
  'use strict';
  if (window.TDBMotion) return;

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
      ddReduced = matchMedia('(prefers-reduced-motion: reduce)');
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

  // Components select the appropriate choreography. These values preserve the
  // established review fades, including forward/backward and cancelled drags.
  const reviews = Object.freeze({ fade: 400, openDelay: 500, nextDelay: 100, previousDelay: 140, cardDelay: 60, initialDelay: 100, easing: 'ease' });
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
  function filterToggle(button) {
    const lines = button ? ['top', 'middle', 'bottom'].map(part => button.querySelector('[data-tdb-filter-line="' + part + '"]')) : [];
    if (lines.length !== 3 || lines.some(line => !line)) return { reset() {}, destroy() {} };
    const controller = new AbortController(), { signal } = controller;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const view = lines[0].ownerSVGElement.viewBox.baseVal;
    const cx = view.x + view.width / 2, cy = view.y + view.height / 2, length = Math.min(view.width, view.height) * 0.8;
    const targets = lines.map((line, index) => {
      const x1 = +line.getAttribute('x1'), x2 = +line.getAttribute('x2');
      const y1 = +line.getAttribute('y1'), y2 = +line.getAttribute('y2');
      return index === 1 ? 'none' : 'translate(' + (cx - (x1 + x2) / 2) + 'px,' + (cy - (y1 + y2) / 2) + 'px) rotate(' + (index === 0 ? 45 : -45) + 'deg) scaleX(' + length / Math.hypot(x2 - x1, y2 - y1) + ')';
    });
    let pressed = false, animations = [];
    function set(value, immediate = false) {
      const current = lines.map(line => ({ transform: getComputedStyle(line).transform, opacity: getComputedStyle(line).opacity }));
      animations.forEach(animation => animation.cancel());
      pressed = value; button.setAttribute('aria-pressed', String(value));
      animations = lines.map((line, index) => line.animate([current[index], {
        transform: value ? targets[index] : 'none', opacity: value && index === 1 ? 0 : 1
      }], { duration: immediate || reduced.matches ? 0 : 300, easing: 'ease-in-out', fill: 'both' }));
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
      reset() { if (pressed) set(false); },
      destroy() { controller.abort(); animations.forEach(animation => animation.cancel()); button.setAttribute('aria-pressed', 'false'); }
    };
  }

  // Compatibility for older immutable tdb-sliders.js pins during migration.
  // All Swiper behaviour is implemented once, inside the custom Swiper asset.
  function bindSwiper(swiper) {
    if (!window.TDBSwiper) throw Error('TDB Swiper behaviour must load before binding a slider');
    return window.TDBSwiper.bindSwiper(swiper);
  }
  window.TDBMotion = Object.freeze({ version: '1.4.0', defaults, duration, ddText, ddOpacity, reviews, fadeController, filterToggle, bindSwiper });
})();
