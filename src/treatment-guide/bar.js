/* Linear interaction for the Designer-owned six-rem chapter strip. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideBar) return;
  const instances = new WeakMap();
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function mount(root) {
    if (instances.has(root)) return instances.get(root);
    const menu = root.querySelector('.treatment-guide_wheel');
    const choices = [...root.querySelectorAll('[data-tdb-guide-choice]')];
    if (!menu || choices.length !== 5) throw Error('Treatment guide bar structure missing');
    const events = new AbortController(),
      { signal } = events;
    const tabs = root.querySelector('.treatment-guide_tabs');
    const tabState = () => tabs && window.jQuery?.data?.(tabs, '.w-tabs');
    const tabAttributes =
      tabs &&
      ['data-duration-in', 'data-duration-out'].map((name) => [name, tabs.getAttribute(name)]);
    const tabMotion = tabs && {
      intro: parseInt(tabAttributes[0][1], 10) || 0,
      outro: parseInt(tabAttributes[1][1], 10) || 0,
    };
    if (tabs) {
      tabAttributes.forEach(([name]) => tabs.setAttribute(name, '0'));
      const config = tabState()?.config;
      if (config) Object.assign(config, { intro: 0, outro: 0, immediate: true });
    }
    const attributes = [
      'role',
      'aria-label',
      'tabindex',
      'aria-orientation',
      'aria-valuemin',
      'aria-valuemax',
      'aria-valuenow',
      'aria-valuetext',
    ];
    const before = attributes.map((name) => [name, menu.getAttribute(name)]);
    const hrefs = choices.map((choice) => choice.getAttribute('href'));
    const tabIndexes = choices.map((choice) => choice.getAttribute('tabindex'));
    const syncChoiceTargets = () =>
      choices.forEach((choice) => {
        if (choice.hasAttribute('href')) choice.removeAttribute('href');
        const tabIndex = choice.classList.contains('w--current') ? '0' : '-1';
        if (choice.getAttribute('tabindex') !== tabIndex) choice.setAttribute('tabindex', tabIndex);
      });
    // Enhanced tabs change chapters in place; native fragment URLs are fallback only.
    syncChoiceTargets();
    const total = root.querySelector('.treatment-guide_pagination-total');
    const totalHidden = total?.getAttribute('aria-hidden');
    total?.setAttribute('aria-hidden', 'true');
    menu.setAttribute('role', 'slider');
    menu.setAttribute('aria-label', 'Treatment guide chapters');
    menu.setAttribute('aria-orientation', 'horizontal');
    menu.setAttribute('aria-valuemin', '1');
    menu.setAttribute('aria-valuemax', '5');
    menu.tabIndex = 0;
    root.classList.add('is-guide-bar', 'is-click-wheel');
    let active = Math.max(
      0,
      choices.findIndex((choice) => choice.classList.contains('w--current')),
    );
    let scrollGuide,
      scrollSelecting = false,
      drag = null,
      geometry,
      raf = 0,
      last = 0;
    let visible = true,
      disposed = false,
      suppressUntil = 0;
    const weights = choices.map((_, i) => (i === active ? 1 : 0));
    const reduced = () =>
      Boolean(window.TDBMotionPolicy?.reduced?.matches || window.TDBMotion?.reduced?.matches);
    const blocked = () => Boolean(root.closest('[inert]') || window.TDBScrollLock?.active);
    const card = window.TDBTreatmentGuideCard?.mount(root, active, navigate);
    function schedule() {
      if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function frame(now) {
      raf = 0;
      if (disposed || !visible || document.hidden) {
        last = 0;
        return;
      }
      const ms = Math.min(40, last ? now - last : 16);
      last = now;
      const dt = (window.TDBMotionProfile?.elapsed(ms) ?? ms) / 1000;
      const ease = reduced() ? 1 : 1 - Math.exp(-dt * 15);
      let moving = false;
      weights.forEach((weight, i) => {
        const goal = i === active ? 1 : 0;
        weights[i] = weight + (goal - weight) * ease;
        if (Math.abs(goal - weights[i]) > 0.002) moving = true;
        else weights[i] = goal;
        choices[i].style.opacity = (0.28 + weights[i] * 0.72).toFixed(4);
      });
      if (moving) schedule();
      else last = 0;
    }
    function measure() {
      geometry = menu.getBoundingClientRect();
      schedule();
    }
    function interact() {
      if (!scrollGuide?.enabled) window.TDBSliderFocus?.focus(root, () => Boolean(drag?.claimed));
    }
    function navigate(direction) {
      interact();
      select((active + direction + 5) % 5, true, direction);
    }
    function select(index, notify = true, direction) {
      index = clamp(index, 0, 4);
      const previous = active;
      active = index;
      const travel =
        previous !== index ? card?.update(index, direction || Math.sign(index - previous)) : null;
      if (notify && !choices[index].classList.contains('w--current')) choices[index].click();
      syncChoiceTargets();
      if (previous !== index && !scrollSelecting && !drag?.claimed)
        scrollGuide?.manual(index, travel);
      menu.setAttribute('aria-valuenow', String(index + 1));
      menu.setAttribute('aria-valuetext', choices[index].textContent.trim());
      schedule();
    }
    function begin(event) {
      if (disposed || blocked() || drag || (event.button != null && event.button !== 0)) return;
      if (!menu.contains(event.target)) return;
      measure();
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        previous: event.clientX,
        claimed: false,
        scroll: false,
      };
      // Do not cancel pointerdown: vertical touch pans remain browser-owned.
    }
    function move(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (!drag.claimed) {
        if (Math.abs(dy) > 6 && Math.abs(dy) >= Math.abs(dx)) {
          drag = null;
          return;
        }
        if (Math.abs(dx) <= 6) return;
        drag.claimed = true;
        drag.scroll = scrollGuide?.beginRotation() || false;
        root.setPointerCapture?.(event.pointerId);
        root.classList.add('is-wheel-dragging');
        interact();
      }
      const delta = (event.clientX - drag.previous) / Math.max(1, geometry.width);
      drag.previous = event.clientX;
      const target = clamp((event.clientX - geometry.left) / Math.max(1, geometry.width), 0, 1);
      if (drag.scroll) scrollGuide.rotate(delta * 5);
      else select(Math.min(4, Math.floor(target * 5)), true, delta < 0 ? -1 : 1);
      schedule();
    }
    function end(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const current = drag;
      drag = null;
      if (current.claimed) {
        suppressUntil = performance.now() + 500;
        if (current.scroll) scrollGuide.endRotation();
        else scrollGuide?.manual(active);
      }
      if (root.hasPointerCapture?.(event.pointerId)) root.releasePointerCapture(event.pointerId);
      root.classList.remove('is-wheel-dragging');
      schedule();
    }
    menu.addEventListener('pointerdown', begin, { passive: true, signal });
    document.addEventListener('pointermove', move, { passive: true, signal });
    for (const type of ['pointerup', 'pointercancel'])
      document.addEventListener(type, end, { signal });
    root.addEventListener(
      'lostpointercapture',
      (event) => {
        // Touch begins with implicit capture on a native tab. Transferring that
        // capture to the guide must not end the newly claimed horizontal drag.
        if (event.target === root) end(event);
      },
      { signal },
    );
    menu.addEventListener(
      'touchmove',
      (event) => {
        if (drag?.claimed && event.touches.length === 1) event.preventDefault();
      },
      { passive: false, signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        if (event.isTrusted && performance.now() < suppressUntil && menu.contains(event.target)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true, signal },
    );
    menu.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
    choices.forEach((choice, index) =>
      choice.addEventListener(
        'click',
        (event) => {
          if (event.isTrusted) {
            interact();
            if (active === index) scrollGuide?.manual(index);
          }
          select(index, false);
        },
        { signal },
      ),
    );
    menu.addEventListener(
      'keydown',
      (event) => {
        const choice = event.target.closest?.('[data-tdb-guide-choice]');
        const activate = choice && (event.key === 'Enter' || event.key === ' ');
        const index = activate
          ? choices.indexOf(choice)
          : {
              ArrowRight: Math.min(4, active + 1),
              ArrowLeft: Math.max(0, active - 1),
              Home: 0,
              End: 4,
            }[event.key];
        if (index == null || blocked()) return;
        event.preventDefault();
        interact();
        if (activate && active === index) scrollGuide?.manual(index);
        select(index);
        (activate ? choice : menu).focus({ preventScroll: true });
      },
      { signal },
    );
    const selection = new MutationObserver(() => {
      syncChoiceTargets();
      const index = choices.findIndex((choice) => choice.classList.contains('w--current'));
      if (index >= 0 && index !== active) select(index, false);
    });
    choices.forEach((choice) =>
      selection.observe(choice, {
        attributes: true,
        attributeFilter: ['class', 'href', 'tabindex'],
      }),
    );
    const resize = new ResizeObserver(measure);
    resize.observe(menu);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        measure();
        schedule();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    });
    intersection.observe(menu);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && drag) end({ pointerId: drag.id });
        else schedule();
      },
      { signal },
    );
    measure();
    select(active, false);
    scrollGuide = window.TDBTreatmentGuideScroll?.mount(root, {
      horizontal: true,
      current: () => active,
      interact() {},
      select(index) {
        scrollSelecting = true;
        select(index);
        scrollSelecting = false;
      },
    });
    const api = {
      select,
      resume(seed) {
        if (seed.cancelled) return;
        begin({
          pointerId: seed.pointerId,
          clientX: seed.startX,
          clientY: seed.startY,
          target: menu,
        });
        move(seed);
        const tapped = drag && !drag.claimed;
        if (!seed.down) {
          end(seed);
          if (tapped) {
            const index = clamp(
              Math.floor(((seed.clientX - geometry.left) / geometry.width) * 5),
              0,
              4,
            );
            if (index === active) scrollGuide?.manual(index);
            select(index);
          }
        }
      },
      destroy() {
        if (disposed) return;
        disposed = true;
        if (drag) end({ pointerId: drag.id });
        cancelAnimationFrame(raf);
        events.abort();
        resize.disconnect();
        intersection.disconnect();
        selection.disconnect();
        scrollGuide?.destroy();
        card?.destroy();
        root.classList.remove('is-guide-bar', 'is-click-wheel', 'is-wheel-dragging');
        choices.forEach((choice) => choice.style.removeProperty('opacity'));
        choices.forEach((choice, i) =>
          hrefs[i] == null ? choice.removeAttribute('href') : choice.setAttribute('href', hrefs[i]),
        );
        choices.forEach((choice, i) =>
          tabIndexes[i] == null
            ? choice.removeAttribute('tabindex')
            : choice.setAttribute('tabindex', tabIndexes[i]),
        );
        before.forEach(([name, value]) =>
          value == null ? menu.removeAttribute(name) : menu.setAttribute(name, value),
        );
        if (totalHidden == null) total?.removeAttribute('aria-hidden');
        else total?.setAttribute('aria-hidden', totalHidden);
        if (tabs) {
          tabAttributes.forEach(([name, value]) =>
            value == null ? tabs.removeAttribute(name) : tabs.setAttribute(name, value),
          );
          const config = tabState()?.config;
          if (config)
            Object.assign(config, tabMotion, { immediate: !tabMotion.intro && !tabMotion.outro });
        }
        window.TDBSliderFocus?.release(root);
        instances.delete(root);
      },
    };
    instances.set(root, api);
    return api;
  }
  window.TDBTreatmentGuideBar = Object.freeze({ mount });
})();
