/* TDB navbar native foundation v1.1.0. Inline in HEAD, before Webflow's runtime.
 * Detach only the three audited Navbar New IX2 handles (ten event bindings).
 * Native Webflow controls, the existing consent gate and enhanced navbar remain.
 * Remove this bridge after retiring those event bindings in Designer.
 */
(() => {
  'use strict';
  if (window.TDBNavbarNative) return;
  const ids = new Set([
    '83119b7e-a73e-66e3-0fce-5279000d146c',
    '83119b7e-a73e-66e3-0fce-5279000d1472',
    '83119b7e-a73e-66e3-0fce-5279000d149c'
  ]);
  const bound = new WeakSet();
  const surfaceRoots = new WeakSet();
  const mobile = window.matchMedia?.('(max-width: 767px)');
  const blurIdle = 'data-tdb-nav-blur-idle';
  function setBlurIdle(surface, idle) {
    if (surface.hasAttribute(blurIdle) === idle) return;
    surface.toggleAttribute(blurIdle, idle);
    // Designer and Webflow may retain a transition for the filter. Complete
    // only that transition so this switch cannot expose a sharp closing frame
    // or interfere with the native transform/height or background-colour fade.
    for (const transition of surface.getAnimations?.() || []) {
      if (transition.transitionProperty === 'backdrop-filter' ||
          transition.transitionProperty === '-webkit-backdrop-filter') transition.finish();
    }
  }
  function restoreBlur(nav) {
    nav.querySelectorAll(`[${blurIdle}]`).forEach(surface => setBlurIdle(surface, false));
  }
  mobile?.addEventListener('change', () => {
    document.querySelectorAll('[data-tdb-navbar-native]').forEach(restoreBlur);
  });
  function scan() {
    document.querySelectorAll('[data-tdb-navbar-native]').forEach(nav => {
      if (!surfaceRoots.has(nav)) {
        surfaceRoots.add(nav);
        nav.addEventListener('animationend', event => {
          if (!mobile?.matches || event.pseudoElement ||
              !nav.querySelector('.navbar10_menu-button.w--open')) return;
          const surface = event.target;
          if ((event.animationName === 'tdb-nav-bar-open' && surface.matches('.tdb-nav-bar-glass.is-nav-solid')) ||
              (event.animationName === 'tdb-nav-menu-open' && surface.matches('.navbar10_menu.is-menu-solid'))) {
            setBlurIdle(surface, true);
          }
        });
      }
      [nav, ...nav.querySelectorAll('.navbar10_menu-dropdown')].forEach(node => {
        const id = node.getAttribute('data-w-id');
        if (!ids.has(id)) return;
        node.setAttribute('data-tdb-nav-previous-id', id);
        node.removeAttribute('data-w-id');
      });
      nav.querySelectorAll('.navbar10_dropdown-toggle,.navbar10_menu-button').forEach(trigger => {
        if (bound.has(trigger)) return;
        bound.add(trigger);
        window.TDBDisclosure.observe(trigger, open => {
          trigger.setAttribute('data-tdb-expanded', String(open));
          if (!open && trigger.matches('.navbar10_menu-button')) restoreBlur(nav);
          // The spacer is outside the dropdown. Preserve its original stagger.
          const sibling = trigger.closest('.navbar10_menu-dropdown')?.nextElementSibling;
          if (sibling?.matches('.accordion-spacer')) sibling.setAttribute('data-tdb-expanded', String(open));
        }, () => trigger.classList.contains('w--open'));
      });
    });
  }
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
  document.addEventListener('DOMContentLoaded', () => {
    scan();
    observer.disconnect();
  }, { once: true });
  window.TDBNavbarNative = Object.freeze({ version: '1.1.0' });
})();
