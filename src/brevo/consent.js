/* Brevo website tracking. Registered by the deferred runtime; targeting is mandatory. */
function prepareBrevoConsent() {
  'use strict';
  if (window.TDBBrevoConsent || !window.TDBConsent?.subscribe) return;
  const consent = window.TDBConsent;
  const src = 'https://cdn.brevo.com/js/sdk-loader.js';
  const permitted = () => consent.allows('targeting');
  let state = 'blocked',
    attempts = 0,
    flight = null,
    retry = 0;
  let started = false,
    initialised = false,
    reloadRequested = false;

  function clearCookies() {
    const host = location.hostname;
    const root = ['thedentalbarns.co.uk', 'thedentalbarns.com'].find(
      (domain) => host === domain || host.endsWith('.' + domain),
    );
    const domains = new Set(['', host, ...(root ? [root] : [])]);
    for (const domain of domains)
      document.cookie =
        'sib_cuid=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
  }
  function sync() {
    if (permitted()) {
      if (!reloadRequested) start();
      return;
    }
    clearTimeout(retry);
    retry = 0;
    if (consent.currentState().decided || started) clearCookies();
    if (!started) {
      state = 'blocked';
      return;
    }
    // The SDK has no verified shutdown contract. Never claim that a requested
    // reload already stopped it: navigation can be cancelled by beforeunload.
    state = 'reload-required';
    if (!reloadRequested) {
      reloadRequested = true;
      window.location.reload();
    }
  }
  function start() {
    if (started || flight || retry || attempts >= 2 || reloadRequested || !permitted()) return;
    if (
      document.querySelector('script[data-tdb-brevo-js],script#sendinblue-js') ||
      [...document.scripts].some((node) => node.src === src) ||
      (Array.isArray(window.Brevo) &&
        window.Brevo.some((item) => Array.isArray(item) && item[0] === 'init'))
    ) {
      started = true;
      state = 'existing';
      return;
    }
    started = true;
    state = 'loading';
    attempts++;
    flight = (async () => {
      try {
        await window.TDBModules.load(src, { attribute: 'data-tdb-brevo-js' });
        if (!permitted() || reloadRequested) {
          sync();
          return;
        }
        // The bootstrap supports init after load. Recheck permission here so
        // a revoked request cannot enqueue tracking while navigation is pending.
        initialised = true;
        state = 'initialising';
        window.Brevo ||= [];
        window.Brevo.push(['init', { client_key: 'hpwhoa9n2kbqn118b9von9ae' }]);
        window.Brevo.push(() => {
          if (permitted() && !reloadRequested) state = 'ready';
          else sync();
        });
        document.getElementById('sendinblue-js')?.addEventListener(
          'error',
          () => {
            if (!reloadRequested) state = 'error';
          },
          { once: true },
        );
      } catch (error) {
        if (reloadRequested) return;
        state = 'error';
        // The shared registry removes a failed owned tag. Timeouts can still
        // execute late, so only an explicit network error permits a retry.
        if (/^Dependency unavailable:/.test(error.message)) {
          started = false;
          if (attempts < 2 && permitted())
            retry = setTimeout(() => {
              retry = 0;
              sync();
            }, 1000);
        }
        console.warn('TDB Brevo tracker unavailable.', error);
      }
    })().finally(() => {
      flight = null;
    });
  }
  window.TDBBrevoConsent = Object.freeze({
    version: '2.0.0',
    status: () => ({
      state,
      consent: permitted(),
      attempts,
      initialised,
      reloadRequired: reloadRequested,
    }),
  });
  consent.subscribe(sync);
  // The native consent adapter rereads the cookie, including changes made in
  // another tab. Lifecycle checks reuse that adapter rather than parsing again.
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
  });
}
