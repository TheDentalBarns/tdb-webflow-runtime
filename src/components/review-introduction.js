/* TDB Review Introduction v1.0.0. No CSS, CMS selection, fetching or consent logic. */
(() => {
  'use strict';
  if (window.TDBReviewIntroduction) return;
  const instances = new WeakMap();
  function mount(root, options = {}) {
    if (instances.has(root)) return instances.get(root);
    if (!window.TDBNativeTicker) throw Error('Native ticker is unavailable');
    const controller = new AbortController();
    const { signal } = controller;
    let disposed = false, played = false, visible = false;
    const slots = [...root.querySelectorAll('[data-tdb-review-rating],[data-tdb-review-count]')];
    const tickers = slots.map(slot => {
      const rating = slot.hasAttribute('data-tdb-review-rating');
      const raw = slot.getAttribute(rating ? 'data-tdb-review-rating' : 'data-tdb-review-count');
      const target = raw === '' ? NaN : Number(raw);
      if (!Number.isFinite(target) || target < 0 || (rating && target > 5) || (!rating && !Number.isInteger(target))) return null;
      return { ticker: window.TDBNativeTicker.mount(slot), text: rating ? target.toFixed(2) : `(${target})` };
    }).filter(Boolean);
    function play() {
      if (disposed || played || !visible || document.hidden) return;
      played = true;
      tickers.forEach(({ ticker, text }) => ticker.update(text));
      observer?.disconnect();
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (!visible) tickers.forEach(({ ticker }) => ticker.settle());
      play();
    }, { threshold: 0.25 }) : null;
    const card = root.querySelector('[data-tdb-review-summary]');
    if (observer) observer.observe(card || root);
    else { visible = true; play(); }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) tickers.forEach(({ ticker }) => ticker.settle());
      else play();
    }, { signal });

    // The separate drawer service supplies this callback after its dependencies exist.
    // A gated/missing drawer service leaves the native card explicitly disabled.
    const triggers = [...root.querySelectorAll('[data-tdb-review-trigger]')];
    const saved = triggers.map(node => ({ node, tabindex: node.getAttribute('tabindex'), disabled: node.getAttribute('aria-disabled') }));
    for (const trigger of triggers) {
      const available = typeof options.openReviews === 'function';
      trigger.setAttribute('aria-disabled', String(!available));
      trigger.setAttribute('tabindex', available ? '0' : '-1');
      if (!available) continue;
      const activate = async event => {
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        if (disposed || trigger.getAttribute('aria-busy') === 'true') return;
        trigger.setAttribute('aria-busy', 'true');
        const item = root.querySelector('[data-tdb-review-id]');
        try {
          await options.openReviews({ trigger, reviewId: item?.getAttribute('data-tdb-review-id') || '', signal });
        } catch (error) {
          if (!disposed) root.dispatchEvent(new CustomEvent('tdb:review-error', { bubbles: true, detail: { error } }));
        } finally { trigger.removeAttribute('aria-busy'); }
      };
      trigger.addEventListener('click', activate, { signal });
      trigger.addEventListener('keydown', activate, { signal });
    }
    const api = Object.freeze({
      destroy() {
        if (disposed) return;
        disposed = true;
        controller.abort();
        observer?.disconnect();
        tickers.forEach(({ ticker }) => ticker.destroy());
        for (const { node, tabindex, disabled } of saved) {
          for (const [key, value] of [['tabindex', tabindex], ['aria-disabled', disabled]]) {
            if (value === null) node.removeAttribute(key); else node.setAttribute(key, value);
          }
          node.removeAttribute('aria-busy');
        }
        options.closeReviews?.();
        instances.delete(root);
      }
    });
    instances.set(root, api);
    return api;
  }
  window.TDBReviewIntroduction = Object.freeze({ version: '1.0.0', mount });
})();
