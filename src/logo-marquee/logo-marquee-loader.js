(() => {
  'use strict';
  if (window.TDBLogoMarqueeLoader) return;
  const VERSION = '1.0.0';
  const selector = '.logo-slider .partner-featured_component';
  const source = new URL('tdb-logo-marquee.js', document.currentScript.src).href;
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
    flight = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.dataset.tdbLogoMarqueeJs = VERSION;
      script.onload = () => window.TDBLogoMarquee ? resolve() : reject(new Error('Marquee API unavailable'));
      script.onerror = () => { script.remove(); reject(new Error('Marquee download failed')); };
      document.head.append(script);
    }).then(() => {
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
