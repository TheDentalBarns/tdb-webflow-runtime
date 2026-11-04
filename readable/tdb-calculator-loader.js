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

/* TDB Treatment Calculator loader v1.7.0. Native entry, inline and drawer loading. */
(function () {
  'use strict';
  if (window.__tdbCalculatorLoader) return;
  window.__tdbCalculatorLoader = true;
  const scriptURL = new URL('tdb-calculator.js', document.currentScript.src).href;
  const styleURL = new URL('tdb-calculator.css', document.currentScript.src).href;
  const moduleRoot = new URL('.', scriptURL);
  const selector = '[data-tdb-calc-open],a[href$="#treatment-calculator"]';
  let loading = null;
  function load() {
    if (window.TDBCalculator) return Promise.resolve(window.TDBCalculator);
    if (loading) return loading;
    loading = window.TDBModuleBootstrap.ensure(scriptURL)
      .then(async (modules) => {
        await Promise.all([
          modules.load(styleURL, { type: 'style', timeout: 15000 }),
          modules
            .load(new URL('tdb-motion.js', moduleRoot), {
              ready: () => Boolean(window.TDBMotion),
            })
            .then(() =>
              modules.load(new URL('tdb-ticker.js', moduleRoot), {
                ready: () => Boolean(window.TDBNativeTicker),
              }),
            )
            .catch(() => {}),
        ]);
        await modules.load(scriptURL, {
          ready: () => typeof window.TDBCalculator?.open === 'function',
          timeout: 15000,
        });
        return window.TDBCalculator;
      })
      .catch((error) => {
        loading = null;
        throw error;
      });
    return loading;
  }
  function start() {
    const pending = new WeakMap();
    const deferred = (root) => root?.getAttribute('data-tdb-calc-load') === 'interaction';
    const localEntry = (link) => {
      if (!link || link.hasAttribute('data-tdb-calc-open')) return null;
      const url = new URL(link.href || '', location.href);
      if (
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        url.hash !== '#treatment-calculator'
      )
        return null;
      const root = document.getElementById('treatment-calculator');
      return deferred(root) ? root : null;
    };
    const status = (root, message) => {
      const node = root.querySelector('[data-tdb-calc-status],[data-tdb-calc-fallback]');
      if (node) node.textContent = message;
    };
    function activate(root) {
      if (pending.has(root)) return pending.get(root);
      root.setAttribute('aria-busy', 'true');
      status(root, 'Loading current prices…');
      const request = load()
        .then((api) => api.mount(root))
        .catch(() => {
          status(
            root,
            'Current prices could not load. Choose again to retry, or browse the fees below.',
          );
        })
        .finally(() => {
          pending.delete(root);
          root.removeAttribute('aria-busy');
        });
      pending.set(root, request);
      return request;
    }
    document.querySelectorAll('[data-tdb-calculator="inline"]').forEach((root) => {
      if (deferred(root)) return;
      if (
        root.getAttribute('data-tdb-calc-load') === 'immediate' ||
        !('IntersectionObserver' in window)
      ) {
        activate(root);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            activate(root);
          }
        },
        { rootMargin: '500px' },
      );
      observer.observe(root);
    });
    document.addEventListener('change', (event) => {
      const input = event.target.closest?.('input[data-category]');
      const root = input?.closest('[data-tdb-calculator="inline"]');
      if (!deferred(root) || root.hasAttribute('data-tdb-calc-ready')) return;
      input.closest('.tdbc-category')?.classList.toggle('is-selected', input.checked);
      activate(root);
    });
    // Native checkbox forms are local controls, never a Webflow submission.
    document.addEventListener(
      'submit',
      (event) => {
        if (event.target.closest('[data-tdb-calc-native-entry]')) event.preventDefault();
      },
      true,
    );
    document.addEventListener(
      'click',
      (event) => {
        const link = event.target.closest?.(selector);
        if (
          !link ||
          localEntry(link) ||
          window.TDBCalculator ||
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button > 0
        )
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
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
          if (entries.some((entry) => entry.isIntersecting)) {
            near.disconnect();
            warm();
          }
        },
        { rootMargin: '800px' },
      );
      document.querySelectorAll(selector).forEach((link) => {
        if (!localEntry(link) && !document.querySelector('[data-tdb-calc-load="interaction"]'))
          near.observe(link);
      });
    }
    document.addEventListener(
      'pointerover',
      (event) => {
        const link = event.target.closest?.(selector);
        if (link && !localEntry(link)) warm();
      },
      { passive: true },
    );
    document.addEventListener('focusin', (event) => {
      const link = event.target.closest?.(selector);
      if (link && !localEntry(link)) warm();
    });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
