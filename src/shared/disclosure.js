/* TDBDisclosure v1.1.0. Shared state observation and opt-in accordions.
 * Answer space changes once; CSS animates only the reveal and chevron.
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
  const mounted = new WeakMap();
  function mount(trigger) {
    if (mounted.has(trigger)) return mounted.get(trigger);
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel?.hasAttribute('data-tdb-disclosure-panel')) return null;
    function set(open) {
      panel.hidden = !open;
      panel.inert = !open;
      trigger.setAttribute('aria-expanded', String(open));
    }
    const click = event => {
      if (event.defaultPrevented || trigger.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      set(trigger.getAttribute('aria-expanded') !== 'true');
    };
    const nativeButton = trigger.tagName === 'BUTTON';
    const keydown = event => {
      if (nativeButton || !['Enter', ' '].includes(event.key)) return;
      if (event.repeat) event.preventDefault();
      else click(event);
    };
    trigger.addEventListener('click', click);
    if (!nativeButton) trigger.addEventListener('keydown', keydown);
    set(trigger.getAttribute('aria-expanded') === 'true');
    const api = Object.freeze({ set, destroy() {
      trigger.removeEventListener('click', click);
      trigger.removeEventListener('keydown', keydown);
      mounted.delete(trigger);
    } });
    mounted.set(trigger, api);
    return api;
  }
  function refresh(root = document) {
    root.querySelectorAll('[data-tdb-disclosure-trigger]').forEach(mount);
  }
  window.TDBDisclosure = Object.freeze({ version: '1.1.0', observe, mount, refresh });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => refresh(), { once: true });
  else refresh();
})();
