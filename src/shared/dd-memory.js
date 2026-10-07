/* DD reload memory v1.0.0. Parser-time opacity only; no layout or scroll writes. */
(() => {
  'use strict';
  if (window.TDBDDMemory) return;
  const storageKey = 'tdb:dd:v1:' + location.pathname + location.search;
  const selector = '[data-tdb-dd-page],[data-tdb-dd-text],.tdbc-dd-fade,.tdb-quotes_byline';
  const restored = new WeakSet(), claimed = new WeakSet();
  const doc = document;
  let saved = null;
  function key(node) {
    // Slider bylines have a new entrance lifecycle; drawer scroll is not restored.
    if (node.closest('[data-tdb-team-quotes],.tdb-quotes,.tdbc-dialog,dialog')) return null;
    const text = node.textContent.trim().replace(/\s+/g, ' ');
    if (!text) return null; // Parser may not have supplied this node's text yet.
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    const id = node.getAttribute('data-tdb-dd-key') || node.getAttribute('data-tdb-dd-previous-id') || node.getAttribute('data-w-id') || node.id || node.className;
    return node.tagName + '|' + id + '|' + (hash >>> 0);
  }
  try {
    const type = performance.getEntriesByType('navigation')[0]?.type;
    if (type === 'reload' || type === 'back_forward') {
      const value = JSON.parse(sessionStorage.getItem(storageKey));
      if (value?.version === 1 && Date.now() - value.time < 86400000 && value.width === innerWidth &&
          Math.abs(value.height - innerHeight) < innerHeight * .25 && value.items && typeof value.items === 'object') saved = value.items;
    }
  } catch (_) { /* Storage is optional. */ }
  function restore(node) {
    if (!saved || restored.has(node) || claimed.has(node)) return false;
    const id = key(node), value = id && saved[id];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return false;
    node.style.opacity = String(value); restored.add(node); return true;
  }
  function scan() { doc.querySelectorAll(selector).forEach(restore); }
  if (saved) {
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    scan();
    document.addEventListener('DOMContentLoaded', () => { scan(); observer.disconnect(); }, { once: true });
  }
  window.TDBDDMemory = Object.freeze({ version: '1.0.0',
    take(node) { restore(node); claimed.add(node); return restored.has(node); },
    save(states) {
      const items = Object.create(null);
      for (const state of states) {
        if (state.owner.root || !state.node.isConnected) continue;
        const id = key(state.node);
        if (id && Number.isFinite(state.value)) items[id] = state.value;
      }
      try { sessionStorage.setItem(storageKey, JSON.stringify({version: 1, time: Date.now(), width: innerWidth, height: innerHeight, items})); } catch (_) {}
    }
  });
})();
