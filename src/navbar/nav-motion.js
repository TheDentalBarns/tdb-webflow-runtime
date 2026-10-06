/* One viewport-height clock for the native mobile menu and desktop dropdowns. */
(() => {
  const nav = document.querySelector('.navbar10_component');
  if (!nav) return;
  const root = document.documentElement;
  let current;
  function refresh() {
    // Same square-root distance curve as the drawers, using the vertical axis.
    // Apply it on phones too: a taller viewport means a longer menu journey.
    const panel = window.TDBPanelMotion.duration();
    const scale = duration => Math.round(duration * panel / 500);
    if (!current || current.panel !== panel) {
      current = Object.freeze({panel, textIn:scale(520), textOut:scale(420), delay:scale(70),
        lock:scale(590) + 30, cleanup:panel + 50});
      root.style.setProperty('--tdb-nav-duration', panel + 'ms');
      root.style.setProperty('--tdb-nav-detail-duration', current.textOut + 'ms');
      root.style.setProperty('--tdb-nav-text-in-duration', current.textIn + 'ms');
      root.style.setProperty('--tdb-nav-text-delay', current.delay + 'ms');
      nav.setAttribute('data-duration', String(panel));
    }
    // Webflow caches data-duration in its .w-nav config after initialization.
    // Update both values so native click, keyboard and outside-click closes agree.
    const native = window.jQuery?.data?.(nav, '.w-nav');
    if (native?.config && native.config.duration !== panel) native.config.duration = panel;
    return current;
  }
  const busy = () => nav.classList.contains('tdb-menu-transitioning') ||
    nav.querySelector('[data-tdb-desktop-panel="opening"],[data-tdb-desktop-panel="closing"]');
  const mobileOpen = () => nav.querySelector('.w-nav-button.w--open');
  window.TDBNavMotion = Object.freeze({refresh, get current() {return current;}});
  function prepare(event) {
    if (busy()) return;
    if (nav.contains(event.target) || mobileOpen()) refresh();
  }
  document.addEventListener('pointerdown', prepare, {capture:true, passive:true});
  document.addEventListener('click', prepare, true);
  document.addEventListener('keydown', event => {
    if (['Enter', ' ', 'Escape'].includes(event.key)) prepare(event);
  }, true);
  addEventListener('resize', () => {
    // Freeze the clock during motion; mobile browser chrome may resize mid-slide.
    if (!busy() && !mobileOpen() && !nav.hasAttribute('data-tdb-desktop-dropdown')) refresh();
  }, {passive:true});
  refresh();
  (window.Webflow = window.Webflow || []).push(refresh);
})();
