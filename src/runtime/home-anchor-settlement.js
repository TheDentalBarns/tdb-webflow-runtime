/* Let Webflow's native home section link settle during Lenis wheel inertia. */
(() => {
  'use strict';
  if (document.documentElement.dataset.wfPage !== '677cf86df9952f978d94d8a9') return;
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href="#All-treatments"]');
    if (!link || !document.getElementById('All-treatments')) return;
    // Lenis ignores native scroll events while its smooth animation is active.
    // Stop that old wheel trajectory before Webflow performs its anchor scroll.
    // Webflow continues to own the destination, focus, history and link behavior.
    if (window.lenis?.isScrolling === 'smooth') window.lenis.reset();
  }, true);
})();
