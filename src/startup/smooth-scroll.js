/* Desktop scrolling starts with the entry, independently of consent and idle work.
 * The browser owns middle-button autoscroll; never animate its wheel events too. */
(() => {
  'use strict';
  if (window.TDBSmoothScroll) return;
  const desktop = window.matchMedia?.('(min-width:768px) and (hover:hover) and (pointer:fine)');
  if (!desktop?.matches || document.documentElement.classList.contains('w-editor')) return;
  let nativeAutoscroll = false;
  const reset = () => window.lenis?.reset();
  function release() {
    nativeAutoscroll = false;
    reset();
  }
  document.addEventListener(
    'pointerdown',
    (event) => {
      // A middle-click on a link retains the browser's open-in-new-tab action.
      // Pointerup cannot end this lease: click-to-autoscroll continues after it.
      nativeAutoscroll =
        event.button === 1 &&
        !event.target.closest?.('a[href],button,input,textarea,select,[contenteditable="true"]');
      reset();
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
        virtualScroll: () => {
          if (!nativeAutoscroll) return true;
          reset();
          return false;
        },
      });
    })
    .catch(() =>
      console.warn('TDB smooth scrolling unavailable; native scrolling remains active.'),
    );
})();
