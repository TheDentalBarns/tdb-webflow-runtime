/* Page DD mount v1.0.1. Components already using ddText/ddRegion keep their
 * own consent/lazy gates. This mounts explicit native page hooks and the
 * calculator's existing dynamic fade class, with one shared opacity owner.
 */
(() => {
  'use strict';
  if (window.TDBDDFades) return;
  const base = new URL('./', document.currentScript.src), mounted = new Map();
  const selector = '[data-tdb-dd-page],.tdbc-dd-fade';
  let pending, queued = false, observer, disposed = false, retryNeeded = false;
  function candidates() {
    return [...document.querySelectorAll(selector)].filter(node =>
      !node.closest('template,[data-tdb-quotes-template]') &&
      !node.matches('.tdbc-dialog .tdbc-section-footer .tdbc-dd-fade'));
  }
  async function refresh() {
    queued = false;
    if (disposed) return;
    for (const [node, owner] of mounted) {
      if (!node.isConnected) { owner.destroy(); mounted.delete(node); }
    }
    if (pending) return pending;
    if (!candidates().some(node => !mounted.has(node))) return;
    retryNeeded = false;
    pending = (async () => {
      if (!window.TDBModules) throw Error('Shared registry unavailable');
      await window.TDBModules.load(new URL('tdb-motion.js', base).href, { ready: () => Boolean(window.TDBMotion?.ddRegion) });
      if (disposed) return;
      for (const node of candidates()) {
        if (mounted.has(node)) continue;
        // If the early bridge failed, leave this node to IX2 instead of racing.
        if (node.hasAttribute('data-tdb-dd-legacy') && node.hasAttribute('data-w-id')) continue;
        const root = node.closest('.tdbc-dialog');
        const mode = node.getAttribute('data-tdb-dd-page') || 'viewport';
        const preset = node.getAttribute('data-tdb-dd-preset') || 'standard';
        mounted.set(node, window.TDBMotion.ddText([node], { root, mode, preset }));
      }
    })().catch(error => {
      retryNeeded = true;
      console.warn('TDB DD: keeping the readable native fallback.', error);
    }).finally(() => { pending = null; });
    return pending;
  }
  function schedule() { if (!queued) { queued = true; queueMicrotask(refresh); } }
  function start() {
    observer = new MutationObserver(records => {
      // Tickers replace text nodes each frame. Only DOM changes involving a
      // fade target need discovery or cleanup.
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))))) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    refresh();
  }
  window.TDBDDFades = Object.freeze({ version: '1.0.1', refresh, count: () => mounted.size, destroy() {
    disposed = true; observer?.disconnect(); mounted.forEach(owner => owner.destroy()); mounted.clear();
  } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('pageshow', refresh);
  // No per-scroll discovery once mounted. A later touch or restored connection
  // can recover a failed request just as a mouse wheel can.
  for (const event of ['wheel','touchstart','pointerdown','online'])
    window.addEventListener(event, () => { if (retryNeeded && !pending && !disposed) refresh(); }, { passive: true });
})();
