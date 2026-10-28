/* Native forms remain useful before the shared runtime is released. */
function prepareJourneyLoader() {
  'use strict';
  if (window.TDBJourneyLoader || !document.querySelector('[data-tdb-journey]')) return;
  const lifecycle = new AbortController();
  let flight,
    disposed = false;
  function prepare() {
    if (disposed) return Promise.resolve();
    if (flight) return flight;
    flight = tdbEnsureFeatureCSS(
      'data-tdb-journey-css',
      'tdb-journey.css',
      '--tdb-journey-ready',
      'journey',
    )
      .then(() =>
        Promise.all([
          window.TDBModules.load(new URL('tdb-journey.js', TDBRuntimeModuleRoot), {
            ready: () => Boolean(window.TDBJourney),
          }),
          // Optional animation uses the existing registry/motion/ticker, never a second engine.
          Promise.all([
            window.TDBModules.load(new URL('tdb-motion.js', TDBRuntimeModuleRoot), {
              ready: () => Boolean(window.TDBMotion),
            }),
            window.TDBModules.load(new URL('tdb-ticker.js', TDBRuntimeModuleRoot), {
              ready: () => Boolean(window.TDBNativeTicker),
            }),
          ]).catch(() => {}),
        ]),
      )
      .then(() => {
        if (!disposed) window.TDBJourney.refresh();
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  const watch = window.TDBFeatureLoading?.watchIntent({
    selector: '[data-tdb-journey]',
    prepare,
    signal: lifecycle.signal,
  });
  document.addEventListener(
    'submit',
    (event) => {
      const root = event.target.closest?.('[data-tdb-journey]');
      if (!root || window.TDBJourney?.owns(root)) return;
      event.preventDefault();
      const value = event.target.elements.namedItem('origin')?.value || '';
      const options = {
        later: root.querySelector('[data-tdb-journey-departure]')?.value === 'later',
        when: root.querySelector('[data-tdb-journey-when]')?.value || '',
        avoid: Boolean(root.querySelector('[data-tdb-journey-avoid]')?.checked),
      };
      prepare()
        .then(() => {
          if (
            !disposed &&
            root.isConnected &&
            event.target.elements.namedItem('origin')?.value === value
          )
            window.TDBJourney.submit(root, value, options);
        })
        .catch(() => {
          const status =
            root.querySelector('[data-tdb-journey-note]') ||
            root.querySelector('[data-tdb-journey-status]');
          if (status)
            status.textContent =
              'The journey planner could not load. Please try again or open directions in Google Maps.';
        });
    },
    { capture: true, signal: lifecycle.signal },
  );
  window.TDBJourneyLoader = Object.freeze({
    refresh: () => watch?.refresh(),
    destroy() {
      disposed = true;
      lifecycle.abort();
      watch?.destroy();
      window.TDBJourney?.destroy();
    },
  });
}
