/* The Home Smile feed is released by the same consent and proximity policy as IG. */
function prepareSmileFeatureLoader() {
  'use strict';
  if (window.TDBSmileFeatureLoader) return;
  const near = new Set(),
    seen = new WeakSet(),
    lifecycle = new AbortController();
  let flight,
    disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries)
              if (entry.isIntersecting) {
                near.add(entry.target);
                observer.unobserve(entry.target);
              }
            refresh();
          },
          { rootMargin: window.TDBFeatureLoading?.embedMargin || '1200px 0px' },
        )
      : null;
  function refresh() {
    if (!allowed()) {
      for (const holder of near) holder.removeAttribute('aria-busy');
      return;
    }
    document.querySelectorAll('[data-tdb-smile-placeholder]').forEach((holder) => {
      if (seen.has(holder)) return;
      seen.add(holder);
      if (observer) observer.observe(holder);
      else near.add(holder);
    });
    for (const holder of near) if (!holder.isConnected) near.delete(holder);
    if (!near.size || flight) return;
    for (const holder of near)
      if (holder.getAttribute('data-smile-state') !== 'ready')
        holder.setAttribute('aria-busy', 'true');
    flight = window.TDBModules.load(new URL('tdb-smile-feed.js', TDBRuntimeModuleRoot), {
      ready: () => Boolean(window.TDBSmileFeed),
      attribute: 'data-tdb-smile-feed-js',
    })
      .then(() => {
        if (disposed) window.TDBSmileFeed?.destroy();
        else if (allowed())
          return Promise.all([...near].map((holder) => window.TDBSmileFeed.prepare(holder)));
      })
      .catch(() => {
        if (!disposed) console.warn('TDB Smiles: retaining the holding image.');
      })
      .finally(() => {
        for (const holder of near) holder.removeAttribute('aria-busy');
        flight = null;
      });
    return flight;
  }
  const unsubscribe = window.TDBConsent?.subscribe(refresh);
  for (const type of ['online', 'pageshow'])
    window.addEventListener(type, refresh, { signal: lifecycle.signal });
  for (const type of ['pointerover', 'focusin'])
    document.addEventListener(
      type,
      (event) => {
        if (event.target.closest?.('[data-tdb-smile-placeholder][data-smile-state="error"]'))
          refresh();
      },
      { passive: true, signal: lifecycle.signal },
    );
  window.TDBSmileFeatureLoader = Object.freeze({
    refresh,
    destroy() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      unsubscribe?.();
      lifecycle.abort();
      for (const holder of near) holder.removeAttribute('aria-busy');
      near.clear();
      window.TDBSmileFeed?.destroy();
    },
  });
  if (!unsubscribe) refresh();
}
