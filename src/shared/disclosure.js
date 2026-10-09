/* TDBDisclosure v1.0.0. State observation only; CSS owns visual feedback.
 * Components retain their own click, keyboard and accessibility controllers.
 */
(() => {
  'use strict';
  if (window.TDBDisclosure) return;
  function observe(trigger, render, read = () => trigger.getAttribute('aria-expanded') === 'true') {
    let previous;
    function sync() {
      const open = Boolean(read());
      if (open === previous) return;
      previous = open;
      render(open);
    }
    const observer = new MutationObserver(sync);
    observer.observe(trigger, { attributes: true, attributeFilter: ['aria-expanded', 'class'] });
    sync();
    return () => observer.disconnect();
  }
  window.TDBDisclosure = Object.freeze({ version: '1.0.0', observe });
})();
