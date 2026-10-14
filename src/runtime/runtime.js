/* TDB runtime v1.0.0. Consent hands off once; DD is the first page enhancement.
 * Component-owned fades retain their existing gates and shared motion owner.
 */
(() => {
  'use strict';
  if (window.TDBRuntime) return;
  if (window.TDBDDFades) { window.TDBRuntime = window.TDBDDFades; return; }
  const base = new URL('./', document.currentScript.src);
  const selector = '[data-tdb-dd-page],.tdbc-dd-fade';
  const mounted = new Map(), cancellations = new Set();
  const lifecycle = new AbortController(), {signal} = lifecycle;
  let pending = null, observer, disposed = false, dirty = false, started = false, retryNeeded = false;

  // A bounded initial-render heuristic, not a claim that the final LCP is known.
  // Wait for load + a short quiet period; never hold background work indefinitely.
  function initialRender() {
    return new Promise(resolve => {
      const gate = new AbortController();
      let quietTimer, limitTimer, paintObserver, finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(quietTimer); clearTimeout(limitTimer);
        paintObserver?.disconnect(); gate.abort(); cancellations.delete(finish);
        resolve(!disposed);
      }
      function quiet() {
        clearTimeout(quietTimer);
        if (document.readyState === 'complete') quietTimer = setTimeout(finish, 150);
      }
      cancellations.add(finish);
      window.addEventListener('load', quiet, {once: true, signal: gate.signal});
      // On an active visit, let the idle queue proceed instead of extending the gate.
      for (const event of ['pointerdown', 'keydown'])
        window.addEventListener(event, finish, {once: true, passive: true, signal: gate.signal});
      try {
        if (window.PerformanceObserver?.supportedEntryTypes?.includes('largest-contentful-paint')) {
          paintObserver = new PerformanceObserver(quiet);
          paintObserver.observe({type: 'largest-contentful-paint', buffered: true});
        }
      } catch (_) { paintObserver?.disconnect(); }
      limitTimer = setTimeout(finish, 1500);
      quiet();
    });
  }

  function background(work) {
    return new Promise((resolve, reject) => {
      if (disposed) { resolve(null); return; }
      const idle = typeof window.requestIdleCallback === 'function' &&
        typeof window.cancelIdleCallback === 'function';
      let handle;
      function cancel() {
        if (idle) window.cancelIdleCallback(handle); else clearTimeout(handle);
        cancellations.delete(cancel); resolve(null);
      }
      function run(deadline) {
        cancellations.delete(cancel);
        if (disposed) { resolve(null); return; }
        try { resolve(work(deadline)); } catch (error) { reject(error); }
      }
      cancellations.add(cancel);
      handle = idle ? window.requestIdleCallback(run, {timeout: 1000}) :
        setTimeout(() => run({didTimeout: true, timeRemaining: () => 0}), 16);
    });
  }

  function eligible(node) {
    return node.isConnected && node.matches(selector) &&
      !node.closest('template,[data-tdb-quotes-template]') &&
      !node.matches('.tdbc-dialog .tdbc-section-footer .tdbc-dd-fade') &&
      !(node.hasAttribute('data-tdb-dd-legacy') && node.hasAttribute('data-w-id'));
  }
  const renderReady = initialRender();
  function refresh() {
    if (disposed) return Promise.resolve();
    dirty = true;
    if (pending) return pending;
    pending = (async () => {
      if (!await renderReady || disposed) return;
      if (!started) {
        observer = new MutationObserver(records => {
          // Ignore ticker text replacements and unrelated DOM changes.
          if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
              node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))))) refresh();
        });
        observer.observe(document.body, {childList: true, subtree: true});
        started = true;
      }
      do {
        dirty = false;
        retryNeeded = false;
        const nodes = await background(() => {
          for (const [node, owner] of mounted) {
            if (!eligible(node)) { owner.destroy(); mounted.delete(node); }
          }
          const targets = [...document.querySelectorAll(selector)].filter(node => eligible(node) && !mounted.has(node));
          if (!targets.length) return [];
          if (!window.TDBModules) throw Error('Shared registry unavailable');
          return window.TDBModules.load(new URL('tdb-motion.js', base).href, {
            ready: () => typeof window.TDBMotion?.ddText === 'function'
          }).then(() => targets);
        });
        if (disposed || !nodes) return;
        let index = 0;
        while (index < nodes.length && !disposed) {
          // Loading and mounting have separate turns. Bound each mounting batch
          // by node count and time; the shared motion owner performs geometry work.
          await background(deadline => {
            const began = performance.now();
            let count = 0;
            while (index < nodes.length && count < 8) {
              if (count && (performance.now() - began >= 4 ||
                  (!deadline.didTimeout && deadline.timeRemaining() < 1))) break;
              const node = nodes[index++]; count++;
              if (!eligible(node) || mounted.has(node)) continue;
              const root = node.closest('.tdbc-dialog');
              const mode = node.getAttribute('data-tdb-dd-page') || 'viewport';
              const preset = node.getAttribute('data-tdb-dd-preset') || 'standard';
              mounted.set(node, window.TDBMotion.ddText([node], {root, mode, preset}));
            }
          });
        }
      } while (dirty && !disposed);
    })().catch(error => {
      if (!disposed) {
        retryNeeded = true;
        console.warn('TDB DD: keeping the readable native fallback.', error);
      }
    }).finally(() => { pending = null; });
    return pending;
  }
  function destroy() {
    if (disposed) return;
    disposed = true; lifecycle.abort(); observer?.disconnect();
    for (const cancel of [...cancellations]) cancel();
    mounted.forEach(owner => owner.destroy()); mounted.clear();
  }
  const api = Object.freeze({
    version: '1.0.0', refresh, count: () => mounted.size, destroy,
    status: () => ({started, pending: !!pending, mounted: mounted.size, retryNeeded, disposed})
  });
  window.TDBRuntime = api;
  window.TDBDDFades = api;
  window.addEventListener('pageshow', refresh, {signal});
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'online'])
    window.addEventListener(event, () => {
      if (retryNeeded && !pending && !disposed) refresh();
    }, {passive: true, signal});
  // The consent handoff occurs after DOM preparation. Keep direct loading safe too.
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', refresh, {once: true, signal});
  else refresh();
})();
