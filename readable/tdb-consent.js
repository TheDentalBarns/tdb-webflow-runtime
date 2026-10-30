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
    TEXT_OPEN_DELAY_MS = window.TDBMotionProfile?.time(70) ?? 70,
    TEXT_CLOSE_MS = window.TDBMotionProfile?.time(420) ?? 420,
    CLOSE_TOTAL_MS = TEXT_CLOSE_MS + 50;
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
        easing:
          window.TDBMotionProfile?.easing('fade', 'cubic-bezier(0,0,.2,1)') ||
          'cubic-bezier(0,0,.2,1)',
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

/* TDB shared dependency registry v2.0.0. One release root and one flight per asset. */
(() => {
  'use strict';
  if (window.TDBModules) return;
  const flights = new Map();
  const registry = document.currentScript;
  const failedNodes = new WeakSet();
  const owner = registry?.src
    ? registry
    : document.querySelector('script[data-tdb-reviews-loader][src]') ||
      document.querySelector('script[data-tdb-logo-marquee-loader][src]');
  const releaseRoot =
    window.TDBRelease?.base || (owner?.src ? new URL('./', owner.src).href : null);
  function resolve(url) {
    const requested = new URL(url, location.href);
    const firstParty =
      requested.origin === 'https://cdn.jsdelivr.net' &&
      requested.pathname.match(
        /^\/gh\/TheDentalBarns\/tdb-webflow-(?:runtime|attribution)@[^/]+\/dist\/([^/]+)$/,
      );
    return releaseRoot && firstParty ? new URL(firstParty[1], releaseRoot).href : requested.href;
  }
  function dependencyError(code, message) {
    return Object.assign(new Error(message), { code });
  }
  // A timeout does not cancel script execution. Keep the original transport until
  // it settles; only an explicit network error permits another execution attempt.
  function load(url, { attribute, ready, type = 'script', timeout = 20000 } = {}) {
    if (!['script', 'module', 'style'].includes(type))
      return Promise.reject(Error('Unknown dependency type: ' + type));
    const src = resolve(url),
      key = type + ':' + src;
    if (/\/tdb-swiper-8\.4\.7\.min\.js$/.test(src) && ready) {
      const engineReady = ready;
      ready = () =>
        engineReady() &&
        (registry?.src
          ? typeof window.TDBSwiper?.create === 'function'
          : Boolean(window.TDBSwiper));
    }
    try {
      if (ready?.()) return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
    const previous = flights.get(key);
    if (previous) {
      if (ready && previous.complete) {
        // The tag loaded earlier, but this caller's required export is absent.
        // Do not turn a fulfilled transport promise into false readiness.
        return Promise.reject(
          dependencyError('TDB_EXPORT', 'Dependency loaded without expected export: ' + src),
        );
      }
      if (ready) previous.checks.add(ready);
      return previous.promise;
    }
    const style = type === 'style';
    const candidates = style
      ? [...document.querySelectorAll('link[rel="stylesheet"]')]
      : [...document.scripts];
    const address = (node) => (style ? node.href : node.src);
    let node =
      candidates.find((n) => !failedNodes.has(n) && address(n) === src) ||
      (attribute && document.querySelector(`${style ? 'link' : 'script'}[${attribute}]`));
    if (node && failedNodes.has(node)) node = null;
    if (node && address(node) !== src)
      return Promise.reject(Error('Conflicting dependency URL: ' + attribute));
    if (node && !style && (node.type === 'module') !== (type === 'module'))
      return Promise.reject(Error('Conflicting dependency type: ' + src));
    const fresh = !node;
    node ||= document.createElement(style ? 'link' : 'script');
    let fulfill,
      reject,
      timer,
      settled = false,
      timedOut = false;
    const promise = new Promise((a, b) => {
      fulfill = a;
      reject = b;
    });
    const entry = { promise, checks: new Set(ready ? [ready] : []), complete: false };
    flights.set(key, entry);
    function cleanup() {
      clearTimeout(timer);
      node.removeEventListener('load', done);
      node.removeEventListener('error', fail);
    }
    function invalidate() {
      failedNodes.add(node);
      if (fresh) node.remove();
      if (flights.get(key) === entry) flights.delete(key);
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      invalidate();
      reject(dependencyError('TDB_NETWORK', 'Dependency unavailable: ' + src));
    }
    function done() {
      if (settled) return;
      try {
        for (const check of entry.checks)
          if (!check())
            throw dependencyError(
              'TDB_EXPORT',
              'Dependency loaded without expected export: ' + src,
            );
      } catch (error) {
        settled = true;
        cleanup();
        entry.checks.clear();
        // The code already ran. Retain a terminal failure, not a retryable URL.
        const failure = dependencyError(
          'TDB_EXPORT',
          'Dependency loaded without expected export: ' + src,
        );
        entry.promise = Promise.reject(failure);
        entry.promise.catch(() => {});
        reject(failure);
        return;
      }
      settled = true;
      cleanup();
      entry.checks.clear();
      entry.complete = true;
      node.dataset.tdbLoaded = 'true';
      if (timedOut) entry.promise = Promise.resolve();
      fulfill();
    }
    // Keep rejected shared flights handled even when an abandoned consumer stops
    // listening; each consumer still receives the original rejected promise.
    promise.catch(() => {});
    if (node.dataset.tdbLoaded === 'true' || (style && node.sheet)) {
      done();
      return promise;
    }
    node.addEventListener('load', done, { once: true });
    node.addEventListener('error', fail, { once: true });
    timer = setTimeout(
      () => {
        timedOut = true;
        // Keep the listeners to adopt a late successful load or release an
        // explicit late network failure. Callers still receive the timeout now.
        reject(dependencyError('TDB_TIMEOUT', 'Dependency timed out: ' + src));
      },
      Number.isFinite(timeout) && timeout > 0 ? timeout : 20000,
    );
    if (fresh) {
      if (style) {
        node.rel = 'stylesheet';
        node.href = src;
      } else {
        node.src = src;
        node.async = true;
        if (type === 'module') node.type = 'module';
      }
      if (attribute) node.setAttribute(attribute, 'true');
      document.head.append(node);
    }
    return promise;
  }
  function loadWithRecovery(url, options = {}) {
    return load(url, options).catch((error) => {
      if (error.code !== 'TDB_NETWORK') throw error;
      return new Promise((resolve) => setTimeout(resolve, 250)).then(() => load(url, options));
    });
  }
  const busy = new WeakMap();
  async function withBusy(trigger, action, { signal, loading = true, onStart, onError } = {}) {
    if (signal?.aborted || trigger.getAttribute('aria-busy') === 'true') return;
    const token = {};
    busy.set(trigger, token);
    trigger.setAttribute('aria-busy', 'true');
    if (loading) trigger.setAttribute('data-tdb-loading', 'true');
    const clear = () => {
      if (busy.get(trigger) !== token) return;
      busy.delete(trigger);
      trigger.removeAttribute('aria-busy');
      if (loading) trigger.removeAttribute('data-tdb-loading');
    };
    signal?.addEventListener('abort', clear, { once: true });
    try {
      onStart?.();
      return await action();
    } catch (error) {
      if (!signal?.aborted && error.name !== 'AbortError') {
        if (onError) onError(error);
        else throw error;
      }
    } finally {
      signal?.removeEventListener('abort', clear);
      clear();
    }
  }
  window.TDBModules = Object.freeze({
    version: '2.0.0',
    load,
    loadWithRecovery,
    resolve,
    withBusy,
  });
})();

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
