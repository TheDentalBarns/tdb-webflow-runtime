/* TDB native value tickers v1.2.1. Layout and initial text belong to Webflow. */
(() => {
  'use strict';
  if (window.TDBNativeTicker) return;
  const instances = new WeakMap();
  function mount(slot, options = {}) {
    if (instances.has(slot)) return instances.get(slot);
    const motion = window.TDBMotion.reduced;
    const originalNodes = [...slot.childNodes];
    let disposed = false, pending = null;
    const template = options.template;
    const valueClass = options.valueClass || 'review-number_value';
    const incomingClass = options.incomingClass || 'review-number_incoming';
    const normalize = options.normalize || (value => value);
    const local = className => [...slot.children].find(node => node.classList.contains(className));
    const authoredValue = local(valueClass);
    // Gallery slots can use the same class for both values; never animate one node twice.
    const authoredIncoming = [...slot.children].find(node => node !== authoredValue && node.classList.contains(incomingClass));
    let text = (authoredValue || slot).textContent.trim();
    const make = className => {
      const node = template?.querySelector('.' + className)?.cloneNode(true) || document.createElement('span');
      node.className = className;
      return node;
    };
    const value = authoredValue || make(valueClass);
    value.textContent = text;
    if (!authoredValue) slot.replaceChildren(value);
    if (authoredIncoming) authoredIncoming.setAttribute('aria-hidden', 'true');

    function settle() {
      if (!pending) return;
      const previous = pending;
      pending = null;
      previous.animations.forEach(animation => {
        animation.onfinish = null;
        animation.cancel();
      });
      value.textContent = text;
      if (previous.incoming !== authoredIncoming) previous.incoming.remove();
    }
    function update(next, direction = 1, animate = true) {
      if (disposed) return;
      next = String(next);
      if (normalize(next) === normalize(text)) return;
      settle();
      const old = text;
      text = next;
      if (!animate || motion.matches || !value.animate || !slot.isConnected) {
        value.textContent = next;
        return;
      }
      const incoming = authoredIncoming || make(incomingClass);
      incoming.textContent = next;
      incoming.setAttribute('aria-hidden', 'true');
      if (incoming.parentElement !== slot) slot.append(incoming);
      const sign = direction < 0 ? -1 : 1;
      const timing = { duration: window.TDBMotion?.defaults.ticker || 400, easing: 'ease-in-out', fill: 'both' };
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
        if (authoredValue) authoredValue.textContent = text;
        else if (slot.children.length === 1) slot.firstElementChild.textContent = text;
        else slot.textContent = text;
        instances.delete(slot);
      }
    });
    instances.set(slot, api);
    return api;
  }
  window.TDBNativeTicker = Object.freeze({ version: '1.2.1', mount });
})();
