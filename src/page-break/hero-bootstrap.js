/* Temporary Home/VIP IX2 handoff v1.0.0. Remove after retiring event e-872.
 * Disconnect only the audited scroll trigger, before Webflow initialises.
 * Designer nodes, classes, bindings and static appearance stay intact.
 */
(() => {
  'use strict';
  const selector = '[data-tdb-page-break="vimeo-hero"] [data-w-id="b1a810af-870e-98e2-c9cd-c1f7607452e7"]';
  const detach = () => document.querySelectorAll(selector).forEach(node => node.removeAttribute('data-w-id'));
  const observer = new MutationObserver(detach);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  detach();
  document.addEventListener('DOMContentLoaded', () => { detach(); observer.disconnect(); }, { once: true });
})();
