/* Page-break memory v1.8.1. Inline in the head, before the body is parsed. */
(() => {
  'use strict';
  if (window.TDBPageBreakMemory) return;
  const selector = '[data-tdb-page-break]', restored = new WeakMap(), claimed = new WeakSet();
  const key = 'tdb:page-break:v1:' + location.pathname + location.search;
  const opacityOnly = wrapper => wrapper.getAttribute?.('data-tdb-parallax-mode') === 'opacity';
  const target = wrapper => opacityOnly(wrapper) ? wrapper : wrapper.querySelector('[data-tdb-page-break-image]') || wrapper.querySelector('img');
  const config = wrapper => {
    const movement = ['data-tdb-parallax-from', 'data-tdb-parallax-to'].map(name => wrapper.getAttribute?.(name) || '').join('|');
    const fade = wrapper.getAttribute?.('data-tdb-parallax-fade-start');
    const ends = [...(wrapper.querySelectorAll?.('[data-tdb-parallax-fade]') || [])].map(node => ['data-tdb-parallax-fade', 'data-tdb-parallax-fade-from', 'data-tdb-parallax-fade-property'].map(name => node.getAttribute(name) || '').join(':')).join(',');
    return (fade == null ? movement : movement + '|' + fade + '|' + wrapper.getAttribute('data-tdb-parallax-fade-end')) + (wrapper.getAttribute?.('data-tdb-parallax-progress') || '') + (wrapper.getAttribute?.('data-tdb-parallax-crop') || '') +
      (opacityOnly(wrapper) ? '|opacity|' + ends : '') + (wrapper.getAttribute?.('data-tdb-parallax-fade-curve') || '') +
      (wrapper.getAttribute?.('data-tdb-parallax-progress') === 'exit'
        ? '|exit:' + wrapper.getAttribute('data-tdb-parallax-exit-start') + ':' + wrapper.getAttribute('data-tdb-parallax-exit-end') : '') +
      (wrapper.hasAttribute?.('data-tdb-parallax-reveal-in')
        ? '|reveal:' + wrapper.getAttribute('data-tdb-parallax-reveal-in') + ':' + wrapper.getAttribute('data-tdb-parallax-reveal-out') + ':' + (wrapper.getAttribute('data-tdb-parallax-reveal-out-end') || '0') + '|targets:' + ends : '');
  };
  const property = node => node.getAttribute('data-tdb-parallax-fade-property') === 'black' ? 'backgroundColor' : 'opacity';
  const identity = node => [node.tagName, ...(node.matches('img') ? [node] : node.querySelectorAll('img'))]
    .map(value => typeof value === 'string' ? value : value.getAttribute('src') || '').join('|');
  let saved = null, observer = null;
  try {
    const type = performance.getEntriesByType('navigation')[0]?.type;
    if (type === 'reload' || type === 'back_forward') {
      const value = JSON.parse(sessionStorage.getItem(key));
      if (value?.version === 1 && Date.now() - value.time < 86400000 &&
          value.width === innerWidth && Math.abs(value.height - innerHeight) < innerHeight * .25 &&
          Array.isArray(value.items)) saved = value;
    }
  } catch (_) { /* Storage is optional; native imagery must always remain usable. */ }
  function restore() {
    if (!saved) return;
    document.querySelectorAll(selector).forEach((wrapper, index) => {
      const node = target(wrapper), item = saved.items[index];
      if (!node || restored.has(node) || claimed.has(node) || !item || item.identity !== identity(node) ||
          (item.config || '|') !== config(wrapper) ||
          !Number.isFinite(item.y) || Math.abs(item.y) > innerHeight * (config(wrapper) === '|' ? .025 : 4)) return;
      const targets = [...(wrapper.querySelectorAll?.('[data-tdb-parallax-fade]') || [])];
      restored.set(node, { original: node.style.transform, originalImageOpacity: node.style.opacity, originalOpacity: targets.map(target => target.style[property(target)]) });
      if (Number.isFinite(item.alpha) && item.alpha >= 0 && item.alpha <= 1)
        targets.forEach(target => {
          const parsed = Number.parseFloat(target.getAttribute('data-tdb-parallax-fade'));
          const end = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
          const start = Number.parseFloat(target.getAttribute('data-tdb-parallax-fade-from'));
          const alpha = end + ((Number.isFinite(start) ? Math.max(0, Math.min(1, start)) : 1) - end) * item.alpha;
          target.style[property(target)] = property(target) === 'backgroundColor' ? `rgba(0, 0, 0, ${alpha})` : String(alpha);
        });
      if (wrapper.hasAttribute?.('data-tdb-parallax-reveal-in') && Number.isFinite(item.reveal) && item.reveal >= 0 && item.reveal <= 1)
        node.style.opacity = String(item.reveal);
      if (!opacityOnly(wrapper)) node.style.transform = `translate3d(0, ${item.y.toFixed(4)}px, 0)`;
    });
  }
  if (saved) {
    // Parser mutations run as microtasks, before paint. No network or layout
    // measurement is needed to recover the last rendered image position.
    observer = new MutationObserver(restore);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    restore();
    document.addEventListener('DOMContentLoaded', () => { restore(); observer.disconnect(); }, { once: true });
  }
  window.TDBPageBreakMemory = Object.freeze({
    version: '1.8.1',
    take(node) { const value = restored.get(node); restored.delete(node); claimed.add(node); return value; },
    save(states) {
      const owned = new Map(states.map(state => [state.wrapper, state]));
      const items = [...document.querySelectorAll(selector)].map(wrapper => {
        const state = owned.get(wrapper);
        return state ? { identity: identity(state.node), config: config(wrapper), y: state.y, alpha: state.alpha, ...(state.reveal ? { reveal: state.revealAlpha } : {}) } : null;
      });
      try {
        sessionStorage.setItem(key, JSON.stringify({ version: 1, time: Date.now(), width: innerWidth, height: innerHeight, items }));
      } catch (_) { /* Private browsing / quota failures do not affect motion. */ }
    },
  });
})();
