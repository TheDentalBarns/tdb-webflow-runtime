/* Shared review summary: existing rating row plus a labelled drawer cue. */
(() => {
  'use strict';
  if (document.querySelector('[data-tdb-summary-card-style]')) return;
  const style = document.createElement('style');
  style.dataset.tdbSummaryCardStyle = '';
  style.textContent = `
.button.is-review[data-tdb-summary-card]{display:inline-grid;grid-template-rows:1fr 1fr;align-items:stretch;gap:0;width:max-content;max-width:100%;height:auto;padding-top:0;padding-bottom:0}
.tdb-summary-rating{display:flex;align-items:center;justify-content:center;gap:.5rem;min-width:0;padding-block:.6rem;box-sizing:border-box}
.tdb-summary-action{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-top:1px solid var(--base-color-brand--orange-2,#ebe2d2);margin-top:0;padding-block:.6rem;width:100%;text-align:left;box-sizing:border-box}
.tdb-summary-label{font-size:.75rem;font-weight:400;line-height:1.4;letter-spacing:.1em;text-transform:uppercase;color:#8f887b}
.tdb-summary-arrow{display:flex;align-items:center;justify-content:center;flex:0 0 3rem;width:3rem;height:3rem;box-sizing:border-box;border:1px solid var(--base-color-brand--orange-3,#d6cab4);border-radius:50%;color:var(--base-color-brand--orange-3,#d6cab4);background:transparent;transition:background-color 300ms ease,color 300ms ease}
.tdb-summary-arrow svg{width:1rem;height:1rem;display:block}
@media(hover:hover) and (pointer:fine){.button.is-review[data-tdb-summary-card]:hover .tdb-summary-arrow{background:var(--base-color-brand--orange-3,#d6cab4);color:#fff}}
.button.is-review[data-tdb-summary-card]:active .tdb-summary-arrow{background:var(--base-color-brand--orange-3,#d6cab4);color:#fff;transition-duration:0s}
@media(max-width:479px){.tdb-summary-rating{gap:.4rem}.tdb-summary-action{gap:.65rem}.tdb-summary-label{font-size:.7rem;letter-spacing:.08em}}
`;
  document.head.append(style);
  function enhance(badge) {
    if (!badge.hasAttribute('data-tdb-review-updated') || badge.hasAttribute('data-tdb-summary-card')) return;
    const row = document.createElement('span');
    row.className = 'tdb-summary-rating';
    while (badge.firstChild) row.append(badge.firstChild);
    const action = document.createElement('span');
    action.className = 'tdb-summary-action';
    action.setAttribute('aria-hidden','true');
    const label = document.createElement('span');
    label.className = 'tdb-summary-label';
    const arrow = document.createElement('span');
    arrow.className = 'tdb-summary-arrow';
    arrow.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.31066 8.75001L9.03033 14.4697L7.96967 15.5303L0.439339 8.00001L7.96967 0.469676L9.03033 1.53034L3.31066 7.25001L15.5 7.25L15.5 8.75L3.31066 8.75001Z" fill="currentColor" transform="rotate(180 8 8)"/></svg>';
    function updateLabel() {
      const count = badge.getAttribute('aria-label')?.match(/Read\s+(\d+)\s+patient reviews/i)?.[1] || row.textContent.match(/\((\d+)\)/)?.[1];
      label.textContent = count ? 'Read our ' + count + ' reviews' : 'Read our reviews';
    }
    action.append(label,arrow);
    badge.append(row,action);
    badge.dataset.tdbSummaryCard = '1';
    updateLabel();
    new MutationObserver(updateLabel).observe(badge,{attributes:true,attributeFilter:['aria-label']});
  }
  function start() {
    const badges = [...document.querySelectorAll('.button.is-review')];
    badges.forEach(badge => {
      enhance(badge);
      if (badge.hasAttribute('data-tdb-summary-card')) return;
      const observer = new MutationObserver(() => {
        enhance(badge);
        if (badge.hasAttribute('data-tdb-summary-card')) observer.disconnect();
      });
      observer.observe(badge,{attributes:true,attributeFilter:['data-tdb-review-updated']});
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
