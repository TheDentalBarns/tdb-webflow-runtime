/* Opt-in native entry fades, sharing the motion profile and fade controller.
 * Static styles author the starting opacity. No markup or layout is rewritten.
 * Loaded only by the standalone motion entry on migrated legacy pages.
 */
(() => {
  'use strict';
  function start() {
    const nodes = document.querySelectorAll(
      '[data-tdb-motion-enter]:not([data-tdb-motion-entered])',
    );
    if (!nodes.length || !window.TDBMotion?.fadeController) return;
    const controller = window.TDBMotion.fadeController();
    nodes.forEach((node) => {
      const duration = Number.parseFloat(node.getAttribute('data-tdb-motion-enter'));
      if (!Number.isFinite(duration) || duration < 0) return;
      node.setAttribute('data-tdb-motion-entered', '');
      controller.to(node, 1, window.TDBMotion.time(duration), 'linear');
    });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
