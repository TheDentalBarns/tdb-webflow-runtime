/* Definition-only. Load the review feature after the shared cookie decision. */
function prepareReviewFeatureLoader() {
  'use strict';
  if (window.TDBReviewFeatureLoader) return;
  const components =
    '[data-tdb-review-introduction],[data-tdb-review-cards],[data-tdb-review-quotes]';
  const triggers = '[data-tdb-review-trigger],[data-tdb-quote-action],[data-tdb-cards-open]';
  const lifecycle = new AbortController();
  let flight,
    disposed = false,
    unsubscribe;
  function allowed() {
    return !disposed && Boolean(window.TDBConsent?.allows());
  }
  async function load() {
    if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
    if (window.TDBReviewLoader) return window.TDBReviewLoader;
    if (!flight)
      flight = window.TDBModules.load(new URL('tdb-reviews-loader.js', TDBRuntimeModuleRoot), {
        ready: () => typeof window.TDBReviewLoader?.open === 'function',
      })
        .then(() => {
          if (!allowed()) {
            if (disposed) window.TDBReviewLoader?.destroy?.();
            throw new DOMException('Cancelled', 'AbortError');
          }
          return window.TDBReviewLoader;
        })
        .finally(() => {
          flight = null;
        });
    return flight;
  }
  function refresh() {
    if (!allowed()) return;
    if (window.TDBReviewLoader) {
      window.TDBReviewLoader.refresh();
      return;
    }
    // The standalone archive has a separate controller.
    if (!document.querySelector(components + ',' + triggers)) return;
    load().catch((error) => {
      if (error.name !== 'AbortError') console.warn('TDB review feature unavailable.', error);
    });
  }
  function activate(event) {
    if (window.TDBReviewLoader || !allowed() || event.defaultPrevented) return;
    const trigger = event.target.closest?.(triggers);
    if (!trigger) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      (event.type === 'click' && event.button !== 0) ||
      trigger.matches('a[download],a[target]:not([target="_self"])')
    )
      return;
    if (
      event.type === 'keydown' &&
      (trigger.matches('button') || (event.key === 'Enter' && trigger.matches('a[href]')))
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (
      event.repeat ||
      trigger.matches(':disabled,[aria-disabled="true"]') ||
      trigger.getAttribute('aria-busy') === 'true'
    )
      return;
    const reviewId =
      trigger.closest('[data-review-id]')?.dataset.reviewId ||
      trigger
        .closest(components)
        ?.querySelector('[data-tdb-review-id]')
        ?.getAttribute('data-tdb-review-id') ||
      '';
    window.TDBModules.withBusy(
      trigger,
      async () => {
        const feature = await load();
        if (!disposed && trigger.isConnected)
          await feature.open({ trigger, reviewId, signal: lifecycle.signal });
      },
      {
        signal: lifecycle.signal,
        onError(error) {
          const status = trigger.closest(components)?.querySelector('[data-tdb-review-status]');
          if (status) status.textContent = 'The reviews could not load. Please try again.';
          else console.warn('TDB reviews: please try opening again.', error);
        },
      },
    );
  }
  for (const type of ['click', 'keydown'])
    document.addEventListener(type, activate, { capture: true, signal: lifecycle.signal });
  for (const type of ['online', 'pageshow'])
    window.addEventListener(type, refresh, { signal: lifecycle.signal });
  window.TDBReviewFeatureLoader = Object.freeze({
    version: '1.0.0',
    load,
    refresh,
    destroy() {
      disposed = true;
      lifecycle.abort();
      unsubscribe?.();
      window.TDBReviewLoader?.destroy?.();
    },
  });
  unsubscribe = window.TDBConsent?.subscribe(refresh);
  if (!unsubscribe) refresh();
}
