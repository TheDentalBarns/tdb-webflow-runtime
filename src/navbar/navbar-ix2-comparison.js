/* Temporary staging-only A/B view. Inline in the Home page head so the
 * original IX2 handles are present before Webflow initializes its events.
 * Site-wide shared disclosure controls and all native geometry stay intact.
 */
(() => {
  'use strict';
  if (location.hostname !== 'dentalbarns.webflow.io' ||
      new URLSearchParams(location.search).get('nav-mode') !== 'ix2') return;
  const ids = new Set([
    '83119b7e-a73e-66e3-0fce-5279000d146c',
    '83119b7e-a73e-66e3-0fce-5279000d1472',
    '83119b7e-a73e-66e3-0fce-5279000d149c'
  ]);
  function restore() {
    document.querySelectorAll('.navbar10_component.w-nav').forEach(nav => {
      const identity = nav.getAttribute('data-w-id') || nav.getAttribute('data-tdb-nav-previous-id');
      if (identity !== '83119b7e-a73e-66e3-0fce-5279000d146c') return;
      // Disable only navbar-scoped replacement CSS/observers, not the shared
      // foundation stylesheet now used by other components on this page.
      nav.removeAttribute('data-tdb-navbar-native');
      nav.setAttribute('data-tdb-nav-ix2-comparison', '1');
      [nav, ...nav.querySelectorAll('.navbar10_menu-dropdown')].forEach(node => {
        const previous = node.getAttribute('data-tdb-nav-previous-id');
        if (ids.has(previous)) node.setAttribute('data-w-id', previous);
      });
      nav.querySelectorAll('[data-tdb-chevron]').forEach(icon => icon.removeAttribute('data-tdb-chevron'));
    });
  }
  const parsing = new MutationObserver(restore);
  parsing.observe(document.documentElement, { childList: true, subtree: true });
  restore();
  document.addEventListener('DOMContentLoaded', () => {
    restore();
    parsing.disconnect();
  }, { once: true });
})();
