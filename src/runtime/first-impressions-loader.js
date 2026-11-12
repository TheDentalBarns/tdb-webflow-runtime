/* Definition-only. The shared consent decision and proximity gate own startup. */
function prepareFirstImpressionsFeatureLoader() {
  if (window.TDBFirstImpressionsFeatureLoader) return;
  const lifecycle = new AbortController(),
    near = new Set(),
    observed = new WeakSet();
  let flight,
    unsubscribe,
    disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
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
  function refresh() {
    if (!allowed()) return;
    document.querySelectorAll('[data-tdb-first-impressions]').forEach((root) => {
      if (observed.has(root)) return;
      observed.add(root);
      if (proximity) proximity.observe(root);
      else near.add(root);
    });
    for (const root of near) if (!root.isConnected) near.delete(root);
    if (!near.size || flight) return flight;
    flight = Promise.resolve()
      .then(() => {
        if (!allowed()) return;
        return window.TDBModules.load(new URL('tdb-first-impressions.js', TDBRuntimeModuleRoot), {
          ready: () => !!window.TDBFirstImpressions,
          attribute: 'data-tdb-first-impressions-feature',
        });
      })
      .then(() => {
        if (disposed) window.TDBFirstImpressions?.destroy();
        else if (allowed())
          return Promise.all(
            [...near].map(async (root) => {
              root.setAttribute('aria-busy', 'true');
              try {
                await window.TDBFirstImpressions?.prepare(root);
                root.removeAttribute('data-fi-error');
              } catch (error) {
                root.setAttribute('data-fi-error', '');
                throw error;
              } finally {
                root.removeAttribute('aria-busy');
              }
            }),
          );
      })
      .catch((error) => {
        if (!disposed && error.name !== 'AbortError')
          console.warn('TDB First Impressions: retaining the holding frame.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  window.TDBFirstImpressionsFeatureLoader = Object.freeze({
    refresh,
    destroy() {
      disposed = true;
      lifecycle.abort();
      proximity?.disconnect();
      unsubscribe?.();
      near.clear();
      window.TDBFirstImpressions?.destroy();
    },
  });
  for (const event of ['online', 'pageshow'])
    window.addEventListener(event, refresh, { signal: lifecycle.signal });
  for (const event of ['pointerover', 'focusin'])
    document.addEventListener(
      event,
      (event) => {
        if (event.target.closest?.('[data-tdb-first-impressions][data-fi-error]')) refresh();
      },
      { passive: true, signal: lifecycle.signal },
    );
  unsubscribe = window.TDBConsent?.subscribe(refresh);
  if (!unsubscribe) refresh();
}
