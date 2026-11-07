/* Enhance the native CMS card. Designer owns every resting element and its space. */
window.TDBTreatmentGuideCard ||= (() => {
  function mount(root, initial, navigate) {
    const panes = [...root.querySelectorAll('[data-tdb-guide-panel]')],
      content = root.querySelector('.treatment-guide_content'),
      pagination = root.querySelector('[data-tdb-guide-pagination]');
    if (panes.length !== 5 || !content || !pagination) return null;
    const events = new AbortController(),
      rows = panes.map((pane) => ({
        pane,
        title: pane.querySelector('[data-tdb-guide-title]'),
        summary: pane.querySelector('[data-tdb-guide-summary]'),
        button: pane.querySelector('[data-tdb-guide-open]'),
        icon: pane.querySelector('.treatment-guide_cta-icon'),
      }));
    if (rows.some((row) => !row.title || !row.summary || !row.button || !row.icon)) return null;
    // Reuse the Designer artwork inside a fixed-size ticker slot, not another card.
    const artwork = rows.map((row) => row.icon.firstElementChild.cloneNode(true));
    const iconTickers = rows.map((row, index) => {
      const ticker = window.TDBNativeTicker.mount(row.icon, {
        valueClass: 'treatment-guide_icon-value',
        incomingClass: 'treatment-guide_icon-incoming',
        render(node, value) {
          node.replaceChildren(artwork[Number(value) || 0].cloneNode(true));
        },
      });
      ticker.update(String(index), 1, false);
      row.button.setAttribute('aria-haspopup', 'dialog');
      row.button.setAttribute('aria-label', 'Learn more about ' + row.title.textContent.trim());
      return ticker;
    });
    const ticker = window.TDBNativeTicker.mount(
      pagination.querySelector('[data-tdb-guide-position]'),
      {
        valueClass: 'treatment-guide_number-value',
        incomingClass: 'treatment-guide_number-incoming',
      },
    );
    for (const button of root.querySelectorAll('[data-tdb-guide-nav]'))
      button.addEventListener('click', () => navigate(Number(button.dataset.tdbGuideNav)), {
        signal: events.signal,
      });
    let active = initial,
      animations = [],
      disposed = false;
    const stop = () => {
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    function update(index, direction = 1, animate = true) {
      if (disposed || (active === index && animate)) return;
      const previous = active;
      stop();
      active = index;
      pagination.setAttribute('aria-label', `${index + 1} of ${rows.length}`);
      ticker.update(String(index + 1).padStart(2, '0'), direction, animate);
      iconTickers[index].update(String(previous), direction, false);
      iconTickers[index].update(String(index), direction, animate);
      rows.forEach((row, i) => {
        row.pane.style.visibility = i === index ? 'visible' : 'hidden';
        row.pane.style.pointerEvents = i === index ? 'auto' : 'none';
        row.pane.setAttribute('aria-hidden', String(i !== index));
      });
      const motion = window.TDBMotion;
      if (!animate || motion?.reduced?.matches || !content.animate) return;
      const duration = motion?.duration(content.clientWidth) || 400,
        easing = motion?.easing('travel', 'cubic-bezier(.3,0,.2,1)') || 'ease',
        old = rows[previous],
        next = rows[index];
      // Only text travels; the native tracks, pagination and controls do not move.
      animations.push(
        old.title.animate(
          [
            { transform: 'translateX(0)', opacity: 1, visibility: 'visible' },
            { transform: `translateX(${-direction * 100}%)`, opacity: 1, visibility: 'visible' },
          ],
          { duration, easing },
        ),
        next.title.animate(
          [{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }],
          { duration, easing },
        ),
      );
      const fade = motion?.defaults || {},
        fadeEase = motion?.easing('fade', 'ease-out') || 'ease-out';
      animations.push(
        old.summary.animate(
          [
            { opacity: 1, visibility: 'visible' },
            { opacity: 0, visibility: 'visible' },
          ],
          { duration: fade.fadeOut || 120, easing: fadeEase },
        ),
        next.summary.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: fade.fadeIn || 350,
          delay: fade.entryDelay || 100,
          easing: fadeEase,
          fill: 'backwards',
        }),
      );
    }
    update(initial, 1, false);
    return {
      update,
      destroy() {
        disposed = true;
        stop();
        events.abort();
        ticker.destroy();
        iconTickers.forEach((ticker, i) => {
          ticker.destroy();
          rows[i].icon.replaceChildren(artwork[i]);
        });
        rows.forEach(({ pane }) => {
          pane.style.removeProperty('visibility');
          pane.style.removeProperty('pointer-events');
          pane.removeAttribute('aria-hidden');
        });
      },
    };
  }
  return Object.freeze({ mount });
})();

