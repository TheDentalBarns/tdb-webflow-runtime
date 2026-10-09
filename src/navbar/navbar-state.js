/* TDBNavbarState v1.0.0. One change observer shared by the basic/enhanced nav.
 * Native Webflow remains the source of truth; consumers select their state.
 */
(() => {
  'use strict';
  if (window.TDBNavbarState) return;
  const instances = new WeakMap();
  function forNav(nav) {
    if (instances.has(nav)) return instances.get(nav);
    const subscriptions = new Set();
    const phone = matchMedia('(max-width:767px)');
    const desktop = matchMedia('(min-width:992px)');
    function sync() {
      for (const item of subscriptions) {
        const value = item.read();
        if (item.ready && Object.is(value, item.value)) continue;
        const previous = item.value;
        item.ready = true;
        item.value = value;
        item.render(value, previous);
      }
    }
    const observer = new MutationObserver(sync);
    observer.observe(nav, { subtree: true, attributes: true,
      attributeFilter: ['class', 'aria-expanded', 'data-nav-menu-open', 'data-tdb-desktop-dropdown'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    phone.addEventListener('change', sync);
    desktop.addEventListener('change', sync);
    const api = Object.freeze({ phone, desktop, refresh: sync,
      watch(read, render) {
        const item = { read, render, ready: false };
        subscriptions.add(item);
        const value = read();
        item.value = value; item.ready = true; render(value, undefined);
        return () => subscriptions.delete(item);
      }
    });
    instances.set(nav, api);
    return api;
  }
  window.TDBNavbarState = Object.freeze({ version: '1.0.0', forNav });
})();
