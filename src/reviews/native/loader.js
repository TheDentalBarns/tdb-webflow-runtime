/* TDB reviews v4.1.0. Runtime starts this feature after a cookie decision.
 * Inline components retain proximity preparation. Drawer assets are demand-only.
 */
(() => {
  'use strict';
  if (window.TDBReviewLoader) return;
  const script = document.currentScript;
  const base = new URL(window.TDBRelease?.base || './', script?.src || location.href);
  const lazyBase = base;
  const options = window.TDBReviewOptions || {};
  const selector =
    '[data-tdb-review-introduction],[data-tdb-review-cards],[data-tdb-review-quotes]';
  const triggers = '[data-tdb-review-trigger],[data-tdb-quote-action],[data-tdb-cards-open]';
  const states = new Map(),
    originals = new Map(),
    lifecycle = new AbortController();
  let session = new AbortController(),
    dataFlight,
    drawer,
    unsubscribe,
    disposed = false,
    permitted,
    openSequence = 0;
  const drawerRoot = () => document.querySelector('[data-tdb-reviews]');
  const lazyRoot = () => document.querySelector('[data-tdb-review-lazy]');
  function allowed() {
    if (disposed) return false;
    try {
      return Boolean(options.permission ? options.permission() : window.TDBConsent?.allows());
    } catch (_) {
      return false;
    }
  }
  function check(signal) {
    if (disposed || signal?.aborted || !allowed())
      throw new DOMException('Cancelled', 'AbortError');
  }
  function triggerState(root, enabled) {
    for (const node of root.querySelectorAll(triggers)) {
      if (!originals.has(node))
        originals.set(node, {
          tabindex: node.getAttribute('tabindex'),
          disabled: node.getAttribute('aria-disabled'),
        });
      const disabled = String(!enabled);
      if (node.getAttribute('aria-disabled') !== disabled)
        node.setAttribute('aria-disabled', disabled);
      if (!enabled) {
        node.setAttribute('tabindex', '-1');
        node.removeAttribute('aria-busy');
        node.removeAttribute('data-tdb-loading');
      } else {
        const value = originals.get(node).tabindex;
        if (value !== null) node.setAttribute('tabindex', value);
        else if (node.matches('button,a[href]')) node.removeAttribute('tabindex');
        else node.setAttribute('tabindex', '0');
      }
    }
  }
  function restoreTriggers(root) {
    for (const [node, saved] of originals)
      if (!root || root.contains(node)) {
        for (const [name, value] of [
          ['tabindex', saved.tabindex],
          ['aria-disabled', saved.disabled],
        ])
          value === null ? node.removeAttribute(name) : node.setAttribute(name, value);
        node.removeAttribute('aria-busy');
        node.removeAttribute('data-tdb-loading');
        originals.delete(node);
      }
  }
  function kind(root) {
    return root.matches('[data-tdb-review-introduction]')
      ? 'introduction'
      : root.matches('[data-tdb-review-cards]')
        ? 'cards'
        : 'quotes';
  }
  async function template(signal) {
    check(signal);
    if (drawerRoot()) return;
    const host = lazyRoot();
    if (!host) return;
    await Promise.all([
      window.TDBModules.load(new URL('tdb-drawer.css', lazyBase), { type: 'style' }),
      window.TDBModules.load(new URL('tdb-review-drawer.css', lazyBase), {
        type: 'style',
        attribute: 'data-tdb-review-drawer-css',
      }),
      window.TDBModules.load(new URL('tdb-review-drawer-template.js', lazyBase), {
        ready: () => typeof window.TDBReviewDrawerTemplate?.mount === 'function',
      }),
    ]);
    check(signal);
    if (!drawerRoot() && host.isConnected && host === lazyRoot())
      window.TDBReviewDrawerTemplate.mount(host);
  }
  async function dependencies(type, signal, withDrawer) {
    check(signal);
    await window.TDBModules.load(new URL('tdb-motion.js', base), {
      ready: () => typeof window.TDBMotion?.ddText === 'function',
    });
    check(signal);
    const files = ['tdb-ticker.js', 'tdb-review-cms.js'];
    if (type && type !== 'quotes') files.push('tdb-review-' + type + '.js');
    if (type === 'quotes') files.push('tdb-quote-carousel.js');
    if (type === 'cards') files.push('tdb-slider-focus.js', 'tdb-rendered-progress.js');
    if (withDrawer && (drawerRoot() || lazyRoot()))
      files.push('tdb-drawer.js', 'tdb-filters.js', 'tdb-reviews.js');
    const ready = {
      'tdb-ticker.js': () => typeof window.TDBNativeTicker?.mount === 'function',
      'tdb-review-cms.js': () => typeof window.TDBReviewCMS?.load === 'function',
      'tdb-review-introduction.js': () => typeof window.TDBReviewIntroduction?.mount === 'function',
      'tdb-review-cards.js': () => typeof window.TDBReviewCards?.mount === 'function',
      'tdb-review-quote-adapter.min.js': () => typeof window.TDBReviewQuotes?.mount === 'function',
      'tdb-quote-carousel.js': () => typeof window.TDBQuoteCarousel?.mount === 'function',
      'tdb-rendered-progress.js': () => typeof window.TDBRenderedProgress?.observe === 'function',
    };
    await Promise.all(
      files.map((file) =>
        window.TDBModules.load(new URL(file, base), ready[file] ? { ready: ready[file] } : {}),
      ),
    );
    check(signal);
    // The canonical CMS bundle now carries its small quote adapter. Retain a
    // demand-only bridge when a page deliberately keeps an older CMS pin.
    if (type === 'quotes' && typeof window.TDBReviewQuotes?.mount !== 'function') {
      await window.TDBModules.load(new URL('tdb-review-quote-adapter.min.js', base), {
        ready: ready['tdb-review-quote-adapter.min.js'],
      });
      check(signal);
    }
    if ((withDrawer && (drawerRoot() || lazyRoot())) || type === 'quotes' || type === 'cards') {
      await window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', base), {
        attribute: 'data-swiper-js',
        ready: () =>
          typeof window.Swiper === 'function' && typeof window.TDBSwiper?.create === 'function',
      });
      check(signal);
    }
    if (window.TDBSwiper)
      for (const [name, plugin] of [
        ['review-drawer', window.TDBReviews],
        ['review-cards', window.TDBReviewCards],
        ['review-testimonials', window.TDBReviewQuotes],
      ])
        if (plugin) window.TDBSwiper.register(name, plugin);
  }
  async function prepare({
    signal = session.signal,
    kind: type = null,
    drawer: withDrawer = type === null,
  } = {}) {
    check(signal);
    if (!states.size && !document.querySelector(selector) && !drawerRoot() && !lazyRoot())
      throw Error('No review component on this page');
    const generation = session.signal;
    await Promise.all([
      dependencies(type, signal, withDrawer),
      withDrawer ? template(signal) : null,
    ]);
    check(signal);
    check(generation);
    if (!dataFlight) {
      const flight = Promise.resolve().then(() => {
        check(generation);
        return window.TDBReviewCMS.load({ signal: generation });
      });
      dataFlight = flight;
      flight.catch(() => {
        if (dataFlight === flight) dataFlight = null;
      });
    }
    const data = await dataFlight;
    check(signal);
    check(generation);
    const root = drawerRoot();
    if (withDrawer && root && !drawer) drawer = window.TDBSwiper.mount('review-drawer', root, data);
    return data;
  }
  async function open({ trigger, signal = session.signal, reviewId = '', onReady } = {}) {
    const request = ++openSequence,
      generation = session.signal;
    const current = () => {
      check(signal);
      check(generation);
      if (request !== openSequence || (trigger && !trigger.isConnected))
        throw new DOMException('Cancelled', 'AbortError');
    };
    const data = await prepare({ signal });
    current();
    if (!drawer) throw Error('Native review drawer unavailable');
    const introduction = trigger?.closest('[data-tdb-review-introduction]');
    await data.ensureIdentity?.(introduction, { signal });
    current();
    const id =
      reviewId ||
      introduction?.querySelector('[data-tdb-review-id]')?.getAttribute('data-tdb-review-id') ||
      window.TDBReviewCMS.resolveIdentity(data.records, introduction);
    if (id) await data.ensure?.([id], { signal });
    current();
    onReady?.();
    const instance = drawer;
    await instance.open(trigger, id);
    if ((signal.aborted || generation.aborted) && request === openSequence && drawer === instance) {
      instance.destroy();
      drawer = null;
    }
  }
  function remove(root, state) {
    state.pending = null;
    state.instance?.destroy();
    state.instance = null;
    proximity?.unobserve(root);
    states.delete(root);
    restoreTriggers(root);
  }
  function reconcile() {
    if (disposed) return;
    const enabled = allowed();
    for (const [root, state] of states) if (!root.isConnected) remove(root, state);
    if (!enabled) {
      if (permitted !== false) {
        session.abort();
        session = new AbortController();
        dataFlight = null;
        ++openSequence;
        drawer?.destroy();
        drawer = null;
        for (const [root, state] of states) {
          state.pending = null;
          state.instance?.destroy();
          state.instance = null;
          triggerState(root, false);
        }
      }
      permitted = false;
      return;
    }
    const changed = permitted !== true;
    permitted = true;
    for (const [root, state] of states) {
      if (!state.instance && (changed || !state.enabled)) {
        triggerState(root, true);
        state.enabled = true;
      }
      if (!state.near || state.instance || state.pending) continue;
      const signal = session.signal,
        token = {};
      state.pending = token;
      const current = () => {
        check(signal);
        if (!root.isConnected || states.get(root) !== state || state.pending !== token)
          throw new DOMException('Cancelled', 'AbortError');
      };
      (async () => {
        const type = kind(root),
          data = await prepare({ signal, kind: type });
        current();
        if (type === 'quotes') await data.fetchRecords(data.featured, { signal });
        if (type === 'introduction') await data.ensureIdentity?.(root, { signal });
        current();
        root
          .querySelectorAll('[data-tdb-review-count]')
          .forEach((node) => node.setAttribute('data-tdb-review-count', String(data.total)));
        root
          .querySelectorAll('[data-tdb-review-rating]')
          .forEach((node) => node.setAttribute('data-tdb-review-rating', data.average.toFixed(2)));
        const callbacks = {
          prepare: async ({ signal: consumerSignal } = {}) => {
            check(signal);
            check(consumerSignal);
            return data;
          },
          openReviews: open,
          closeReviews: () => {
            drawer?.destroy();
            drawer = null;
          },
        };
        state.instance =
          type === 'introduction'
            ? window.TDBReviewIntroduction.mount(root, callbacks)
            : window.TDBSwiper.mount(
                type === 'cards' ? 'review-cards' : 'review-testimonials',
                root,
                data,
                callbacks,
              );
        if (!state.instance) throw Error('Review component did not mount');
        root.removeAttribute('data-tdb-review-error');
      })()
        .catch((error) => {
          if (error.name !== 'AbortError' && !signal.aborted && root.isConnected) {
            root.dataset.tdbReviewError = error.message;
            console.warn('TDB review component:', error.message);
          }
        })
        .finally(() => {
          if (state.pending === token) state.pending = null;
        });
    }
  }
  const proximity =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const state = states.get(entry.target);
              if (state) state.near = entry.isIntersecting;
            }
            reconcile();
          },
          { rootMargin: '700px 0px' },
        )
      : null;
  function refresh() {
    if (disposed) return;
    for (const root of document.querySelectorAll(selector))
      if (!states.has(root)) {
        const state = { near: !proximity, instance: null, pending: null, enabled: false };
        states.set(root, state);
        proximity?.observe(root);
      }
    reconcile();
  }
  function intent(event) {
    const root = event.target.closest?.(selector),
      state = states.get(root);
    if (state && !state.instance && !state.pending) {
      state.near = true;
      reconcile();
    }
  }
  function activate(event) {
    const trigger = event.target.closest?.(triggers);
    if (!trigger || event.defaultPrevented) return;
    // One event policy for cold and mounted consumers. Native controls synthesize
    // their own click; don't let older consumer key handlers also open the drawer.
    if (event.type === 'keydown') {
      if (!['Enter', ' '].includes(event.key)) return;
      if (event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (trigger.matches('button') || (event.key === 'Enter' && trigger.matches('a[href]'))) {
        event.stopImmediatePropagation();
        return;
      }
    }
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      (event.type === 'click' && event.button !== 0) ||
      trigger.matches('a[download],a[target]:not([target="_self"])')
    ) {
      event.stopImmediatePropagation();
      return;
    }
    if (!allowed() || trigger.matches(':disabled,[aria-disabled="true"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    let root = trigger.closest(selector),
      state = states.get(root);
    if (root && !state) {
      refresh();
      state = states.get(root);
    }
    if (state?.instance) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (trigger.getAttribute('aria-busy') === 'true') return;
    const reviewId =
      trigger.closest('[data-review-id]')?.dataset.reviewId ||
      root?.querySelector('[data-tdb-review-id]')?.getAttribute('data-tdb-review-id') ||
      '';
    if (state) {
      state.near = true;
      reconcile();
    }
    const status = root?.querySelector('[data-tdb-review-status]');
    if (status) status.textContent = '';
    window.TDBModules.withBusy(trigger, () => open({ trigger, signal: session.signal, reviewId }), {
      signal: session.signal,
      onError(error) {
        if (status) status.textContent = 'The reviews could not load. Please try again.';
        else console.warn('TDB reviews: please try opening again.', error);
      },
    });
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    ++openSequence;
    session.abort();
    lifecycle.abort();
    unsubscribe?.();
    proximity?.disconnect();
    drawer?.destroy();
    drawer = null;
    for (const [root, state] of [...states]) remove(root, state);
    restoreTriggers();
    dataFlight = null;
  }
  for (const type of ['pointerover', 'focusin', 'pointerdown'])
    document.addEventListener(type, intent, { passive: true, signal: lifecycle.signal });
  for (const type of ['click', 'keydown'])
    document.addEventListener(type, activate, { capture: true, signal: lifecycle.signal });
  for (const type of ['online', 'pageshow'])
    window.addEventListener(type, refresh, { signal: lifecycle.signal });
  window.TDBReviewLoader = Object.freeze({
    version: '4.1.0',
    prepare,
    open,
    refresh,
    destroy,
    status: () => ({
      allowed: allowed(),
      prepared: !!drawer,
      instances: [...states.values()].filter((state) => state.instance).length,
      disposed,
    }),
  });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', refresh, {
      once: true,
      signal: lifecycle.signal,
    });
  else refresh();
  unsubscribe = options.subscribe
    ? options.subscribe(reconcile)
    : window.TDBConsent?.subscribe(reconcile);
})();
