/* TDB review drawer bridge v1.0.0. Identity lookup only: CMS chooses the quote. */
(() => {
  'use strict';
  if (window.TDBReviewDrawerBridge) return;
  let dataPromise;
  const clean = text => String(text || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  const assertActive = signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
  function getRecords() {
    if (!dataPromise) dataPromise = (async () => {
      const node = document.querySelector('[data-tdb-review-drawer-data]');
      if (!node) throw Error('Review data is unavailable');
      let text = node.textContent;
      if (node.dataset.encoding === 'gzip-base64') {
        const bytes = Uint8Array.from(atob(text.trim()), char => char.charCodeAt(0));
        text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      }
      return JSON.parse(text).records || [];
    })().catch(error => { dataPromise = null; throw error; });
    return dataPromise;
  }
  function resolveIdentity(records, root) {
    const author = clean(root?.querySelector('[data-tdb-review-author]')?.textContent);
    const excerpt = clean(root?.querySelector('[data-tdb-review-excerpt]')?.textContent);
    if (!author || !excerpt) return '';
    const matches = records.filter(record => clean(record.name) === author &&
      [record.excerpt, ...Object.values(record.excerpts || {})].some(text => clean(text) === excerpt));
    // Never substitute a different review when the external snapshot is behind CMS.
    return matches.length === 1 ? matches[0].id : '';
  }
  async function open({ trigger, reviewId, signal }) {
    assertActive(signal);
    const service = window.TDBPowerSnippets;
    if (!service?.loadDrawer) throw Error('Review service is unavailable');
    const records = await getRecords();
    assertActive(signal);
    const root = trigger.closest('[data-tdb-review-introduction]');
    const preferred = reviewId || resolveIdentity(records, root);
    const drawer = await service.loadDrawer();
    assertActive(signal);
    await drawer.open(trigger, preferred);
    if (signal?.aborted) {
      if (trigger.getAttribute('aria-expanded') === 'true') drawer.close();
      assertActive(signal);
    }
  }
  function close(root) {
    if (root?.querySelector('[data-tdb-review-trigger][aria-expanded="true"]')) window.TDBReviewDrawer?.close();
  }
  window.TDBReviewDrawerBridge = Object.freeze({ version: '1.0.0', open, close, resolveIdentity });
})();
