/* Brevo website tracking v1.0.1. Uses the existing CookieScript consent controller. */
(() => {
  'use strict';
  if (window.TDBBrevoConsent) return;

  // Public website tracker key, never a Brevo API key or contact identifier.
  const CLIENT_KEY = 'hpwhoa9n2kbqn118b9von9ae';
  const SDK_SRC = 'https://cdn.brevo.com/js/sdk-loader.js';
  let started = false;
  let reloading = false;
  let status = 'blocked';

  // Missing controller state during resume/initialisation is not a saved
  // rejection. Only a complete decision can start or stop the tracker.
  function marketingConsent() {
    try {
      const consent = window.CookieScript?.instance?.currentState?.();
      if (consent?.action === 'reject') return false;
      if (consent?.action !== 'accept' || !Array.isArray(consent.categories)) return null;
      return consent.categories.includes('targeting');
    } catch (_) {
      return null;
    }
  }

  function loadBrevo() {
    if (started || reloading || marketingConsent() !== true) return;
    started = true;
    // Repeated consent notifications must never initialise a second tracker.
    if (document.querySelector('script[data-tdb-brevo-js], script#sendinblue-js') ||
        document.querySelector(`script[src="${SDK_SRC}"]`)) {
      status = 'existing';
      return;
    }
    status = 'loading';
    window.Brevo = window.Brevo || [];
    window.Brevo.push(['init', { client_key: CLIENT_KEY }]);
    // The official SDK sends one automatic page view; do not add another.
    window.Brevo.push(() => { status = 'ready'; });
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.setAttribute('data-tdb-brevo-js', '1.0.1');
    script.onerror = () => { status = 'error'; };
    document.head.appendChild(script);
  }

  function clearBrevoCookie() {
    // The current official SDK writes sib_cuid at / on the site hostname.
    const expiry = 'sib_cuid=; Max-Age=0; Path=/; SameSite=Lax';
    document.cookie = expiry;
    document.cookie = `${expiry}; Domain=${window.location.hostname}`;
  }

  function syncConsent(event) {
    const consent = event?.type === 'CookieScriptReject' ? false : marketingConsent();
    if (consent === null) return;
    if (consent) {
      loadBrevo();
      return;
    }
    clearBrevoCookie();
    if (!started || reloading) return;
    // Brevo has no documented unload API. The saved rejection survives this
    // reload, which stops the SDK and prevents it loading on the new page.
    reloading = true;
    status = 'blocked';
    window.location.reload();
  }

  window.TDBBrevoConsent = Object.freeze({
    version: '1.0.1',
    status: () => ({ state: status, consent: marketingConsent() })
  });
  for (const event of [
    'CookieScriptLoaded', 'CookieScriptCurrentState', 'CookieScriptAccept',
    'CookieScriptAcceptAll', 'CookieScriptCategory-targeting', 'CookieScriptReject'
  ]) window.addEventListener(event, syncConsent);
  // Covers a restored back/forward page and decisions changed in another tab.
  window.addEventListener('pageshow', syncConsent);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncConsent();
  });
  if (window.CookieScript?.instance) syncConsent();
})();
