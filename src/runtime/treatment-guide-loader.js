/* Presence/consent gate only. Native Webflow tabs and details remain the fallback. */
function prepareTreatmentGuideLoader() {
  if (window.TDBTreatmentGuideLoader) return;
  const originals = [...document.querySelectorAll('[data-tdb-guide]')];
  if (!originals.length) return;
  const comparisons = [];
  // Explicit design comparison. Copy only authored CMS DOM, before any enhancement mounts.
  for (const [index, root] of originals.entries()) {
    if (root.hasAttribute('data-tdb-guide-variant')) continue;
    root.dataset.tdbGuideVariant = 'cream';
    const comparison = root.cloneNode(true),
      ids = new Map();
    comparison.dataset.tdbGuideVariant = 'charcoal';
    comparison.setAttribute('data-tdb-guide-comparison', '');
    for (const node of [comparison, ...comparison.querySelectorAll('*')]) {
      node.removeAttribute('data-w-id');
      if (node.id) {
        const next = node.id + '-guide-comparison-' + index;
        ids.set(node.id, next);
        node.id = next;
      }
    }
    for (const node of comparison.querySelectorAll('[aria-controls],[aria-labelledby],[href]')) {
      for (const attribute of ['aria-controls', 'aria-labelledby']) {
        const value = node.getAttribute(attribute);
        if (value)
          node.setAttribute(
            attribute,
            value
              .split(/\s+/)
              .map((id) => ids.get(id) || id)
              .join(' '),
          );
      }
      const href = node.getAttribute('href');
      if (href?.startsWith('#') && ids.has(href.slice(1)))
        node.setAttribute('href', '#' + ids.get(href.slice(1)));
    }
    const layout = comparison.querySelector('.treatment-guide_layout');
    for (const sibling of [...layout.parentElement.children])
      if (sibling !== layout && sibling.querySelector('[data-tdb-guide-heading]')) sibling.remove();
    root.after(comparison);
    comparisons.push(comparison);
    const choices = [...comparison.querySelectorAll('[data-tdb-guide-choice]')];
    const panes = [...comparison.querySelectorAll('[data-tdb-guide-panel]')];
    function choose(index) {
      choices.forEach((choice, i) => {
        choice.classList.toggle('w--current', i === index);
        choice.setAttribute('aria-selected', String(i === index));
        choice.tabIndex = i === index ? 0 : -1;
      });
      panes.forEach((pane, i) => {
        pane.classList.toggle('w--tab-active', i === index);
        pane.style.removeProperty('opacity');
      });
    }
    choices.forEach((choice, index) =>
      choice.addEventListener('click', (event) => {
        event.preventDefault();
        choose(index);
      }),
    );
    choices.forEach((choice, index) =>
      choice.addEventListener('keydown', (event) => {
        const keys = {
          ArrowRight: (index + 1) % 5,
          ArrowDown: (index + 1) % 5,
          ArrowLeft: (index + 4) % 5,
          ArrowUp: (index + 4) % 5,
          Home: 0,
          End: 4,
        };
        if (!(event.key in keys)) return;
        event.preventDefault();
        choices[keys[event.key]].click();
        choices[keys[event.key]].focus({ preventScroll: true });
      }),
    );
    choose(0);
    for (const [section, label] of [
      [root, 'Cream ring'],
      [comparison, 'Charcoal ring'],
    ]) {
      const marker = document.createElement('p');
      marker.className = 'text-style-tagline-restored treatment-guide_variant-label';
      marker.textContent = label;
      section.querySelector('.treatment-guide_layout').before(marker);
    }
  }
  const roots = [...originals, ...comparisons];
  const events = new AbortController(),
    owners = new Map(),
    pending = new WeakSet();
  let disposed = false,
    gesture = null;
  const allowed = () => !disposed && (!window.TDBConsent || window.TDBConsent.allows());
  async function wheel(root) {
    if (!allowed()) return;
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
      if (!trigger || event.defaultPrevented) return;
      event.preventDefault();
      open(trigger);
    },
    { signal: events.signal },
  );
  // Capture a first drag while the small wheel module is still downloading.
  document.addEventListener(
    'pointerdown',
    (event) => {
      const ball = event.target.closest?.('[data-tdb-guide-ball]');
      const root = ball?.closest('[data-tdb-guide]');
      if (!root || owners.has(root) || event.button !== 0 || !allowed()) return;
      event.preventDefault();
      const seed = (gesture = {
        root,
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        down: true,
      });
      ball.setPointerCapture?.(event.pointerId);
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
      roots.forEach((root) => window.TDBTreatmentGuideDrawer?.destroy(root));
      comparisons.forEach((root) => root.remove());
      originals.forEach((root) => {
        delete root.dataset.tdbGuideVariant;
        root.querySelector('.treatment-guide_variant-label')?.remove();
      });
    },
  });
}
