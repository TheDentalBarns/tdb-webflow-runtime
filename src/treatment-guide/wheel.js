/* Pressure and interaction only; the resting wheel and CMS card live in Designer. */
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
      art = root.querySelector('.treatment-guide_dial-art');
    const menu = root.querySelector('.treatment-guide_wheel'),
      svg = art?.querySelector('.treatment-guide_finger-pad'),
      segments = [...(svg?.querySelectorAll('[data-guide-segment]') || [])];
    if (!art || choices.length !== 5 || segments.length !== 5 || !menu)
      throw Error('Treatment guide structure missing');
    // Webflow exports its built-in tab durations even when custom attributes
    // override them in Designer. Keep native tab selection/ARIA, but give the
    // card renderer sole ownership of animation while this wheel is mounted.
    const tabs = root.querySelector('.treatment-guide_tabs');
    const tabState = () => tabs && window.jQuery?.data?.(tabs, '.w-tabs');
    const tabAttributes =
      tabs &&
      ['data-duration-in', 'data-duration-out'].map((name) => [name, tabs.getAttribute(name)]);
    const tabMotion = tabs && {
      intro: Number.parseInt(tabAttributes[0][1], 10) || 0,
      outro: Number.parseInt(tabAttributes[1][1], 10) || 0,
    };
    if (tabs) {
      for (const [name] of tabAttributes) tabs.setAttribute(name, '0');
      const config = tabState()?.config;
      if (config) Object.assign(config, { intro: 0, outro: 0, immediate: true });
    }
    const events = new AbortController(),
      signal = events.signal;
    const original = {
      menuRole: menu.getAttribute('role'),
      menuLabel: menu.getAttribute('aria-label'),
      menuTab: menu.getAttribute('tabindex'),
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
    const indentation = window.TDBTreatmentGuidePressure.create(svg);
    svg.insertBefore(indentation.layer, svg.querySelector('.treatment-guide_divider'));
    const icons = choices;
    menu.setAttribute('role', 'slider');
    menu.setAttribute('aria-label', 'Treatment guide wheel');
    menu.setAttribute('aria-valuemin', '1');
    menu.setAttribute('aria-valuemax', '5');
    menu.tabIndex = 0;
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
      suppressUntil = 0,
      pressureOpacity = 0,
      preview = null,
      previewTimer = 0,
      previewEligible = false,
      previewPlayed = false,
      interacted = false;
    function stopPreview(permanent = false) {
      if (permanent) interacted = true;
      clearTimeout(previewTimer);
      previewTimer = 0;
      if (!preview) return;
      angle = preview.angle;
      target = angle + wrap(active * step - angle);
      velocity = 0;
      preview = null;
      root.classList.remove('is-wheel-previewing');
      if (!visible || document.hidden || reduced()) {
        angle = target;
        pressureOpacity = 0;
        render(1);
      }
      start();
    }
    function preparePreview() {
      if (
        disposed ||
        interacted ||
        previewPlayed ||
        previewTimer ||
        !previewEligible ||
        document.hidden ||
        reduced() ||
        drag
      )
        return;
      previewTimer = setTimeout(() => {
        previewTimer = 0;
        if (
          disposed ||
          interacted ||
          previewPlayed ||
          !previewEligible ||
          document.hidden ||
          reduced()
        )
          return;
        previewPlayed = true;
        preview = { elapsed: 0, origin: angle, angle };
        root.classList.add('is-wheel-previewing');
        start();
      }, 400);
    }
    function interact() {
      stopPreview(true);
      window.TDBSliderFocus?.focus(root, () => Boolean(drag));
    }
    function navigate(direction) {
      interact();
      select(active + direction, true, direction);
    }
    function select(index, notify = true, direction) {
      index = ((index % 5) + 5) % 5;
      const previous = active;
      if (previous !== index) stopPreview(true);
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
      start();
    }
    function radialOffset(distance) {
      // The indentation follows the finger to either boundary of the annulus.
      const reach = Math.max(0, outer - radius);
      return Math.max(-reach, Math.min(reach, distance - radius));
    }
    function render(dt) {
      const distance = radius + radialOffset(radius + radial),
        shownAngle = preview?.angle ?? angle,
        x = Math.sin(shownAngle) * distance,
        y = -Math.cos(shownAngle) * distance;
      let unsettled = false;
      const focus = preview ? chapter(shownAngle) : active;
      segments.forEach((segment, i) => {
        // The preview hints at each sector without changing the reader's chapter.
        const glow = i === focus ? (drag ? 0.72 : 1) : 0;
        weights[i] += (glow - weights[i]) * (reduced() ? 1 : 1 - Math.exp(-dt * 11));
        if (Math.abs(glow - weights[i]) > 0.002) unsettled = true;
        else weights[i] = glow;
        segment.style.opacity = weights[i].toFixed(4);
        if (icons[i]) icons[i].style.opacity = (0.28 + weights[i] * 0.7).toFixed(4);
      });
      const pressed = drag ? 1 : preview ? 0.65 : 0;
      pressureOpacity += (pressed - pressureOpacity) * (reduced() ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(pressed - pressureOpacity) > 0.002) unsettled = true;
      else pressureOpacity = pressed;
      indentation.render(500 + (x / outer) * 500, 500 + (y / outer) * 500, pressureOpacity);
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
      if (preview) {
        if (reduced()) stopPreview();
        else {
          preview.elapsed += elapsed(ms);
          const ease = (value) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, value)))) / 2;
          const progress =
            preview.elapsed < 950
              ? ease(preview.elapsed / 950)
              : preview.elapsed < 1100
                ? 1
                : 1 - ease((preview.elapsed - 1100) / 1100);
          preview.angle = preview.origin + step * 2 * progress;
          if (preview.elapsed >= 2200) stopPreview();
        }
      }
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
        preview ||
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
      if (!menu.contains(event.target) && !svg.contains(event.target)) return;
      measure();
      const px = event.clientX - cx,
        py = event.clientY - cy,
        distance = Math.hypot(px, py);
      if (distance < 2 * radius - outer - 4 || distance > outer + 4) return;
      event.preventDefault?.();
      stopPreview(true);
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
      radialTarget = radialOffset(distance);
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
      radialTarget = radialOffset(Math.hypot(px, py));
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
    root.addEventListener('focusin', () => stopPreview(true), { signal });
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
          event.isTrusted &&
          performance.now() < suppressUntil &&
          (menu.contains(event.target) || svg.contains(event.target))
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
        if (menu.contains(event.target) || svg.contains(event.target)) event.preventDefault();
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
    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        previewEligible = visible && entries[0].intersectionRatio >= 0.55;
        if (!previewEligible) stopPreview();
        if (visible) {
          measure();
          preparePreview();
          start();
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
          last = 0;
        }
      },
      { threshold: [0, 0.55] },
    );
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
        if (document.hidden) stopPreview();
        else {
          preparePreview();
          start();
        }
      },
      { signal },
    );
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
        clearTimeout(previewTimer);
        cancelAnimationFrame(raf);
        events.abort();
        observer.disconnect();
        selection.disconnect();
        intersection.disconnect();
        card?.destroy();
        if (tabs) {
          for (const [name, value] of tabAttributes)
            if (value === null) tabs.removeAttribute(name);
            else tabs.setAttribute(name, value);
          const config = tabState()?.config;
          if (config)
            Object.assign(config, tabMotion, { immediate: !tabMotion.intro && !tabMotion.outro });
        }
        window.TDBSliderFocus?.release(root);
        for (const [name, value] of [
          ['role', original.menuRole],
          ['aria-label', original.menuLabel],
          ['tabindex', original.menuTab],
        ])
          if (value == null) menu.removeAttribute(name);
          else menu.setAttribute(name, value);
        indentation.destroy();
        root.classList.remove('is-click-wheel', 'is-wheel-dragging', 'is-wheel-previewing');
        for (const attribute of [
          'aria-valuemin',
          'aria-valuemax',
          'aria-valuenow',
          'aria-valuetext',
        ])
          menu.removeAttribute(attribute);
        root.removeAttribute('data-tdb-guide-fallback');
        choices.forEach((choice) => choice.style.removeProperty('opacity'));
        segments.forEach((segment) => segment.style.removeProperty('opacity'));
        instances.delete(root);
      },
    };
    instances.set(root, api);
    return api;
  }
  window.TDBTreatmentGuideWheel = Object.freeze({ mount });
})();
