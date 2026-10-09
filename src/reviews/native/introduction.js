/* TDB Review Introduction v1.2.2. No CSS, CMS selection, fetching or consent logic. */
(() => {
  'use strict';
  if (window.TDBReviewIntroduction) return;
  const instances = new WeakMap();
  function mount(root, options = {}) {
    if (instances.has(root)) return instances.get(root);
    if (!window.TDBNativeTicker) throw Error('Native ticker is unavailable');
    const controller = new AbortController();
    const { signal } = controller;
    let disposed = false, played = false, visible = false, ready = false;
    options.prepare?.({signal}).then(() => { ready = true; play(); }).catch(() => {});
    const slots = [...root.querySelectorAll('[data-tdb-review-rating],[data-tdb-review-count]')];
    const tickers = slots.map(slot => {
      const rating = slot.hasAttribute('data-tdb-review-rating');
      const raw = slot.getAttribute(rating ? 'data-tdb-review-rating' : 'data-tdb-review-count');
      const target = raw === '' ? NaN : Number(raw);
      if (!Number.isFinite(target) || target < 0 || (rating && target > 5) || (!rating && !Number.isInteger(target))) return null;
      return { ticker: window.TDBNativeTicker.mount(slot), text: rating ? target.toFixed(2) : slot.getAttribute('data-tdb-count-format') === 'plain' ? String(target) : `(${target})` };
    }).filter(Boolean);
    function play() {
      if (disposed || played || !visible || document.hidden || (options.prepare && !ready)) return;
      played = true;
      tickers.forEach(({ ticker, text }) => ticker.update(text));
      observer?.disconnect();
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.25);
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
    const status = root.querySelector('[data-tdb-review-status]');
    root.addEventListener('tdb:review-error', () => {
      if (status) status.textContent = 'The reviews could not load. Please try again.';
    }, { signal });
    const dd=window.TDBMotion.ddText(root.querySelectorAll('[data-tdb-dd-text]'));
    const reflectDrawer = () => {
      const opened=triggers.some(trigger=>trigger.getAttribute('aria-expanded')==='true'||trigger.getAttribute('aria-busy')==='true');
      root.querySelectorAll('[data-tdb-pulse]').forEach(pulse=>pulse.setAttribute('data-tdb-pulse',String(!opened)));

    };
    const drawerObserver = new MutationObserver(reflectDrawer);
    triggers.forEach(trigger => drawerObserver.observe(trigger, { attributes: true, attributeFilter: ['aria-expanded', 'aria-busy'] }));
    reflectDrawer();
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
        if (status) status.textContent = '';
        const item = root.querySelector('[data-tdb-review-id]');
        await window.TDBModules.withBusy(trigger, () => options.openReviews({ trigger, reviewId: item?.getAttribute('data-tdb-review-id') || '', signal }), {
          signal, onStart: reflectDrawer,
          onError(error) { if (!disposed) root.dispatchEvent(new CustomEvent('tdb:review-error', { bubbles: true, detail: { error } })); }
        });
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
        drawerObserver.disconnect();
        dd.destroy();
        tickers.forEach(({ ticker }) => ticker.destroy());
        for (const { node, tabindex, disabled } of saved) {
          for (const [key, value] of [['tabindex', tabindex], ['aria-disabled', disabled]]) {
            if (value === null) node.removeAttribute(key); else node.setAttribute(key, value);
          }
          node.removeAttribute('aria-busy');
          node.removeAttribute('data-tdb-loading');
        }
        options.closeReviews?.(root);
        triggers.forEach(trigger => {
          trigger.setAttribute('aria-expanded', 'false');
        });
        if (status) status.textContent = '';
        root.querySelectorAll('[data-tdb-pulse]').forEach(pulse=>pulse.setAttribute('data-tdb-pulse','true'));
        instances.delete(root);
      }
    });
    instances.set(root, api);
    return api;
  }
  window.TDBReviewIntroduction = Object.freeze({ version: '1.2.2', mount });
})();

