/* Native CMS text row follows rendered image geometry, including loop/width motion.
 * Designer owns the rows, typography, spacing and automatic content height.
 * This controller only mirrors the existing slider's horizontal motion/state.
 */
window.TDBTreatmentDetails ||= (() => {
  const instances = new WeakMap();
  function prepare(root) {
    if (!root.hasAttribute('data-tdb-treatment-postage')) return null;
    if (instances.has(root)) return instances.get(root);
    const owner = root.closest('[data-tdb-treatment-layout]');
    const viewport = owner?.querySelector('[data-tdb-treatment-details] .tdb-treatment-viewport');
    const track = viewport?.querySelector('.tdb-treatment-wrapper');
    if (!track) return null;
    const originals = [...track.children];
    let sources = [],
      rows = [],
      lastTransform = '',
      disposed = false;
    const colors = new Map();
    function rebuild(slides) {
      if (disposed) return;
      if (slides.length === sources.length && slides.every((s, i) => s.node === sources[i])) return;
      sources = slides.map((s) => s.node);
      colors.forEach((a) => a.cancel());
      colors.clear();
      const used = new Set();
      rows = slides.map((slide) => {
        const original = originals[slide.value];
        if (!original) return null;
        const duplicate =
          slide.node.classList.contains('swiper-slide-duplicate') || used.has(original);
        const node = duplicate ? original.cloneNode(true) : original;
        if (!duplicate) used.add(original);
        if (duplicate) {
          node.removeAttribute('id');
          node.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
        }
        node.dataset.tdbDetailIndex = String(slide.value);
        return {
          node,
          title: node.querySelector('.tdb-treatment-title'),
          copy: node.querySelector('[data-tdb-service-copy]'),
          sourceCopy: slide.node.querySelector('[data-tdb-copy-state],[data-tdb-service-copy]'),
          active: null,
        };
      });
      track.replaceChildren(...rows.filter(Boolean).map((r) => r.node));
    }
    function measure(slides, rect = (node) => node.getBoundingClientRect()) {
      if (disposed || !slides.length) return null;
      rebuild(slides);
      const origin = rect(viewport).left;
      // Batch all layout reads before writes; use rendered (not target) positions.
      const boxes = slides.map((s) => rect(s.node));
      const states = slides.map((s, i) => {
        const active = s.node.classList.contains('swiper-slide-active');
        const row = rows[i];
        if (row && (!row.sourceCopy || !s.node.contains(row.sourceCopy)))
          row.sourceCopy = s.node.querySelector('[data-tdb-copy-state],[data-tdb-service-copy]');
        return {
          active,
          copy: row?.sourceCopy,
          color: row?.title && row.active !== active ? getComputedStyle(row.title).color : null,
        };
      });
      return { origin, boxes, states };
    }
    function paint(slides, snapshot) {
      if (disposed || !slides.length) return;
      const { origin, boxes, states } = snapshot || measure(slides);
      const transform = `translate3d(${boxes[0].left - origin}px,0,0)`;
      if (transform !== lastTransform) track.style.transform = lastTransform = transform;
      rows.forEach((row, i) => {
        if (!row) return;
        const box = boxes[i],
          next = boxes[i + 1];
        const width = Math.round(box.width * 1000) / 1000;
        const gap = Math.round((next ? Math.max(0, next.left - box.right) : 0) * 1000) / 1000;
        if (row.width !== width) row.node.style.width = (row.width = width) + 'px';
        if (row.gap !== gap) row.node.style.marginRight = (row.gap = gap) + 'px';
        for (const state of ['is-visible', 'is-moving', 'is-entry-pending'])
          row.copy?.classList.toggle(state, !!states[i].copy?.classList.contains(state));
        if (row.active !== states[i].active) {
          row.active = states[i].active;
          row.node.inert = !row.active;
          row.node.setAttribute('aria-hidden', String(!row.active));
          if (row.title) {
            colors.get(row.title)?.cancel();
            colors.set(
              row.title,
              row.title.animate(
                [
                  { color: states[i].color },
                  { color: row.active ? '#ffffff' : 'rgba(255,255,255,0.5)' },
                ],
                {
                  duration: window.TDBMotion?.reduced?.matches
                    ? 0
                    : (window.TDBMotionProfile?.time(200) ?? 200),
                  fill: 'forwards',
                },
              ),
            );
          }
        }
      });
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      colors.forEach((a) => a.cancel());
      track.style.removeProperty('transform');
      originals.forEach((node) => {
        node.style.removeProperty('width');
        node.style.removeProperty('margin-right');
        node.removeAttribute('data-tdb-detail-index');
        node.removeAttribute('aria-hidden');
        node.inert = false;
        node
          .querySelectorAll('.is-visible,.is-moving,.is-entry-pending')
          .forEach((e) => e.classList.remove('is-visible', 'is-moving', 'is-entry-pending'));
      });
      track.replaceChildren(...originals);
      instances.delete(root);
    }
    const api = { sync: rebuild, measure, paint, dispose };
    instances.set(root, api);
    return api;
  }
  return { prepare };
})();
