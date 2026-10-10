/* Services and Treatments first-paint layout v1.1.0.
 * Inline in the homepage head: select native Designer variants while parsing.
 * No dimensions, styling, carousel setup, network requests or motion live here.
 */
(() => {
  'use strict';
  const rootSelector = '.tdb-service-parallax,[data-tdb-treatment]';
  const targets = '.tdb-service-content,.tdb-service-heading-row,.tdb-service-title,.tdb-service-copy,.tdb-service-link-source,.tdb-service-controls,.tdb-service-buttons,.tdb-service-cta';
  const touch = matchMedia('(pointer: coarse)');
  const landscape = matchMedia('(orientation: landscape)');

  function isPhoneLandscape() {
    const shortSide = Math.min(screen.width, screen.height);
    const type = screen.orientation?.type;
    const rotated = type ? type.startsWith('landscape') :
      typeof window.orientation === 'number' ? Math.abs(window.orientation) === 90 : landscape.matches;
    // Match the existing physical-phone classifier and presentation guard.
    // Opening a keyboard on a portrait phone must not select landscape.
    return touch.matches && shortSide > 0 && shortSide <= 600 && rotated && landscape.matches;
  }

  function apply() {
    const phone = isPhoneLandscape();
    document.querySelectorAll(rootSelector).forEach(root => {
      root.querySelectorAll(targets).forEach(node => node.classList.toggle('is-phone-landscape', phone));
    });
  }

  // Mutation callbacks run before rendering, including streamed HTML chunks.
  // Stop watching the page once its native markup has finished parsing.
  const parsing = new MutationObserver(apply);
  parsing.observe(document.documentElement, {childList: true, subtree: true});
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    parsing.disconnect();
    apply();
  }, {once: true});

  // Cover an orientation change while the external runtime is still loading.
  // Keep Treatments on the same native landscape variant until both carousels
  // have a presentation controller that owns their orientation changes.
  function resize() {
    const roots = [...document.querySelectorAll(rootSelector)];
    if (roots.length && roots.every(root => root.hasAttribute('data-tdb-service-layout'))) {
      touch.removeEventListener('change', resize);
      landscape.removeEventListener('change', resize);
      screen.orientation?.removeEventListener('change', resize);
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('resize', resize);
      return;
    }
    apply();
  }
  touch.addEventListener('change', resize);
  landscape.addEventListener('change', resize);
  screen.orientation?.addEventListener('change', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('resize', resize, {passive: true});
})();
