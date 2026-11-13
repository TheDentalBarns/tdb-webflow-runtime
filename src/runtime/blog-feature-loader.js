/* Definition-only. Article filters follow the shared cookie-decision gate. */
function prepareBlogFeatureLoader() {
  'use strict';
  if (window.TDBBlogFeatureLoader || !document.querySelector('[data-tdb-blog-page]')) return;
  const lifecycle = new AbortController();
  let flight,
    disposed = false,
    unsubscribe;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  function refresh() {
    if (!allowed()) {
      window.TDBBlogFilters?.destroy();
      return;
    }
    if (!flight)
      flight = window.TDBModules.load(new URL('tdb-blog.js', TDBRuntimeModuleRoot), {
        ready: () => Boolean(window.TDBBlogFilters),
      })
        .then(() => allowed() && window.TDBBlogFilters.mount())
        .catch((error) => {
          if (error.name !== 'AbortError') console.warn('TDB article filters unavailable.', error);
        })
        .finally(() => {
          flight = null;
        });
    return flight;
  }
  window.TDBBlogFeatureLoader = Object.freeze({
    refresh,
    destroy() {
      if (disposed) return;
      disposed = true;
      lifecycle.abort();
      unsubscribe?.();
      window.TDBBlogFilters?.destroy();
    },
  });
  for (const type of ['online', 'pageshow'])
    window.addEventListener(type, refresh, { signal: lifecycle.signal });
  unsubscribe = window.TDBConsent?.subscribe(refresh);
  if (!unsubscribe) refresh();
}
