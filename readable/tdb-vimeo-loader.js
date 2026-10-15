/* TDB Vimeo loader 2.0.0. Released by the shared functionality-consent gate.
 * Owns proximity and preparation; the coordinator owns permission and settings.
 * Webflow owns the static frame. The controller owns playback.
 */
(() => {
  'use strict';
  if (window.TDBVimeoLoader || !window.TDBConsent?.subscribe) return;
  const base = new URL('./', document.currentScript.src);
  const consent = window.TDBConsent;
  const selector = '[data-vimeo-hero-shell],[data-vimeo-ambient-init],[data-vimeo-content-init]';
  const roots = [...document.querySelectorAll(selector)];
  let pending = null,
    near = false,
    flight = null,
    observer = null,
    api = null;
  let armed = false,
    unsubscribe;
  const permitted = () => consent.allows('functionality');
  function mark(root, loading) {
    if (!root) return;
    root.querySelector('[data-vimeo-control="play"]')?.setAttribute('aria-busy', String(loading));
    if (root.matches('[data-vimeo-hero-shell]')) {
      root.setAttribute('data-vimeo-ui', loading ? 'loading' : 'idle');
      root.setAttribute('data-vimeo-pulse', String(!loading));
    } else {
      root.setAttribute('data-vimeo-loading', String(loading));
      root.setAttribute('data-vimeo-awaiting-consent', 'false');
    }
  }
  function clearPending() {
    mark(pending, false);
    pending = null;
  }
  function disarm() {
    armed = false;
    observer?.disconnect();
    document.removeEventListener('pointerover', onIntent, true);
    document.removeEventListener('focusin', onIntent, true);
  }
  async function prepare() {
    if (!permitted() || (!near && !pending) || !roots.length) return null;
    if (api) return api;
    if (flight) return flight;
    flight = (async () => {
      const shared = document.querySelector('link[data-tdb-ui-css]');
      if (!shared || shared.disabled) throw new Error('Shared UI stylesheet unavailable');
      await Promise.all([
        window.TDBModules.load(shared.href, { type: 'style', timeout: 15000 }).then(() => {
          shared.media = 'all';
        }),
        window.TDBModules.load(new URL('tdb-vimeo.css', base), {
          type: 'style',
          attribute: 'data-tdb-vimeo-css',
          timeout: 15000,
        }),
      ]);
      if (!permitted()) return null;
      await window.TDBModules.load(new URL('tdb-vimeo.js', base), {
        attribute: 'data-vimeo-controller-js',
        ready: () => !!window.TDBVimeo,
        timeout: 15000,
      });
      if (!permitted()) return null;
      api = window.TDBVimeo.init();
      if (!api) throw new Error('Vimeo controller did not initialise');
      disarm();
      unsubscribe?.();
      const target = pending;
      pending = null;
      target?.querySelector('[data-vimeo-control="play"]')?.setAttribute('aria-busy', 'false');
      if (target?.isConnected) api.play(target);
      return api;
    })()
      .catch((error) => {
        clearPending();
        console.warn(error.message);
        return null;
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  function onIntent(event) {
    if (!event.target.closest?.(selector)) return;
    near = true;
    prepare();
  }
  function arm() {
    if (!permitted()) {
      disarm();
      clearPending();
      return;
    }
    if (api || armed || !roots.length) return;
    armed = true;
    document.addEventListener('pointerover', onIntent, true);
    document.addEventListener('focusin', onIntent, true);
    if ('IntersectionObserver' in window) {
      observer ||= new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            near = true;
            prepare();
          }
        },
        { rootMargin: '300px 0px' },
      );
      roots.forEach((root) =>
        observer.observe(root.closest('.layout355_background-video-wrapper') || root),
      );
    } else near = true;
    prepare();
  }
  function play(root) {
    if (!permitted()) return Promise.resolve(null);
    if (api) return api.play(root);
    if (pending !== root) clearPending();
    pending = root;
    mark(root, true);
    return prepare();
  }
  window.TDBVimeoLoader = Object.freeze({
    version: '2.0.0',
    prepare,
    play,
    status: () => ({
      present: roots.length,
      permitted: permitted(),
      near,
      pending: !!pending,
      loading: !!flight,
      ready: !!api,
    }),
  });
  unsubscribe = consent.subscribe(arm);
})();
