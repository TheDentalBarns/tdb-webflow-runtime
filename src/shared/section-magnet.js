/* Opt-in section centring. Runs inside tdb-motion, never adds page styles.
 * A short, interruptible correction after a user scroll has settled. It is
 * deliberately not scroll locking or mandatory snapping.
 */
(() => {
  'use strict';
  if (window.TDBSectionMagnet) return;
  const roots = [...document.querySelectorAll('[data-tdb-magnet]')];
  if (!roots.length) return;
  const reduced =
    window.TDBMotion?.reduced ||
    window.TDBMotionPolicy?.reduced ||
    matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController(),
    { signal } = controller;
  let timer = 0,
    raf = 0,
    active = null,
    lastSnapped = null;
  let armed = false,
    held = false,
    anchorUntil = 0,
    lastInput = 0;
  let startY = window.scrollY,
    lastY = window.scrollY;
  const editable = 'input,textarea,select,[contenteditable="true"]';
  const captureRadius = () => Math.min(240, innerHeight * 0.24);
  function modalOpen() {
    return [...document.querySelectorAll('[aria-modal="true"]')].some((node) => {
      if (node.closest('[hidden],[aria-hidden="true"],[inert]')) return false;
      const style = getComputedStyle(node);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.visibility !== 'collapse' &&
        node.getClientRects().length > 0
      );
    });
  }
  function blocked() {
    return (
      document.hidden ||
      reduced.matches ||
      document.documentElement.matches('.w-editor,.tdb-sg-locked,.tdb-sg-chrome-away') ||
      modalOpen() ||
      getComputedStyle(document.documentElement).overflowY === 'hidden' ||
      getComputedStyle(document.body).overflowY === 'hidden' ||
      getComputedStyle(document.body).position === 'fixed' ||
      document.activeElement?.matches?.(editable)
    );
  }
  function geometry(node) {
    const box = node.getBoundingClientRect();
    let bottom = box.bottom;
    if (node.dataset.tdbMagnet === 'treatment') {
      const owner = node.closest('[data-tdb-treatment-layout]');
      for (const row of owner?.querySelectorAll(
        '[data-tdb-treatment-details],.tdb-treatment-cta',
      ) || [])
        bottom = Math.max(bottom, row.getBoundingClientRect().bottom);
    }
    // Keep the authored heights. On short screens centre the image frame,
    // rather than disabling the magnet because the copy extends below it.
    if (node.dataset.tdbMagnet === 'treatment' && bottom - box.top > innerHeight - 32)
      bottom = box.bottom;
    const height = bottom - box.top;
    const allowed = node.dataset.tdbMagnet === 'frame' ? innerHeight * 1.12 : innerHeight - 32;
    return {
      node,
      top: box.top,
      bottom,
      height,
      delta: (box.top + bottom - innerHeight) / 2,
      fits: box.width > 0 && height > 0 && height <= allowed,
    };
  }
  function stop() {
    clearTimeout(timer);
    timer = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (active?.lenis && window.lenis === active.lenis)
      active.lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    active = null;
  }
  function reset() {
    stop();
    armed = false;
    startY = lastY = window.scrollY;
  }
  function settle() {
    timer = 0;
    if (!armed || held || active || performance.now() < anchorUntil || blocked()) return;
    // Native scrollend can precede the tail of Lenis' wheel easing.
    if (window.lenis?.isScrolling || performance.now() - lastInput < 160) {
      timer = setTimeout(settle, 180);
      return;
    }
    armed = false;
    const travel = window.scrollY - startY;
    if (Math.abs(travel) < 8) return;
    const radius = captureRadius();
    const candidates = roots
      .map(geometry)
      .filter((g) => {
        if (g.node === lastSnapped && Math.abs(g.delta) > radius * 1.6) lastSnapped = null;
        return (
          g.fits &&
          g.node !== lastSnapped &&
          Math.abs(g.delta) > 2 &&
          Math.abs(g.delta) <= radius &&
          Math.abs(g.delta + travel) > Math.abs(g.delta)
        );
      })
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
    const chosen = candidates[0];
    if (!chosen) return;
    const from = window.scrollY;
    const destination = Math.max(
      0,
      Math.min(from + chosen.delta, document.documentElement.scrollHeight - innerHeight),
    );
    if (Math.abs(destination - from) < 2) return;
    lastSnapped = chosen.node;
    const duration = 560,
      started = performance.now();
    const ease = (p) => 1 - (1 + 7 * p) * Math.exp(-7 * p);
    const scale = ease(1);
    active = { node: chosen.node, lenis: window.lenis || null };
    // Share the slider's existing chrome lifetime. Its own correction must
    // not be mistaken for the visitor scrolling away from the section.
    window.TDBSliderFocus?.focus(chosen.node, () => Boolean(active));
    const step = (now) => {
      raf = 0;
      if (!active || blocked()) return reset();
      const p = Math.min(1, (now - started) / duration);
      const y = from + ((destination - from) * ease(p)) / scale;
      // Use the site's existing scroll owner; never race its inertia.
      if (active.lenis) active.lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo({ top: y, behavior: 'instant' });
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        active = null;
        // Scroll observers can batch the final correction into one delivery.
        // Rebase their browsing distance at the settled position as well.
        window.TDBSliderFocus?.focus(chosen.node);
        startY = lastY = window.scrollY;
      }
    };
    raf = requestAnimationFrame(step);
  }
  function input(event) {
    if (event.type === 'keydown') {
      // Keep keyboard navigation literal and cancel a correction immediately.
      reset();
      anchorUntil = performance.now() + 1000;
      return;
    }
    if (
      event.type === 'wheel' &&
      (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY))
    ) {
      reset();
      return;
    }
    if (event.target?.closest?.(editable)) return reset();
    const wasActive = !!active;
    stop();
    if (!armed || wasActive) startY = window.scrollY;
    armed = true;
    lastInput = performance.now();
    if (event.type === 'pointerdown' || event.type === 'touchstart') held = true;
  }
  function released() {
    held = false;
    if (armed) {
      clearTimeout(timer);
      timer = setTimeout(settle, 180);
    }
  }
  function scroll() {
    const y = window.scrollY;
    if (active) {
      lastY = y;
      return;
    }
    if (armed && y !== lastY) {
      clearTimeout(timer);
      timer = setTimeout(settle, 180);
    }
    lastY = y;
    if (lastSnapped && Math.abs(geometry(lastSnapped).delta) > captureRadius() * 1.6)
      lastSnapped = null;
  }
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
    document.addEventListener(type, input, { signal, capture: true, passive: true });
  for (const type of ['pointerup', 'pointercancel', 'touchend', 'touchcancel'])
    window.addEventListener(type, released, { signal, passive: true });
  window.addEventListener('scroll', scroll, { signal, passive: true });
  document.addEventListener(
    'scrollend',
    () => {
      if (armed && !active) {
        clearTimeout(timer);
        timer = setTimeout(settle, 180);
      }
    },
    { signal, passive: true },
  );
  document.addEventListener(
    'click',
    (event) => {
      if (event.target.closest?.('a[href*="#"]')) {
        reset();
        anchorUntil = performance.now() + 2000;
      }
    },
    { signal, capture: true, passive: true },
  );
  document.addEventListener('visibilitychange', reset, { signal });
  window.addEventListener('resize', reset, { signal, passive: true });
  window.addEventListener('pagehide', reset, { signal });
  reduced.addEventListener('change', reset, { signal });
  window.TDBSectionMagnet = Object.freeze({
    version: '1.1.0',
    destroy() {
      reset();
      controller.abort();
    },
  });
})();
