(() => {
  'use strict';

  const VERSION = '0.7.1-parallel-footer';
  const FOOTER_RUNTIME_URL = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@09c99f4eb0cb8eb67ee8bf92f849a99618248e9f/dist/tdb-footer-runtime.min.js';
  let footerRuntimePromise = null;

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
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@9ecc45134d68ac301a98b60e8a8e2971894c60ab/dist/tdb-logo-marquee.js',
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

  const vimeoPromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-vimeo-js@v1.0.1/dist/vimeo-controller.min.js',
    'data-vimeo-controller-js',
  );

  const footerRuntimeReadyPromise = loadFooterRuntime();

  const ready = Promise.allSettled([
    consentPromise,
    cookieScriptPromise,
    logoMarqueePromise,
    attributionPromise,
    scrollDisablePromise,
    vimeoPromise,
    footerRuntimeReadyPromise,
  ]);

  function loadFooterRuntime() {
    if (window.TDBFooterRuntime) return Promise.resolve(window.TDBFooterRuntime);
    if (footerRuntimePromise) return footerRuntimePromise;

    footerRuntimePromise = loadScript(
      FOOTER_RUNTIME_URL,
      'data-tdb-footer-runtime-js',
      () => Boolean(window.TDBFooterRuntime),
    ).then(() => window.TDBFooterRuntime).catch(error => {
      document.querySelector('script[data-tdb-footer-runtime-js]')?.remove();
      footerRuntimePromise = null;
      console.error('TDB Footer Runtime failed to load');
      throw error;
    });

    return footerRuntimePromise;
  }

  function waitForRealVIPDrawer() {
    return new Promise((resolve, reject) => {
      let tries = 0;
      const check = () => {
        const api = window.TDBVIPDrawer;
        if (api && !api._tdbBridge) return resolve(api);
        if (++tries > 200) return reject(new Error('TDB VIP Drawer did not initialise'));
        setTimeout(check, 25);
      };
      check();
    });
  }

  function openVIPDrawer() {
    return loadFooterRuntime()
      .then(() => window.TDBVIPDrawerLoader?.load?.())
      .then(waitForRealVIPDrawer)
      .then(api => api.open());
  }

  const vipBridge = Object.freeze({
    version: 'bridge-1.0.0',
    _tdbBridge: true,
    open: openVIPDrawer,
    close: () => waitForRealVIPDrawer().then(api => api.close()),
  });

  if (!window.TDBVIPDrawer || window.TDBVIPDrawer._tdbBridge) window.TDBVIPDrawer = vipBridge;
  if (!window.TDBVIPDrawerDesktop || window.TDBVIPDrawerDesktop._tdbBridge) window.TDBVIPDrawerDesktop = vipBridge;

  const vipSelector = 'a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';

  function findVIPTrigger(event) {
    const target = event.target;
    if (target instanceof Element) {
      const match = target.closest(vipSelector);
      if (match) return match;
    }
    return event.composedPath?.().find(node => node instanceof Element && node.matches?.(vipSelector)) || null;
  }

  function onEarlyVIPClick(event) {
    if (!window.TDBVIPDrawer?._tdbBridge || !findVIPTrigger(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    openVIPDrawer().catch(() => {});
  }

  function onEarlyVIPKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    onEarlyVIPClick(event);
  }

  document.addEventListener('click', onEarlyVIPClick, true);
  document.addEventListener('keydown', onEarlyVIPKeydown, true);

  const deferredIntentSelector = 'form, .highlight-swiper_component, .parallax-swiper_component';
  function onDeferredIntent(event) {
    const target = event.target;
    if (target instanceof Element && target.closest(deferredIntentSelector)) loadFooterRuntime();
  }
  document.addEventListener('pointerdown', onDeferredIntent, true);
  document.addEventListener('focusin', onDeferredIntent, true);

  if (/^#vip/i.test(location.hash || '')) openVIPDrawer().catch(() => {});

  window.TDBImmediateRuntimeBatch = Object.freeze({
    version: VERSION,
    ready,
    loadFooterRuntime,
    status: () => ({
      consent: Boolean(window.TDBConsent),
      cookieScript: Boolean(window.CookieScript?.instance),
      cookieVersion: window.CookieScript?.instance?.version || null,
      attribution: Boolean(window.TDBAttribution),
      attributionVersion: window.TDBAttribution?.version || null,
      logoMarquee: Boolean(window.TDBLogoMarquee),
      footerRuntime: Boolean(window.TDBFooterRuntime),
      vipDrawerLoader: Boolean(window.TDBVIPDrawerLoader),
      vipDrawer: Boolean(window.TDBVIPDrawer && !window.TDBVIPDrawer._tdbBridge),
    }),
  });
})();
