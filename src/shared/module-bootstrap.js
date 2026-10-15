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
