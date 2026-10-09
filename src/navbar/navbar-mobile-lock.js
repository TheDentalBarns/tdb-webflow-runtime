/* Native mobile-menu lock, available before consent and through enhancement. */
(() => {
  'use strict';
  const nav = document.querySelector('[data-tdb-navbar-native]');
  if (!nav || nav.hasAttribute('data-tdb-nav-scroll-lock')) return;
  const state = window.TDBNavbarState.forNav(nav);
  const button = nav.querySelector('.w-nav-button');
  const menu = nav.querySelector('.w-nav-menu');
  if (!button || !menu) return;
  let release = null, suspended = false;
  nav.setAttribute('data-tdb-nav-scroll-lock', '');
  function sync() {
    const open = !suspended && !state.desktop.matches &&
      (button.classList.contains('w--open') || menu.hasAttribute('data-nav-menu-open'));
    if (open && !release) release = window.TDBScrollLock.acquire({
      allow: () => [menu, nav.querySelector('.w-nav-overlay')]
    });
    else if (!open && release) { release(); release = null; }
  }
  state.watch(() => [state.desktop.matches, button.classList.contains('w--open'),
    menu.hasAttribute('data-nav-menu-open')].join('|'), sync);
  addEventListener('pagehide', () => { suspended = true; sync(); });
  addEventListener('pageshow', () => { suspended = false; sync(); });
})();
