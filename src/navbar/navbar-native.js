/* TDB navbar native foundation v1.0.0. Inline in HEAD, before Webflow's runtime.
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
  function scan() {
    document.querySelectorAll('[data-tdb-navbar-native]').forEach(nav => {
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
  window.TDBNavbarNative = Object.freeze({ version: '1.0.0' });
})();
