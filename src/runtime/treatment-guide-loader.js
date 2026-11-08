/* Presence/consent gate only. Native Webflow tabs and details remain the fallback. */
function prepareTreatmentGuideLoader() {
  if (window.TDBTreatmentGuideLoader) return;
  const roots = [...document.querySelectorAll('[data-tdb-guide]')];
  if (!roots.length) return;
  const events = new AbortController(),
    owners = new Map(),
    imageLoading = new Map(),
    pending = new WeakSet();
  let disposed = false,
    gesture = null;
  const allowed = () => !disposed && (!window.TDBConsent || window.TDBConsent.allows());
  function prepareExitImage(root) {
    if (!allowed() || !root.hasAttribute('data-tdb-guide-scroll')) return;
    // Pinning adds travel before this image. Its native lazy threshold can then
    // miss a fast exit or a turn through the wheel; warm only the adjacent break.
    const image = root.nextElementSibling?.querySelector('[data-tdb-page-break] img');
    if (!image || image.getAttribute('loading') !== 'lazy') return;
    imageLoading.set(image, image.getAttribute('loading'));
    image.setAttribute('loading', 'eager');
    image.decode?.().catch(() => {});
  }
  async function wheel(root) {
    if (!allowed()) return;
    prepareExitImage(root);
    await window.TDBModules.load(new URL('tdb-treatment-guide.css', TDBRuntimeModuleRoot), {
      type: 'style',
    });
    await window.TDBModules.load(new URL('tdb-motion.js', TDBRuntimeModuleRoot));
    await window.TDBModules.load(new URL('tdb-ticker.js', TDBRuntimeModuleRoot));
    await window.TDBModules.load(new URL('tdb-slider-focus.js', TDBRuntimeModuleRoot));
    await window.TDBModules.load(new URL('tdb-treatment-guide-wheel.js', TDBRuntimeModuleRoot), {
      ready: () => Boolean(window.TDBTreatmentGuideWheel),
    });
    if (allowed() && root.isConnected && !owners.has(root))
      owners.set(root, window.TDBTreatmentGuideWheel.mount(root));
    return owners.get(root);
  }
  async function drawer(root) {
    if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
    await window.TDBModules.load(new URL('tdb-treatment-guide-drawer.js', TDBRuntimeModuleRoot), {
      ready: () => Boolean(window.TDBTreatmentGuideDrawer),
    });
    if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
    return window.TDBTreatmentGuideDrawer.prepare(root);
  }
  async function open(trigger) {
    if (!allowed() || pending.has(trigger)) return;
    const root = trigger.closest('[data-tdb-guide]');
    if (!root) return;
    pending.add(trigger);
    try {
      let api;
      await window.TDBModules.withBusy(
        trigger,
        async () => {
          api = await drawer(root);
        },
        {
          signal: events.signal,
          onError(error) {
            throw error;
          },
        },
      );
      if (allowed() && trigger.isConnected) {
        const details = trigger.closest('details');
        if (details) details.open = false;
        await api.open(
          Number(
            trigger.dataset.tdbGuideTarget ??
              trigger.closest('[data-tdb-guide-panel]')?.dataset.tdbGuidePanel,
          ),
          trigger,
        );
      }
    } catch (error) {
      if (allowed() && trigger.isConnected) {
        const details =
          trigger.closest('details') ||
          root.querySelector(`[data-tdb-guide-panel="${trigger.dataset.tdbGuideTarget}"] details`);
        if (details) {
          details.open = true;
          if (trigger.hasAttribute('data-tdb-guide-target')) {
            root.setAttribute('data-tdb-guide-fallback', '');
            details.querySelector('summary')?.focus({ preventScroll: true });
          }
        }
      }
      if (error.name !== 'AbortError')
        console.warn('Treatment guide: using native chapter content.', error);
    } finally {
      pending.delete(trigger);
    }
  }
  document.addEventListener(
    'click',
    (event) => {
      const trigger = event.target.closest?.('[data-tdb-guide] [data-tdb-guide-open]');
      if (!trigger || event.defaultPrevented || !allowed()) return;
      event.preventDefault();
      open(trigger);
    },
    { signal: events.signal },
  );
  // Capture a first drag while the small wheel module is still downloading.
  document.addEventListener(
    'pointerdown',
    (event) => {
      const surface = event.target.closest?.('[data-tdb-guide-pad], [data-tdb-guide-choice]');
      const root = surface?.closest('[data-tdb-guide]');
      if (!root || owners.has(root) || event.button !== 0 || !allowed()) return;
      const art = root.querySelector('.treatment-guide_dial-art');
      const horizontal = art && getComputedStyle(art).aspectRatio === 'auto';
      if (!horizontal) event.preventDefault();
      const seed = (gesture = {
        root,
        horizontal,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        down: true,
      });
      if (!horizontal) root.setPointerCapture?.(event.pointerId);
      wheel(root)
        .then((api) => {
          if (gesture !== seed || !api) return;
          gesture = null;
          api.resume(seed);
        })
        .catch(() => {
          if (gesture === seed) gesture = null;
        });
    },
    { capture: true, signal: events.signal },
  );
  for (const type of ['pointermove', 'pointerup', 'pointercancel'])
    document.addEventListener(
      type,
      (event) => {
        if (!gesture || event.pointerId !== gesture.pointerId) return;
        gesture.clientX = event.clientX;
        gesture.clientY = event.clientY;
        if (type !== 'pointermove') {
          gesture.down = false;
          gesture.cancelled = type === 'pointercancel';
        }
      },
      { capture: true, passive: true, signal: events.signal },
    );
  for (const root of roots) {
    for (const type of ['touchstart', 'touchmove'])
      root.addEventListener(
        type,
        (event) => {
          if (
            gesture?.down &&
            gesture.root === root &&
            gesture.pointerType === 'touch' &&
            !gesture.horizontal &&
            event.touches.length === 1
          )
            event.preventDefault();
        },
        { passive: false, signal: events.signal },
      );
    prepareExitImage(root);
    window.TDBFeatureLoading?.watchIntent({
      selector: '[data-tdb-guide]',
      root: root.parentElement,
      signal: events.signal,
      prepare: () => wheel(root),
    });
    // The drawer's heavier dependencies are prepared only on actual control intent.
    for (const type of ['pointerover', 'focusin'])
      root.addEventListener(
        type,
        (event) => {
          if (event.target.closest('[data-tdb-guide-open]')) drawer(root).catch(() => {});
        },
        { passive: true, signal: events.signal },
      );
  }
  const observer =
    !window.TDBFeatureLoading && 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries)
              if (entry.isIntersecting)
                wheel(entry.target)
                  .then(() => observer.unobserve(entry.target))
                  .catch(() => {});
          },
          { rootMargin: '700px 0px' },
        )
      : null;
  if (observer) roots.forEach((root) => observer.observe(root));
  window.TDBTreatmentGuideLoader = Object.freeze({
    open,
    wheel,
    destroy() {
      disposed = true;
      events.abort();
      observer?.disconnect();
      gesture = null;
      owners.forEach((api) => api.destroy());
      owners.clear();
      imageLoading.forEach((loading, image) => image.setAttribute('loading', loading));
      imageLoading.clear();
      roots.forEach((root) => window.TDBTreatmentGuideDrawer?.destroy(root));
    },
  });
}
