(() => {
  'use strict';

  /*
   * STAGING EXPERIMENT ONLY — zero CookieScript opening animation.
   *
   * The production CookieScript v3.0.0 values remain untouched:
   * - Backdrop: opacity 420ms cubic-bezier(.4, 0, .2, 1)
   * - Panel: transform 420ms cubic-bezier(.4, 0, .2, 1)
   * - Content: 350ms cubic-bezier(.5, 0, 1, 1), delayed 70ms
   *
   * This override affects opening only. The existing closing choreography remains active.
   */

  if (document.querySelector('style[data-tdb-cookie-no-open-animation-test]')) return;

  const style = document.createElement('style');
  style.setAttribute('data-tdb-cookie-no-open-animation-test', '1');
  style.textContent = `
    #tdb-consent-root:not(.tdb-consent-closing) .tdb-consent-backdrop,
    #tdb-consent-root:not(.tdb-consent-closing) .tdb-consent-surface {
      transition: none !important;
    }

    #tdb-consent-root.tdb-consent-text-open .tdb-consent-motion {
      animation: none !important;
      opacity: 1 !important;
      transform: translate3d(0, 0, 0) !important;
    }
  `;

  document.head.appendChild(style);
})();
