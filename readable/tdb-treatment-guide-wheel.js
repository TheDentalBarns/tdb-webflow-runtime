/* Optional spring wheel. Native tabs own selection/content; no CMS text is copied here. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideWheel) return;
  const instances = new WeakMap();
  function mount(root) {
    if (instances.has(root)) return instances.get(root);
    const choices = [...root.querySelectorAll('[data-tdb-guide-choice]')];
    const ball = root.querySelector('[data-tdb-guide-ball]');
    const art = ball?.parentElement,
      orbit = root.querySelector('.treatment-guide_orbit');
    const number = root.querySelector('[data-tdb-guide-number]');
    const positions = [...root.querySelectorAll('[data-tdb-guide-position]')].map((slot) =>
      window.TDBNativeTicker?.mount(slot, {
        valueClass: 'treatment-guide_number-value',
        incomingClass: 'treatment-guide_number-incoming',
      }),
    );
    if (!ball || choices.length !== 5 || !orbit)
      throw Error('Treatment guide wheel structure missing');
    const events = new AbortController(),
      signal = events.signal;
    const original = {
      style: ball.getAttribute('style'),
      tabindex: ball.getAttribute('tabindex'),
      hidden: ball.getAttribute('aria-hidden'),
    };
    const reduced = () =>
      Boolean(window.TDBMotionPolicy?.reduced?.matches || window.TDBMotion?.reduced?.matches);
    const elapsed = (ms) => window.TDBMotionProfile?.elapsed(ms) ?? ms;
    const rgb = (color) => {
      const values = color.match(/[\d.]+/g)?.map(Number) || [100, 100, 100];
      return [...values.slice(0, 3), values[3] ?? 1];
    };
    const muted = rgb(
      getComputedStyle(choices.find((c) => !c.classList.contains('w--current')) || choices[0])
        .color,
    );
    const ink = rgb(getComputedStyle(ball.firstElementChild || ball).backgroundColor);
    let active = Math.max(
      0,
      choices.findIndex((c) => c.classList.contains('w--current')),
    );
    let radius = 100,
      cx = 0,
      cy = 0,
      x = 0,
      y = -radius,
      vx = 0,
      vy = 0;
    let tx = 0,
      ty = -radius,
      drag = null,
      raf = 0,
      last = 0,
      visible = true,
      disposed = false;
    const weights = choices.map((_, i) => (i === active ? 1 : 0));
    const home = (index) => ({
      x: Math.sin((index * Math.PI * 2) / 5) * radius,
      y: -Math.cos((index * Math.PI * 2) / 5) * radius,
    });
    const nearest = (px, py) =>
      ((Math.round(Math.atan2(px, -py) / ((Math.PI * 2) / 5)) % 5) + 5) % 5;
    function select(index, notify = true) {
      index = ((index % 5) + 5) % 5;
      const previous = active;
      active = index;
      if (previous !== index && positions[index]) {
        positions[index].update(String(previous + 1).padStart(2, '0'), 1, false);
        positions[index].update(String(index + 1).padStart(2, '0'), index > previous ? 1 : -1);
      }
      if (notify && !choices[index].classList.contains('w--current')) choices[index].click();
      if (number) number.textContent = String(index + 1).padStart(2, '0');
      ball.setAttribute('aria-valuenow', String(index + 1));
      ball.setAttribute('aria-valuetext', choices[index].textContent.trim());
      if (!drag) ({ x: tx, y: ty } = home(active));
      start();
    }
    function measure() {
      const box = art.getBoundingClientRect(),
        ring = orbit.getBoundingClientRect();
      if (!box.width || !ring.width) return;
      cx = box.left + box.width / 2;
      cy = box.top + box.height / 2;
      const scale = ring.width / 2 / radius;
      radius = ring.width / 2;
      x *= scale;
      y *= scale;
      vx *= scale;
      vy *= scale;
      if (!drag) ({ x: tx, y: ty } = home(active));
      start();
    }
    function render(dt) {
      ball.style.transform = `translate3d(${x.toFixed(3)}px,${(y + radius).toFixed(3)}px,0)`;
      const speed = Math.hypot(vx, vy);
      const core = ball.firstElementChild;
      if (core) core.style.transform = `scale(${(1 + Math.min(0.14, speed / 9000)).toFixed(3)})`;
      let unsettled = false;
      for (let i = 0; i < 5; i++) {
        const point = home(i),
          distance = Math.hypot(x - point.x, y - point.y) / radius;
        const glow = drag
          ? Math.max(i === active ? 0.6 : 0, 1 - distance / 1.05)
          : i === active
            ? 1
            : 0;
        weights[i] += (glow - weights[i]) * (reduced() ? 1 : 1 - Math.exp(-dt * 11));
        if (Math.abs(glow - weights[i]) > 0.002) unsettled = true;
        choices[i].style.color = `rgba(${muted
          .map((c, j) => {
            const value = c + (ink[j] - c) * weights[i];
            return j === 3 ? value.toFixed(4) : Math.round(value);
          })
          .join(',')})`;
      }
      return unsettled;
    }
    function frame(now) {
      raf = 0;
      if (disposed || !visible || document.hidden) {
        last = 0;
        return;
      }
      const ms = Math.min(40, last ? now - last : 16);
      last = now;
      const dt = Math.max(0.001, (drag ? ms : elapsed(ms)) / 1000);
      if (reduced() && !drag) {
        x = tx;
        y = ty;
        vx = vy = 0;
      } else {
        const steps = Math.max(1, Math.ceil(dt * 120)),
          h = dt / steps;
        const stiffness = drag ? 900 : 180,
          damping = drag ? 47 : 22;
        for (let i = 0; i < steps; i++) {
          vx += ((tx - x) * stiffness - vx * damping) * h;
          vy += ((ty - y) * stiffness - vy * damping) * h;
          x += vx * h;
          y += vy * h;
        }
      }
      const colors = render(dt);
      if (Math.hypot(tx - x, ty - y) > 0.025 || Math.hypot(vx, vy) > 0.06 || colors) start();
      else {
        last = 0;
      }
    }
    function start() {
      if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function begin(event) {
      if ((event.button != null && event.button !== 0) || drag) return;
      event.preventDefault?.();
      measure();
      drag = {
        id: event.pointerId,
        ox: x - (event.clientX - cx),
        oy: y - (event.clientY - cy),
        px: event.clientX,
        py: event.clientY,
        time: performance.now(),
        vx: 0,
        vy: 0,
      };
      ball.style.cursor = 'grabbing';
      ball.setPointerCapture?.(event.pointerId);
      start();
    }
    function move(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const now = performance.now(),
        dt = Math.max(8, now - drag.time) / 1000;
      drag.vx = drag.vx * 0.35 + ((event.clientX - drag.px) / dt) * 0.65;
      drag.vy = drag.vy * 0.35 + ((event.clientY - drag.py) / dt) * 0.65;
      drag.px = event.clientX;
      drag.py = event.clientY;
      drag.time = now;
      tx = event.clientX - cx + drag.ox;
      ty = event.clientY - cy + drag.oy;
      const distance = Math.hypot(tx, ty),
        limit = radius * 2.05;
      if (distance > limit) {
        const factor = (limit + Math.sqrt((distance - limit) * radius * 0.25)) / distance;
        tx *= factor;
        ty *= factor;
      }
      if (Math.hypot(tx, ty) > radius * 0.3) select(nearest(tx, ty));
      start();
    }
    function end(event, cancelled = false) {
      if (!drag || drag.id !== event.pointerId) return;
      const freshness = Math.max(0, 1 - (performance.now() - drag.time) / 140);
      const dx = Math.max(-1800, Math.min(1800, drag.vx * freshness));
      const dy = Math.max(-1800, Math.min(1800, drag.vy * freshness));
      const chosen = cancelled ? active : nearest(tx + dx * 0.105, ty + dy * 0.105);
      drag = null;
      if (!cancelled) {
        vx += dx * 0.35;
        vy += dy * 0.35;
      }
      ball.style.cursor = 'grab';
      if (ball.hasPointerCapture?.(event.pointerId)) ball.releasePointerCapture(event.pointerId);
      select(chosen);
    }
    choices.forEach((choice, index) =>
      choice.addEventListener('click', () => select(index, false), { signal }),
    );
    // Webflow also changes tabs through its own arrow-key handler, without a click.
    const selection = new MutationObserver(() => {
      const index = choices.findIndex((choice) => choice.classList.contains('w--current'));
      if (index >= 0 && index !== active) select(index, false);
    });
    choices.forEach((choice) =>
      selection.observe(choice, { attributes: true, attributeFilter: ['class'] }),
    );
    ball.addEventListener('pointerdown', begin, { signal });
    document.addEventListener('pointermove', move, { passive: true, signal });
    document.addEventListener('pointerup', (event) => end(event), { signal });
    document.addEventListener('pointercancel', (event) => end(event, true), { signal });
    ball.addEventListener('lostpointercapture', (event) => end(event, true), { signal });
    ball.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
    ball.addEventListener('click', (event) => event.preventDefault(), { signal });
    ball.addEventListener(
      'keydown',
      (event) => {
        const keys = {
          ArrowRight: active + 1,
          ArrowDown: active + 1,
          ArrowLeft: active - 1,
          ArrowUp: active - 1,
          Home: 0,
          End: 4,
        };
        if (!(event.key in keys)) return;
        event.preventDefault();
        select(keys[event.key]);
        ball.focus({ preventScroll: true });
      },
      { signal },
    );
    const observer = new ResizeObserver(measure);
    observer.observe(art);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        measure();
        start();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    });
    intersection.observe(art);
    window.addEventListener(
      'scroll',
      () => {
        if (drag) measure();
      },
      { passive: true, signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && drag) end({ pointerId: drag.id }, true);
        if (!document.hidden) start();
      },
      { signal },
    );
    ball.removeAttribute('aria-hidden');
    ball.tabIndex = 0;
    ball.setAttribute('role', 'slider');
    ball.setAttribute('aria-valuemin', '1');
    ball.setAttribute('aria-valuemax', '5');
    measure();
    ({ x, y } = home(active));
    select(active, false);
    render(1);
    const api = {
      select,
      resume(seed) {
        begin({ pointerId: seed.pointerId, clientX: seed.startX, clientY: seed.startY });
        move(seed);
        if (!seed.down) end(seed, seed.cancelled);
      },
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        events.abort();
        observer.disconnect();
        selection.disconnect();
        positions.forEach((ticker) => ticker?.destroy());
        intersection.disconnect();
        choices.forEach((choice) => choice.style.removeProperty('color'));
        for (const [name, value] of [
          ['style', original.style],
          ['tabindex', original.tabindex],
          ['aria-hidden', original.hidden],
        ])
          if (value == null) ball.removeAttribute(name);
          else ball.setAttribute(name, value);
        ball.firstElementChild?.style.removeProperty('transform');
        instances.delete(root);
      },
    };
    instances.set(root, api);
    return api;
  }
  window.TDBTreatmentGuideWheel = Object.freeze({ mount });
})();
