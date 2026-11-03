/* Native forms remain useful before the shared runtime is released. */
function prepareJourneyLoader() {
  'use strict';
  if (window.TDBJourneyLoader || !document.querySelector('[data-tdb-journey]')) return;
  const lifecycle = new AbortController();
  let flight,
    disposed = false;
  let focusedRoot = null,
    focusRequest = 0;
  function leaveJourney() {
    focusRequest++;
    if (focusedRoot) window.TDBSliderFocus?.release?.(focusedRoot);
    focusedRoot = null;
  }
  function focusJourney(root) {
    focusedRoot = root;
    const request = ++focusRequest;
    const visible = () => {
      if (!root.isConnected) return false;
      const rect = root.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      return rect.bottom > top && rect.top < top + (viewport?.height || window.innerHeight);
    };
    const apply = () => {
      if (!disposed && request === focusRequest && focusedRoot === root && visible())
        window.TDBSliderFocus?.focus(root, visible);
    };
    // Input focus can precede the deferred map module or its first network load.
    if (window.TDBSliderFocus) apply();
    else
      tdbEnsureSliderFocus()
        .then(apply)
        .catch(() => {});
  }
  for (const type of ['pointerdown', 'focusin'])
    document.addEventListener(
      type,
      (event) => {
        const root = event.target.closest?.('[data-tdb-journey]');
        if (root) focusJourney(root);
        else leaveJourney();
      },
      { capture: true, passive: true, signal: lifecycle.signal },
    );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') leaveJourney();
    },
    { signal: lifecycle.signal },
  );
  window.addEventListener('pagehide', leaveJourney, { signal: lifecycle.signal });
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
        appointment: root.querySelector('[data-tdb-journey-departure]')?.value === 'appointment',
        center: event.submitter?.hasAttribute('data-tdb-journey-update') || false,
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
      leaveJourney();
      lifecycle.abort();
      watch?.destroy();
      window.TDBJourney?.destroy();
    },
  });
  // The native postcode field can receive focus before the consent-released
  // runtime starts. Adopt that live focus rather than requiring another tap.
  const initialFocus = document.activeElement?.closest?.('[data-tdb-journey]');
  if (initialFocus) focusJourney(initialFocus);
}
