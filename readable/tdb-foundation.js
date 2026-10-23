/* All pages share this origin for announcement and public CMS JSON. */
(() => {
  const origin = 'https://tdb-public-availability.david-070.workers.dev';
  if (
    [...document.querySelectorAll('link[rel~="preconnect"]')].some(
      (link) =>
        new URL(link.href, document.baseURI).origin === origin &&
        link.hasAttribute('crossorigin') &&
        link.crossOrigin !== 'use-credentials',
    )
  )
    return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  link.setAttribute('data-tdb-content-preconnect', '');
  document.head.append(link);
})();

/* TDBScrollLock v1.0.4. Shared, independently releasable scroll-lock owners.
 * No body positioning or scroll reset: keep the document and navbar geometry.
 * Touch/wheel containment allows nested scrollers and prevents edge chaining.
 */
(() => {
  'use strict';
  if (window.TDBScrollLock) return;
  const owners = new Map();
  const html = document.documentElement;
  let previousLenis,
    touch = null;
  function roots() {
    return [...owners.values()]
      .flatMap((options) =>
        typeof options.allow === 'function' ? options.allow() : options.allow || [],
      )
      .filter(Boolean);
  }
  function canScroll(target, dx, dy) {
    const allowed = roots();
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? dx : dy;
    if (!delta) return true;
    let node = target instanceof Element ? target : target?.parentElement;
    for (
      ;
      node && allowed.some((root) => root === node || root.contains(node));
      node = node.parentElement
    ) {
      const css = getComputedStyle(node);
      if (!/(auto|scroll|overlay)/.test(horizontal ? css.overflowX : css.overflowY)) continue;
      const position = horizontal ? node.scrollLeft : node.scrollTop;
      const extent = horizontal
        ? node.scrollWidth - node.clientWidth
        : node.scrollHeight - node.clientHeight;
      if (extent > 1 && (delta < 0 ? position > 0 : position < extent - 1)) return true;
    }
    return false;
  }
  function wheel(event) {
    if (!event.ctrlKey && !canScroll(event.target, event.deltaX, event.deltaY))
      event.preventDefault();
  }
  function start(event) {
    touch =
      event.touches.length === 1 ? [event.touches[0].clientX, event.touches[0].clientY] : null;
  }
  function move(event) {
    if (!touch || event.touches.length !== 1) return;
    const point = event.touches[0];
    const dx = touch[0] - point.clientX,
      dy = touch[1] - point.clientY;
    touch = [point.clientX, point.clientY];
    if (!canScroll(event.target, dx, dy)) event.preventDefault();
  }
  function lock() {
    // Measure the unlocked page before lock writes.
    const gap = Math.max(0, innerWidth - html.clientWidth);
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    if (!document.querySelector('style[data-tdb-scroll-lock-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-tdb-scroll-lock-css', '');
      style.textContent =
        'html.tdb-scroll-locked {\n  overflow: hidden !important;\n  overscroll-behavior: none;\n}\nhtml.tdb-scroll-locked body {\n  padding-right: var(--tdb-scroll-lock-padding) !important;\n}';
      document.head.append(style);
    }
    previousLenis = document.body.getAttribute('data-lenis-prevent');
    html.style.setProperty('--tdb-scroll-lock-padding', `${padding + gap}px`);
    document.body.setAttribute('data-lenis-prevent', '');
    html.classList.add('tdb-scroll-locked');
    document.addEventListener('wheel', wheel, { capture: true, passive: false });
    document.addEventListener('touchstart', start, { capture: true, passive: true });
    document.addEventListener('touchmove', move, { capture: true, passive: false });
  }
  function unlock() {
    html.classList.remove('tdb-scroll-locked');
    html.style.removeProperty('--tdb-scroll-lock-padding');
    if (document.body.getAttribute('data-lenis-prevent') === '') {
      if (previousLenis === null) document.body.removeAttribute('data-lenis-prevent');
      else document.body.setAttribute('data-lenis-prevent', previousLenis);
    }
    document.removeEventListener('wheel', wheel, true);
    document.removeEventListener('touchstart', start, true);
    document.removeEventListener('touchmove', move, true);
    touch = null;
  }
  function acquire(options = {}) {
    const token = {};
    if (!owners.size) lock();
    owners.set(token, options);
    return () => {
      if (owners.delete(token) && !owners.size) unlock();
    };
  }
  window.TDBScrollLock = Object.freeze({
    version: '1.0.4',
    acquire,
    get active() {
      return owners.size > 0;
    },
  });
})();

