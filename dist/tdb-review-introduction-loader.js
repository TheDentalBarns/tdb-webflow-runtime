/* TDB review drawer bridge v2.0.0. CMS owns content and featured-quote selection. */
(() => {
  'use strict';
  if (window.TDBReviewDrawerBridge) return;
  let base, drawerFlight;
  const assertActive = signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
  function configure({ baseURL }) { base = new URL(baseURL, location.href); }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = src; script.async = true;
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(Error('Review drawer failed to load')); };
      document.head.append(script);
    });
  }
  async function loadDrawer(signal) {
    assertActive(signal);
    if (window.TDBReviewDrawer) {
      if (window.TDBReviewDrawer.version !== '2.0.0-cms') throw Error('The previous review drawer is still active');
      return window.TDBReviewDrawer;
    }
    if (!base) throw Error('Review drawer module URL is unavailable');
    if (!drawerFlight) drawerFlight = loadScript(new URL('src/reviews/review-drawer-cms.js', base).href)
      .then(() => {
        if (window.TDBReviewDrawer?.version !== '2.0.0-cms') throw Error('CMS drawer API unavailable');
        return window.TDBReviewDrawer;
      }).catch(error => { drawerFlight = null; throw error; });
    const drawer = await drawerFlight; assertActive(signal); return drawer;
  }
  function resolveIdentity(records, root) { return window.TDBReviewCMS?.resolveIdentity(records, root) || ''; }
  async function open({ trigger, reviewId, signal }) {
    assertActive(signal);
    const service = window.TDBReviewCMS;
    if (!service) throw Error('CMS review service is unavailable');
    const { records } = await service.load({ signal });
    assertActive(signal);
    const root = trigger.closest('[data-tdb-review-introduction]');
    const preferred = reviewId || resolveIdentity(records, root);
    const drawer = await loadDrawer(signal);
    assertActive(signal);
    await drawer.open(trigger, preferred, { signal });
    if (signal?.aborted) {
      if (trigger.getAttribute('aria-expanded') === 'true') drawer.close();
      assertActive(signal);
    }
  }
  function close(root) {
    if (root?.querySelector('[data-tdb-review-trigger][aria-expanded="true"]')) window.TDBReviewDrawer?.close();
  }
  window.TDBReviewDrawerBridge = Object.freeze({ version: '2.0.0', configure, open, close, resolveIdentity });
})();

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

/* TDB Review Introduction bootstrap v2.0.0. Page uses one immutable external reference. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script?.src) return;
  const base = new URL('../', script.src);
  window.TDBReviewDrawerBridge.configure({ baseURL: base.href });
  function start() {
    if (!document.querySelector('[data-tdb-review-introduction]')) return;
    window.TDBReviewIntroductionLoader.start({
      urls: [
        new URL('src/reviews/review-cms-source.js', base).href,
        new URL('src/shared/value-tickers-native.js', base).href,
        new URL('src/components/review-introduction.js', base).href
      ],
      componentOptions: {
        openReviews: options => window.TDBReviewDrawerBridge.open(options),
        closeReviews: root => window.TDBReviewDrawerBridge.close(root)
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
