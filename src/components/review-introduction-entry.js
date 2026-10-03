/* TDB Review Introduction bootstrap v1.0.0. Page uses one immutable external reference. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script?.src) return;
  const base = new URL('../', script.src);
  function start() {
    if (!document.querySelector('[data-tdb-review-introduction]')) return;
    window.TDBReviewIntroductionLoader.start({
      urls: [
        new URL('src/shared/value-tickers-native.js', base).href,
        new URL('src/components/review-introduction.js', base).href
      ],
      componentOptions: {
        openReviews: options => window.TDBReviewDrawerBridge.open(options),
        closeReviews: root => window.TDBReviewDrawerBridge.close(root)
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
