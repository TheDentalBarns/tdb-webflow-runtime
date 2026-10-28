/* TDB native value tickers v1.4.0. Layout and initial text belong to Webflow. */
(() => {
  'use strict';
  if (window.TDBNativeTicker) return;
  const instances = new WeakMap();
  function mount(slot, options = {}) {
    if (instances.has(slot)) return instances.get(slot);
    const motion = window.TDBMotion.reduced;
    const originalNodes = [...slot.childNodes];
    let disposed = false,
      pending = null;
    const template = options.template;
    const valueClass = options.valueClass || 'review-number_value';
    const incomingClass = options.incomingClass || 'review-number_incoming';
    const normalize = options.normalize || ((value) => value);
    const local = (className) =>
      [...slot.children].find((node) => node.classList.contains(className));
    const authoredValue = local(valueClass);
    // Gallery slots can use the same class for both values; never animate one node twice.
    const authoredIncoming = [...slot.children].find(
      (node) => node !== authoredValue && node.classList.contains(incomingClass),
    );
    let text = (authoredValue || slot).textContent.trim();
    const make = (className) => {
      const node =
        template?.querySelector('.' + className)?.cloneNode(true) || document.createElement('span');
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
      previous.animations.forEach((animation) => {
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
      const timing = {
        duration:
          window.TDBMotion?.defaults[options.durationKey || 'ticker'] ||
          window.TDBMotion?.defaults.ticker ||
          (window.TDBMotionProfile?.time(400) ?? 400),
        easing: window.TDBMotionProfile?.easing('control', 'ease-in-out') || 'ease-in-out',
        fill: 'both',
      };
      value.textContent = old;
      const transition = { incoming, animations: [] };
      pending = transition;
      try {
        transition.animations.push(
          value.animate(
            [{ transform: 'translateY(0)' }, { transform: `translateY(${-sign * 100}%)` }],
            timing,
          ),
        );
        transition.animations.push(
          incoming.animate(
            [{ transform: `translateY(${sign * 100}%)` }, { transform: 'translateY(0)' }],
            timing,
          ),
        );
        transition.animations[1].onfinish = () => {
          if (pending === transition) settle();
        };
      } catch (_) {
        settle();
      }
    }
    function onMotion() {
      if (motion.matches) settle();
    }
    function sequence(values, direction = -1, animate = true) {
      if (disposed || !Array.isArray(values) || !values.length) return;
      settle();
      const rows = [text];
      for (const next of values.map(String))
        if (normalize(next) !== normalize(rows.at(-1))) rows.push(next);
      if (rows.length === 1) return;
      text = rows.at(-1);
      if (!animate || motion.matches || !value.animate || !slot.isConnected || rows.length > 32) {
        value.textContent = text;
        return;
      }
      // One bounded strip, one uninterrupted travel curve. No per-value timers
      // or repeated easing; the authored value still reserves the slot geometry.
      const track = make(incomingClass);
      track.setAttribute('aria-hidden', 'true');
      track.style.height = '100%';
      const down = direction < 0;
      track.replaceChildren(
        ...(down ? [...rows].reverse() : rows).map((label) => {
          const row = make(valueClass);
          row.textContent = label;
          row.style.height = '100%';
          return row;
        }),
      );
      slot.append(track);
      const travel = -(rows.length - 1) * 100;
      const timing = {
        duration:
          window.TDBMotion.defaults.tickerFlow || (window.TDBMotionProfile?.time(1400) ?? 1400),
        easing: window.TDBMotion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
        fill: 'both',
      };
      const transition = { incoming: track, animations: [] };
      pending = transition;
      try {
        transition.animations.push(value.animate([{ opacity: 0 }, { opacity: 0 }], timing));
        transition.animations.push(
          track.animate(
            [
              { transform: `translateY(${down ? travel : 0}%)` },
              { transform: `translateY(${down ? 0 : travel}%)` },
            ],
            timing,
          ),
        );
        transition.animations[1].onfinish = () => {
          if (pending === transition) settle();
        };
      } catch (_) {
        settle();
      }
    }
    motion.addEventListener('change', onMotion);
    const api = Object.freeze({
      update,
      sequence,
      settle,
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
      },
    });
    instances.set(slot, api);
    return api;
  }
  window.TDBNativeTicker = Object.freeze({ version: '1.4.0', mount });
})();
