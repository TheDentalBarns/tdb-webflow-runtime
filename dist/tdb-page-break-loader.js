/* Page-break mount v1.0.1. Behaviour lives in shared TDBMotion. */
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
    })().catch(error => {
      // Reveal-only artwork otherwise stays at its authored zero opacity if
      // the download fails. Keep it readable until a later retry can mount.
      for (const wrapper of wrappers) {
        if (!(Number.parseFloat(wrapper.getAttribute?.('data-tdb-parallax-reveal-in')) > 0)) continue;
        const image = wrapper.querySelector('[data-tdb-page-break-image]') || wrapper.querySelector('img');
        if (image) image.style.opacity = '1';
      }
      console.warn('TDB page breaks: keeping native static images.', error);
    }).finally(() => { pending = null; });
    return pending;
  }
  window.TDBPageBreaks = Object.freeze({ version: '1.0.1', refresh, status: () => mounted?.status() || [] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
  // Recovery works with touch input and reconnects, including repeated failures.
  window.addEventListener('pageshow', refresh);
  for (const event of ['wheel','touchstart','pointerdown','online'])
    window.addEventListener(event, () => { if (!mounted && !pending) refresh(); }, { passive: true });
})();
