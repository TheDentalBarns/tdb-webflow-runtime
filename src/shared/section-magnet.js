/* Opt-in section centring. Runs inside tdb-motion, never adds page styles.
 * Proximity capture with an elastic return and a wider breakaway threshold.
 * Native gestures stay free; only the released position snaps into place.
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
  const desktop = matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const controller = new AbortController(),
    { signal } = controller;
  let timer = 0,
    raf = 0,
    active = null,
    centred = null;
  let armed = false,
    held = false,
    anchorUntil = 0,
    lastInput = 0;
  let startY = window.scrollY,
    lastY = window.scrollY;
  const editable = 'input,textarea,select,[contenteditable="true"]';
  const captureRadius = () => Math.min(240, innerHeight * 0.26);
  const releaseRadius = () => Math.min(360, innerHeight * 0.4);
  const spring = (p) => {
    const damping = 0.72,
      frequency = 7.5,
      root = Math.sqrt(1 - damping * damping),
      phase = frequency * root * p;
    return (
      1 -
      Math.exp(-damping * frequency * p) * (Math.cos(phase) + (damping / root) * Math.sin(phase))
    );
  };
  const springEnd = spring(1);
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
      !desktop.matches ||
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
  function reset(clearCentre = false) {
    stop();
    armed = false;
    held = false;
    if (clearCentre === true) centred = null;
    startY = lastY = window.scrollY;
  }
  function settle() {
    timer = 0;
    if (!armed || held || active || performance.now() < anchorUntil || blocked()) return;
    // Let fast inertia finish, but take over the last slow Lenis tail instead
    // of waiting through another full scroll-end debounce before returning.
    const lenis = window.lenis;
    if (
      performance.now() - lastInput < 120 ||
      (lenis?.isScrolling && (!Number.isFinite(lenis.velocity) || Math.abs(lenis.velocity) > 1.5))
    ) {
      timer = setTimeout(settle, 80);
      return;
    }
    const travel = window.scrollY - startY;
    if (Math.abs(travel) < 0.5) {
      armed = false;
      return;
    }
    const candidates = roots.map(geometry);
    const heldCentre = candidates.find((g) => g.node === centred);
    if (!heldCentre?.fits || Math.abs(heldCentre.delta) > releaseRadius()) centred = null;
    const chosen = candidates
      .filter(
        (g) =>
          g.fits && Math.abs(g.delta) <= (g.node === centred ? releaseRadius() : captureRadius()),
      )
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
    const target = chosen.find((g) => g.node === centred) || chosen[0];
    if (!target) {
      // The slow tail may still cross into the capture range. Keep observing
      // it until Lenis finishes, rather than discarding that final approach.
      if (lenis?.isScrolling) timer = setTimeout(settle, 80);
      else armed = false;
      return;
    }
    armed = false;
    centred = target.node;
    const from = window.scrollY;
    const destination = Math.max(
      0,
      Math.min(from + target.delta, document.documentElement.scrollHeight - innerHeight),
    );
    if (Math.abs(destination - from) < 2) {
      if (lenis?.isScrolling) lenis.scrollTo(destination, { immediate: true, force: true });
      return;
    }
    const duration = Math.min(950, 600 + Math.sqrt(Math.abs(destination - from)) * 18),
      started = performance.now();
    active = { node: target.node, lenis: window.lenis || null };
    // Share the slider's existing chrome lifetime. Its own correction must
    // not be mistaken for the visitor scrolling away from the section.
    window.TDBSliderFocus?.focus(target.node, () => Boolean(active));
    const step = (now) => {
      raf = 0;
      if (!active || blocked()) return reset();
      const p = Math.min(1, (now - started) / duration);
      // A damped spring crosses the centre slightly, then settles. Use time,
      // not frame increments, so the elastic feel is stable at 60/120 Hz.
      const y = from + (destination - from) * (p === 1 ? 1 : spring(p) / springEnd);
      // Use the site's existing scroll owner; never race its inertia.
      if (active.lenis) active.lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo({ top: y, behavior: 'instant' });
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        active = null;
        // Scroll observers can batch the final correction into one delivery.
        // Rebase their browsing distance at the settled position as well.
        window.TDBSliderFocus?.focus(target.node);
        startY = lastY = window.scrollY;
      }
    };
    raf = requestAnimationFrame(step);
  }
  function input(event) {
    // Keep phone/tablet scrolling native, including landscape. A touch on a
    // hybrid laptop also cancels the desktop spring without arming a return.
    if (!desktop.matches || event.type === 'touchstart' || event.pointerType === 'touch') {
      reset(true);
      return;
    }
    if (event.type === 'keydown') {
      // Keep keyboard navigation literal and cancel a correction immediately.
      reset(true);
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
    if (event.type === 'pointerdown') {
      reset();
      held = true;
      return;
    }
    const wasActive = !!active;
    stop();
    if (!centred)
      centred = roots.map(geometry).find((g) => g.fits && Math.abs(g.delta) <= 3)?.node || null;
    if (!armed || wasActive) startY = window.scrollY;
    armed = true;
    lastInput = performance.now();
    timer = setTimeout(settle, 120);
  }
  function released() {
    held = false;
    if (armed) {
      clearTimeout(timer);
      timer = setTimeout(settle, 120);
    }
  }
  function scroll() {
    const y = window.scrollY;
    if (active) {
      lastY = y;
      return;
    }
    if (armed && y !== lastY) {
      if (window.lenis?.isScrolling === 'smooth') {
        if (!timer) timer = setTimeout(settle, 80);
      } else {
        clearTimeout(timer);
        timer = setTimeout(settle, 120);
      }
    }
    if (centred && Math.abs(geometry(centred).delta) > releaseRadius()) centred = null;
    lastY = y;
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
        timer = setTimeout(settle, 120);
      }
    },
    { signal, passive: true },
  );
  document.addEventListener(
    'click',
    (event) => {
      reset();
      if (event.target.closest?.('a[href*="#"]')) {
        anchorUntil = performance.now() + 2000;
      }
    },
    { signal, capture: true, passive: true },
  );
  const resetContext = () => reset(true);
  document.addEventListener('visibilitychange', resetContext, { signal });
  window.addEventListener('resize', resetContext, { signal, passive: true });
  window.addEventListener('pagehide', resetContext, { signal });
  reduced.addEventListener('change', resetContext, { signal });
  desktop.addEventListener('change', resetContext, { signal });
  window.TDBSectionMagnet = Object.freeze({
    version: '1.3.1',
    destroy() {
      reset();
      controller.abort();
    },
  });
})();
