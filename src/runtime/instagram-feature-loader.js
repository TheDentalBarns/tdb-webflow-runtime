/* Definition-only. Native CMS Instagram enhancement follows the shared decision. */
function prepareInstagramFeatureLoader() {
  'use strict';
  if (window.TDBInstagramFeatureLoader) return;
  // Historical pages with an explicitly owned native build keep that controller.
  if (document.querySelector('script[data-tdb-instagram-native][src]')) return;
  const lifecycle = new AbortController();
  let flight,
    deferredFlight,
    disposed = false,
    unsubscribe;
  const near = new Set(),
    observed = new WeakSet();
  const proximity =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                near.add(entry.target);
                proximity.unobserve(entry.target);
              }
            });
            refresh();
          },
          { rootMargin: window.TDBFeatureLoading?.embedMargin || '1200px 0px' },
        )
      : null;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  function deferred() {
    document.querySelectorAll('[data-tdb-ig-placeholder]').forEach((holder) => {
      if (observed.has(holder)) return;
      observed.add(holder);
      if (proximity) proximity.observe(holder);
      else near.add(holder);
    });
    for (const holder of near) if (!holder.isConnected) near.delete(holder);
    if (!near.size || deferredFlight) return;
    for (const holder of near)
      if (holder.getAttribute('data-ig-state') !== 'ready')
        holder.setAttribute('aria-busy', 'true');
    deferredFlight = Promise.resolve()
      .then(() => {
        if (!allowed()) {
          for (const holder of near) holder.removeAttribute('aria-busy');
          return;
        }
        return window.TDBModules.load(new URL('tdb-instagram-deferred.js', TDBRuntimeModuleRoot), {
          ready: () => Boolean(window.TDBInstagramDeferred),
          attribute: 'data-tdb-instagram-deferred',
        });
      })
      .then(() => {
        if (disposed) window.TDBInstagramDeferred?.destroy();
        else if (allowed())
          return Promise.all(
            [...near].map((holder) => window.TDBInstagramDeferred?.prepare(holder)),
          );
      })
      .catch((error) => {
        if (!disposed) console.warn('TDB Instagram: retaining the holding image.', error);
      })
      .finally(() => {
        for (const holder of near) holder.removeAttribute('aria-busy');
        deferredFlight = null;
      });
    return deferredFlight;
  }
  function refresh() {
    if (!allowed()) return;
    deferred();
    if (window.TDBInstagramNative) {
      window.TDBInstagramNative.refresh();
      return;
    }
    if (flight || !document.querySelector('[data-tdb-ig-native]')) return;
    flight = Promise.resolve()
      .then(() => {
        if (!allowed()) return;
        return window.TDBModules.load(
          new URL('tdb-instagram-native.min.js', TDBRuntimeModuleRoot),
          {
            ready: () => Boolean(window.TDBInstagramNative),
            attribute: 'data-tdb-instagram-feature',
          },
        );
      })
      .then(() => {
        if (disposed) window.TDBInstagramNative?.destroy?.();
        else if (allowed()) window.TDBInstagramNative?.refresh();
      })
      .catch((error) => {
        if (!disposed) console.warn('TDB Instagram: retaining native posts.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  window.TDBInstagramFeatureLoader = Object.freeze({
    version: '1.1.0',
    refresh,
    destroy() {
      if (disposed) return;
      disposed = true;
      lifecycle.abort();
      proximity?.disconnect();
      near.clear();
      unsubscribe?.();
      window.TDBInstagramDeferred?.destroy();
      window.TDBInstagramNative?.destroy?.();
    },
  });
  for (const event of ['online', 'pageshow'])
    window.addEventListener(event, refresh, { signal: lifecycle.signal });
  for (const event of ['pointerover', 'focusin'])
    document.addEventListener(
      event,
      (e) => {
        if (e.target.closest?.('[data-tdb-ig-placeholder][data-ig-state="error"]')) refresh();
      },
      { passive: true, signal: lifecycle.signal },
    );
  unsubscribe = window.TDBConsent?.subscribe(refresh);
  if (!unsubscribe) refresh();
}
