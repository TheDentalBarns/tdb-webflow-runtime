/* TDB review drawer bridge v2.0.0. CMS owns content and featured-quote selection. */
(() => {
  'use strict';
  if (window.TDBReviewDrawerBridge) return;
  let base, drawerFlight;
  const assertActive = signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
  function configure({ baseURL }) { base = new URL(baseURL, location.href); }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = src; script.async = true;
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(Error('Review drawer failed to load')); };
      document.head.append(script);
    });
  }
  async function loadDrawer(signal) {
    assertActive(signal);
    if (window.TDBReviewDrawer) {
      if (window.TDBReviewDrawer.version !== '2.0.0-cms') throw Error('The previous review drawer is still active');
      return window.TDBReviewDrawer;
    }
    if (!base) throw Error('Review drawer module URL is unavailable');
    if (!drawerFlight) drawerFlight = loadScript(new URL('src/reviews/review-drawer-cms.js', base).href)
      .then(() => {
        if (window.TDBReviewDrawer?.version !== '2.0.0-cms') throw Error('CMS drawer API unavailable');
        return window.TDBReviewDrawer;
      }).catch(error => { drawerFlight = null; throw error; });
    const drawer = await drawerFlight; assertActive(signal); return drawer;
  }
  function resolveIdentity(records, root) { return window.TDBReviewCMS?.resolveIdentity(records, root) || ''; }
  async function open({ trigger, reviewId, signal }) {
    assertActive(signal);
    const service = window.TDBReviewCMS;
    if (!service) throw Error('CMS review service is unavailable');
    const { records } = await service.load({ signal });
    assertActive(signal);
    const root = trigger.closest('[data-tdb-review-introduction]');
    const preferred = reviewId || resolveIdentity(records, root);
    const drawer = await loadDrawer(signal);
    assertActive(signal);
    await drawer.open(trigger, preferred, { signal });
    if (signal?.aborted) {
      if (trigger.getAttribute('aria-expanded') === 'true') drawer.close();
      assertActive(signal);
    }
  }
  function close(root) {
    if (root?.querySelector('[data-tdb-review-trigger][aria-expanded="true"]')) window.TDBReviewDrawer?.close();
  }
  window.TDBReviewDrawerBridge = Object.freeze({ version: '2.0.0', configure, open, close, resolveIdentity });
})();