/* Native TDB consent v4.0.9. Browser helper CSS is delivered by early tdb-ui.css. */
(() => {
  'use strict';
  if (window.CookieScript?.instance?.__tdbNative) return;
  const VERSION = '4.0.9',
    COOKIE_NAME = 'CookieScriptConsent',
    COOKIE_DAYS = 30,
    ALL_CATEGORIES = ['performance', 'strict', 'targeting', 'functionality'],
    STRICT_ONLY = ['strict'],
    ROOT_ID = 'tdb-consent-root',
    TEXT_OPEN_DELAY_MS = 70,
    TEXT_CLOSE_MS = 420,
    CLOSE_TOTAL_MS = 470;
  let hasShown = false,
    open = false,
    closing = false,
    mounted = false,
    lastFocus = null,
    openFrame1 = 0,
    openFrame2 = 0,
    textOpenTimer = 0,
    closeTimer = 0,
    pendingAfterClose = null,
    interactionLocked = false,
    releaseLock = null,
    refs = null,
    textAnimations = [];
  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }
  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  function normaliseCategories(value, action) {
    let categories = value;
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch {
        categories = categories.split(',');
      }
    }
    if (!Array.isArray(categories)) categories = [];
    categories = unique(categories.map(String));
    if (action === 'accept' && categories.length === 0) categories = ALL_CATEGORIES.slice();
    if (!categories.includes('strict')) categories.push('strict');
    return categories;
  }
  function readDecision() {
    const row = document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE_NAME}=`));
    if (!row)
      return {
        action: undefined,
        categories: STRICT_ONLY.slice(),
      };
    const raw = row.slice(COOKIE_NAME.length + 1);
    let data = null;
    for (const candidate of [raw, safeDecode(raw)]) {
      try {
        data = JSON.parse(candidate);
        break;
      } catch {}
    }
    if (!data || typeof data !== 'object')
      return {
        action: undefined,
        categories: STRICT_ONLY.slice(),
      };
    let action = data.action ?? data.a;
    if (action === 'acceptall') action = 'accept';
    if (!['accept', 'reject'].includes(action)) action = undefined;
    const state = {
      action: action,
      categories: normaliseCategories(data.categories ?? data.c, action),
    };
    if (data.key) state.key = data.key;
    return state;
  }
  function writeDecision(action, categories) {
    const storedCategories =
        action === 'accept' ? unique(categories.filter((category) => category !== 'strict')) : [],
      value = encodeURIComponent(
        JSON.stringify({
          action: action,
          categories: storedCategories,
          consenttime: Math.floor(Date.now() / 1e3),
        }),
      ),
      expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString(),
      secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${value}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
  }
  function dispatch(name, detail) {
    document.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        cancelable: true,
        detail: detail,
      }),
    );
  }
  function pushConsentUpdate(categories) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: `CookieScriptConsentUpdated[${categories.join(',')}]`,
    });
  }
  function dispatchState() {
    dispatch('CookieScriptCurrentState', api.currentState());
  }
  function dispatchCategories(categories) {
    categories.forEach((category) => dispatch(`CookieScriptCategory-${category}`));
  }
  function activateWithKeyboard(element, callback) {
    element.addEventListener('click', callback);
    if (element.tagName === 'BUTTON') return;
    element.addEventListener('keydown', (event) => {
      if (!['Enter', ' ', 'Spacebar'].includes(event.key)) return;
      event.preventDefault();
      callback();
    });
  }
  function cancelOpenFrames() {
    clearTimeout(textOpenTimer);
    textOpenTimer = 0;
    if (openFrame1) cancelAnimationFrame(openFrame1);
    if (openFrame2) cancelAnimationFrame(openFrame2);
    openFrame1 = openFrame2 = 0;
  }
  function clearTextAnimations() {
    textAnimations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {}
    });
    textAnimations = [];
    if (refs?.motion)
      refs.motion.getAnimations().forEach((animation) => {
        try {
          animation.cancel();
        } catch {}
      });
  }
  function resetTextState() {
    if (!refs) return;
    clearTextAnimations();
    refs.motion.classList.remove('is-consent-text-open');
    refs.motion.style.removeProperty('opacity');
    refs.motion.style.removeProperty('transform');
  }
  function animateTextOut() {
    if (!refs) return;
    const { motion } = refs,
      computed = getComputedStyle(motion),
      startTransform = computed.transform === 'none' ? 'translate3d(0,0,0)' : computed.transform,
      parsedOpacity = Number.parseFloat(computed.opacity),
      startOpacity = Number.isFinite(parsedOpacity) ? parsedOpacity : 1;
    motion.classList.remove('is-consent-text-open');
    clearTextAnimations();
    const animation = motion.animate(
      [
        {
          opacity: startOpacity,
          transform: startTransform,
          offset: 0,
        },
        {
          opacity: 0.5,
          transform: 'translate3d(0,.2rem,0)',
          offset: 0.2,
        },
        {
          opacity: 0.15,
          transform: 'translate3d(0,.45rem,0)',
          offset: 0.42,
        },
        {
          opacity: 0,
          transform: 'translate3d(0,.75rem,0)',
          offset: 0.68,
        },
        {
          opacity: 0,
          transform: 'translate3d(0,.95rem,0)',
          offset: 1,
        },
      ],
      {
        duration: TEXT_CLOSE_MS,
        easing: 'cubic-bezier(0,0,.2,1)',
        fill: 'forwards',
      },
    );
    textAnimations.push(animation);
  }
  function isEditable(target) {
    return (
      target instanceof Element &&
      (target.isContentEditable ||
        Boolean(
          target.closest('input,textarea,select,[contenteditable="true"],[contenteditable=""]'),
        ))
    );
  }
  function blockScrollKeys(event) {
    if (!interactionLocked) return;
    if (event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
    if (
      event.key === ' ' &&
      event.target instanceof Element &&
      event.target.closest('button,a,[role="button"],input')
    )
      return;
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
      event.preventDefault();
  }
  function mount() {
    if (mounted && refs) return refs;
    const root = document.getElementById(ROOT_ID);
    if (!root) return null;
    const dialog = document.getElementById('tdb-consent-dialog'),
      motion = root.querySelector('.tdb-consent-motion'),
      accept = document.getElementById('cookiescript_accept'),
      reject = document.getElementById('cookiescript_reject');
    const backdrop = root.querySelector('.tdb-consent-backdrop'),
      surface = root.querySelector('.tdb-consent-surface'),
      scroll = root.querySelector('.tdb-consent-scroll');
    if (!dialog || !motion || !accept || !reject || !backdrop || !surface || !scroll) return null;
    refs = {
      root: root,
      dialog: dialog,
      motion: motion,
      accept: accept,
      reject: reject,
      backdrop: backdrop,
      surface: surface,
      scroll: scroll,
    };
    if (!mounted) {
      activateWithKeyboard(accept, api.acceptAllAction);
      activateWithKeyboard(reject, api.rejectAllAction);
      dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        const controls = [accept, reject],
          index = controls.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          reject.focus();
        } else if (!event.shiftKey && index === controls.length - 1) {
          event.preventDefault();
          accept.focus();
        }
      });
      document.addEventListener('keydown', blockScrollKeys, true);
      mounted = true;
    }
    return refs;
  }
  function show(immediate = false) {
    const found = mount();
    if (!found) return;
    const {
      root: root,
      dialog: dialog,
      surface: surface,
      backdrop: backdrop,
      motion: motion,
      scroll: scroll,
    } = found;
    if (open && !closing && surface.classList.contains('is-consent-surface-open')) return;
    clearTimeout(closeTimer);
    closeTimer = 0;
    pendingAfterClose = null;
    cancelOpenFrames();
    // The shared lock reads page geometry; acquire before any banner writes.
    if (!releaseLock)
      releaseLock = window.TDBScrollLock.acquire({
        allow: [scroll],
      });
    if (hasShown) resetTextState();
    hasShown = true;
    if (!open) lastFocus = document.activeElement;
    open = true;
    closing = false;
    if (immediate && !document.querySelector('style[data-tdb-consent-instant-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-tdb-consent-instant-css', '');
      style.textContent =
        '[data-tdb-consent-instant] :is(\n  .tdb-consent-backdrop,\n  .tdb-consent-surface,\n  .tdb-consent-scroll,\n  .tdb-consent-motion\n) {\n  transition: none !important;\n  animation: none !important;\n}';
      document.head.append(style);
    }
    root.toggleAttribute('data-tdb-consent-instant', immediate === true);
    root.setAttribute('aria-hidden', 'false');
    root.classList.add('is-consent-active');
    root.inert = false;
    dialog.style.removeProperty('pointer-events');
    surface.classList.remove('is-consent-surface-open');
    scroll.classList.remove('is-consent-content-open');
    backdrop.classList.remove('is-consent-open');
    interactionLocked = true;
    if (immediate === true) {
      // The first visit has no entrance delay or moving surface/text.
      surface.classList.add('is-consent-surface-open');
      scroll.classList.add('is-consent-content-open');
      backdrop.classList.add('is-consent-open');
      motion.classList.add('is-consent-text-open');
      dialog.focus({ preventScroll: true });
      return;
    }
    openFrame1 = requestAnimationFrame(() => {
      openFrame1 = 0;
      if (!open || closing) return;
      openFrame2 = requestAnimationFrame(() => {
        openFrame2 = 0;
        if (!open || closing) return;
        dialog.focus({
          preventScroll: true,
        });
        surface.classList.add('is-consent-surface-open');
        // Reveal text only where the moving cream surface already covers it.
        scroll.classList.add('is-consent-content-open');
        backdrop.classList.add('is-consent-open');
        // Designer export omits transition-delay; preserve the original pause here.
        textOpenTimer = setTimeout(() => {
          textOpenTimer = 0;
          if (open && !closing) motion.classList.add('is-consent-text-open');
        }, TEXT_OPEN_DELAY_MS);
      });
    });
  }
  function finishHide() {
    if (!refs) return;
    const { root } = refs;
    resetTextState();
    root.classList.remove('is-consent-active');
    root.removeAttribute('data-tdb-consent-instant');
    refs.surface.classList.remove('is-consent-surface-open');
    refs.scroll.classList.remove('is-consent-content-open');
    refs.backdrop.classList.remove('is-consent-open');
    root.inert = true;
    root.setAttribute('aria-hidden', 'true');
    interactionLocked = false;
    if (releaseLock) {
      releaseLock();
      releaseLock = null;
    }
    open = false;
    closing = false;
    const afterClose = pendingAfterClose;
    pendingAfterClose = null;
    if (lastFocus instanceof HTMLElement && document.contains(lastFocus))
      lastFocus.focus({
        preventScroll: true,
      });
    if (typeof afterClose === 'function') afterClose();
    // hide() has no CookieScriptClose event in the compatibility contract.
    // Still settle a pending video request when settings were simply closed.
    window.TDBConsent?.settle?.();
  }
  function hide(afterClose) {
    const found = mount();
    if (!found) {
      if (typeof afterClose === 'function') afterClose();
      return;
    }
    const { root: root, surface: surface, backdrop: backdrop } = found;
    if (closing) return;
    cancelOpenFrames();
    clearTimeout(closeTimer);
    pendingAfterClose = typeof afterClose === 'function' ? afterClose : null;
    if (!root.classList.contains('is-consent-active')) {
      finishHide();
      return;
    }
    closing = true;
    // Restore the existing close transition before changing its visual state.
    root.removeAttribute('data-tdb-consent-instant');
    animateTextOut();
    refs.dialog.style.pointerEvents = 'none';
    surface.classList.remove('is-consent-surface-open');
    refs.scroll.classList.remove('is-consent-content-open');
    backdrop.classList.remove('is-consent-open');
    closeTimer = setTimeout(finishHide, CLOSE_TOTAL_MS);
  }
  function acceptAll() {
    if (closing) return;
    writeDecision('accept', ALL_CATEGORIES);
    hide(() => {
      api.onAcceptAll();
      dispatch('CookieScriptAcceptAll');
      dispatchState();
      dispatchCategories(ALL_CATEGORIES);
      pushConsentUpdate(ALL_CATEGORIES);
    });
  }
  function rejectAll() {
    if (closing) return;
    writeDecision('reject', STRICT_ONLY);
    hide(() => {
      api.onReject();
      dispatch('CookieScriptReject');
      dispatchState();
      dispatchCategories(STRICT_ONLY);
      pushConsentUpdate(STRICT_ONLY);
    });
  }
  const api = {
    __tdbLite: true,
    __tdbNative: true,
    version: VERSION,
    onAcceptAll() {},
    onAccept() {},
    onReject() {},
    onClose() {},
    dispatchEventNames: [],
    currentState: readDecision,
    // Remain the top dialog until the existing closing motion has finished.
    isOpen: () => open,
    categories: () => ALL_CATEGORIES.slice(),
    expireDays: () => COOKIE_DAYS,
    hash: () => `tdb-cookie-consent-lite-${VERSION}`,
    show: show,
    showDetails: show,
    hide: () => hide(() => api.onClose()),
    acceptAllAction: acceptAll,
    rejectAllAction: rejectAll,
    acceptAction(categories) {
      if (Array.isArray(categories) && categories.includes('performance')) acceptAll();
      else rejectAll();
    },
    applyCurrentCookiesState: dispatchState,
    forceDispatchCSLoadEvent() {
      dispatch('CookieScriptLoaded');
    },
    getCookieValueForQueryArg() {
      const row = document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE_NAME}=`));
      return row ? `${COOKIE_NAME}=${encodeURIComponent(row.slice(COOKIE_NAME.length + 1))}` : '';
    },
  };
  window.CookieScript = window.CookieScript || function CookieScript() {};
  window.CookieScript.instance = api;
  window.CookieScript.init = () => api;
  window.CookieScript.autoDisable = () => {};
  window.CookieScript.autoDisableStop = () => {};
  function boot() {
    const state = readDecision();
    if (!state.action) show(true);
    else if (!open) {
      // Saved choices need state/events now; bind controls only on show().
      const root = document.getElementById(ROOT_ID);
      if (root) root.inert = true;
    }
    dispatch('CookieScriptLoaded');
    dispatch('CookieScriptCurrentState', state);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot, {
      once: true,
    });
  else boot();
})();

