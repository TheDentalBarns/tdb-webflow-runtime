/* Shared, demand-only bridge for standalone pages without the consent registry.
 * Bundled into those entry points; it adds no request when TDBModules exists.
 */
(() => {
  'use strict';
  if (window.TDBModuleBootstrap) return;
  let flight;
  const failed = new WeakSet();
  function ensure(base) {
    if (window.TDBModules) return Promise.resolve(window.TDBModules);
    if (flight) return flight;
    flight = new Promise((resolve, reject) => {
      const scripts = [...document.scripts].filter((node) => !failed.has(node));
      // Adopt the foundation already in flight, including its configured pins.
      let node =
        scripts.find((s) => /\/tdb-modules\.js(?:[?#]|$)/.test(s.src)) ||
        scripts.find((s) => /\/tdb-consent\.js(?:[?#]|$)/.test(s.src));
      const fresh = !node;
      node ||= document.createElement('script');
      const cleanup = () => {
        clearTimeout(timer);
        node.removeEventListener('load', done);
        node.removeEventListener('error', fail);
      };
      const done = () => {
        cleanup();
        if (window.TDBModules) resolve(window.TDBModules);
        else
          reject(
            Object.assign(Error('Shared registry loaded without expected export'), {
              code: 'TDB_EXPORT',
            }),
          );
      };
      const fail = () => {
        cleanup();
        failed.add(node);
        if (fresh) node.remove();
        // Only a failed request can be retried. A timeout may still execute.
        flight = null;
        reject(Object.assign(Error('Shared registry unavailable'), { code: 'TDB_NETWORK' }));
      };
      const timer = setTimeout(() => {
        reject(Object.assign(Error('Shared registry timed out'), { code: 'TDB_TIMEOUT' }));
      }, 20000);
      node.addEventListener('load', done, { once: true });
      node.addEventListener('error', fail, { once: true });
      if (fresh) {
        node.src = new URL('tdb-modules.js', base).href;
        node.async = true;
        document.head.append(node);
      } else if (node.dataset.tdbLoaded === 'true') done();
    });
    return flight;
  }
  window.TDBModuleBootstrap = Object.freeze({ ensure });
})();

/* TDB Treatment Calculator loader v1.6.0. URLs are immutable release pins. */
(function () {
  'use strict';
  if (window.__tdbCalculatorLoader) return;
  window.__tdbCalculatorLoader = true;
  const scriptURL = new URL('tdb-calculator.js', document.currentScript.src).href;
  const styleURL = new URL('tdb-calculator.css', document.currentScript.src).href;
  const selector = '[data-tdb-calc-open],a[href$="#treatment-calculator"]';
  let loading = null;
  function load() {
    if (window.TDBCalculator) return Promise.resolve(window.TDBCalculator);
    if (loading) return loading;
    loading = window.TDBModuleBootstrap.ensure(scriptURL)
      .then(async (modules) => {
        // Preserve CSS-before-execution: the controller measures its native UI.
        await modules.load(styleURL, { type: 'style', timeout: 15000 });
        await modules.load(scriptURL, {
          ready: () => typeof window.TDBCalculator?.open === 'function',
          timeout: 15000,
        });
        return window.TDBCalculator;
      })
      .catch((e) => {
        loading = null;
        throw e;
      });
    return loading;
  }
  function start() {
    const mount = document.querySelector('[data-tdb-calculator="inline"]');
    if (mount) {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              observer.disconnect();
              load().catch(() => {
                const p = mount.querySelector('[data-tdb-calc-fallback]');
                if (p)
                  p.textContent =
                    'The calculator could not load. Please refresh, or browse our treatment fees below.';
              });
            }
          },
          { rootMargin: '500px' },
        );
        observer.observe(mount);
      } else load().catch(() => {});
    }
    document.addEventListener(
      'click',
      (e) => {
        const link = e.target.closest?.(selector);
        if (
          !link ||
          window.TDBCalculator ||
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button > 0
        )
          return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (link.getAttribute('aria-busy') === 'true') return;
        link.setAttribute('aria-busy', 'true');
        load()
          .then((api) => api.open(link))
          .catch(() => {
            location.assign(link.href || '/dental-cost-lichfield#treatment-calculator');
          })
          .finally(() => link.removeAttribute('aria-busy'));
      },
      true,
    );
    const warm = () =>
      load()
        .then((api) => api.preload?.())
        .catch(() => {});
    if ('IntersectionObserver' in window) {
      const near = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            near.disconnect();
            warm();
          }
        },
        { rootMargin: '800px' },
      );
      document.querySelectorAll(selector).forEach((el) => near.observe(el));
    }
    document.addEventListener(
      'pointerover',
      (e) => {
        if (e.target.closest?.(selector)) warm();
      },
      { passive: true },
    );
    document.addEventListener('focusin', (e) => {
      if (e.target.closest?.(selector)) warm();
    });
    // Delegation also supports FAQ links inserted after initial page rendering.
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
