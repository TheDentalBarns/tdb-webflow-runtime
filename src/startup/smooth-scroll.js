/* Either consent choice releases desktop scrolling. Saved choices start at entry,
 * before foundation/runtime/idle work. Native autoscroll only borrows the input. */
(() => {
  'use strict';
  if (window.TDBSmoothScroll) return;
  const desktop = window.matchMedia?.('(min-width:768px) and (hover:hover) and (pointer:fine)');
  if (!desktop?.matches || document.documentElement.classList.contains('w-editor')) return;
  let nativeAutoscroll = false,
    middleHeld = false,
    middleOrigin = null,
    middleDragged = false,
    nativeScrollAt = 0,
    started = false;
  const reset = () => window.lenis?.reset();
  function release() {
    nativeAutoscroll = false;
    middleHeld = false;
    middleOrigin = null;
    middleDragged = false;
    reset();
  }
  document.addEventListener(
    'pointerdown',
    (event) => {
      const startsAutoscroll =
        event.button === 1 &&
        !event.target.closest?.('a[href],button,input,textarea,select,[contenteditable="true"]');
      // A second middle click ends the browser gesture; it must not re-latch it.
      if (nativeAutoscroll || !startsAutoscroll) return release();
      nativeAutoscroll = middleHeld = true;
      middleOrigin = [event.clientX, event.clientY];
      nativeScrollAt = performance.now();
      reset();
    },
    { capture: true, passive: true },
  );
  document.addEventListener(
    'pointermove',
    (event) => {
      if (middleHeld && middleOrigin)
        middleDragged ||=
          Math.hypot(event.clientX - middleOrigin[0], event.clientY - middleOrigin[1]) > 4;
    },
    { capture: true, passive: true },
  );
  document.addEventListener(
    'pointerup',
    (event) => {
      if (event.button !== 1) return;
      middleHeld = false;
      // Hold-and-drag ends on release; a stationary click can keep autoscrolling.
      if (middleDragged) release();
    },
    { capture: true, passive: true },
  );
  document.addEventListener('pointercancel', release, { capture: true, passive: true });
  window.addEventListener(
    'scroll',
    () => {
      if (nativeAutoscroll) nativeScrollAt = performance.now();
    },
    { passive: true },
  );
  window.addEventListener(
    'scrollend',
    (event) => {
      if (event.target !== window && event.target !== document) return;
      // Observe before Lenis stops native scrollend propagation. Ignore its
      // synthetic completion event from an earlier animation.
      if (nativeAutoscroll && !middleHeld && !event.detail?.lenisScrollEnd) release();
    },
    { capture: true, passive: true },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        ['Escape', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(
          event.key,
        )
      )
        release();
    },
    { capture: true, passive: true },
  );
  window.addEventListener('blur', release);
  window.addEventListener('pagehide', release);
  window.addEventListener('pageshow', release);
  window.TDBSmoothScroll = Object.freeze({
    get nativeAutoscroll() {
      return nativeAutoscroll;
    },
  });
  const consentEvents = [
    'CookieScriptLoaded',
    'CookieScriptCurrentState',
    'CookieScriptAcceptAll',
    'CookieScriptReject',
    'CookieScriptClose',
  ];
  function start() {
    if (started) return;
    const consent = window.CookieScript?.instance;
    const choice = consent?.currentState?.() || window.TDBConsentDecision.read();
    if (!['accept', 'reject'].includes(choice.action) || consent?.isOpen?.()) return;
    started = true;
    consentEvents.forEach((name) => window.removeEventListener(name, start));
    window.TDBModules.loadWithRecovery(window.TDBRelease.asset('tdb-lenis.min.js'), {
      attribute: 'data-lenis-js',
      ready: () => typeof window.Lenis === 'function',
    })
      .then(() => {
        if (window.lenis) return;
        window.lenis = new window.Lenis({
          autoRaf: true,
          smoothWheel: true,
          syncTouch: false,
          virtualScroll: ({ event }) => {
            // Some browsers swallow the finishing click. A normal wheel after
            // native movement has settled resumes smoothing on that same event.
            // Its button state also recovers a pointerup consumed by the browser.
            if (nativeAutoscroll && event.type === 'wheel') middleHeld = Boolean(event.buttons & 4);
            if (
              nativeAutoscroll &&
              !middleHeld &&
              event.type === 'wheel' &&
              performance.now() - nativeScrollAt > 180
            )
              release();
            if (!nativeAutoscroll) return true;
            reset();
            return false;
          },
        });
      })
      .catch(() =>
        console.warn('TDB smooth scrolling unavailable; native scrolling remains active.'),
      );
  }
  consentEvents.forEach((name) => window.addEventListener(name, start));
  start();
})();
