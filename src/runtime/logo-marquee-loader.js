/* Started only by the consent-released runtime. Static Webflow tracks use
 * proximity discovery; refresh() explicitly discovers later DOM additions. */
(() => {
  'use strict';
  if (window.TDBLogoMarqueeLoader) return;
  const base = new URL('./', document.currentScript.src);
  const selector = '.logo-slider .partner-featured_component';
  const observed = new Set(), nearby = new Set();
  let schedule, proximity, lifecycle, flight = null;
  let started = false, loaded = false, failed = false, disposed = false;

  function cleanupDiscovery() {
    proximity?.disconnect(); proximity = null;
    observed.clear(); nearby.clear();
  }
  function prune() {
    for (const track of observed) if (!track.isConnected || !track.matches(selector)) {
      proximity?.unobserve(track); observed.delete(track); nearby.delete(track);
    }
  }
  function sync() {
    prune();
    if (disposed || !started || loaded || !nearby.size) return Promise.resolve();
    if (flight) return flight;
    failed = false;
    flight = (async () => {
      await schedule(() => {
        if (disposed) return;
        if (!window.TDBModules) throw Error('Shared registry unavailable');
        return Promise.all([
          window.TDBModules.load(new URL('tdb-motion.js', base).href, {
            ready: () => typeof window.TDBMotion?.ddText === 'function' &&
              typeof window.TDBMotion?.duration === 'function' && Boolean(window.TDBMotion?.reduced)
          }),
          window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', base).href, {
            ready: () => typeof window.TDBSwiper?.create === 'function'
          })
        ]);
      });
      if (disposed) return;
      // The module reads motion defaults at registration, so keep this order.
      await schedule(() => disposed ? null : window.TDBModules.load(new URL('tdb-logo-marquee.min.js', base).href, {
        attribute: 'data-tdb-logo-marquee-js',
        ready: () => typeof window.TDBLogoMarquee?.start === 'function' &&
          typeof window.TDBLogoMarquee?.refresh === 'function'
      }));
      if (disposed) return;
      // Network completion only registers the module. Mount on a later turn.
      await schedule(() => {
        if (disposed) return;
        window.TDBLogoMarquee.start({schedule});
        loaded = true;
        cleanupDiscovery();
      });
    })().catch(error => {
      if (!disposed) {
        failed = true;
        console.warn('TDB marquee: retaining static logos.', error);
      }
    }).finally(() => { flight = null; });
    return flight;
  }
  function refresh() {
    if (!started || disposed) return Promise.resolve();
    if (loaded) return schedule(() => { if (!disposed) return window.TDBLogoMarquee.refresh(); });
    prune();
    const tracks = document.querySelectorAll(selector);
    if (!tracks.length) { cleanupDiscovery(); return Promise.resolve(); }
    if (!proximity && 'IntersectionObserver' in window) {
      proximity = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!observed.has(entry.target)) continue;
          if (entry.isIntersecting) nearby.add(entry.target); else nearby.delete(entry.target);
        }
        sync();
      }, {rootMargin: '600px 0px'});
    }
    for (const track of tracks) {
      if (observed.has(track)) continue;
      observed.add(track);
      if (proximity) proximity.observe(track); else nearby.add(track);
    }
    if (!lifecycle) {
      lifecycle = new AbortController();
      const {signal} = lifecycle;
      window.addEventListener('pageshow', refresh, {signal});
      window.addEventListener('online', sync, {signal});
      document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); }, {signal});
    }
    return sync();
  }
  function guard(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.logo-slider .tdb-partner-logo') &&
        !target.closest('.tdb-partner-source')) event.preventDefault();
  }



  function start(options) {
    if (disposed) return;
    if (!started) {
      document.addEventListener('click', guard, true);
      document.addEventListener('auxclick', guard, true);
      schedule = options.schedule; started = true;
    }
    return document.querySelector(selector) ? schedule(refresh) : Promise.resolve();
  }
  function destroy() {
    disposed = true; lifecycle?.abort(); cleanupDiscovery();
    document.removeEventListener('click',guard,true);
    document.removeEventListener('auxclick',guard,true);
    window.TDBLogoMarquee?.destroy();
  }
  window.TDBLogoMarqueeLoader = Object.freeze({version: '2.0.0', start, refresh, destroy,
    status: () => ({started, loaded, loading: Boolean(flight), failed, nearby: nearby.size, disposed})});
})();
