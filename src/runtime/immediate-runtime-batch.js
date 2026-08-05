(() => {
  'use strict';

  const VERSION = '0.5.0-attribution-intent';
  const mobileQuery = matchMedia('(max-width:767px)');
  const vipTriggerSelector =
    '#tdb-vip-drawer .tdb-vip-drawer-handle, a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';

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
  ).catch((error) => {
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
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-attribution@01237bc6785820198ea770f4abfb86f03cd40026/dist/tdb-attribution.min.js',
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

  const vipDrawerPromise =
    mobileQuery.matches && document.getElementById('tdb-vip-drawer')
      ? loadScript(
          'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.4.0/dist/tdb-vip-drawer.js',
          'data-tdb-vip-drawer-js',
          () => Boolean(window.TDBVIPDrawer),
        )
      : Promise.resolve();

  function findVipTrigger(event) {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    return target.closest(vipTriggerSelector);
  }

  function openVipAfterLoad(event) {
    if (!mobileQuery.matches || window.TDBVIPDrawer || !findVipTrigger(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    vipDrawerPromise.then(() => window.TDBVIPDrawer?.open());
  }

  function openVipAfterKey(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    openVipAfterLoad(event);
  }

  document.addEventListener('click', openVipAfterLoad, true);
  document.addEventListener('keydown', openVipAfterKey, true);

  vipDrawerPromise.finally(() => {
    document.removeEventListener('click', openVipAfterLoad, true);
    document.removeEventListener('keydown', openVipAfterKey, true);
  });

  const ready = Promise.allSettled([
    consentPromise,
    cookieScriptPromise,
    logoMarqueePromise,
    attributionPromise,
    scrollDisablePromise,
    vimeoPromise,
    vipDrawerPromise,
  ]);

  window.TDBImmediateRuntimeBatch = Object.freeze({
    version: VERSION,
    ready,
    status: () => ({
      consent: Boolean(window.TDBConsent),
      cookieScript: Boolean(window.CookieScript?.instance),
      cookieVersion: window.CookieScript?.instance?.version || null,
      attribution: Boolean(window.TDBAttribution),
      attributionVersion: window.TDBAttribution?.version || null,
      logoMarquee: Boolean(window.TDBLogoMarquee),
      vipDrawer: Boolean(window.TDBVIPDrawer),
    }),
  });
})();
