/* TDB native value tickers v1.0.0. Layout and initial text belong to Webflow. */
(() => {
  'use strict';
  if (window.TDBNativeTicker) return;
  const instances = new WeakMap();
  function mount(slot) {
    if (instances.has(slot)) return instances.get(slot);
    const motion = window.TDBMotion.reduced;
    const originalNodes = [...slot.childNodes];
    let text = slot.textContent.trim(), disposed = false, pending = null;
    const value = document.createElement('span');
    value.className = 'review-number_value';
    value.textContent = text;
    slot.replaceChildren(value);

    function settle() {
      if (!pending) return;
      const previous = pending;
      pending = null;
      previous.animations.forEach(animation => {
        animation.onfinish = null;
        animation.cancel();
      });
      value.textContent = text;
      previous.incoming.remove();
    }
    function update(next, direction = 1, animate = true) {
      if (disposed) return;
      next = String(next);
      if (next === text) return;
      settle();
      const old = text;
      text = next;
      if (!animate || motion.matches || !value.animate || !slot.isConnected) {
        value.textContent = next;
        return;
      }
      const incoming = document.createElement('span');
      incoming.className = 'review-number_incoming';
      incoming.textContent = next;
      incoming.setAttribute('aria-hidden', 'true');
      slot.append(incoming);
      const sign = direction < 0 ? -1 : 1;
      const timing = { duration: 400, easing: 'ease-in-out', fill: 'both' };
      value.textContent = old;
      const transition = { incoming, animations: [] };
      pending = transition;
      try {
        transition.animations.push(value.animate([
          { transform: 'translateY(0)' }, { transform: `translateY(${-sign * 100}%)` }
        ], timing));
        transition.animations.push(incoming.animate([
          { transform: `translateY(${sign * 100}%)` }, { transform: 'translateY(0)' }
        ], timing));
        transition.animations[1].onfinish = () => { if (pending === transition) settle(); };
      } catch (_) { settle(); }
    }
    function onMotion() { if (motion.matches) settle(); }
    motion.addEventListener('change', onMotion);
    const api = Object.freeze({
      update, settle,
      destroy() {
        if (disposed) return;
        settle();
        disposed = true;
        motion.removeEventListener('change', onMotion);
        // Keep the settled number; never rewind to the understated initial value.
        slot.replaceChildren(...originalNodes);
        if (slot.children.length === 1) slot.firstElementChild.textContent = text;
        else slot.textContent = text;
        instances.delete(slot);
      }
    });
    instances.set(slot, api);
    return api;
  }
  window.TDBNativeTicker = Object.freeze({ version: '1.0.0', mount });
})();
