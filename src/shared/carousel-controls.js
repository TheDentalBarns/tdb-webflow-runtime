/* Shared carousel input v1.0.0. Adapters retain their navigation decisions. */
(() => {
  'use strict';
  if (window.TDBCarouselControls) return;
  const editable = 'input,textarea,select,[contenteditable="true"]';
  function bind({root, previous, next, navigate, enabled = () => true, signal}) {
    for (const [button, direction] of [[previous, -1], [next, 1]]) {
      if (!button) continue;
      button.setAttribute('role', 'button'); button.tabIndex = 0;
      const activate = event => {
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
        // Native buttons already dispatch their own keyboard click.
        if (event.type === 'keydown' && button.tagName === 'BUTTON') return;
        event.preventDefault();
        if (enabled() && !button.matches(':disabled,[aria-disabled="true"]') && !button.closest('[inert]')) navigate(direction);
      };
      button.addEventListener('click', activate, {signal});
      button.addEventListener('keydown', activate, {signal});
    }
    root.addEventListener('keydown', event => {
      if (event.defaultPrevented || !enabled() || event.target.closest(editable) ||
          event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1);
    }, {signal});
  }
  window.TDBCarouselControls = Object.freeze({version: '1.0.0', bind});
})();
