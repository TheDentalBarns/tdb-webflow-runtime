/* Click-wheel trial; native labels and bound panes remain the fallback. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideWheel) return;
  const instances = new WeakMap(),
    turn = Math.PI * 2,
    step = turn / 5;
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const chapter = (angle) => ((Math.round(angle / step) % 5) + 5) % 5;
  function mount(root) {
    if (instances.has(root)) return instances.get(root);
    const choices = [...root.querySelectorAll('[data-tdb-guide-choice]')],
      ball = root.querySelector('[data-tdb-guide-ball]'),
      art = ball?.parentElement;
    const orbit = root.querySelector('.treatment-guide_orbit'),
      menu = root.querySelector('.treatment-guide_wheel'),
      number = root.querySelector('[data-tdb-guide-number]');
    if (!ball || choices.length !== 5 || !orbit || !menu)
      throw Error('Treatment guide structure missing');
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
      const values = color.match(/[\d.]+/g)?.map(Number) || [0, 0, 0];
      return [...values.slice(0, 3), values[3] ?? 1];
    };
    let active = Math.max(
      0,
      choices.findIndex((choice) => choice.classList.contains('w--current')),
    );
    const muted = rgb(
        getComputedStyle(
          choices.find((choice) => !choice.classList.contains('w--current')) || choices[0],
        ).color,
      ),
      ink = rgb(getComputedStyle(choices[active]).color);
    const weights = choices.map((_, i) => (i === active ? 1 : 0)),
      card = window.TDBTreatmentGuideCard?.mount(root, active);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('treatment-guide_finger-pad');
    const ring = document.createElementNS(svg.namespaceURI, 'circle');
    ring.setAttribute('cx', '500');
    ring.setAttribute('cy', '500');
    ring.setAttribute('r', '370');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke-width', '260');
    ring.setAttribute('data-tdb-guide-pad', '');
    svg.append(ring);
    for (let i = 0; i < 5; i++) {
      const line = document.createElementNS(svg.namespaceURI, 'line'),
        a = (i + 0.5) * step;
      line.setAttribute('x1', String(500 + Math.sin(a) * 260));
      line.setAttribute('y1', String(500 - Math.cos(a) * 260));
      line.setAttribute('x2', String(500 + Math.sin(a) * 480));
      line.setAttribute('y2', String(500 - Math.cos(a) * 480));
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.append(line);
    }
    menu.prepend(svg);
    root.classList.add('is-click-wheel');
    let radius = 100,
      outer = 140,
      cx = 0,
      cy = 0,
      angle = active * step,
      target = angle,
      velocity = 0,
      radial = 0,
      radialTarget = 0,
      radialVelocity = 0;
    let drag = null,
      raf = 0,
      last = 0,
      visible = true,
      disposed = false,
      suppressUntil = 0;
    function select(index, notify = true, direction) {
      index = ((index % 5) + 5) % 5;
      const previous = active;
      active = index;
      if (previous !== index)
        card?.update(index, direction || (wrap((index - previous) * step) < 0 ? -1 : 1));
      if (notify && !choices[index].classList.contains('w--current')) choices[index].click();
      if (number) number.textContent = String(index + 1).padStart(2, '0');
      ball.setAttribute('aria-valuenow', String(index + 1));
      ball.setAttribute('aria-valuetext', choices[index].textContent.trim());
      if (!drag) target = angle + wrap(index * step - angle);
      start();
    }
    function measure() {
      const box = art.getBoundingClientRect(),
        path = orbit.getBoundingClientRect();
      if (!box.width || !path.width) return;
      cx = box.left + box.width / 2;
      cy = box.top + box.height / 2;
      radius = path.width / 2;
      outer = box.width / 2;
      start();
    }
    function render(dt) {
      const distance = radius + radial,
        x = Math.sin(angle) * distance,
        y = -Math.cos(angle) * distance;
      ball.style.transform = `translate3d(${x.toFixed(3)}px,${(y + radius).toFixed(3)}px,0)`;
      let unsettled = false;
      choices.forEach((choice, i) => {
        const proximity = Math.abs(wrap(angle - i * step)) / step,
          glow = drag ? Math.max(i === active ? 0.6 : 0, 1 - proximity) : i === active ? 1 : 0;
        weights[i] += (glow - weights[i]) * (reduced() ? 1 : 1 - Math.exp(-dt * 11));
        if (Math.abs(glow - weights[i]) > 0.002) unsettled = true;
        choice.style.color = `rgba(${muted
          .map((value, j) => {
            const result = value + (ink[j] - value) * weights[i];
            return j === 3 ? result.toFixed(4) : Math.round(result);
          })
          .join(',')})`;
      });
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
        angle = target;
        radial = 0;
        velocity = radialVelocity = 0;
      } else {
        const steps = Math.max(1, Math.ceil(dt * 120)),
          h = dt / steps,
          k = drag ? 900 : 170,
          damping = drag ? 47 : 22;
        for (let i = 0; i < steps; i++) {
          velocity += ((target - angle) * k - velocity * damping) * h;
          angle += velocity * h;
          radialVelocity += ((radialTarget - radial) * k - radialVelocity * damping) * h;
          radial += radialVelocity * h;
        }
      }
      const colors = render(dt);
      if (
        Math.abs(target - angle) > 0.0001 ||
        Math.abs(velocity) > 0.0004 ||
        Math.abs(radialTarget - radial) > 0.025 ||
        Math.abs(radialVelocity) > 0.06 ||
        colors
      )
        start();
      else last = 0;
    }
    function start() {
      if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function begin(event) {
      if ((event.button != null && event.button !== 0) || drag) return;
      const onBall = event.target?.closest?.('[data-tdb-guide-ball]');
      if (!onBall && !menu.contains(event.target)) return;
      measure();
      const px = event.clientX - cx,
        py = event.clientY - cy,
        distance = Math.hypot(px, py);
      if (!onBall && (distance < 2 * radius - outer - 4 || distance > outer + 4)) return;
      event.preventDefault?.();
      const pointerAngle = Math.atan2(px, -py);
      target = angle + wrap(pointerAngle - angle);
      drag = {
        id: event.pointerId,
        px: event.clientX,
        py: event.clientY,
        previous: pointerAngle,
        time: performance.now(),
        velocity: 0,
        moved: false,
      };
      radialTarget =
        Math.tanh((distance - radius) / Math.max(1, outer - radius)) *
        Math.max(0, outer - radius) *
        0.18;
      root.classList.add('is-wheel-dragging');
      root.setPointerCapture?.(event.pointerId);
      select(chapter(target));
      start();
    }
    function move(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const px = event.clientX - cx,
        py = event.clientY - cy,
        pointerAngle = Math.atan2(px, -py),
        delta = wrap(pointerAngle - drag.previous),
        now = performance.now(),
        dt = Math.max(8, now - drag.time) / 1000;
      drag.velocity = drag.velocity * 0.4 + (delta / dt) * 0.6;
      drag.previous = pointerAngle;
      drag.time = now;
      if (Math.hypot(event.clientX - drag.px, event.clientY - drag.py) > 5) drag.moved = true;
      if (Math.hypot(px, py) > outer * 0.15) target += delta;
      radialTarget =
        Math.tanh((Math.hypot(px, py) - radius) / Math.max(1, outer - radius)) *
        Math.max(0, outer - radius) *
        0.18;
      select(chapter(target), true, delta < 0 ? -1 : 1);
      start();
    }
    function end(event, cancelled = false) {
      if (!drag || drag.id !== event.pointerId) return;
      const freshness = Math.max(0, 1 - (performance.now() - drag.time) / 140),
        momentum = cancelled ? 0 : Math.max(-8, Math.min(8, drag.velocity * freshness));
      const destination = Math.round((target + (cancelled ? 0 : momentum * 0.14)) / step) * step;
      if (drag.moved) suppressUntil = performance.now() + 450;
      drag = null;
      radialTarget = 0;
      velocity += momentum * 0.45;
      root.classList.remove('is-wheel-dragging');
      if (root.hasPointerCapture?.(event.pointerId)) root.releasePointerCapture(event.pointerId);
      select(chapter(destination), true, momentum < 0 ? -1 : 1);
      target = destination;
      start();
    }
    root.addEventListener('pointerdown', begin, { signal });
    document.addEventListener('pointermove', move, { passive: true, signal });
    document.addEventListener('pointerup', (event) => end(event), { signal });
    document.addEventListener('pointercancel', (event) => end(event, true), { signal });
    root.addEventListener(
      'lostpointercapture',
      (event) => {
        if (event.target === root) end(event, true);
      },
      { signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        if (
          event.target.closest?.('[data-tdb-guide-ball]') ||
          (event.isTrusted && performance.now() < suppressUntil && menu.contains(event.target))
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true, signal },
    );
    root.addEventListener(
      'dragstart',
      (event) => {
        if (menu.contains(event.target) || ball.contains(event.target)) event.preventDefault();
      },
      { signal },
    );
    choices.forEach((choice, index) =>
      choice.addEventListener('click', () => select(index, false), { signal }),
    );
    const selection = new MutationObserver(() => {
      const index = choices.findIndex((choice) => choice.classList.contains('w--current'));
      if (index >= 0 && index !== active) select(index, false);
    });
    choices.forEach((choice) =>
      selection.observe(choice, { attributes: true, attributeFilter: ['class'] }),
    );
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
    select(active, false);
    render(1);
    const api = {
      select,
      resume(seed) {
        begin({
          pointerId: seed.pointerId,
          clientX: seed.startX,
          clientY: seed.startY,
          target: ball,
        });
        move(seed);
        if (!seed.down) end(seed, seed.cancelled);
      },
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        events.abort();
        observer.disconnect();
        selection.disconnect();
        intersection.disconnect();
        card?.destroy();
        svg.remove();
        root.classList.remove('is-click-wheel', 'is-wheel-dragging');
        root.removeAttribute('data-tdb-guide-fallback');
        choices.forEach((choice) => choice.style.removeProperty('color'));
        for (const [name, value] of [
          ['style', original.style],
          ['tabindex', original.tabindex],
          ['aria-hidden', original.hidden],
        ])
          if (value == null) ball.removeAttribute(name);
          else ball.setAttribute(name, value);
        instances.delete(root);
      },
    };
    instances.set(root, api);
    return api;
  }
  window.TDBTreatmentGuideWheel = Object.freeze({ mount });
})();
