/* TDB shared motion v1.3.0. Timing, DD text and reusable opacity fades. */
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

  // Compatibility for older immutable tdb-sliders.js pins during migration.
  // All Swiper behaviour is implemented once, inside the custom Swiper asset.
  function bindSwiper(swiper) {
    if (!window.TDBSwiper) throw Error('TDB Swiper behaviour must load before binding a slider');
    return window.TDBSwiper.bindSwiper(swiper);
  }
  window.TDBMotion = Object.freeze({ version: '1.3.0', defaults, duration, ddText, ddOpacity, reviews, fadeController, bindSwiper });
})();
