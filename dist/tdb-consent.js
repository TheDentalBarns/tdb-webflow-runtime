(() => {
  'use strict';
  const VERSION = '0.3.0';
  const GA_MEASUREMENT_ID = 'G-GCWCSWR50M';
  const META_PIXEL_ID = '1326762815429148';
  const INTELLIMIZE_SRC = 'https://cdn.intellimize.co/snippet/117204709.js';
  const ELFSIGHT_SRC = 'https://static.elfsight.com/platform/platform.js';
  if (window.__tdbConsentBooted) return;
  window.__tdbConsentBooted = true;
  let pendingShowSettings = false;
  const state = { analytics: false, intellimize: false, meta: false, elfsight: false };
  function appendScript(src, marker, options = {}) {
    const existing = document.querySelector(`script[${marker}]`) || document.querySelector(`script[src="${src}"]`);
    if (existing) return existing;
    const script = document.createElement('script');
    script.src = src;
    script.async = options.async !== false;
    script.charset = options.charset || 'UTF-8';
    script.setAttribute(marker, 'true');
    document.head.appendChild(script);
    return script;
  }
  function loadGoogleAnalytics() {
    if (state.analytics) return;
    const src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    const alreadyPresent = Boolean(document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`));
    if (!alreadyPresent) appendScript(src, 'data-tdb-ga-js');
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() { window.dataLayer.push(arguments); };
    }
    if (!alreadyPresent && !window.__tdbGaConfigured) {
      window.__tdbGaConfigured = true;
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID);
    }
    state.analytics = true;
  }
  function loadIntellimize() {
    if (state.intellimize) return;
    appendScript(INTELLIMIZE_SRC, 'data-tdb-intellimize-js');
    state.intellimize = true;
  }
  function loadMetaPixel() {
    if (state.meta) return;
    const alreadyBooted = typeof window.fbq === 'function';
    const existingScript = document.querySelector('script[src="https://connect.facebook.net/en_US/fbevents.js"]');
    if (!alreadyBooted) {
      const fbq = function () {
        fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;
    }
    if (!existingScript) appendScript('https://connect.facebook.net/en_US/fbevents.js', 'data-tdb-meta-js');
    if (!alreadyBooted) {
      window.fbq('init', META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
    state.meta = true;
  }
  function loadPerformanceScripts() {
    loadGoogleAnalytics();
    loadIntellimize();
    loadMetaPixel();
  }
  function loadElfsight() {
    if (state.elfsight) return;
    appendScript(ELFSIGHT_SRC, 'data-tdb-elfsight-js');
    state.elfsight = true;
  }
  function hasPerformanceConsent() {
    try {
      const currentState = window.CookieScript?.instance?.currentState?.();
      return Boolean(currentState?.categories?.includes('performance'));
    } catch (error) { return false; }
  }
  function hasConsentDecisionCookie() {
    const consentCookie = document.cookie.split('; ').find(row => row.startsWith('CookieScriptConsent='));
    if (!consentCookie) return false;
    try {
      const decodedCookie = decodeURIComponent(consentCookie);
      return decodedCookie.includes('"action"') || decodedCookie.includes('"a":') || decodedCookie.includes('accept') || decodedCookie.includes('reject') || decodedCookie.includes('close');
    } catch (error) { return false; }
  }
  function showCookieSettings() {
    const show = window.CookieScript?.instance?.show;
    if (typeof show === 'function') {
      pendingShowSettings = false;
      show.call(window.CookieScript.instance);
      return true;
    }
    pendingShowSettings = true;
    return false;
  }
  function handleCookieScriptReady() {
    if (pendingShowSettings) showCookieSettings();
    if (hasPerformanceConsent()) loadPerformanceScripts();
    if (hasConsentDecisionCookie()) loadElfsight();
  }
  function bindEvents() {
    document.addEventListener('click', event => {
      const trigger = event.target.closest?.('#cookie-settings-link');
      if (!trigger) return;
      event.preventDefault();
      showCookieSettings();
    });
    window.addEventListener('CookieScriptLoaded', handleCookieScriptReady);
    window.addEventListener('CookieScriptAccept', event => {
      const categories = event?.detail?.categories || [];
      if (categories.includes('performance') || hasPerformanceConsent()) loadPerformanceScripts();
      loadElfsight();
    });
    window.addEventListener('CookieScriptAcceptAll', () => {
      loadPerformanceScripts();
      loadElfsight();
    });
    window.addEventListener('CookieScriptCategory-performance', loadPerformanceScripts);
    window.addEventListener('CookieScriptReject', loadElfsight);
    window.addEventListener('CookieScriptClose', loadElfsight);
  }
  bindEvents();
  window.openCookieSettingsPanel = showCookieSettings;
  window.TDBConsent = Object.freeze({
    version: VERSION,
    refresh: handleCookieScriptReady,
    loadElfsight,
    loadPerformanceScripts,
    status: () => ({ ...state })
  });
  if (window.CookieScript?.instance) handleCookieScriptReady();
})();
