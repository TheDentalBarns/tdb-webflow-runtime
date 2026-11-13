/* TDB motion policy v1.1.0. Owner-approved full motion for design review.
 * The shared entry establishes this before fetching foundation. Foundation
 * includes the same idempotent policy for direct loads. It does not fetch or
 * eagerly initialize the shared motion module.
 * It changes TDB's behavior only; the browser's media queries remain intact.
 */
(() => {
  'use strict';
  if (window.TDBMotionPolicy) return;
  // The CMS template opts in natively, before startup/foundation or any
  // deferred feature mounts. Functional carousel, drawer and ticker motion
  // keeps the shared full-motion policy; only decorative page effects stop.
  const vipCampaign = Boolean(document.querySelector('[data-tdb-vip-campaign]'));
  const pageEffects = Object.freeze({
    textReveals: !vipCampaign,
    imageParallax: !vipCampaign,
    stickyPricing: !vipCampaign,
  });
  const reduced = Object.freeze({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  window.TDBMotionPolicy = Object.freeze({ version: '1.1.0', mode: 'full', reduced, pageEffects });
  document.documentElement.dataset.tdbMotion = 'full';
})();
