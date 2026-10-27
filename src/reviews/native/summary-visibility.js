/* Remember native summary exposure before consent/deferred review preparation.
 * Observation only: no content changes, network work or motion in startup. */
(() => {
  'use strict';
  if (window.TDBReviewSummaryVisibility) return;
  const seen = new WeakMap(),
    pending = new Set();
  let observer;
  const belowViewport = (card) => {
    const rect = card.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top >= innerHeight;
  };
  function release(card) {
    seen.set(card, true);
    pending.delete(card);
    observer?.unobserve(card);
    if (!pending.size) observer?.disconnect();
  }
  function record(entries) {
    if (document.hidden) return;
    for (const entry of entries) if (entry.isIntersecting) release(entry.target);
  }
  function start() {
    if (!('IntersectionObserver' in window)) return;
    const cards = document.querySelectorAll(
      '[data-tdb-review-introduction] [data-tdb-review-summary]',
    );
    if (!cards.length) return;
    observer = new IntersectionObserver(record, { threshold: 0 });
    for (const card of cards) {
      // A restored/scrolled page has uncertain earlier exposure: keep its totals.
      const exposed = scrollY > 0 || !belowViewport(card);
      seen.set(card, exposed);
      if (!exposed) {
        pending.add(card);
        observer.observe(card);
      }
    }
  }
  window.TDBReviewSummaryVisibility = Object.freeze({
    claim(card) {
      if (!card) return false;
      record(observer?.takeRecords() || []);
      const unseen = seen.get(card) === false && belowViewport(card);
      release(card);
      return unseen;
    },
  });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
