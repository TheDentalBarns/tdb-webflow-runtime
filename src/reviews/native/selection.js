/* One published CMS selection for every review presentation on a page. */
(() => {
  'use strict';
  if (window.TDBReviewSelection) return;
  const path = (value) => value.replace(/\/+$/, '') || '/';
  function select(index, contexts, pathname, override = '', lead = '') {
    const context = override
      ? contexts.find((item) => item.id === override)
      : contexts.find((item) => item.paths.includes(path(pathname)));
    // A page joins the new editorial policy only when its CMS context is active.
    if (!context) return null;
    const topicFor = (row) =>
      context.topics.find((topic) => Object.hasOwn(row.snippetRanks || {}, topic));
    const rows = index.map((row) => ({ ...row, displayTopic: topicFor(row) || 'general' }));
    const matched = (row) => Boolean(topicFor(row));
    const low = (row) => row.rating !== null && row.rating < 5;
    rows.sort(
      (a, b) =>
        Number(b.id === lead) - Number(a.id === lead) ||
        Number(low(a)) - Number(low(b)) ||
        Number(matched(b)) - Number(matched(a)) ||
        (matched(a) && matched(b)
          ? context.topics.indexOf(a.displayTopic) - context.topics.indexOf(b.displayTopic) ||
            a.snippetRanks[a.displayTopic] - b.snippetRanks[b.displayTopic]
          : 0) ||
        a.rank - b.rank ||
        a.id.localeCompare(b.id),
    );
    // The native CMS lead owns position one and its duplicate group's primary
    // slot. Other cross-posts sit just before the lower-rated reviews.
    const seen = new Set(),
      primary = [],
      crossposts = [],
      lowerRated = [];
    for (const row of rows) {
      if (row.id === lead) {
        primary.push(row);
      } else if (low(row)) {
        lowerRated.push(row);
      } else if (row.duplicate && seen.has(row.duplicate)) {
        crossposts.push(row);
      } else {
        primary.push(row);
      }
      if (row.duplicate) seen.add(row.duplicate);
    }
    return [...primary, ...crossposts, ...lowerRated];
  }
  function decorate(record, row) {
    if (!row?.displayTopic) return record;
    record.displayExcerpt =
      row.displayTopic === 'general'
        ? record.excerpt
        : record.excerpts[row.displayTopic] || record.excerpt;
    return record;
  }
  window.TDBReviewSelection = Object.freeze({ select, decorate });
})();
