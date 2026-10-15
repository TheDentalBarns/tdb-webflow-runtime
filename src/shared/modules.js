/* TDB shared dependency registry v1.7.0. Independently pinned shared releases. */
(() => {
  'use strict';
  if (window.TDBModules) return;
  const flights = new Map();
  const registry = document.currentScript;
  // Optional per-file releases keep unrelated carousel/overlay assets on their
  // existing cohort. Values are immutable commit IDs, never mutable branch names.
  let assetPins = {};
  try {
    assetPins = JSON.parse(registry?.dataset?.tdbAssetPins || '{}');
  } catch (_) {}
  assetPins = Object.freeze(
    Object.fromEntries(
      Object.entries(assetPins || {}).filter(
        ([file, pin]) => /^[a-z0-9.-]+\.(?:js|css)$/.test(file) && /^[a-f0-9]{40}$/.test(pin),
      ),
    ),
  );
  const failedNodes = new WeakSet();
  const motionRoot = registry?.src
    ? new URL(registry.dataset?.tdbMotionBase || './', registry.src)
    : null;
  // A motion-only release can retain the existing carousel URLs and cache entries.
  const carouselRoot = registry?.dataset?.tdbCarouselBase
    ? new URL(registry.dataset.tdbCarouselBase, registry.src)
    : motionRoot;
  const drawerRoot = registry?.dataset?.tdbDrawerBase
    ? new URL(registry.dataset.tdbDrawerBase, registry.src)
    : carouselRoot;
  const availabilityRoot = registry?.dataset?.tdbAvailabilityBase
    ? new URL(registry.dataset.tdbAvailabilityBase, registry.src)
    : carouselRoot;
  const availabilityFiles = new Set(['tdb-availability.js', 'tdb-review-availability.js']);
  const drawerFiles = new Set([
    'tdb-drawer.js',
    'tdb-reviews.js',
    'tdb-review-introduction.js',
    'tdb-review-cards.js',
  ]);
  const carouselFiles = new Set([
    'tdb-rendered-progress.js',
    'tdb-swiper-8.4.7.min.js',
    'tdb-motion.js',
    'tdb-parallax.js',
    'tdb-gallery.js',
    'tdb-slider-focus.js',
    'tdb-sliders.js',
    'tdb-review-quotes.js',
    'tdb-review-cards.js',
    'tdb-review-cms.js',
    'tdb-reviews.js',
    'tdb-drawer.js',
    'tdb-filters.js',
    'tdb-ticker.js',
    'tdb-logo-marquee.js',
    'tdb-review-availability.js',
  ]);
  function resolve(url) {
    let src = new URL(url, location.href).href;
    const requested = src.match(
      /^https:\/\/cdn\.jsdelivr\.net\/gh\/TheDentalBarns\/tdb-webflow-runtime@[^/]+\/dist\/([^/]+)$/,
    );
    // Motion uses this registry's release; other assets can retain a pinned base.
    // Resolve before ready/cache checks so differently
    // pinned consumers share one flight whichever component requests the engine first.
    const sharedLoader =
      document.querySelector('script[data-tdb-reviews-loader][src]') ||
      document.querySelector('script[data-tdb-logo-marquee-loader][src]');
    const shared = src.match(
      /^https:\/\/cdn\.jsdelivr\.net\/gh\/TheDentalBarns\/tdb-webflow-runtime@[^/]+\/dist\/(tdb-motion\.js|tdb-filters\.js|tdb-drawer\.js|tdb-ticker\.js|tdb-swiper-8\.4\.7\.min\.js)$/,
    );
    if (requested && assetPins[requested[1]]) {
      src =
        'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@' +
        assetPins[requested[1]] +
        '/dist/' +
        requested[1];
    } else if (availabilityRoot && requested && availabilityFiles.has(requested[1])) {
      src = new URL(requested[1], availabilityRoot).href;
    } else if (
      carouselRoot &&
      requested &&
      (carouselFiles.has(requested[1]) || drawerFiles.has(requested[1]))
    ) {
      src = new URL(
        requested[1],
        requested[1] === 'tdb-motion.js'
          ? motionRoot
          : drawerFiles.has(requested[1])
            ? drawerRoot
            : carouselRoot,
      ).href;
    } else if (sharedLoader && shared) {
      src = new URL(shared[1], sharedLoader.src).href;
    }
    return src;
  }
  function dependencyError(code, message) {
    return Object.assign(new Error(message), { code });
  }
  // A timeout does not cancel script execution. Keep the original transport until
  // it settles; only an explicit network error permits another execution attempt.
  function load(url, { attribute, ready, type = 'script', timeout = 20000 } = {}) {
    if (!['script', 'module', 'style'].includes(type))
      return Promise.reject(Error('Unknown dependency type: ' + type));
    const src = resolve(url),
      key = type + ':' + src;
    if (/\/tdb-swiper-8\.4\.7\.min\.js$/.test(src) && ready) {
      const engineReady = ready;
      ready = () =>
        engineReady() &&
        (carouselRoot ? typeof window.TDBSwiper?.create === 'function' : Boolean(window.TDBSwiper));
    }
    try {
      if (ready?.()) return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
    const previous = flights.get(key);
    if (previous) {
      if (ready && previous.complete) {
        // The tag loaded earlier, but this caller's required export is absent.
        // Do not turn a fulfilled transport promise into false readiness.
        return Promise.reject(
          dependencyError('TDB_EXPORT', 'Dependency loaded without expected export: ' + src),
        );
      }
      if (ready) previous.checks.add(ready);
      return previous.promise;
    }
    const style = type === 'style';
    const candidates = style
      ? [...document.querySelectorAll('link[rel="stylesheet"]')]
      : [...document.scripts];
    const address = (node) => (style ? node.href : node.src);
    let node =
      candidates.find((n) => !failedNodes.has(n) && address(n) === src) ||
      (attribute && document.querySelector(`${style ? 'link' : 'script'}[${attribute}]`));
    if (node && failedNodes.has(node)) node = null;
    if (node && address(node) !== src)
      return Promise.reject(Error('Conflicting dependency URL: ' + attribute));
    if (node && !style && (node.type === 'module') !== (type === 'module'))
      return Promise.reject(Error('Conflicting dependency type: ' + src));
    const fresh = !node;
    node ||= document.createElement(style ? 'link' : 'script');
    let fulfill,
      reject,
      timer,
      settled = false,
      timedOut = false;
    const promise = new Promise((a, b) => {
      fulfill = a;
      reject = b;
    });
    const entry = { promise, checks: new Set(ready ? [ready] : []), complete: false };
    flights.set(key, entry);
    function cleanup() {
      clearTimeout(timer);
      node.removeEventListener('load', done);
      node.removeEventListener('error', fail);
    }
    function invalidate() {
      failedNodes.add(node);
      if (fresh) node.remove();
      if (flights.get(key) === entry) flights.delete(key);
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      invalidate();
      reject(dependencyError('TDB_NETWORK', 'Dependency unavailable: ' + src));
    }
    function done() {
      if (settled) return;
      try {
        for (const check of entry.checks)
          if (!check())
            throw dependencyError(
              'TDB_EXPORT',
              'Dependency loaded without expected export: ' + src,
            );
      } catch (error) {
        settled = true;
        cleanup();
        entry.checks.clear();
        // The code already ran. Retain a terminal failure, not a retryable URL.
        const failure = dependencyError(
          'TDB_EXPORT',
          'Dependency loaded without expected export: ' + src,
        );
        entry.promise = Promise.reject(failure);
        entry.promise.catch(() => {});
        reject(failure);
        return;
      }
      settled = true;
      cleanup();
      entry.checks.clear();
      entry.complete = true;
      node.dataset.tdbLoaded = 'true';
      if (timedOut) entry.promise = Promise.resolve();
      fulfill();
    }
    // Keep rejected shared flights handled even when an abandoned consumer stops
    // listening; each consumer still receives the original rejected promise.
    promise.catch(() => {});
    if (node.dataset.tdbLoaded === 'true' || (style && node.sheet)) {
      done();
      return promise;
    }
    node.addEventListener('load', done, { once: true });
    node.addEventListener('error', fail, { once: true });
    timer = setTimeout(
      () => {
        timedOut = true;
        // Keep the listeners to adopt a late successful load or release an
        // explicit late network failure. Callers still receive the timeout now.
        reject(dependencyError('TDB_TIMEOUT', 'Dependency timed out: ' + src));
      },
      Number.isFinite(timeout) && timeout > 0 ? timeout : 20000,
    );
    if (fresh) {
      if (style) {
        node.rel = 'stylesheet';
        node.href = src;
      } else {
        node.src = src;
        node.async = true;
        if (type === 'module') node.type = 'module';
      }
      if (attribute) node.setAttribute(attribute, 'true');
      document.head.append(node);
    }
    return promise;
  }
  function loadWithRecovery(url, options = {}) {
    return load(url, options).catch((error) => {
      if (error.code !== 'TDB_NETWORK') throw error;
      return new Promise((resolve) => setTimeout(resolve, 250)).then(() => load(url, options));
    });
  }
  const busy = new WeakMap();
  async function withBusy(trigger, action, { signal, loading = true, onStart, onError } = {}) {
    if (signal?.aborted || trigger.getAttribute('aria-busy') === 'true') return;
    const token = {};
    busy.set(trigger, token);
    trigger.setAttribute('aria-busy', 'true');
    if (loading) trigger.setAttribute('data-tdb-loading', 'true');
    const clear = () => {
      if (busy.get(trigger) !== token) return;
      busy.delete(trigger);
      trigger.removeAttribute('aria-busy');
      if (loading) trigger.removeAttribute('data-tdb-loading');
    };
    signal?.addEventListener('abort', clear, { once: true });
    try {
      onStart?.();
      return await action();
    } catch (error) {
      if (!signal?.aborted && error.name !== 'AbortError') {
        if (onError) onError(error);
        else throw error;
      }
    } finally {
      signal?.removeEventListener('abort', clear);
      clear();
    }
  }
  window.TDBModules = Object.freeze({
    version: '1.7.0',
    load,
    loadWithRecovery,
    resolve,
    assetPins,
    withBusy,
  });
})();
