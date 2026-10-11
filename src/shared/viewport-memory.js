/* Viewport reload memory v2.0.0. Inline before body parsing.
 * Adapters preserve the existing DD and page-break runtime contracts.
 * Save uses their cached document geometry, never a layout measurement.
 */
(() => {
  'use strict';
  if (window.TDBViewportMemory) return;
  const doc = document, key = 'tdb:view:v2:' + location.pathname + location.search;
  const dd = '[data-tdb-dd-page],[data-tdb-dd-text],.tdbc-dd-fade,.tdb-quotes_byline';
  const pb = '[data-tdb-page-break]', selector = dd + ',' + pb;
  const restoredDD = new WeakSet(), restoredPB = new WeakMap(), claimed = new WeakSet(), claimedPB = new WeakSet();
  const height = innerHeight, width = innerWidth;
  let saved, observer, output;
  const unit = n => Number.isFinite(n) && n >= 0 && n <= 1;
  const clamp = n => Math.max(0, Math.min(1, n));
  const attr = (node, name) => node.getAttribute(name) || '';
  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return (value >>> 0).toString(36);
  }
  function ddKey(node) {
    if (node.closest('[data-tdb-team-quotes],.tdb-quotes,.tdbc-dialog,dialog')) return;
    const text = node.textContent.trim().replace(/\s+/g, ' ');
    if (text) return hash(node.tagName + '|' + (attr(node, 'data-tdb-dd-key') ||
      attr(node, 'data-tdb-dd-previous-id') || attr(node, 'data-w-id') || node.id || node.className) + '|' + text);
  }
  const opacityOnly = wrapper => attr(wrapper, 'data-tdb-parallax-mode') === 'opacity';
  const target = wrapper => opacityOnly(wrapper) ? wrapper : wrapper.querySelector('[data-tdb-page-break-image]') || wrapper.querySelector('img');
  const fades = wrapper => [...wrapper.querySelectorAll('[data-tdb-parallax-fade]')];
  const property = node => attr(node, 'data-tdb-parallax-fade-property') === 'black' ? 'backgroundColor' : 'opacity';
  // Stable structural address avoids a whole-document scan for section indexes.
  function address(node) {
    const parts = [];
    for (; node && node !== doc.documentElement; node = node.parentElement) {
      if (node.id) { parts.push('#' + node.id); break; }
      let index = 0;
      for (let previous = node.previousElementSibling; previous; previous = previous.previousElementSibling) index++;
      parts.push(index);
    }
    return parts.join('/');
  }
  const configNames = ('mode from to fade-start fade-end progress crop fade-curve exit-start exit-end reveal-in reveal-out reveal-out-end reveal-final').split(' ');
  function pbKey(wrapper, node, targets) {
    return hash(JSON.stringify([address(wrapper), node.tagName,
      [...(node.matches('img') ? [node] : node.querySelectorAll('img'))].map(image => attr(image, 'src')),
      configNames.map(name => attr(wrapper, 'data-tdb-parallax-' + name)),
      targets.map(node => ['fade', 'fade-from', 'fade-property'].map(name => attr(node, 'data-tdb-parallax-' + name)))]));
  }
  try {
    const type = performance.getEntriesByType('navigation')[0]?.type;
    if (type === 'reload' || type === 'back_forward') {
      const value = JSON.parse(sessionStorage.getItem(key));
      if (value?.v === 2 && Number.isFinite(value.t) && Date.now() - value.t >= 0 && Date.now() - value.t < 86400000 &&
          value.w === width && Math.abs(value.h - height) < height * .25 &&
          value.d && typeof value.d === 'object' && value.p && typeof value.p === 'object') saved = value;
    }
  } catch (_) { /* Storage is optional. */ }
  function restoreDD(node) {
    if (!saved || claimed.has(node) || restoredDD.has(node)) return;
    const id = ddKey(node), value = id && saved.d[id];
    if (unit(value)) { node.style.opacity = String(value); restoredDD.add(node); }
  }
  function restorePB(wrapper) {
    if (!saved) return;
    const node = target(wrapper);
    if (!node || claimedPB.has(node) || restoredPB.has(node)) return;
    const targets = fades(wrapper), item = saved.p[pbKey(wrapper, node, targets)];
    const configured = attr(wrapper, 'data-tdb-parallax-from') || attr(wrapper, 'data-tdb-parallax-to');
    if (!Array.isArray(item) || !Number.isFinite(item[0]) || Math.abs(item[0]) > height * (configured ? 4 : .025) ||
        !unit(item[1]) || (item[2] != null && !unit(item[2]))) return;
    restoredPB.set(node, { original: node.style.transform, originalImageOpacity: node.style.opacity,
      originalOpacity: targets.map(target => target.style[property(target)]) });
    targets.forEach(target => {
      const end = parseFloat(attr(target, 'data-tdb-parallax-fade'));
      const start = parseFloat(attr(target, 'data-tdb-parallax-fade-from'));
      const low = Number.isFinite(end) ? clamp(end) : 0;
      const alpha = low + ((Number.isFinite(start) ? clamp(start) : 1) - low) * item[1];
      target.style[property(target)] = property(target) === 'backgroundColor' ? `rgba(0, 0, 0, ${alpha})` : String(alpha);
    });
    if (wrapper.hasAttribute('data-tdb-parallax-reveal-in') && unit(item[2])) node.style.opacity = String(item[2]);
    if (!opacityOnly(wrapper)) node.style.transform = `translate3d(0, ${item[0].toFixed(4)}px, 0)`;
  }
  function restore(node) {
    if (node.matches(dd)) restoreDD(node);
    if (node.matches(pb)) restorePB(node);
  }
  function collect(node, pending) {
    if (node.nodeType !== 1) return;
    // Include containing effects when streamed text/images complete their identity.
    for (let parent = node; parent; parent = parent.parentElement) if (parent.matches(selector)) pending.add(parent);
    node.querySelectorAll(selector).forEach(node => pending.add(node));
  }
  if (saved && (Object.keys(saved.d).length || Object.keys(saved.p).length)) {
    if (doc.readyState === 'loading') {
      observer = new MutationObserver(records => {
        const pending = new Set();
        for (const record of records) {
          // Only ancestors of the mutation target, not its entire existing subtree.
          let node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
          for (; node; node = node.parentElement) if (node.matches(selector)) pending.add(node);
          record.addedNodes.forEach(node => collect(node, pending));
        }
        pending.forEach(restore);
      });
      observer.observe(doc.documentElement, { childList: true, subtree: true, characterData: true });
      doc.addEventListener('DOMContentLoaded', () => { doc.querySelectorAll(selector).forEach(restore); observer.disconnect(); }, { once: true });
    }
    doc.querySelectorAll(selector).forEach(restore);
  }
  function near(state, scroll, view) {
    const g = state.geometry;
    return g && Number.isFinite(g[0]) && Number.isFinite(g[1]) && g[1] > 0 &&
      g[0] + g[1] > scroll - view * .25 && g[0] < scroll + view * 1.25;
  }
  function save(kind, states) {
    const scroll = scrollY, view = innerHeight, currentWidth = innerWidth, items = Object.create(null);
    for (const state of states) {
      const node = state.node;
      if (!node.isConnected || !near(state, scroll, view)) continue;
      if (kind === 'd') {
        if (state.owner.root || !unit(state.value)) continue;
        const id = ddKey(node);
        if (id) items[id] = state.value;
      } else {
        if (!Number.isFinite(state.y) || !unit(state.alpha)) continue;
        items[pbKey(state.wrapper, node, fades(state.wrapper))] = [state.y, state.alpha, state.reveal ? state.revealAlpha : null];
      }
    }
    if (!output || output.w !== currentWidth || output.h !== view || output.s !== scroll) output = { v: 2, w: currentWidth, h: view, s: scroll, d: {}, p: {} };
    output.t = Date.now(); output[kind] = items;
    try { sessionStorage.setItem(key, JSON.stringify(output)); } catch (_) {}
  }
  window.TDBDDMemory = Object.freeze({ version: '2.0.0',
    take(node) { restoreDD(node); claimed.add(node); return restoredDD.has(node); },
    save(states) { save('d', states); }
  });
  window.TDBPageBreakMemory = Object.freeze({ version: '2.0.0',
    take(node) {
      // Also supports a late-inserted page break after the parser observer stops.
      const wrapper = node.closest(pb); if (wrapper) restorePB(wrapper);
      const value = restoredPB.get(node); restoredPB.delete(node); claimedPB.add(node); return value;
    },
    save(states) { save('p', states); }
  });
  window.TDBViewportMemory = Object.freeze({ version: '2.0.0' });
})();
