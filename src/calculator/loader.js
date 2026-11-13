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
    const status = (root, message, busy = false) => {
      const node = root.querySelector('[data-tdb-calc-status],[data-tdb-calc-fallback]');
      if (!node) return;
      node.toggleAttribute('data-loading', busy);
      node.textContent = busy ? '' : message;
      if (busy) node.setAttribute('aria-label', message);
      else node.removeAttribute('aria-label');
    };
    function activate(root) {
      if (pending.has(root)) return pending.get(root);
      const entry = root.querySelector('[data-tdb-calc-native-entry]'),
        box = entry?.getBoundingClientRect(),
        gate = new AbortController(),
        style = document.documentElement.style,
        previousAnchor = style.getPropertyValue('overflow-anchor'),
        previousPriority = style.getPropertyPriority('overflow-anchor'),
        entryPosition =
          deferred(root) && box?.height && box.bottom > 0 && box.top < innerHeight
            ? { anchor: entry, top: box.top, signal: gate.signal }
            : null;
      const release = () => {
        if (gate.signal.aborted) return;
        gate.abort();
        if (entryPosition && style.getPropertyValue('overflow-anchor') === 'none') {
          if (previousAnchor)
            style.setProperty('overflow-anchor', previousAnchor, previousPriority);
          else style.removeProperty('overflow-anchor');
        }
      };
      if (entryPosition) {
        // Protect the native cards before even the loading message or feature
        // stylesheet changes layout. The calculator owns the final correction.
        style.setProperty('overflow-anchor', 'none');
        for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'pagehide'])
          window.addEventListener(type, release, {
            passive: true,
            signal: gate.signal,
          });
      }
      root.setAttribute('aria-busy', 'true');
      status(root, 'Loading current prices', true);
      const request = load()
        .then((api) => api.mount(root, { entryPosition }))
        .catch(() => {
          status(
            root,
            'Current prices could not load. Choose again to retry, or browse the fees below.',
          );
        })
        .finally(() => {
          release();
          const node = root.querySelector('[data-tdb-calc-status],[data-tdb-calc-fallback]');
          node?.removeAttribute('data-loading');
          node?.removeAttribute('aria-label');
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
