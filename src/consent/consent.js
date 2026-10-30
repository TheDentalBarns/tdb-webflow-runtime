(() => {
  'use strict';

  const VERSION = '0.7.1';
  const base = new URL('./', document.currentScript.src);
  const GA_MEASUREMENT_ID = 'G-GCWCSWR50M';
  const META_PIXEL_ID = '1326762815429148';
  const INTELLIMIZE_SRC = 'https://cdn.intellimize.co/snippet/117204709.js';

  if (window.__tdbConsentBooted) return;
  window.__tdbConsentBooted = true;

  let pendingShowSettings = false,
    gatesReady = false;
  const subscribers = new Set();
  let decisionKey = '',
    videoPresent = false,
    videoFlight = null,
    pendingVideo = null;
  const videoSelector =
    '[data-vimeo-hero-shell],[data-vimeo-ambient-init],[data-vimeo-content-init]';
  const quoteSelector = '[data-tdb-team-quotes][data-tdb-team-cms]';
  let quotePresent = false,
    quoteFlight = null;
  const pendingQuotes = new Map();
  // The map's native reserved space is also its consent entry point. This
  // belongs in foundation: the journey module may not have been released yet.
  const mapGates = new Map();
  const mapGateAttributes = ['role', 'tabindex', 'aria-label', 'aria-haspopup'];
  function syncMapGates() {
    const blocked = !allows('functionality');
    for (const [canvas, original] of mapGates) {
      if (blocked) {
        canvas.setAttribute('role', 'button');
        canvas.setAttribute('tabindex', '0');
        canvas.setAttribute('aria-label', 'Open cookie preferences to enable the interactive map');
        canvas.setAttribute('aria-haspopup', 'dialog');
      } else if (canvas.getAttribute('aria-haspopup') === 'dialog') {
        for (const [name, value] of original)
          if (value === null) canvas.removeAttribute(name);
          else canvas.setAttribute(name, value);
      }
    }
  }
  function mapConsentIntent(event) {
    if (allows('functionality')) return;
    const canvas = event.target.closest?.('[data-tdb-journey-map]');
    if (!mapGates.has(canvas)) return;
    if (
      event.type === 'keydown' &&
      (event.target !== canvas || event.repeat || !['Enter', ' '].includes(event.key))
    )
      return;
    if (event.target.closest?.('a,button,input,select,textarea')) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    showCookieSettings();
  }
  let runtimeFlight = null,
    runtimeReady = false,
    runtimeAttempts = 0,
    runtimeRetry = 0;
  function releaseRuntime() {
    if (!gatesReady || !allows() || window.CookieScript?.instance?.isOpen?.()) return;
    if (runtimeReady || runtimeFlight || runtimeRetry || runtimeAttempts >= 2) return;
    runtimeAttempts++;
    runtimeFlight = (async () => {
      if (!window.TDBModules) throw Error('Shared registry unavailable');
      await window.TDBModules.load(new URL('tdb-runtime.js', base).href, {
        attribute: 'data-tdb-runtime',
        ready: () => typeof window.TDBRuntime?.refresh === 'function',
      });
      runtimeReady = true;
    })()
      .catch((error) => {
        console.warn('TDB Runtime handoff failed:', error);
        if (runtimeAttempts < 2)
          runtimeRetry = setTimeout(() => {
            runtimeRetry = 0;
            releaseRuntime();
          }, 1000);
      })
      .finally(() => {
        runtimeFlight = null;
      });
  }

  // One permission boundary. A category alone is not a valid saved decision.
  function currentState() {
    let value;
    try {
      value = window.CookieScript?.instance?.currentState?.();
    } catch (_) {}
    const decided = value?.action === 'accept' || value?.action === 'reject';
    return {
      decided,
      action: decided ? value.action : undefined,
      categories:
        value?.action === 'accept' && Array.isArray(value.categories)
          ? value.categories.slice()
          : ['strict'],
    };
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
        attribute: 'data-tdb-vimeo-loader',
        ready: () => !!window.TDBVimeoLoader,
        timeout: 15000,
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
    })()
      .catch((error) => {
        clearVideo();
        console.warn(error.message);
        return null;
      })
      .finally(() => {
        videoFlight = null;
      });
    return videoFlight;
  }
  function settle() {
    if (!gatesReady) return;
    syncMapGates();
    if (!allows('performance')) cancelPerformanceRetries();
    const choice = currentState();
    const key = JSON.stringify([choice.action, choice.categories]);
    if (key !== decisionKey) {
      decisionKey = key;
      for (const callback of subscribers) {
        try {
          callback(choice);
        } catch (error) {
          console.warn(error.message);
        }
      }
    }
    if (allows('functionality')) releaseVideo();
    else clearVideo();
    if (allows()) releaseQuotes();
    releaseRuntime();
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
        attribute: 'data-tdb-team-quote-runtime',
        ready: () => !!window.TDBQuoteCarousel,
      });
      const quotes = window.TDBQuoteCarousel;
      if (allows()) quotes.refresh();
      while (pendingQuotes.size) {
        const [root, keys] = pendingQuotes.entries().next().value;
        pendingQuotes.delete(root);
        if (root.isConnected) await quotes.activate(root, keys);
      }
      return quotes;
    })()
      .catch((error) => {
        pendingQuotes.clear();
        console.warn(error.message);
        return null;
      })
      .finally(() => {
        quoteFlight = null;
      });
    return quoteFlight;
  }
  function quoteIntent(event) {
    const root = event.target.closest?.(quoteSelector);
    if (!root || window.TDBQuoteCarousel?.isMounted(root)) return;
    if (
      event.type === 'keydown' &&
      (event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key) ||
        event.target.closest?.(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"])',
        ))
    )
      return;
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
    const control = event.target.closest?.(
      permitted
        ? '[data-vimeo-control="play"]'
        : '[data-vimeo-control],.vimeo-player__loading,.vimeo-player__bg',
    );
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
    if (gatesReady) return;
    document.querySelectorAll('[data-tdb-journey-map]').forEach((canvas) => {
      mapGates.set(
        canvas,
        mapGateAttributes.map((name) => [name, canvas.getAttribute(name)]),
      );
    });
    if (mapGates.size) {
      document.addEventListener('click', mapConsentIntent);
      document.addEventListener('keydown', mapConsentIntent);
    }
    videoPresent = !!document.querySelector(videoSelector);
    // No video-specific observers, assets or stylesheet work before permission.
    if (videoPresent) document.addEventListener('click', videoClick, true);
    quotePresent = !!document.querySelector(quoteSelector);
    if (quotePresent) {
      ['pointerdown', 'focusin', 'keydown'].forEach((type) =>
        document.addEventListener(type, quoteIntent, true),
      );
      if (!('PointerEvent' in window))
        document.addEventListener('touchstart', quoteIntent, { capture: true, passive: true });
    }
    gatesReady = true;
    handleCookieScriptReady();
  }

  const state = {
    analytics: false,
    intellimize: false,
    meta: false,
  };

  // Keep the legacy flags as request/boot indicators; scripts exposes load outcomes.
  const performanceScripts = new Map();
  const MAX_SCRIPT_ATTEMPTS = 2,
    SCRIPT_RETRY_DELAY = 1000;

  function cancelPerformanceRetries() {
    for (const entry of performanceScripts.values()) {
      clearTimeout(entry.retryTimer);
      entry.retryTimer = 0;
    }
  }

  function requestPerformanceScript(key, src, marker) {
    if (!gatesReady || !allows('performance')) return;
    let entry = performanceScripts.get(key);
    if (!entry) {
      entry = { status: 'idle', attempts: 0, retryTimer: 0 };
      performanceScripts.set(key, entry);
    }
    if (
      entry.status === 'requested' ||
      entry.status === 'loaded' ||
      entry.status === 'existing' ||
      entry.retryTimer ||
      entry.attempts >= MAX_SCRIPT_ATTEMPTS
    )
      return;

    const existing =
      document.querySelector(`script[${marker}]`) || document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // Another owner may have finished before our listeners existed. Do not
      // claim verified readiness, replace its tag, or retry its request.
      entry.status = existing.dataset.tdbLoaded === 'true' ? 'loaded' : 'existing';
      state[key] = true;
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.charset = 'UTF-8';
    script.setAttribute(marker, 'true');
    entry.status = 'requested';
    entry.attempts++;
    state[key] = true;

    function cleanup() {
      script.removeEventListener('load', loaded);
      script.removeEventListener('error', failed);
    }
    function loaded() {
      cleanup();
      script.dataset.tdbLoaded = 'true';
      entry.status = 'loaded';
    }
    function failed() {
      cleanup();
      script.remove();
      state[key] = false;
      entry.status = 'failed';
      // Retry explicit failures only: a timeout could still execute later.
      if (entry.attempts < MAX_SCRIPT_ATTEMPTS && allows('performance')) {
        entry.retryTimer = setTimeout(() => {
          entry.retryTimer = 0;
          requestPerformanceScript(key, src, marker);
        }, SCRIPT_RETRY_DELAY);
      }
    }
    script.addEventListener('load', loaded);
    script.addEventListener('error', failed);
    document.head.appendChild(script);
  }

  function loadGoogleAnalytics() {
    const src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    const alreadyPresent = Boolean(
      document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`),
    );

    requestPerformanceScript('analytics', src, 'data-tdb-ga-js');

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
  }

  function loadIntellimize() {
    requestPerformanceScript('intellimize', INTELLIMIZE_SRC, 'data-tdb-intellimize-js');
  }

  function loadMetaPixel() {
    const alreadyBooted = typeof window.fbq === 'function';

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

    requestPerformanceScript(
      'meta',
      'https://connect.facebook.net/en_US/fbevents.js',
      'data-tdb-meta-js',
    );

    if (!alreadyBooted) {
      window.fbq('init', META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
  }

  function loadPerformanceScripts() {
    if (!gatesReady || !allows('performance')) return;
    loadGoogleAnalytics();
    loadIntellimize();
    loadMetaPixel();
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
    if (!gatesReady) return;
    if (pendingShowSettings) showCookieSettings();
    loadPerformanceScripts();
    settle();
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('#cookie-settings-link');
      if (!trigger) return;

      event.preventDefault();
      showCookieSettings();
    });

    window.addEventListener('CookieScriptLoaded', handleCookieScriptReady);

    window.addEventListener('CookieScriptAccept', handleCookieScriptReady);
    window.addEventListener('CookieScriptAcceptAll', handleCookieScriptReady);

    window.addEventListener('CookieScriptCategory-performance', loadPerformanceScripts);

    window.addEventListener('CookieScriptReject', settle);
    window.addEventListener('CookieScriptClose', settle);
    [
      'CookieScriptCurrentState',
      'CookieScriptAcceptSelection',
      'CookieScriptCategory-functionality',
    ].forEach((type) => window.addEventListener(type, settle));
  }

  bindEvents();

  window.openCookieSettingsPanel = showCookieSettings;

  window.TDBConsent = Object.freeze({
    version: VERSION,
    refresh: handleCookieScriptReady,
    currentState,
    allows,
    subscribe,
    settle,
    loadPerformanceScripts,
    status: () => ({
      ...state,
      scripts: Object.fromEntries(
        [...performanceScripts].map(([key, { status, attempts }]) => [key, { status, attempts }]),
      ),
    }),
  });

  // Detect the DOM once before the initial consent refresh. Early CookieScript
  // events are covered by this refresh; subsequent events use the same handler.
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', prepareGates, { once: true });
  else prepareGates();
})();
