/* Essential native navigation. Consent/runtime own eligibility and downloads. */
(() => {
  'use strict';
  const nav = document.querySelector('.navbar10_component');
  if (!nav || window.TDBNavbarLoader || window.TDBNavbar) return;
  const state = window.TDBNavbarState.forNav(nav);
  const html = document.documentElement;
  const duration = nav.getAttribute('data-duration');
  const transparent = nav.getAttribute('transparent-nav') === 'true';
  const surfaces = [...nav.querySelectorAll('#nav-button-link,.navbar10_logo-link,.navbar10_link,.menu-icon5'), nav]
    .map(node => [node, node.classList.contains('is-trans')]);
  let installer, schedule, stopWatching, requested = false, queued = false, ready = false, open = false;
  const isOpen = () => Boolean(nav.querySelector('.w-nav-button.w--open,.w-dropdown-toggle.w--open,[data-nav-menu-open]'));
  function setDuration(value) {
    nav.setAttribute('data-duration', String(value));
    const config = window.jQuery?.data(nav, '.w-nav')?.config;
    if (config) config.duration = Number(value);
  }
  function sync() {
    if (ready) return;
    const next = isOpen();
    if (next !== open) {
      open = next;
      html.toggleAttribute('data-tdb-nav-basic-open', open);
      if (transparent) surfaces.forEach(([node, original]) => node.classList.toggle('is-trans', open || original));
    }
    if (open || !requested || !installer || queued) return;
    queued = true;
    schedule(() => {
      queued = false;
      // A user can open the native menu while an idle callback is waiting.
      if (ready || isOpen()) return;
      setDuration(duration || 500);
      installer();
      ready = true;
      stopWatching?.();
      html.removeAttribute('data-tdb-nav-basic-open');
      nav.removeAttribute('data-tdb-nav-basic');
      nav.setAttribute('data-tdb-nav-enhanced', '');
    }).catch(error => console.warn('TDB navbar: retaining native navigation.', error));
  }
  nav.querySelectorAll('.navbar10_blog-item-image').forEach(image => {
    image.sizes = '(max-width: 479px) 100vw, (max-width: 991px) 50vw, 22vw';
  });
  nav.setAttribute('data-tdb-nav-basic', '');
  setDuration(0);
  (window.Webflow ||= []).push(() => { if (!ready) setDuration(0); });
  stopWatching = state.watch(isOpen, sync);
  window.TDBNavbarLoader = Object.freeze({
    version: '2.0.0',
    prepare: () => window.TDBRuntime?.enhanceNavbar?.() || Promise.resolve(false),
    register(callback) { if (!ready) installer = callback; },
    activate(background) {
      if (ready || requested) return;
      schedule = background;
      requested = true;
      sync();
    },
    status: () => ({ready, registered: Boolean(installer), waitingForClose: requested && !ready,
      decided: Boolean(window.TDBConsent?.allows())})
  });
  window.dispatchEvent(new Event('tdb:navbar-ready'));
})();