/* Continue the same spinner rotation until its opacity transition finishes. */
(() => {
  'use strict';
  if (!document.querySelector('[data-tdb-hero-toggle]')) return;

  function loadingFade(event) {
    const art = event.target;
    if (
      event.propertyName !== 'opacity' ||
      event.pseudoElement !== '::after' ||
      !art.matches?.('.tdb-hero-toggle-art') ||
      !art.closest('[data-tdb-hero-toggle]')
    )
      return;

    if (event.type === 'transitionrun') {
      art.style.setProperty('--tdb-hero-spin', 'running');
    } else {
      // Loading-state CSS still runs the animation if the fade was reversed.
      art.style.removeProperty('--tdb-hero-spin');
    }
  }

  document.addEventListener('transitionrun', loadingFade);
  document.addEventListener('transitionend', loadingFade);
  document.addEventListener('transitioncancel', loadingFade);
})();

(() => {
  'use strict';

  const VERSION = '0.7.0';
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

/* Physical phone orientation avoids triggering when the portrait keyboard opens. */
(() => {
  const touch = matchMedia('(pointer: coarse)');
  const landscape = matchMedia('(orientation: landscape)');
  function update() {
    const shortSide = Math.min(screen.width, screen.height);
    const type = screen.orientation?.type;
    const rotated = type
      ? type.startsWith('landscape')
      : typeof window.orientation === 'number'
        ? Math.abs(window.orientation) === 90
        : landscape.matches;
    const active = touch.matches && shortSide > 0 && shortSide <= 600 && rotated;
    if (active && !document.querySelector('style[data-tdb-phone-landscape-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-tdb-phone-landscape-css', '');
      style.textContent =
        'html.tdb-phone-landscape #tdb-elfsight-timer-shell,\nhtml.tdb-phone-landscape #tdb-vip-drawer:not(.is-open):not(.is-closing),\nhtml.tdb-phone-landscape:not(:has(.navbar10_component .w--open,.navbar10_component [data-nav-menu-open])) :is(.navbar10_component,.navbar-bg_layer) {\n  display: none !important;\n}';
      document.head.append(style);
    }
    document.documentElement.classList.toggle('tdb-phone-landscape', active);
  }
  update();
  touch.addEventListener('change', update);
  landscape.addEventListener('change', update);
  screen.orientation?.addEventListener('change', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update, { passive: true });
})();

/* TDBNavbarState v1.0.0. One change observer shared by the basic/enhanced nav.
 * Native Webflow remains the source of truth; consumers select their state.
 */
(() => {
  'use strict';
  if (window.TDBNavbarState) return;
  const instances = new WeakMap();
  function forNav(nav) {
    if (instances.has(nav)) return instances.get(nav);
    const subscriptions = new Set();
    const phone = matchMedia('(max-width:767px)');
    const desktop = matchMedia('(min-width:992px)');
    function sync() {
      for (const item of subscriptions) {
        const value = item.read();
        if (item.ready && Object.is(value, item.value)) continue;
        const previous = item.value;
        item.ready = true;
        item.value = value;
        item.render(value, previous);
      }
    }
    const observer = new MutationObserver(sync);
    observer.observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'aria-expanded',
        'data-nav-menu-open',
        'data-tdb-desktop-dropdown',
      ],
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    phone.addEventListener('change', sync);
    desktop.addEventListener('change', sync);
    const api = Object.freeze({
      phone,
      desktop,
      refresh: sync,
      watch(read, render) {
        const item = { read, render, ready: false };
        subscriptions.add(item);
        const value = read();
        item.value = value;
        item.ready = true;
        render(value, undefined);
        return () => subscriptions.delete(item);
      },
    });
    instances.set(nav, api);
    return api;
  }
  function whenReady(start) {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
  window.TDBNavbarState = Object.freeze({ version: '1.1.0', forNav, whenReady });
})();

/* Disclosure initial state is authored in Designer. Only user toggles enable motion. */
(() => {
  'use strict';
  if (window.TDBDisclosure) return;
  const e = new WeakMap();
  let t = 0;
  function n(e) {
    if (!e.id || document.getElementById(e.id) !== e) {
      let n;
      do {
        n = 'tdb-disclosure-' + ++t;
      } while (document.getElementById(n));
      e.id = n;
    }
    return e.id;
  }
  function a(t) {
    if (e.has(t)) return e.get(t);
    const a = t.nextElementSibling,
      r = a?.hasAttribute('data-tdb-disclosure-panel')
        ? a
        : document.getElementById(t.getAttribute('aria-controls'));
    if (!r?.hasAttribute('data-tdb-disclosure-panel')) return null;
    function i(e) {
      (!(e = Boolean(e)) && r.contains(document.activeElement) && t.focus({ preventScroll: !0 }),
        (r.hidden = !e),
        (r.inert = !e),
        r.setAttribute('aria-hidden', String(!e)),
        t.setAttribute('aria-expanded', String(e)),
        r.classList.toggle('is-open', e),
        t.closest('[data-tdb-disclosure-item]')?.classList.toggle('is-open', e),
        t.querySelector('[data-tdb-chevron]')?.classList.toggle('is-open', e));
    }
    (t.setAttribute('aria-controls', n(r)), r.setAttribute('aria-labelledby', n(t)));
    const d = (e) => {
        e.defaultPrevented ||
          'true' === t.getAttribute('aria-disabled') ||
          (e.preventDefault(),
          t
            .closest('[data-tdb-disclosure-item]')
            ?.setAttribute('data-tdb-disclosure-interacted', ''),
          i('true' !== t.getAttribute('aria-expanded')));
      },
      o = 'BUTTON' === t.tagName,
      s = (e) => {
        !o && ['Enter', ' '].includes(e.key) && (e.repeat ? e.preventDefault() : d(e));
      };
    (t.addEventListener('click', d),
      o || t.addEventListener('keydown', s),
      i('true' === t.getAttribute('aria-expanded')));
    const c = Object.freeze({
      set: i,
      destroy() {
        (t.removeEventListener('click', d), t.removeEventListener('keydown', s), e.delete(t));
      },
    });
    return (e.set(t, c), c);
  }
  function r(e = document) {
    (e.matches?.('[data-tdb-disclosure-trigger]') && a(e),
      e.querySelectorAll('[data-tdb-disclosure-trigger]').forEach(a));
  }
  ((window.TDBDisclosure = Object.freeze({
    version: '1.2.1',
    observe: function (e, t, n = () => 'true' === e.getAttribute('aria-expanded')) {
      let a;
      function r() {
        const e = Boolean(n());
        e !== a && ((a = e), t(e));
      }
      const i = new MutationObserver(r);
      return (
        i.observe(e, { attributes: !0, attributeFilter: ['aria-expanded', 'class'] }),
        r(),
        () => i.disconnect()
      );
    },
    mount: a,
    refresh: r,
  })),
    'loading' === document.readyState
      ? document.addEventListener('DOMContentLoaded', () => r(), { once: !0 })
      : r());
})();
/* Mirror native Webflow state without motion or an extra observer. */
(() => {
  'use strict';
  if (window.TDBNavbarNative) return;
  function start() {
    document.querySelectorAll('[data-tdb-navbar-native]').forEach((nav) => {
      const state = window.TDBNavbarState.forNav(nav);
      nav.querySelectorAll('.navbar10_dropdown-toggle,.navbar10_menu-button').forEach((control) => {
        state.watch(
          () => control.classList.contains('w--open'),
          (expanded) => {
            control.setAttribute('data-tdb-expanded', String(expanded));
            const spacer = control.closest('.navbar10_menu-dropdown')?.nextElementSibling;
            if (spacer?.matches('.accordion-spacer'))
              spacer.setAttribute('data-tdb-expanded', String(expanded));
          },
        );
      });
    });
  }
  window.TDBNavbarNative = Object.freeze({ version: '2.0.0' });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

/* Native mobile-menu lock, available before consent and through enhancement. */
window.TDBNavbarState.whenReady(() => {
  'use strict';
  const nav = document.querySelector('[data-tdb-navbar-native]');
  if (!nav || nav.hasAttribute('data-tdb-nav-scroll-lock')) return;
  const state = window.TDBNavbarState.forNav(nav);
  const button = nav.querySelector('.w-nav-button');
  const menu = nav.querySelector('.w-nav-menu');
  if (!button || !menu) return;
  let release = null,
    suspended = false;
  nav.setAttribute('data-tdb-nav-scroll-lock', '');
  function sync() {
    const open =
      !suspended &&
      !state.desktop.matches &&
      (button.classList.contains('w--open') || menu.hasAttribute('data-nav-menu-open'));
    if (open && !release)
      release = window.TDBScrollLock?.acquire({
        allow: () => [menu, nav.querySelector('.w-nav-overlay')],
      });
    else if (!open && release) {
      release();
      release = null;
    }
  }
  state.watch(
    () =>
      [
        state.desktop.matches,
        button.classList.contains('w--open'),
        menu.hasAttribute('data-nav-menu-open'),
      ].join('|'),
    sync,
  );
  // The head consent bundle normally precedes this deferred footer bundle.
  // Recover an already-open menu if the shared owner arrives late.
  if (!window.TDBScrollLock)
    document
      .querySelector('script[data-tdb-consent-js]')
      ?.addEventListener('load', sync, { once: true });
  addEventListener('pagehide', () => {
    suspended = true;
    sync();
  });
  addEventListener('pageshow', () => {
    suspended = false;
    sync();
  });
});

/* Essential native navigation. Consent/runtime own eligibility and downloads. */
window.TDBNavbarState.whenReady(() => {
  'use strict';
  const nav = document.querySelector('.navbar10_component');
  if (!nav || window.TDBNavbarLoader || window.TDBNavbar) return;
  // Install the basic-menu lock before any open state can be applied.
  if (!document.querySelector('style[data-tdb-basic-nav-lock]')) {
    const lockStyle = document.createElement('style');
    lockStyle.setAttribute('data-tdb-basic-nav-lock', '');
    lockStyle.textContent = 'html[data-tdb-nav-basic-open]{overflow:hidden}';
    document.head.append(lockStyle);
  }
  const state = window.TDBNavbarState.forNav(nav);
  const html = document.documentElement;
  const duration = nav.getAttribute('data-duration');
  const transparent = nav.getAttribute('transparent-nav') === 'true';
  const surfaces = [
    ...nav.querySelectorAll('#nav-button-link,.navbar10_logo-link,.navbar10_link,.menu-icon5'),
    nav,
  ].map((node) => [node, node.classList.contains('is-trans')]);
  let installer,
    schedule,
    stopWatching,
    requested = false,
    queued = false,
    ready = false,
    open = false;
  const isOpen = () =>
    Boolean(
      nav.querySelector('.w-nav-button.w--open,.w-dropdown-toggle.w--open,[data-nav-menu-open]'),
    );
  function setDuration(value) {
    nav.setAttribute('data-duration', String(value));
    const config = window.jQuery?.data(nav, '.w-nav')?.config;
    if (config) config.duration = Number(value);
  }
  function sync() {
    if (ready) return;
    const next = isOpen();
    if (next !== open) {
      open = next;
      html.toggleAttribute('data-tdb-nav-basic-open', open);
      if (transparent)
        surfaces.forEach(([node, original]) => node.classList.toggle('is-trans', open || original));
    }
    if (open || !requested || !installer || queued) return;
    queued = true;
    Promise.resolve()
      .then(() =>
        schedule(() => {
          // A user can open the native menu while an idle callback is waiting.
          if (ready || isOpen()) return;
          setDuration(duration || 500);
          installer();
          // Basic-mode closes create a Tram controller whose inherited transition
          // is "none". Reusing it produces an invalid "none, transform ..." list.
          // Reset only this closed menu so its next use reads the enhanced styles.
          const menu = nav.querySelector('.w-nav-menu');
          if (menu && typeof window.tram === 'function') {
            window.tram(menu).destroy();
            menu.style.removeProperty('transition');
          }
          ready = true;
          stopRetrying();
          stopWatching?.();
          html.removeAttribute('data-tdb-nav-basic-open');
          nav.removeAttribute('data-tdb-nav-basic');
          nav.setAttribute('data-tdb-nav-enhanced', '');
        }),
      )
      .catch((error) => {
        if (!ready) {
          setDuration(0);
          nav.addEventListener('pointerdown', retry, { passive: true });
          nav.addEventListener('focusin', retry);
          window.addEventListener('online', retry);
        }
        console.warn('TDB navbar: retaining native navigation.', error);
      })
      .finally(() => {
        queued = false;
      });
  }
  function retry() {
    sync();
  }
  function stopRetrying() {
    nav.removeEventListener('pointerdown', retry);
    nav.removeEventListener('focusin', retry);
    window.removeEventListener('online', retry);
  }
  nav.querySelectorAll('.navbar10_blog-item-image').forEach((image) => {
    image.sizes = '(max-width: 479px) 100vw, (max-width: 991px) 50vw, 22vw';
  });
  nav.setAttribute('data-tdb-nav-basic', '');
  setDuration(0);
  (window.Webflow ||= []).push(() => {
    if (!ready) setDuration(0);
  });
  stopWatching = state.watch(isOpen, sync);
  window.TDBNavbarLoader = Object.freeze({
    version: '2.0.3',
    prepare: () => window.TDBRuntime?.enhanceNavbar?.() || Promise.resolve(false),
    register(callback) {
      if (!ready) {
        installer = callback;
        sync();
      }
    },
    activate(background) {
      if (ready) return;
      schedule = background;
      requested = true;
      sync();
    },
    status: () => ({
      ready,
      registered: Boolean(installer),
      waitingForClose: requested && !ready,
      decided: Boolean(window.TDBConsent?.allows()),
    }),
  });
  window.dispatchEvent(new Event('tdb:navbar-ready'));
});
