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