/* Generated by tools/runtime-build/build-guide-pressure.cjs; alpha only, no palette. */
// prettier-ignore
window.TDBTreatmentGuidePressureMasks = Object.freeze({"dark":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYAAAAEACAMAAACNqVFVAAAAwFBMVEX///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+Kz6mvAAAAQHRSTlMABAgMEBQYHCAkKC0xNTk9QUVJTVFVWV1hZWltcXV5fYKGio6SlpqeoqaqrrK2ur7CxsrO0tfb3+Pn6+/z9/v/gsO1LwAAFMpJREFUeNrtXed6qlAQVGNBBUUFrFETe4+98f7Pdb/dPSDYosarlLO/ohT9Zs7O7JkkGgi4qnR9j7U7U3RE1wO8nos54b3dbrcbqDXV6qjY03gKnEuMcDb+gjuijpADwsvlcrmAmrOaWcp4Dk+AM4kTIgOo4EzcXAQ8gx0xJ7Cn0+n0B2ti1JiV+QQdhzOJFGSDUUFEcHyvQ28gD8AD7AQ6YT0ajUZDrMGFoqNwHrFCZAAVRATjgdNwAXpE3gAeYEfUCfB+v9/v9Xq9LlbnbNExOAvOJkIYF8AEIwJ54DTYsN9sGPQMecIdYSfMO51Ou91uQTWxGmeKjuBJ7XabCEEykApgwuCBaNhs/M6CzrBfLmHVT6ew5gl5AB5gR9QZ3t9QX1T1s8UO4omMEcYFMAFEIA+TCdAwn4MqEQt+dGjSHMR+NjOgR+QJeMCdUGeA12q1WhXqk6pyVOxpPAXOZYQQF8QEEoE8MBqgGZAFUCR/gQ96b8F+OGTQG8gj7gg7QV6pVMrlcrlUKpWKUIUzhQfgDDiTKEEyiAoggvFANAyHFhbQF3xBAoJPC/+Afa/HoCfkGfAAO2KOeOfzmqapqqoqiqLkqLKs2EM4AmdompbPIyPIBlBhEoE8EA29noUFoxU8TYIdfNQcA3sT+lrNBL5IqAPkgHUmI8tyOp1KpSRJksSTgmdTqVQ6LctyJgOsAB3ERdEkAngwaDBZAEXyOgk6Q98AnzTngL0BfbkMCz6fB9xzOUA9nU5JkphMJhLxuCDEYtFoJBIJ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","light":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYAAAAEACAMAAACNqVFVAAAAwFBMVEX///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+Kz6mvAAAAQHRSTlMABAgMEBQYHCAkKC0xNTk9QUVJTVFVWV1hZWltcXV5fYKGio6SlpqeoqaqrrK2ur7CxsrO0tfb3+Pn6+/z9/v/gsO1LwAAIrpJREFUeNrtnWdb4zoThknvpJFe6G1hgd3D//9t55omjWTZCRsDdvB8ed+TOJvw3JqisSydnBRWWGGFFVZYYYUVVlhhMVYqlcrlcqVSqVTBagHDN+CKcrlcKpUKzVKRHURHvev1eqPRaDabzRZZ2zF+Ed5vNBr1eh2JAIwCxb8Ij7qD6qg5qt3pdLrdbg/slK3PJv+Nb3a73U6ng0yQBrAgEoWu+ylfrYLwJDuIjoL3+4PBYDAcDkdg46DhW8PhEK5EKkADWAAKAFGtFhySpa/VUPl2m3Xvs+bj8dnZ2WQymUyn0+kMbB4xfBneh+vOzs4ACNLoM4l2GzmAPxQYPO1Z+lYLlWfhUXbQHPVeLBbL5XK5Wq1Wa7KNMn4J3oWrFosFEgEaiEJAAIdWSzAUFEh7CPQsPSg/GoHwoDvIDpqj2Nvtdntu7CJi9j24EqEADUIxnQKI0Qg5EAZIDz+bAouP2vcgyOOYB+Xnc9IdVbd6X4pdxZi5wBJBFkRiPkcO4A+QInpE4WdC8LSnUT+BMQ/Kr9cb0t2ojvJes90kmFxjeQiK7RZcAjjMZoABvOFnUhDxjfYYcFh6Up6FF9VJ21uyux3Gl1kejIJBAAfCQEFJKPwUCCUUv6XEJ+0x3JD0pDzrbiS/J3sw9uiZfYcvNTiYhOEAGCAsMQULoYUQSkc89NXId7SHYY/SG+VZeKM5ifxL7Clo5m2FhFEwCOGAGMgZDAXlCcfoCOVKFWK+K77RHkc9Su8Ib0QngZ/JficYX6KAMAoLgjGg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"});

/* Circular indentation and rounded wedge edges, underneath the untouched dividers. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuidePressure) return;
  let serial = 0;
  function create(svg) {
    const id = `tdb-guide-pressure-${++serial}`;
    const make = (tag, attrs, parent) => {
      const node = document.createElementNS(svg.namespaceURI, tag);
      for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
      parent?.append(node);
      return node;
    };
    const defs = make('defs', {}, svg);
    function gradient(name, colour, stops) {
      const node = make('radialGradient', { id: `${id}-${name}` }, defs);
      for (const [offset, opacity] of stops)
        make(
          'stop',
          {
            offset,
            'stop-opacity': opacity,
            ...(colour === 'white'
              ? { 'stop-color': 'white' }
              : { class: `treatment-guide_pressure-${colour}` }),
          },
          node,
        );
    }
    gradient('feather', 'light', [
      [0, 0],
      [0.25, 0],
      [0.42, 0.025],
      [0.59, 0.1],
      [0.77, 0.035],
      [1, 0],
    ]);
    gradient('well', 'core', [
      [0, 1],
      [0.25, 1],
      [0.36, 0.94],
      [0.46, 0.65],
      [0.56, 0.23],
      [0.68, 0.04],
      [0.82, 0],
      [1, 0],
    ]);
    gradient('rim', 'light', [
      [0, 0],
      [0.29, 0],
      [0.38, 0.02],
      [0.48, 0.14],
      [0.58, 0.62],
      [0.64, 0.86],
      [0.7, 0.55],
      [0.78, 0.2],
      [0.89, 0.035],
      [1, 0],
    ]);
    gradient('falloff', 'white', [
      [0, 1],
      [0.32, 0.94],
      [0.55, 0.68],
      [0.76, 0.28],
      [0.9, 0.06],
      [1, 0],
    ]);
    const clip = make('clipPath', { id: `${id}-clip` }, defs);
    make(
      'path',
      {
        'clip-rule': 'evenodd',
        d: 'M500 0A500 500 0 1 1 500 1000A500 500 0 1 1 500 0M500 360A140 140 0 1 0 500 640A140 140 0 1 0 500 360',
      },
      clip,
    );
    const mask = (name) =>
      make(
        'mask',
        {
          id: `${id}-${name}`,
          maskUnits: 'userSpaceOnUse',
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
          style: 'mask-type:alpha',
        },
        defs,
      );
    const moving = make('g', { class: 'treatment-guide_pressure-mask' }, mask('contact'));
    make('circle', { r: 242, fill: `url(#${id}-falloff)` }, moving);
    const layer = make('g', { 'clip-path': `url(#${id}-clip)` });
    const pressure = make('g', { class: 'treatment-guide_pressure' }, layer);
    const surface = make('g', {}, pressure);
    for (const [name, radius] of [
      ['feather', 316.8],
      ['well', 220],
      ['rim', 220],
    ])
      make('circle', { r: radius, fill: `url(#${id}-${name})` }, surface);
    const contact = make(
      'g',
      { class: 'treatment-guide_pressure-contact', mask: `url(#${id}-contact)` },
      layer,
    );
    for (const name of ['dark', 'light']) {
      const wedgeMask = mask(name);
      for (let i = 0; i < 5; i++)
        make(
          'image',
          {
            x: 200,
            y: 0,
            width: 600,
            height: 400,
            transform: `rotate(${i * 72} 500 500)`,
            href: window.TDBTreatmentGuidePressureMasks[name],
          },
          wedgeMask,
        );
      make(
        'rect',
        {
          width: 1000,
          height: 1000,
          class: `treatment-guide_pressure-edge-${name}`,
          mask: `url(#${id}-${name})`,
        },
        contact,
      );
    }
    return {
      layer,
      destroy() {
        layer.remove();
        defs.remove();
      },
      render(x, y, depth) {
        const translate = `translate(${x} ${y})`,
          scale = `scale(${0.8 + 0.2 * depth})`;
        pressure.setAttribute('transform', translate);
        surface.setAttribute('transform', scale);
        moving.setAttribute('transform', `${translate} ${scale}`);
        pressure.style.opacity = contact.style.opacity = depth.toFixed(4);
      },
    };
  }
  window.TDBTreatmentGuidePressure = Object.freeze({ create });
})();

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
