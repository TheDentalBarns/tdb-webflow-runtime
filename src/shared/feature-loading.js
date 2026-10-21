/* One post-consent policy for in-page proximity and additional-panel intent. */
(() => {
  'use strict';
  if (window.TDBFeatureLoading) return;
  const embedMargin = '700px 0px',
    settledMs = 200,
    retryMs = 5000;
  const watches = new Set(),
    targets = new Map();
  let observer,
    mutations,
    events,
    unsubscribe,
    timer = 0,
    lastScroll = 0;
  const allowed = () => Boolean(window.TDBConsent?.allows()) && !document.hidden;
  const usable = (node) =>
    node.isConnected &&
    // Marquee repeats are aria-hidden for accessibility but remain visible and clickable.
    !node.closest('[hidden],[inert],.w-condition-invisible') &&
    !node.matches(':disabled,[aria-disabled="true"]') &&
    getComputedStyle(node).visibility !== 'hidden';
  function unobserve(watch) {
    for (const [node, owners] of targets) {
      owners.delete(watch);
      if (!owners.size) {
        observer?.unobserve(node);
        targets.delete(node);
      }
    }
    watch.visible.clear();
  }
  function prepare(watch, node) {
    if (
      watch.done ||
      watch.flight ||
      !allowed() ||
      !watch.enabled() ||
      !usable(node) ||
      Date.now() < watch.retryAt
    )
      return;
    watch.flight = Promise.resolve()
      .then(() => {
        if (!watches.has(watch) || !allowed() || !watch.enabled() || !usable(node)) return false;
        return Promise.resolve(watch.prepare(node)).then(() => true);
      })
      .then((prepared) => {
        if (prepared && allowed() && watches.has(watch)) {
          watch.done = true;
          unobserve(watch);
        }
      })
      .catch(() => {
        watch.retryAt = Date.now() + retryMs;
      })
      .finally(() => {
        watch.flight = null;
      });
  }
  function settle() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      if (!allowed()) return;
      if (performance.now() - lastScroll < settledMs) {
        settle();
        return;
      }
      for (const watch of watches) {
        const node = [...watch.visible].find(usable);
        if (node) prepare(watch, node);
      }
    }, settledMs);
  }
  function refresh(watch) {
    if (watch.done || !watches.has(watch)) return;
    for (const [node, owners] of targets) {
      if (!node.isConnected) {
        for (const owner of owners) owner.visible.delete(node);
        observer?.unobserve(node);
        targets.delete(node);
      }
    }
    for (const node of watch.root.querySelectorAll(watch.selector)) {
      let owners = targets.get(node);
      if (!owners) {
        owners = new Set();
        targets.set(node, owners);
        observer?.observe(node);
      }
      owners.add(watch);
    }
  }
  function start() {
    if (events) return;
    events = new AbortController();
    if ('IntersectionObserver' in window)
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            for (const watch of targets.get(entry.target) || []) {
              if (entry.isIntersecting) watch.visible.add(entry.target);
              else watch.visible.delete(entry.target);
            }
          settle();
        },
        { rootMargin: '0px', threshold: 0 },
      );
    const intent = (event) => {
      if (event.type === 'pointerover' && event.pointerType === 'touch') return;
      for (const watch of watches) {
        const node = event.target.closest?.(watch.selector);
        if (node && watch.root.contains(node)) prepare(watch, node);
      }
    };
    for (const type of ['pointerover', 'focusin', 'pointerdown'])
      document.addEventListener(type, intent, {
        passive: true,
        capture: true,
        signal: events.signal,
      });
    window.addEventListener(
      'scroll',
      () => {
        lastScroll = performance.now();
        settle();
      },
      { passive: true, signal: events.signal },
    );
    for (const type of ['pageshow', 'online'])
      window.addEventListener(
        type,
        () => {
          for (const watch of watches) {
            watch.retryAt = 0;
            refresh(watch);
          }
          settle();
        },
        { signal: events.signal },
      );
    document.addEventListener('visibilitychange', settle, { signal: events.signal });
    mutations = new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType === 1),
        )
      )
        for (const watch of watches) refresh(watch);
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    unsubscribe = window.TDBConsent?.subscribe(() => {
      if (!allowed())
        for (const watch of watches) {
          watch.done = false;
          refresh(watch);
        }
      settle();
    });
  }
  function stop() {
    if (watches.size) return;
    clearTimeout(timer);
    observer?.disconnect();
    mutations?.disconnect();
    events?.abort();
    unsubscribe?.();
    observer = mutations = events = unsubscribe = null;
    targets.clear();
  }
  function watchIntent({ selector, root = document, prepare: work, enabled = () => true, signal }) {
    const watch = {
      selector,
      root,
      prepare: work,
      enabled,
      visible: new Set(),
      done: false,
      flight: null,
      retryAt: 0,
    };
    function destroy() {
      watches.delete(watch);
      unobserve(watch);
      stop();
    }
    if (!signal?.aborted) {
      watches.add(watch);
      start();
      refresh(watch);
      signal?.addEventListener('abort', destroy, { once: true });
    }
    return Object.freeze({ refresh: () => refresh(watch), destroy });
  }
  window.TDBFeatureLoading = Object.freeze({
    version: '1.0.0',
    embedMargin,
    settledMs,
    watchIntent,
  });
})();
