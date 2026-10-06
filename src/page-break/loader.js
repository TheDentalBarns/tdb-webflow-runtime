/* Page-break mount v1.0.0. Behaviour lives in shared TDBMotion. */
(() => {
  'use strict';
  if (window.TDBPageBreaks) return;
  const root = new URL('./', document.currentScript.src);
  let pending, mounted;
  async function refresh() {
    if (mounted) return mounted.refresh();
    if (pending) return pending;
    const wrappers = [...document.querySelectorAll('[data-tdb-page-break]')];
    if (!wrappers.length) return;
    pending = (async () => {
      if (!window.TDBModules) throw Error('Page breaks require the shared module registry');
      await window.TDBModules.load(new URL('tdb-motion.js', root).href, { ready: () => Boolean(window.TDBMotion?.pageBreaks) });
      mounted = window.TDBMotion.pageBreaks(wrappers);
    })().catch(error => { console.warn('TDB page breaks: keeping native static images.', error); }).finally(() => { pending = null; });
    return pending;
  }
  window.TDBPageBreaks = Object.freeze({ version: '1.0.0', refresh, status: () => mounted?.status() || [] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
  // Retry a failed download on a later visit to the page or first user scroll.
  window.addEventListener('pageshow', refresh);
  window.addEventListener('wheel', () => { if (!mounted && !pending) refresh(); }, { once: true, passive: true });
})();
