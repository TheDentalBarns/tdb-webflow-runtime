/* TDBDisclosure v1.2.0. Shared state observation and opt-in accordions.
 * Answer space changes once; CSS owns the reveal, chevron and small gap finish.
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
  let sequence = 0;
  function identify(node) {
    if (!node.id || document.getElementById(node.id) !== node) {
      let id;
      do { id = 'tdb-disclosure-' + ++sequence; } while (document.getElementById(id));
      node.id = id;
    }
    return node.id;
  }
  function mount(trigger) {
    if (mounted.has(trigger)) return mounted.get(trigger);
    // Prefer the authored sibling: copied components can initially repeat IDs.
    const sibling = trigger.nextElementSibling;
    const panel = sibling?.hasAttribute('data-tdb-disclosure-panel')
      ? sibling : document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel?.hasAttribute('data-tdb-disclosure-panel')) return null;
    trigger.setAttribute('aria-controls', identify(panel));
    panel.setAttribute('aria-labelledby', identify(trigger));
    function set(open) {
      open = Boolean(open);
      if (!open && panel.contains(document.activeElement)) trigger.focus({ preventScroll: true });
      panel.hidden = !open;
      panel.inert = !open;
      panel.setAttribute('aria-hidden', String(!open));
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
    if (root.matches?.('[data-tdb-disclosure-trigger]')) mount(root);
    root.querySelectorAll('[data-tdb-disclosure-trigger]').forEach(mount);
  }
  window.TDBDisclosure = Object.freeze({ version: '1.2.0', observe, mount, refresh });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => refresh(), { once: true });
  else refresh();
})();
