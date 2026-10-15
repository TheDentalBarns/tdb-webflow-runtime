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

/* TDB review archive loader v1.1.0. Presence + proximity + performance gate.
 * CMS HTML/pagination remain available immediately. No tracking dependencies.
 * An existing CookieScript decision (accept OR reject/close) releases enhancement;
 * deliberate filter intent also releases this functional module.
 */
(() => {
  'use strict';
  if (window.TDBReviewListLoader) return;
  const script = document.currentScript,
    base = new URL('./', script.src),
    root = document.querySelector('[data-tdb-review-page]');
  if (!root) return;
  script.setAttribute('data-tdb-reviews-loader', '');
  let near = false,
    intent = false,
    flight = null,
    instance = null;
  const decided = () => {
    try {
      const action = window.CookieScript?.instance?.currentState?.()?.action;
      if (['accept', 'reject', 'close'].includes(String(action).toLowerCase())) return true;
      const raw = document.cookie
        .split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith('CookieScriptConsent='));
      const saved = raw && JSON.parse(decodeURIComponent(raw.slice(raw.indexOf('=') + 1)));
      return ['accept', 'reject', 'close'].includes(
        String(saved?.action || saved?.a).toLowerCase(),
      );
    } catch {
      return false;
    }
  };
  const registry = () => window.TDBModuleBootstrap.ensure(base);
  async function prepare() {
    if (instance) return instance;
    if (flight) return flight;
    flight = (async () => {
      await registry();
      await TDBModules.load(new URL('tdb-motion.js', base), { ready: () => !!window.TDBMotion });
      await Promise.all(
        [
          ['tdb-ticker.js', 'TDBNativeTicker'],
          ['tdb-filters.js', 'TDBFilters'],
          ['tdb-review-cms.js', 'TDBReviewCMS'],
          ['tdb-review-list.js', 'TDBReviewList'],
        ].map(([name, key]) =>
          TDBModules.load(new URL(name, base), { ready: () => !!window[key] }),
        ),
      );
      instance = TDBReviewList.mount(root);
      return instance;
    })();
    flight.catch(() => {
      flight = null;
    });
    return flight;
  }
  function sync() {
    if (near && (intent || decided())) prepare().catch(() => {});
  }
  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              near = true;
              sync();
            }
          },
          { rootMargin: '700px' },
        )
      : null;
  if (io) io.observe(root.querySelector('[data-tdb-review-cms]') || root);
  else near = true;
  for (const name of [
    'CookieScriptLoaded',
    'CookieScriptCurrentState',
    'CookieScriptAccept',
    'CookieScriptAcceptAll',
    'CookieScriptReject',
    'CookieScriptClose',
  ])
    addEventListener(name, sync);
  const toggle = root.querySelector('[data-tdb-filter-toggle]');
  // A functional user request is not a request for marketing consent.
  for (const name of ['pointerenter', 'focus', 'pointerdown'])
    toggle?.addEventListener(
      name,
      () => {
        intent = true;
        near = true;
        sync();
      },
      { passive: true },
    );
  let opening = false;
  const trigger = (event) => {
    const t = event.target.closest?.('[data-tdb-filter-toggle]');
    if (!t || instance) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (opening) return;
    opening = true;
    intent = true;
    near = true;
    prepare()
      .then(() => t.click())
      .catch(() => {
        const status = root.querySelector('[data-tdb-list-status]');
        if (status) status.textContent = 'Filters could not load. Please try again.';
      })
      .finally(() => {
        opening = false;
      });
  };
  document.addEventListener('click', trigger, true);
  if (location.hash && location.hash.includes('=')) {
    intent = true;
    near = true;
    sync();
  }
  const idle = () =>
    registry()
      .then(() => TDBModules.load(new URL('tdb-review-availability.js', base)))
      .catch(() => {});
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
  sync();
  window.TDBReviewListLoader = {
    prepare,
    status: () => ({ near, prepared: !!instance, ...instance?.status() }),
  };
})();
