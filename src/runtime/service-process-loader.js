/* Consent-released, proximity-gated native service journeys. */
function prepareServiceProcessLoader() {
  if (window.TDBServiceProcessLoader) return;
  const pending = new Set(document.querySelectorAll('[data-tdb-service-process]'));
  if (!pending.size) return;
  const owners = new Map();
  const lifecycle = new AbortController();
  let flight,
    disposed = false;
  async function mount() {
    if (disposed || flight) return flight;
    flight = (async () => {
      await window.TDBModules.load(new URL('tdb-motion.js', TDBRuntimeModuleRoot).href, {
        ready: () => typeof window.TDBMotion?.serviceJourney === 'function',
      });
      if (disposed) return;
      for (const root of pending) {
        if (root.isConnected) owners.set(root, window.TDBMotion.serviceJourney(root));
        observer?.unobserve(root);
      }
      pending.clear();
    })()
      .catch((error) => {
        if (!disposed)
          console.warn('TDB service journey: keeping native anchor navigation.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) mount();
          },
          { rootMargin: '600px 0px' },
        )
      : null;
  window.TDBServiceProcessLoader = Object.freeze({
    refresh() {
      owners.forEach((owner) => owner.refresh());
    },
    destroy() {
      disposed = true;
      lifecycle.abort();
      observer?.disconnect();
      owners.forEach((owner) => owner.destroy());
      owners.clear();
      pending.clear();
    },
  });
  window.addEventListener(
    'online',
    () => {
      if (pending.size) mount();
    },
    { signal: lifecycle.signal },
  );
  if (observer) pending.forEach((root) => observer.observe(root));
  else mount();
}
