/* The only Webflow JS entry. Start essential foundation as soon as the DOM is ready.
 * Consent releases runtime; runtime owns the existing proximity/intent gates. */
(() => {
  'use strict';
  if (window.TDBStart) return;
  let state = 'waiting',
    error = null;
  let complete;
  const ready = new Promise((resolve) => {
    complete = resolve;
  });
  window.TDBStart = Object.freeze({ ready, status: () => ({ state, error }) });
  function load() {
    if (state !== 'waiting') return;
    state = 'loading';
    window.TDBModules.loadWithRecovery(window.TDBRelease.asset('tdb-foundation.js'), {
      attribute: 'data-tdb-foundation-js',
      ready: () => Boolean(window.TDBConsent && window.TDBNavbarState),
    }).then(
      () => {
        state = 'ready';
        complete(true);
      },
      (failure) => {
        state = 'failed';
        error = failure.code || failure.message;
        console.warn('TDB startup unavailable.', failure);
        complete(false);
      },
    );
  }
  function start() {
    document.body.setAttribute('data-wf-scroll-motion', 'none');
    // Capture a held press before foundation/runtime downloads or idle startup.
    // Controller/audio fetching still waits for the consent-released runtime.
    prepareHoldAudioLoader(true);
    load();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
