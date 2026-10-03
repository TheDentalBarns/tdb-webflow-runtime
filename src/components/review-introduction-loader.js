/* TDB review loader v1.0.0: permission, presence and proximity are separate gates. */
(() => {
  'use strict';
  if (window.TDBReviewIntroductionLoader) return;
  const selector = '[data-tdb-review-introduction]';
  const events = ['CookieScriptLoaded', 'CookieScriptCurrentState', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'];
  const decisions = ['accept', 'reject', 'close'];
  let singleton = null;
  function hasDecision() {
    try {
      if (decisions.includes(String(window.CookieScript?.instance?.currentState?.()?.action).toLowerCase())) return true;
      const cookie = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('CookieScriptConsent='));
      if (!cookie) return false;
      const state = JSON.parse(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)));
      return decisions.includes(String(state.action || state.a).toLowerCase());
    } catch (_) { return false; }
  }
  function start({ urls, permission, subscribe, componentOptions = {} }) {
    if (singleton) return singleton;
    if (!Array.isArray(urls) || !urls.length) throw Error('Supply immutable URLs for the ticker and component modules');
    const roots = new Map(), mounted = new Map(), controller = new AbortController();
    const { signal } = controller;
    let stopped = false, decision = hasDecision(), flight = null, loaded = false, failed = false;
    const downloads = new Map();
    const allowed = () => {
      try { return permission ? Boolean(permission()) : decision || hasDecision(); }
      catch (_) { return false; }
    };
    const load = src => {
      if (downloads.has(src)) return downloads.get(src);
      const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { downloads.delete(src); script.remove(); reject(Error('Review module failed to load')); };
      document.head.append(script);
      });
      downloads.set(src, promise);
      return promise;
    };
    function sync() {
      if (stopped) return;
      for (const root of roots.keys()) {
        if (root.isConnected) continue;
        mounted.get(root)?.destroy();
        mounted.delete(root);
        roots.delete(root);
        proximity?.unobserve(root);
      }
      if (!allowed()) {
        for (const instance of mounted.values()) instance.destroy();
        mounted.clear();
        return;
      }
      if (![...roots.values()].some(Boolean)) return;
      if (loaded) {
        for (const [root, near] of roots) if (near && !mounted.has(root)) mounted.set(root, window.TDBReviewIntroduction.mount(root, componentOptions));
        return;
      }
      if (flight) return;
      failed = false;
      // Scripts only define APIs. Permission is checked again before any mount.
      flight = (async () => {
        for (const src of urls) {
          if (stopped || !allowed()) return;
          await load(src);
        }
        if (!window.TDBNativeTicker || !window.TDBReviewIntroduction) throw Error('Review module API unavailable');
        loaded = true;
      })().catch(() => { failed = true; downloads.clear(); }).finally(() => {
        flight = null;
        if (loaded) sync();
      });
    }
    const proximity = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      entries.forEach(entry => roots.set(entry.target, entry.isIntersecting));
      sync();
    }, { rootMargin: '600px 0px' }) : null;
    function discover() {
      document.querySelectorAll(selector).forEach(root => {
        if (roots.has(root)) return;
        roots.set(root, !proximity);
        proximity?.observe(root);
      });
      sync();
    }
    const discovery = new MutationObserver(discover);
    function onConsent(event) {
      decision = ['CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'].includes(event.type) || hasDecision();
      sync();
    }
    for (const event of events) window.addEventListener(event, onConsent, { signal });
    window.addEventListener('online', sync, { signal });
    window.addEventListener('pageshow', sync, { signal });
    const unsubscribe = subscribe?.(sync);
    const api = Object.freeze({
      refresh: discover,
      status: () => ({ allowed: allowed(), loaded, loading: Boolean(flight), failed, instances: mounted.size }),
      destroy() {
        if (stopped) return;
        stopped = true;
        controller.abort();
        unsubscribe?.();
        proximity?.disconnect();
        discovery.disconnect();
        for (const instance of mounted.values()) instance.destroy();
        mounted.clear();
        roots.clear();
        singleton = null;
      }
    });
    singleton = api;
    discovery.observe(document.documentElement, { childList: true, subtree: true });
    discover();
    return api;
  }
  window.TDBReviewIntroductionLoader = Object.freeze({ version: '1.0.0', start });
})();
