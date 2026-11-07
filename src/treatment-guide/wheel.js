/* Ivory segment wheel; native labels and bound panes remain the fallback. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideWheel) return;
  const instances = new WeakMap(),
    turn = Math.PI * 2,
    step = turn / 5;
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const chapter = (angle) => ((Math.round(angle / step) % 5) + 5) % 5;
  let serial = 0;
  function mount(root) {
    if (instances.has(root)) return instances.get(root);
    const choices = [...root.querySelectorAll('[data-tdb-guide-choice]')],
      ball = root.querySelector('[data-tdb-guide-ball]'),
      art = ball?.parentElement;
    const orbit = root.querySelector('.treatment-guide_orbit'),
      menu = root.querySelector('.treatment-guide_wheel');
    if (!ball || choices.length !== 5 || !orbit || !menu)
      throw Error('Treatment guide structure missing');
    const events = new AbortController(),
      signal = events.signal;
    const original = {
      style: ball.getAttribute('style'),
      tabindex: ball.getAttribute('tabindex'),
      hidden: ball.getAttribute('aria-hidden'),
      menuRole: menu.getAttribute('role'),
      menuLabel: menu.getAttribute('aria-label'),
      menuTab: menu.getAttribute('tabindex'),
      size: root.style.getPropertyValue('--tdb-guide-dial-size'),
    };
    const reduced = () =>
      Boolean(window.TDBMotionPolicy?.reduced?.matches || window.TDBMotion?.reduced?.matches);
    const elapsed = (ms) => window.TDBMotionProfile?.elapsed(ms) ?? ms;
    let active = Math.max(
      0,
      choices.findIndex((choice) => choice.classList.contains('w--current')),
    );
    const weights = choices.map((_, i) => (i === active ? 1 : 0)),
      card = window.TDBTreatmentGuideCard?.mount(root, active, navigate);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('treatment-guide_finger-pad');
    const ring = document.createElementNS(svg.namespaceURI, 'circle');
    ring.setAttribute('cx', '500');
    ring.setAttribute('cy', '500');
    ring.setAttribute('r', '320');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke-width', '360');
    ring.setAttribute('data-tdb-guide-pad', '');
    const id = `tdb-guide-pressure-${++serial}`;
    const defs = document.createElementNS(svg.namespaceURI, 'defs');
    defs.innerHTML = `<radialGradient id="${id}-shade"><stop class="treatment-guide_pressure-core" offset="0" stop-opacity=".85"/><stop class="treatment-guide_pressure-dark" offset=".38" stop-opacity=".9"/><stop class="treatment-guide_pressure-dark" offset=".72" stop-opacity=".45"/><stop class="treatment-guide_pressure-dark" offset="1" stop-opacity="0"/></radialGradient><radialGradient id="${id}-light"><stop class="treatment-guide_pressure-light" offset="0" stop-opacity=".5"/><stop class="treatment-guide_pressure-light" offset="1" stop-opacity="0"/></radialGradient><clipPath id="${id}-clip"><path clip-rule="evenodd" d="M500 0A500 500 0 1 1 500 1000A500 500 0 1 1 500 0M500 360A140 140 0 1 0 500 640A140 140 0 1 0 500 360"/></clipPath>`;
    svg.append(defs, ring);
    const point = (radius, angle) =>
      `${500 + Math.sin(angle) * radius} ${500 - Math.cos(angle) * radius}`;
    const segments = choices.map((_, i) => {
      const path = document.createElementNS(svg.namespaceURI, 'path'),
        from = (i - 0.5) * step,
        to = (i + 0.5) * step;
      path.classList.add('treatment-guide_segment');
      path.setAttribute('data-guide-segment', String(i));
      path.setAttribute(
        'd',
        `M${point(500, from)}A500 500 0 0 1 ${point(500, to)}L${point(140, to)}A140 140 0 0 0 ${point(140, from)}Z`,
      );
      svg.append(path);
      return path;
    });
    const pressureClip = document.createElementNS(svg.namespaceURI, 'g'),
      pressure = document.createElementNS(svg.namespaceURI, 'g');
    pressureClip.setAttribute('clip-path', `url(#${id}-clip)`);
    pressure.classList.add('treatment-guide_pressure');
    pressure.innerHTML = `<circle cy="25" r="110" fill="url(#${id}-light)"/><circle r="100" fill="url(#${id}-shade)"/>`;
    pressureClip.append(pressure);
    svg.append(pressureClip);
    for (let i = 0; i < 5; i++) {
      const line = document.createElementNS(svg.namespaceURI, 'line'),
        a = (i + 0.5) * step;
      line.setAttribute('x1', String(500 + Math.sin(a) * 140));
      line.setAttribute('y1', String(500 - Math.cos(a) * 140));
      line.setAttribute('x2', String(500 + Math.sin(a) * 500));
      line.setAttribute('y2', String(500 - Math.cos(a) * 500));
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.append(line);
    }
    menu.prepend(svg);
    const iconLayer = document.createElement('div');
    iconLayer.className = 'treatment-guide_wheel-icons';
    iconLayer.setAttribute('aria-hidden', 'true');
    const icons = choices.map((_, i) => {
      const icon = window.TDBTreatmentGuideCard?.createArtwork?.(i);
      if (!icon) return null;
      icon.classList.add('treatment-guide_segment-icon');
      icon.style.left = `${50 + Math.sin(i * step) * 32}%`;
      icon.style.top = `${50 - Math.cos(i * step) * 32}%`;
      iconLayer.append(icon);
      return icon;
    });
    menu.append(iconLayer);
    menu.setAttribute('role', 'slider');
    menu.setAttribute('aria-label', 'Treatment guide wheel');
    menu.setAttribute('aria-valuemin', '1');
    menu.setAttribute('aria-valuemax', '5');
    menu.tabIndex = 0;
    root.classList.add('is-click-wheel', 'is-ivory-guide');
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
      suppressUntil = 0,
      pressureOpacity = 0;
    function interact() {
      window.TDBSliderFocus?.focus(root, () => Boolean(drag));
    }
    function navigate(direction) {
      interact();
      select(active + direction, true, direction);
    }
    function select(index, notify = true, direction) {
      index = ((index % 5) + 5) % 5;
      const previous = active;
      active = index;
      if (previous !== index)
        card?.update(index, direction || (wrap((index - previous) * step) < 0 ? -1 : 1));
      if (notify && !choices[index].classList.contains('w--current')) choices[index].click();
      menu.setAttribute('aria-valuenow', String(index + 1));
      menu.setAttribute('aria-valuetext', choices[index].textContent.trim());
      if (!drag) target = angle + wrap(index * step - angle);
      start();
    }
    function measure() {
      const box = art.getBoundingClientRect();
      if (!box.width) return;
      cx = box.left + box.width / 2;
      cy = box.top + box.height / 2;
      radius = box.width * 0.32;
      outer = box.width / 2;
      root.style.setProperty('--tdb-guide-dial-size', `${box.width}px`);
      start();
    }
    function render(dt) {
      const distance = radius + radial,
        x = Math.sin(angle) * distance,
        y = -Math.cos(angle) * distance;
      pressure.setAttribute(
        'transform',
        `translate(${500 + (x / outer) * 500} ${500 + (y / outer) * 500})`,
      );
      let unsettled = false;
      segments.forEach((segment, i) => {
        // The whole sector follows the selected card while the pressure follows the spring.
        const glow = i === active ? (drag ? 0.72 : 1) : 0;
        weights[i] += (glow - weights[i]) * (reduced() ? 1 : 1 - Math.exp(-dt * 11));
        if (Math.abs(glow - weights[i]) > 0.002) unsettled = true;
        else weights[i] = glow;
        segment.style.opacity = weights[i].toFixed(4);
        if (icons[i]) icons[i].style.opacity = (0.28 + weights[i] * 0.7).toFixed(4);
      });
      const pressed = drag ? 1 : 0;
      pressureOpacity += (pressed - pressureOpacity) * (reduced() ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(pressed - pressureOpacity) > 0.002) unsettled = true;
      else pressureOpacity = pressed;
      pressure.style.opacity = pressureOpacity.toFixed(4);
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
      if (event.target?.closest?.('[data-tdb-guide-nav]')) return;
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
      interact();
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
      choice.addEventListener(
        'click',
        (event) => {
          if (event.isTrusted) interact();
          select(index, false);
        },
        { signal },
      ),
    );
    root.addEventListener(
      'click',
      (event) => {
        if (event.target.closest?.('[data-tdb-guide-open]')) interact();
      },
      { signal },
    );
    const selection = new MutationObserver(() => {
      const index = choices.findIndex((choice) => choice.classList.contains('w--current'));
      if (index >= 0 && index !== active) select(index, false);
    });
    choices.forEach((choice) =>
      selection.observe(choice, { attributes: true, attributeFilter: ['class'] }),
    );
    menu.addEventListener(
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
        interact();
        select(keys[event.key]);
        menu.focus({ preventScroll: true });
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
    ball.setAttribute('aria-hidden', 'true');
    ball.tabIndex = -1;
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
          target: menu,
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
        window.TDBSliderFocus?.release(root);
        for (const [name, value] of [
          ['role', original.menuRole],
          ['aria-label', original.menuLabel],
          ['tabindex', original.menuTab],
        ])
          if (value == null) menu.removeAttribute(name);
          else menu.setAttribute(name, value);
        svg.remove();
        iconLayer.remove();
        root.classList.remove('is-click-wheel', 'is-ivory-guide', 'is-wheel-dragging');
        if (original.size) root.style.setProperty('--tdb-guide-dial-size', original.size);
        else root.style.removeProperty('--tdb-guide-dial-size');
        for (const attribute of [
          'aria-valuemin',
          'aria-valuemax',
          'aria-valuenow',
          'aria-valuetext',
        ])
          menu.removeAttribute(attribute);
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
