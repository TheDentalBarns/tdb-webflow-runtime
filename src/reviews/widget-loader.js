/* Definition only: the consent-released runtime starts this lightweight owner. */
function prepareReviewWidgetLoader() {
  'use strict';
  if (window.TDBReviewWidgetLoader) return;
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  let section, observer, frame = 0, flight, widget, disposed = false, retryAt = 0;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows()) &&
    !window.CookieScript?.instance?.isOpen?.();
  const past = () => Boolean(section?.isConnected && section.getClientRects().length &&
    section.getBoundingClientRect().bottom <= 0);
  async function load() {
    if (!allowed() || !past() || flight || widget || Date.now() < retryAt) return;
    flight = Promise.all([
      window.TDBModules.load(new URL('tdb-review-widget.css', TDBRuntimeModuleRoot), {
        type: 'style', attribute: 'data-tdb-review-widget-css',
        ready: () => getComputedStyle(document.documentElement)
          .getPropertyValue('--tdb-review-widget-ready').trim() === '1',
      }),
      window.TDBModules.load(new URL('tdb-review-widget.js', TDBRuntimeModuleRoot), {
        ready: () => typeof window.TDBReviewWidget?.mount === 'function',
      }),
    ]).then(() => {
      if (!allowed()) return;
      widget = window.TDBReviewWidget.mount();
      widget.setVisible(past());
    }).catch(error => {
      retryAt = Date.now() + 3000;
      console.warn('TDB review widget unavailable; will retry on scroll or reconnect.', error);
    }).finally(() => { flight = null; });
    return flight;
  }
  function update() {
    frame = 0;
    if (disposed) return;
    // Some CMS and older pages still use the shared Hero Headline review badge.
    const legacy = document.querySelector('[data-wf--hero---headline--variant] .button.is-review');
    const next = document.querySelector('[data-tdb-review-widget-boundary]') ||
      document.querySelector('[data-tdb-review-introduction]') ||
      legacy?.closest('[data-wf--hero---headline--variant]');
    if (next !== section) {
      if (section) observer?.unobserve(section);
      section = next;
      if (section) observer?.observe(section);
    }
    if (widget) widget.setVisible(past());
    else load();
  }
  function refresh() {
    if (!disposed && !frame) frame = requestAnimationFrame(update);
  }
  if ('ResizeObserver' in window) {
    observer = new ResizeObserver(refresh);
    observer.observe(document.body);
  }
  for (const type of ['scroll', 'resize', 'pageshow', 'tdb:features-ready'])
    window.addEventListener(type, refresh, { passive: true, signal });
  window.addEventListener('online', () => { retryAt = 0; refresh(); }, { signal });
  const unsubscribe = window.TDBConsent?.subscribe(refresh);
  window.TDBReviewWidgetLoader = Object.freeze({
    refresh,
    destroy() {
      disposed = true;
      lifecycle.abort();
      unsubscribe?.();
      observer?.disconnect();
      cancelAnimationFrame(frame);
      widget?.destroy();
    },
  });
  refresh();
}
