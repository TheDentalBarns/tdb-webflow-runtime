/* Load the native USP adapter only where its component exists.
 * The shared registry retains the Home-specific adapter pin. Present components
 * keep their existing startup/500px warm-up; later native insertion is observed.
 */
(() => {
  'use strict';
  const selector = '[data-tdb-usp]';
  let observer, requested = false;
  function load() {
    if (requested) return;
    requested = true;
    observer?.disconnect();
    if (window.TDBUSPDrawer) return;
    window.TDBModules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@3217122904abee907bac1af3c23c28320e421219/dist/tdb-usp-drawer.js', {
      ready: () => Boolean(window.TDBUSPDrawer)
    }).catch(error => console.error('Practice highlights could not load', error));
  }
  if (document.querySelector(selector)) { load(); return; }
  // Inspect added element subtrees only; unrelated attributes/text never rescan
  // the page. Disconnect permanently as soon as the native component appears.
  observer = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node =>
      node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))))) load();
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
})();
