(() => {
  'use strict';

  const VERSION = '0.8.17-native-scroll-staging';

  // Replace only Webflow's mobile anchor animation. Its empty-link handling
  // and the site's drawer, tab and filter click handlers remain registered.
  (window.Webflow = window.Webflow || []).push(() => {
    const wf = window.Webflow;
    const $ = window.jQuery;
    const scrollModule = wf.require?.('scroll');
    if (!$ || !scrollModule?.ready || wf.env?.('editor')) return;
    const mobile = matchMedia('(max-width: 767px)');
    let active = false;
    function sync() {
      if (mobile.matches === active) return;
      active = mobile.matches;
      if (active) $(document).off('click.wf-scroll');
      else scrollModule.ready();
      document.documentElement.dataset.tdbAnchorScroll = active ? 'native' : 'webflow';
    }
    sync();
    mobile.addEventListener('change', sync);
    // Webflow can rebind its delegated handler after our ready callback.
    // Remove that handler before this click reaches the document's bubble
    // listeners. Do not cancel propagation: target interactions and the
    // drawer's own handlers must still receive the original click.
    document.addEventListener('click', () => {
      if (mobile.matches) $(document).off('click.wf-scroll');
    }, true);
    document.addEventListener('click', event => {
      if (!active || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') ||
          (link.target && link.target !== '_self') ||
          link.closest('.w-tab-link,[data-tdb-vip-open],#tdb-vip-drawer,[role="dialog"]')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname ||
          url.search !== location.search || !url.hash || url.hash === '#' ||
          url.hash.toLowerCase() === '#vip') return;
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch (_) { return; }
      const target = document.getElementById(id);
      if (!target || !target.getClientRects().length) return;
      event.preventDefault();
      // Keep the existing fixed-header and optional centred-target contract.
      const header = document.querySelector('header, body > .header, body > .w-nav:not([data-no-scroll])');
      const offset = header && getComputedStyle(header).position === 'fixed'
        ? header.getBoundingClientRect().height : 0;
      const rect = target.getBoundingClientRect();
      let top = window.scrollY + rect.top - offset;
      if (target.dataset.scroll === 'mid' && rect.height < innerHeight - offset)
        top -= (innerHeight - offset - rect.height) / 2;
      if (location.hash !== url.hash) history.pushState({ hash: url.hash }, '', url.hash);
      const tabindex = target.getAttribute('tabindex');
      if (tabindex === null) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (tabindex === null) target.removeAttribute('tabindex');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.body.getAttribute('data-wf-scroll-motion') === 'none';
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'instant' : 'smooth' });
    });
  });

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
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@2f8ff525fc254a7524d42bf6b12db5f3e8c4d59f/dist/tdb-footer-runtime.min.js',
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
