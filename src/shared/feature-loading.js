/* One post-consent policy for in-page proximity and additional-panel intent. */
(() => {
  'use strict';
  if (window.TDBFeatureLoading) return;
  const embedMargin = '1200px 0px',
    panelMargin = '700px 0px',
    settledMs = 200,
    retryMs = 5000;
  const watches = new Set(),
    targets = new Map();
  const observers = new Map();
  let mutations,
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
  function detach(watch, node, owners) {
    owners.delete(watch);
    watch.visible.delete(node);
    if (![...owners].some((owner) => owner.kind === watch.kind))
      observers.get(watch.kind)?.unobserve(node);
    if (!owners.size) targets.delete(node);
  }
  function unobserve(watch) {
    for (const [node, owners] of targets) {
      if (owners.has(watch)) detach(watch, node, owners);
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
    timer = 0;
    if (
      !allowed() ||
      ![...watches].some((watch) => watch.kind === 'popover' && !watch.done && watch.visible.size)
    )
      return;
    timer = setTimeout(() => {
      timer = 0;
      if (!allowed()) return;
      if (performance.now() - lastScroll < settledMs) {
        settle();
        return;
      }
      for (const watch of watches) {
        if (watch.kind !== 'popover') continue;
        const node = [...watch.visible].find(usable);
        if (node) prepare(watch, node);
      }
    }, settledMs);
  }
  function prepareNearby() {
    if (!allowed()) return;
    for (const watch of watches) {
      if (watch.kind !== 'panel' || watch.done || watch.flight) continue;
      const node = [...watch.visible].find(usable);
      if (node) prepare(watch, node);
    }
  }
  function refresh(watch) {
    if (watch.done || !watches.has(watch)) return;
    const matches = new Set(watch.root.querySelectorAll(watch.selector));
    for (const [node, owners] of targets) {
      if (owners.has(watch) && !matches.has(node)) {
        detach(watch, node, owners);
      }
    }
    for (const node of matches) observe(watch, node);
  }
  function observe(watch, node) {
    let owners = targets.get(node);
    if (!owners) {
      owners = new Set();
      targets.set(node, owners);
    }
    const peers = [...owners].filter((owner) => owner.kind === watch.kind);
    const needsObserver = !peers.length;
    if (peers.some((owner) => owner.visible.has(node))) watch.visible.add(node);
    owners.add(watch);
    if (needsObserver) observerFor(watch.kind)?.observe(node);
  }
  function observerFor(kind) {
    if (!('IntersectionObserver' in window)) return null;
    if (!observers.has(kind))
      observers.set(
        kind,
        new IntersectionObserver(
          (entries) => {
            for (const entry of entries)
              for (const watch of targets.get(entry.target) || []) {
                if (watch.kind !== kind) continue;
                if (entry.isIntersecting) watch.visible.add(entry.target);
                else watch.visible.delete(entry.target);
              }
            if (kind === 'panel') prepareNearby();
            else settle();
          },
          { rootMargin: kind === 'panel' ? panelMargin : '0px', threshold: 0 },
        ),
      );
    return observers.get(kind);
  }
  function discover(records) {
    const added = new Set();
    let removed = false;
    for (const record of records) {
      for (const node of record.addedNodes) if (node.nodeType === 1) added.add(node);
      if ([...record.removedNodes].some((node) => node.nodeType === 1)) removed = true;
    }
    if (!added.size && !removed) return;
    // Nested additions in the same delivery need only one subtree scan.
    const roots = [...added].filter(
      (node) =>
        node.isConnected && ![...added].some((parent) => parent !== node && parent.contains(node)),
    );
    for (const watch of watches) {
      if (watch.done) continue;
      // Structural/sibling selectors can change matches outside the inserted
      // subtree. Keep the complete query for those public-API cases.
      if (/[:+~]/.test(watch.selector)) {
        refresh(watch);
        continue;
      }
      if (removed) {
        for (const [node, owners] of targets) {
          if (
            owners.has(watch) &&
            (!node.isConnected || !watch.root.contains(node) || !node.matches(watch.selector))
          ) {
            detach(watch, node, owners);
          }
        }
      }
      for (const node of roots) {
        if (node === watch.root || node.contains(watch.root)) {
          refresh(watch);
        } else if (watch.root.contains(node)) {
          if (node.matches(watch.selector)) observe(watch, node);
          for (const match of node.querySelectorAll(watch.selector)) observe(watch, match);
        }
      }
    }
  }
  function start() {
    if (events) return;
    events = new AbortController();
    const intent = (event) => {
      if (event.type === 'pointerover' && event.pointerType === 'touch') return;
      for (const watch of watches) {
        if (watch.done) continue;
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
          prepareNearby();
          settle();
        },
        { signal: events.signal },
      );
    document.addEventListener(
      'visibilitychange',
      () => {
        prepareNearby();
        settle();
      },
      { signal: events.signal },
    );
    mutations = new MutationObserver(discover);
    mutations.observe(document.body, { childList: true, subtree: true });
    unsubscribe = window.TDBConsent?.subscribe(() => {
      if (!allowed())
        for (const watch of watches) {
          watch.done = false;
          refresh(watch);
        }
      prepareNearby();
      settle();
    });
  }
  function stop() {
    if (watches.size) return;
    clearTimeout(timer);
    for (const observer of observers.values()) observer.disconnect();
    observers.clear();
    mutations?.disconnect();
    events?.abort();
    unsubscribe?.();
    mutations = events = unsubscribe = null;
    targets.clear();
  }
  function watchIntent({
    selector,
    root = document,
    prepare: work,
    enabled = () => true,
    signal,
    kind = 'panel',
  }) {
    if (!['panel', 'popover'].includes(kind)) throw Error('Unknown preparation kind: ' + kind);
    const watch = {
      kind,
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
      prepareNearby();
      settle();
      signal?.addEventListener('abort', destroy, { once: true });
    }
    return Object.freeze({
      refresh: () => {
        refresh(watch);
        prepareNearby();
        settle();
      },
      destroy,
    });
  }
  window.TDBFeatureLoading = Object.freeze({
    version: '1.2.0',
    embedMargin,
    panelMargin,
    settledMs,
    watchIntent,
  });
})();
