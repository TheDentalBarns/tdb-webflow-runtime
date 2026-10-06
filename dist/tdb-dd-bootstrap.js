/* DD migration bridge v1.0.0. Inline in HEAD before Webflow's runtime.
 * Designer retains native nodes, CMS/prop bindings and appearance. Only the
 * audited DD-only interaction handles are disconnected on the published DOM.
 * Remove this bridge after deleting DD action lists in Designer (IX2 has no
 * supported deletion API). Native data-tdb-dd-page markers remain permanent.
 */
(() => {
  'use strict';
  if (window.TDBDDBootstrap) return;
  const selector = '[data-tdb-dd-legacy][data-w-id]';
  function detach(node) {
    const id = node.getAttribute('data-w-id');
    if (id) { node.setAttribute('data-tdb-dd-previous-id', id); node.removeAttribute('data-w-id'); }
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches(selector)) detach(root);
    root.querySelectorAll(selector).forEach(detach);
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') scan(record.target);
      else record.addedNodes.forEach(scan);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true,
    attributes: true, attributeFilter: ['data-w-id','data-tdb-dd-legacy'] });
  scan(document.documentElement);
  window.TDBDDBootstrap = Object.freeze({ version: '1.0.0', scan });
})();
