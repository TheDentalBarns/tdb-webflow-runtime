/* TDB runtime v1.4.1. Consent hands off once; feature loaders follow in idle turns.
 * Component-owned fades retain their existing gates and shared motion owner.
 */
(() => {
  'use strict';
  if (window.TDBRuntime) return;
  const base = new URL('./', document.currentScript.src);
  const selector = '[data-tdb-dd-page],.tdbc-dd-fade';
  const mounted = new Map(),
    cancellations = new Set();
  const lifecycle = new AbortController(),
    { signal } = lifecycle;
  let pending = null,
    observer,
    disposed = false,
    dirty = false,
    started = false,
    retryNeeded = false;
  let navbarFlight = null,
    navbarRequested = false,
    navbarRetry = false,
    controlsReady = false;

  // A bounded initial-render heuristic, not a claim that the final LCP is known.
  // Wait for load + a short quiet period; never hold background work indefinitely.
  function initialRender() {
    return new Promise((resolve) => {
      const gate = new AbortController();
      let quietTimer,
        limitTimer,
        paintObserver,
        finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(quietTimer);
        clearTimeout(limitTimer);
        paintObserver?.disconnect();
        gate.abort();
        cancellations.delete(finish);
        resolve(!disposed);
      }
      function quiet() {
        clearTimeout(quietTimer);
        if (document.readyState === 'complete') quietTimer = setTimeout(finish, 150);
      }
      cancellations.add(finish);
      window.addEventListener('load', quiet, { once: true, signal: gate.signal });
      // On an active visit, let the idle queue proceed instead of extending the gate.
      for (const event of ['pointerdown', 'keydown'])
        window.addEventListener(event, finish, { once: true, passive: true, signal: gate.signal });
      try {
        if (window.PerformanceObserver?.supportedEntryTypes?.includes('largest-contentful-paint')) {
          paintObserver = new PerformanceObserver(quiet);
          paintObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        }
      } catch (_) {
        paintObserver?.disconnect();
      }
      limitTimer = setTimeout(finish, 1500);
      quiet();
    });
  }

  function background(work) {
    return new Promise((resolve, reject) => {
      if (disposed) {
        resolve(null);
        return;
      }
      const idle =
        typeof window.requestIdleCallback === 'function' &&
        typeof window.cancelIdleCallback === 'function';
      let handle;
      function cancel() {
        if (idle) window.cancelIdleCallback(handle);
        else clearTimeout(handle);
        cancellations.delete(cancel);
        resolve(null);
      }
      function run(deadline) {
        cancellations.delete(cancel);
        if (disposed) {
          resolve(null);
          return;
        }
        try {
          resolve(work(deadline));
        } catch (error) {
          reject(error);
        }
      }
      cancellations.add(cancel);
      handle = idle
        ? window.requestIdleCallback(run, { timeout: 1000 })
        : setTimeout(() => run({ didTimeout: true, timeRemaining: () => 0 }), 16);
    });
  }

  function eligible(node) {
    return (
      node.isConnected &&
      node.matches(selector) &&
      !node.closest('template,[data-tdb-quotes-template]') &&
      !node.matches('.tdbc-dialog .tdbc-section-footer .tdbc-dd-fade') &&
      !(node.hasAttribute('data-tdb-dd-legacy') && node.hasAttribute('data-w-id'))
    );
  }
  const renderReady = initialRender();
  function enhanceNavbar() {
    if (disposed || navbarRequested) return Promise.resolve(navbarRequested);
    if (navbarFlight) return navbarFlight;
    if (!window.TDBConsent?.allows() || window.CookieScript?.instance?.isOpen?.())
      return Promise.resolve(false);
    const loader = window.TDBNavbarLoader;
    if (!loader && !document.querySelector('[data-tdb-disclosure-trigger],[data-tdb-chevron]'))
      return Promise.resolve(false);
    navbarFlight = (async () => {
      if (!(await renderReady) || disposed) return false;
      await background(() =>
        window.TDBModules.load(new URL('tdb-control-motion.css', base).href, {
          type: 'style',
          attribute: 'data-tdb-control-motion-css',
        }),
      );
      if (disposed) return false;
      if (loader) {
        await background(() =>
          window.TDBModules.load(new URL('tdb-navbar.min.js', base).href, {
            attribute: 'data-tdb-navbar-enhancement',
            timeout: 15000,
            ready: () => loader.status().registered || loader.status().ready,
          }),
        );
        if (disposed) return false;
        loader.activate(background);
        navbarRequested = true;
      }
      await background(() => {
        if (controlsReady) return;
        // Do not replay an entrance for a disclosure already opened natively.
        document
          .querySelectorAll('[data-tdb-disclosure-interacted]')
          .forEach((node) => node.removeAttribute('data-tdb-disclosure-interacted'));
        document.documentElement.setAttribute('data-tdb-control-motion', '');
        controlsReady = true;
      });
      navbarRetry = false;
      return true;
    })()
      .catch((error) => {
        if (!disposed) {
          navbarRetry = true;
          console.warn('TDB navbar: retaining native navigation.', error);
        }
        return false;
      })
      .finally(() => {
        navbarFlight = null;
        // A fast runtime can arrive before the deferred early navbar loader.
        if (!loader && window.TDBNavbarLoader && !navbarRequested && !navbarRetry && !disposed)
          enhanceNavbar();
      });
    return navbarFlight;
  }
  function refresh() {
    if (disposed) return Promise.resolve();
    dirty = true;
    if (pending) return pending;
    pending = (async () => {
      if (!(await renderReady) || disposed) return;
      if (!started) {
        observer = new MutationObserver((records) => {
          // Ignore ticker text replacements and unrelated DOM changes.
          if (
            records.some((record) =>
              [...record.addedNodes, ...record.removedNodes].some(
                (node) =>
                  node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector)),
              ),
            )
          )
            refresh();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        started = true;
      }
      do {
        dirty = false;
        retryNeeded = false;
        const nodes = await background(() => {
          for (const [node, owner] of mounted) {
            if (!eligible(node)) {
              owner.destroy();
              mounted.delete(node);
            }
          }
          const targets = [...document.querySelectorAll(selector)].filter(
            (node) => eligible(node) && !mounted.has(node),
          );
          if (!targets.length) return [];
          if (!window.TDBModules) throw Error('Shared registry unavailable');
          return window.TDBModules.load(new URL('tdb-motion.js', base).href, {
            ready: () => typeof window.TDBMotion?.ddText === 'function',
          }).then(() => targets);
        });
        if (disposed || !nodes) return;
        let index = 0;
        while (index < nodes.length && !disposed) {
          // Loading and mounting have separate turns. Bound each mounting batch
          // by node count and time; the shared motion owner performs geometry work.
          await background((deadline) => {
            const began = performance.now();
            let count = 0;
            while (index < nodes.length && count < 8) {
              if (
                count &&
                (performance.now() - began >= 4 ||
                  (!deadline.didTimeout && deadline.timeRemaining() < 1))
              )
                break;
              const node = nodes[index++];
              count++;
              if (!eligible(node) || mounted.has(node)) continue;
              const root = node.closest('.tdbc-dialog');
              const mode = node.getAttribute('data-tdb-dd-page') || 'viewport';
              const preset = node.getAttribute('data-tdb-dd-preset') || 'standard';
              mounted.set(node, window.TDBMotion.ddText([node], { root, mode, preset }));
            }
          });
        }
      } while (dirty && !disposed);
    })()
      .catch((error) => {
        if (!disposed) {
          retryNeeded = true;
          console.warn('TDB DD: keeping the readable native fallback.', error);
        }
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    lifecycle.abort();
    observer?.disconnect();
    window.TDBLogoMarqueeLoader?.destroy();
    window.TDBUSPDrawerLoader?.destroy();
    window.TDBPageBreaks?.destroy();
    window.TDBFiveSensesLauncher?.destroy();
    window.TDBHoldAudioLoader?.destroy();
    window.TDBReviewFeatureLoader?.destroy();
    window.TDBReviewWidgetLoader?.destroy();
    window.TDBLazyIconMasks?.destroy();
    window.TDBInstagramFeatureLoader?.destroy();
    window.TDBSmileFeatureLoader?.destroy();
    for (const cancel of [...cancellations]) cancel();
    mounted.forEach((owner) => owner.destroy());
    mounted.clear();
  }
  const api = Object.freeze({
    version: '1.5.0',
    refresh,
    enhanceNavbar,
    schedule: background,
    count: () => mounted.size,
    destroy,
    status: () => ({
      started,
      pending: !!pending,
      mounted: mounted.size,
      retryNeeded,
      disposed,
      controlsReady,
      navbarRequested,
      navbarRetry,
    }),
  });
  window.TDBRuntime = api;
  window.TDBDDFades = api;
  window.addEventListener('pageshow', refresh, { signal });
  window.addEventListener('tdb:navbar-ready', enhanceNavbar, { signal });
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'online'])
    window.addEventListener(
      event,
      () => {
        if (retryNeeded && !pending && !disposed) refresh();
        if (navbarRetry && !navbarFlight && !disposed) enhanceNavbar();
      },
      { passive: true, signal },
    );
  // The consent handoff occurs after DOM preparation. Keep direct loading safe too.
  function start() {
    window.TDBHoldAudioLoader?.start();
    refresh();
    enhanceNavbar();
    renderReady
      .then((ready) => {
        if (ready) {
          if (typeof TDBFeatureStartup !== 'undefined')
            TDBFeatureStartup.start(background, () => !disposed).catch((error) => {
              if (!disposed) console.warn('TDB feature startup unavailable.', error);
            });
          return window.TDBLogoMarqueeLoader?.start({ schedule: background });
        }
      })
      .catch((error) => {
        if (!disposed) console.warn('TDB marquee startup unavailable.', error);
      });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true, signal });
  else start();
})();
