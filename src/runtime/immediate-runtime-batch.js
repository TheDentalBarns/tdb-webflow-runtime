(() => {
  'use strict';

  const VERSION = '0.9.7-banner-live-dot';

  function loadScript(src, attrName, readyCheck) {
    const existing = document.querySelector(`script[${attrName}]`);
    if (existing) {
      if (!readyCheck || readyCheck()) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(existing), { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.type = 'text/javascript';
      script.charset = 'UTF-8';
      script.async = true;
      script.setAttribute(attrName, 'true');
      script.onload = () => resolve(script);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const consentPromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.3.0/dist/tdb-consent.js',
    'data-tdb-consent-js',
    () => Boolean(window.TDBConsent),
  ).catch(error => {
    console.error('TDB Consent failed to load');
    throw error;
  });

  const cookieScriptPromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/CookieScript@798b41dc10895752a232d631cf7e5232c3598673/tdb-cookie-consent.min.js',
    'data-cookie-script-js',
    () => Boolean(window.CookieScript?.instance),
  );

  const logoMarqueePromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@66a28eb999d7d001d2b69e7ce3b9fce27d63ec4e/dist/tdb-logo-marquee.js',
    'data-tdb-logo-marquee-js',
    () => Boolean(window.TDBLogoMarquee),
  );

  const attributionPromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-attribution@afee7b723073c1d3965b5a10eb29e225b7ef55c1/dist/tdb-attribution.min.js',
    'data-tdb-attribution-js',
    () => Boolean(window.TDBAttribution),
  );

  const scrollDisablePromise = loadScript(
    'https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1.6.2/scrolldisable.js',
    'data-scrolldisable-js',
  );

  function loadVimeoWhenPresent() {
    // Match the controller's complete component contract, including CMS content players.
    const component = document.querySelector(
      '[data-vimeo-hero-shell], [data-vimeo-ambient-init], [data-vimeo-player-init][data-vimeo-content-init]',
    );
    if (component) {
      const contentPlayer = document.querySelector('[data-vimeo-player-init][data-vimeo-content-init]');
      const cssReady = contentPlayer
        ? footerRuntimePromise.then(() => window.TDBFeatureCSS.contentVideo())
        : Promise.resolve();
      return cssReady.then(() => loadScript(
        'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-vimeo-js@v1.0.1/dist/vimeo-controller.min.js',
        'data-vimeo-controller-js',
      ));
    }

    // Normally this deferred runtime runs after parsing. Preserve discovery if
    // it is ever moved earlier: an unfinished document cannot prove absence.
    if (document.readyState === 'loading') {
      return new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', () => resolve(loadVimeoWhenPresent()), { once: true });
      });
    }
    return Promise.resolve(null);
  }

  const footerRuntimePromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@3447dbf609684559ecd19efc2d888b5d1d1fc4b4/dist/tdb-footer-runtime.min.js',
    'data-tdb-footer-runtime-js',
    () => Boolean(window.TDBFooterRuntime),
  );

  const vimeoPromise = loadVimeoWhenPresent();

  const priorityReady = Promise.allSettled([
    consentPromise,
    cookieScriptPromise,
    logoMarqueePromise,
    attributionPromise,
    footerRuntimePromise,
  ]);

  priorityReady.then(() => {
    window.__TDB_PRIORITY_READY__ = true;
    window.dispatchEvent(new Event('tdb:priority-ready'));
  });

  const ready = Promise.allSettled([
    consentPromise,
    cookieScriptPromise,
    logoMarqueePromise,
    attributionPromise,
    scrollDisablePromise,
    vimeoPromise,
    footerRuntimePromise,
  ]);

  window.TDBImmediateRuntimeBatch = Object.freeze({
    version: VERSION,
    priorityReady,
    ready,
    status: () => ({
      priorityReady: Boolean(window.__TDB_PRIORITY_READY__),
      consent: Boolean(window.TDBConsent),
      cookieScript: Boolean(window.CookieScript?.instance),
      cookieVersion: window.CookieScript?.instance?.version || null,
      attribution: Boolean(window.TDBAttribution),
      attributionVersion: window.TDBAttribution?.version || null,
      logoMarquee: Boolean(window.TDBLogoMarquee),
      footerRuntime: Boolean(window.TDBFooterRuntime),
      vipDrawerLoader: Boolean(window.TDBVIPDrawerLoader),
      vipDrawer: Boolean(window.TDBVIPDrawer),
    }),
  });
})();
