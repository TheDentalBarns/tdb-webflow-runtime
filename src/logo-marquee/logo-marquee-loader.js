(() => {
  'use strict';
  if (window.TDBLogoMarqueeLoader) return;
  const VERSION = '1.2.0';
  const selector = '.logo-slider .partner-featured_component';
  const source = new URL('../src/logo-marquee/logo-marquee.js', document.currentScript.src).href;
  // Logo links are controls even before the lazy runtime is ready.
  // Explicit links inside a tooltip remain normal links.
  function guardLogoNavigation(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.logo-slider .partner_logos') &&
        !target.closest('.tdb-partner-source')) event.preventDefault();
  }
  document.addEventListener('click', guardLogoNavigation, true);
  document.addEventListener('auxclick', guardLogoNavigation, true);
  const nearby = new Set();
  const observed = new Set();
  let decision = false;
  let flight = null;
  let loaded = false;
  let failed = false;
  let proximity;
  let discovery;
  const controller = new AbortController();
  const signal = controller.signal;
  const completed = value => ['accept', 'reject', 'close'].includes(String(value || '').toLowerCase());

  function hasDecision() {
    try {
      if (completed(window.CookieScript?.instance?.currentState?.()?.action)) return true;
      const cookie = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('CookieScriptConsent='));
      if (!cookie) return false;
      const state = JSON.parse(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)));
      return completed(state.action || state.a);
    } catch (_) { return false; }
  }

  function sync() {
    for (const track of nearby) if (!track.isConnected) nearby.delete(track);
    if (!(decision || hasDecision()) || !nearby.size || flight || loaded) return;
    decision = true;
    if (window.TDBLogoMarquee) {
      loaded = true;
      window.TDBLogoMarquee.start?.();
      cleanupDiscovery();
      return;
    }
    failed = false;
    // The decision gate delays first-party animation; it is not marketing consent.
    // Use the shared registry so the review section and marquee reuse DD motion.
    flight = Promise.all([
      window.TDBModules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@f87c184fa42235f9cdf0c8d46cf8cac679d954fc/dist/tdb-motion.js'),
      window.TDBModules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@59026fb0b51c67513ffa4938e74340f72dcb11d5/dist/tdb-swiper-8.4.7.min.js', { ready: () => Boolean(window.TDBSwiper) })
    ]).then(() =>
      window.TDBModules.load(source, { attribute: 'data-tdb-logo-marquee-js', ready: () => Boolean(window.TDBLogoMarquee) })
    ).then(() => {
      loaded = true;
      cleanupDiscovery();
    }).catch(() => {
      failed = true;
      // Retry on a later proximity, consent, online or visibility event.
    }).finally(() => { flight = null; });
  }

  function observe(track) {
    if (observed.has(track)) return;
    observed.add(track);
    if (proximity) proximity.observe(track);
    else { nearby.add(track); sync(); }
  }
  function discover(root = document) {
    if (root instanceof Element && root.matches(selector)) observe(root);
    root.querySelectorAll?.(selector).forEach(observe);
  }
  function cleanupDiscovery() {
    proximity?.disconnect();
    discovery?.disconnect();
    nearby.clear();
    observed.clear();
    controller.abort();
  }
  function onDecision(event) {
    if (['CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'].includes(event.type)) decision = true;
    else decision = hasDecision();
    sync();
  }
  function boot() {
    if ('IntersectionObserver' in window) proximity = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? nearby.add(entry.target) : nearby.delete(entry.target));
      sync();
    }, { rootMargin: '600px 0px' });
    discover();
    discovery = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) discover(node);
    });
    discovery.observe(document.body, { childList: true, subtree: true });
    sync();
  }
  for (const event of ['CookieScriptLoaded', 'CookieScriptCurrentState', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose']) window.addEventListener(event, onDecision, { signal });
  window.addEventListener('pageshow', sync, { signal });
  window.addEventListener('online', sync, { signal });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); }, { signal });
  window.TDBLogoMarqueeLoader = Object.freeze({ version: VERSION, refresh: () => { if (loaded) window.TDBLogoMarquee.refresh(); else { discover(); sync(); } }, status: () => ({ decision: decision || hasDecision(), loaded, loading: Boolean(flight), failed, nearby: nearby.size }) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true, signal });
  else boot();
})();
