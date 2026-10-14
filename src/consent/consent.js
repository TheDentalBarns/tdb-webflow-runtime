(() => {
  'use strict';

  const VERSION = '0.6.1';
  const base = new URL('./', document.currentScript.src);
  const GA_MEASUREMENT_ID = 'G-GCWCSWR50M';
  const META_PIXEL_ID = '1326762815429148';
  const INTELLIMIZE_SRC = 'https://cdn.intellimize.co/snippet/117204709.js';

  if (window.__tdbConsentBooted) return;
  window.__tdbConsentBooted = true;

  let pendingShowSettings = false;
  const subscribers = new Set();
  let decisionKey = '', videoPresent = false, videoFlight = null, pendingVideo = null;
  const videoSelector = '[data-vimeo-hero-shell],[data-vimeo-ambient-init],[data-vimeo-content-init]';
  const quoteSelector = '[data-tdb-team-quotes][data-tdb-team-cms]';
  let quotePresent = false, quoteFlight = null;
  const pendingQuotes = new Map();

  // One permission boundary. A category alone is not a valid saved decision.
  function currentState() {
    let value;
    try { value = window.CookieScript?.instance?.currentState?.(); } catch (_) {}
    const decided = value?.action === 'accept' || value?.action === 'reject';
    return { decided, action: decided ? value.action : undefined,
      categories: value?.action === 'accept' && Array.isArray(value.categories) ? value.categories.slice() : ['strict'] };
  }
  function allows(category) {
    const choice = currentState();
    return choice.decided && (!category || choice.categories.includes(category));
  }
  function subscribe(callback) {
    subscribers.add(callback);
    callback(currentState());
    return () => subscribers.delete(callback);
  }
  function markVideo(root, state) {
    if (!root) return;
    const waiting = state !== 'idle';
    root.querySelector('[data-vimeo-control="play"]')?.setAttribute('aria-busy', String(waiting));
    if (root.matches('[data-vimeo-hero-shell]')) {
      root.setAttribute('data-vimeo-ui', state);
      root.setAttribute('data-vimeo-pulse', String(!waiting));
    } else {
      root.setAttribute('data-vimeo-loading', String(waiting));
      root.setAttribute('data-vimeo-awaiting-consent', String(state === 'awaiting-consent'));
    }
  }
  function clearVideo() {
    markVideo(pendingVideo, 'idle');
    pendingVideo = null;
  }
  function releaseVideo() {
    if (!videoPresent || !allows('functionality')) return Promise.resolve(null);
    if (videoFlight) return videoFlight;
    videoFlight = (async () => {
      if (!window.TDBModules) throw new Error('Shared dependency registry unavailable');
      await window.TDBModules.load(new URL('tdb-vimeo-loader.js', base), {
        attribute: 'data-tdb-vimeo-loader', ready: () => !!window.TDBVimeoLoader, timeout: 15000
      });
      if (!allows('functionality')) return null;
      while (pendingVideo && allows('functionality')) {
        const target = pendingVideo;
        pendingVideo = null;
        if (!target.isConnected) continue;
        target.querySelector('[data-vimeo-control="play"]')?.setAttribute('aria-busy', 'false');
        await window.TDBVimeoLoader.play(target);
      }
      return window.TDBVimeoLoader;
    })().catch(error => {
      clearVideo();
      console.warn(error.message);
      return null;
    }).finally(() => { videoFlight = null; });
    return videoFlight;
  }
  function settle() {
    const choice = currentState();
    const key = JSON.stringify([choice.action, choice.categories]);
    if (key !== decisionKey) {
      decisionKey = key;
      for (const callback of subscribers) {
        try { callback(choice); } catch (error) { console.warn(error.message); }
      }
    }
    if (allows('functionality')) releaseVideo();
    else clearVideo();
    if (allows()) releaseQuotes();
  }
  // Owner quotes are a local enhancement: either saved choice releases their
  // proximity observer. Explicit interaction can start just that quote sooner.
  function releaseQuotes() {
    if (!quotePresent || (!allows() && !pendingQuotes.size)) return Promise.resolve(null);
    if (quoteFlight) return quoteFlight;
    quoteFlight = (async () => {
      if (!window.TDBModules) throw new Error('Shared dependency registry unavailable');
      // Reviews use this same canonical URL, so concurrent consumers share one request.
      await window.TDBModules.load(new URL('tdb-quote-carousel.js', base), {
        attribute: 'data-tdb-team-quote-runtime', ready: () => !!window.TDBQuoteCarousel
      });
      const quotes = window.TDBQuoteCarousel;
      if (allows()) quotes.refresh();
      while (pendingQuotes.size) {
        const [root, keys] = pendingQuotes.entries().next().value;
        pendingQuotes.delete(root);
        if (root.isConnected) await quotes.activate(root, keys);
      }
      return quotes;
    })().catch(error => {
      pendingQuotes.clear();
      console.warn(error.message);
      return null;
    }).finally(() => { quoteFlight = null; });
    return quoteFlight;
  }
  function quoteIntent(event) {
    const root = event.target.closest?.(quoteSelector);
    if (!root || window.TDBQuoteCarousel?.isMounted(root)) return;
    if (event.type === 'keydown' && (event.altKey || event.ctrlKey || event.metaKey ||
        !['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key) ||
        event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))) return;
    const keys = pendingQuotes.get(root) || [];
    if (event.type === 'keydown' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      keys.push(event.key);
    }
    pendingQuotes.set(root, keys);
    releaseQuotes();
  }
  function videoClick(event) {
    // The denied state must work before Vimeo's controller/CSS is fetched.
    // Its spinner and circular backplate are siblings of the Play control.
    const permitted = allows('functionality');
    const control = event.target.closest?.(permitted ? '[data-vimeo-control="play"]' :
      '[data-vimeo-control],.vimeo-player__loading,.vimeo-player__bg');
    const root = control?.closest('[data-vimeo-content-init],[data-vimeo-hero-shell]');
    if (!root || (permitted && window.TDBVimeo?.initialised)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pendingVideo !== root) clearVideo();
    pendingVideo = root;
    markVideo(root, permitted ? 'loading' : 'awaiting-consent');
    if (permitted) releaseVideo();
    else showCookieSettings();
  }
  function prepareGates() {
    videoPresent = !!document.querySelector(videoSelector);
    // No video-specific observers, assets or stylesheet work before permission.
    if (videoPresent) document.addEventListener('click', videoClick, true);
    quotePresent = !!document.querySelector(quoteSelector);
    if (quotePresent) {
      ['pointerdown', 'focusin', 'keydown'].forEach(type => document.addEventListener(type, quoteIntent, true));
      if (!('PointerEvent' in window)) document.addEventListener('touchstart', quoteIntent, {capture: true, passive: true});
    }
    settle();
  }

  const state = {
    analytics: false,
    intellimize: false,
    meta: false
  };

  function appendScript(src, marker, options = {}) {
    const existing =
      document.querySelector(`script[${marker}]`) ||
      document.querySelector(`script[src="${src}"]`);

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
    const alreadyPresent = Boolean(
      document.querySelector(
        `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
      )
    );

    if (!alreadyPresent) {
      appendScript(src, 'data-tdb-ga-js');
    }

    window.dataLayer = window.dataLayer || [];

    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
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
    const existingScript = document.querySelector(
      'script[src="https://connect.facebook.net/en_US/fbevents.js"]'
    );

    if (!alreadyBooted) {
      const fbq = function () {
        fbq.callMethod
          ? fbq.callMethod.apply(fbq, arguments)
          : fbq.queue.push(arguments);
      };

      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];

      window.fbq = fbq;
      window._fbq = fbq;
    }

    if (!existingScript) {
      appendScript(
        'https://connect.facebook.net/en_US/fbevents.js',
        'data-tdb-meta-js'
      );
    }

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

  function hasPerformanceConsent() {
    try {
      const currentState = window.CookieScript?.instance?.currentState?.();
      return Boolean(currentState?.categories?.includes('performance'));
    } catch (error) {
      return false;
    }
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
    settle();
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

      if (
        categories.includes('performance') ||
        hasPerformanceConsent()
      ) {
        loadPerformanceScripts();
      }

      settle();
    });

    window.addEventListener('CookieScriptAcceptAll', () => {
      loadPerformanceScripts();
      settle();
    });

    window.addEventListener(
      'CookieScriptCategory-performance',
      loadPerformanceScripts
    );

    window.addEventListener('CookieScriptReject', settle);
    window.addEventListener('CookieScriptClose', settle);
    ['CookieScriptCurrentState','CookieScriptAcceptSelection','CookieScriptCategory-functionality']
      .forEach(type => window.addEventListener(type, settle));
  }

  bindEvents();

  window.openCookieSettingsPanel = showCookieSettings;

  window.TDBConsent = Object.freeze({
    version: VERSION,
    refresh: handleCookieScriptReady,
    currentState, allows, subscribe, settle,
    loadPerformanceScripts,
    status: () => ({ ...state })
  });

  if (window.CookieScript?.instance) {
    handleCookieScriptReady();
  }
  // Authored after the shared registry; safe for both deferred and async use.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareGates, {once: true});
  else prepareGates();
})();
