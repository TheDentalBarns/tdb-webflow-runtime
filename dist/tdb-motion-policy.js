/* TDB motion policy v1.0.0. Owner-approved full motion for design review.
 * Inline the minified artifact at the start of the Webflow site head. This
 * small policy does not fetch or eagerly initialize the shared motion module.
 * It changes TDB's behavior only; the browser's media queries remain intact.
 */
(() => {
  'use strict';
  if (window.TDBMotionPolicy) return;
  const reduced = Object.freeze({
    matches: false,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
  });
  window.TDBMotionPolicy = Object.freeze({ version: '1.0.0', mode: 'full', reduced });
  document.documentElement.dataset.tdbMotion = 'full';
})();
