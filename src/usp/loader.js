/* Definition-only. Runtime owns startup; the drawer owns content and motion. */
function prepareUSPDrawerLoader() {
  'use strict';
  if (window.TDBUSPDrawerLoader) return;
  const selector = '[data-tdb-usp]', zoneSelector = '[data-tdb-usp-trigger-zone]';
  const url = new URL('tdb-usp-drawer.js', TDBRuntimeModuleRoot);
  const seen = new WeakSet(), pending = new WeakSet(), labels = new WeakMap();
  const events = new AbortController();
  let flight = null, prefetchFailed = false, disposed = false;
  const proximity = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      proximity.unobserve(entry.target);
      warm();
    }
  }, {rootMargin: '500px'}) : null;

  function refresh(root = document) {
    if (disposed) return;
    const sections = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    for (const section of sections) {
      if (seen.has(section)) continue;
      seen.add(section);
      section.querySelectorAll('[data-tdb-usp-launch]').forEach(trigger => {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-disabled', 'false');
        trigger.tabIndex = 0;
      });
      // Home's lazy snapshot still waits for activation, including HTML/CSS.
      if (!section.hasAttribute('data-tdb-usp-lazy')) proximity?.observe(section);
    }
    window.TDBUSPDrawer?.refresh?.();
  }
  function load() {
    if (disposed) return Promise.reject(Error('Practice highlights loader disposed'));
    if (flight) return flight;
    flight = Promise.resolve().then(() => {
      if (!window.TDBModules?.load) throw Error('Shared module registry unavailable');
      return window.TDBModules.load(url, {ready: () => Boolean(window.TDBUSPDrawer?.refresh)});
    }).then(() => {
      window.TDBUSPDrawer.refresh();
      proximity?.disconnect();
      return window.TDBUSPDrawer;
    }).finally(() => { flight = null; });
    return flight;
  }
  function warm() {
    if (!prefetchFailed && !disposed) load().catch(() => { prefetchFailed = true; });
  }
  async function open(trigger) {
    if (disposed || !trigger?.isConnected || pending.has(trigger)) return;
    pending.add(trigger);
    if (!labels.has(trigger)) labels.set(trigger, trigger.getAttribute('aria-label'));
    const label = labels.get(trigger);
    if (label == null) trigger.removeAttribute('aria-label'); else trigger.setAttribute('aria-label', label);
    let ready = false;
    try {
      if (!window.TDBModules?.withBusy) throw Error('Shared module registry unavailable');
      await window.TDBModules.withBusy(trigger, async () => { await load(); ready = true; }, {
        signal: events.signal,
        onError(error) { throw error; }
      });
      // Replay only after the download busy state clears. The adapter owns
      // selection, content loading, focus, spinner and the actual opening.
      if (ready && !disposed && trigger.isConnected) trigger.click();
    } catch (error) {
      const text = trigger.closest(zoneSelector)?.querySelector('[data-tdb-usp-label]')?.textContent.trim() || 'Practice highlights';
      trigger.setAttribute('aria-label', 'Unable to load. Try again: ' + text);
      console.warn('Practice highlights could not load', error);
    } finally { pending.delete(trigger); }
  }
  function target(event) {
    const zone = event.target.closest?.(zoneSelector);
    return zone?.closest(selector) ? zone.querySelector('[data-tdb-usp-launch]') : null;
  }
  function activate(event) {
    if (event.defaultPrevented || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
    const trigger = target(event);
    if (!trigger || window.TDBUSPDrawer?.has?.(trigger.closest(selector))) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!event.repeat) open(trigger);
  }
  for (const type of ['click', 'keydown'])
    document.addEventListener(type, activate, {capture: true, signal: events.signal});
  for (const type of ['pointerover', 'focusin', 'pointerdown'])
    document.addEventListener(type, event => { if (target(event)) warm(); }, {passive: true, signal: events.signal});
  window.TDBUSPDrawerLoader = Object.freeze({
    version: '2.0.0', load, open, refresh,
    destroy() { disposed = true; events.abort(); proximity?.disconnect(); }
  });
  refresh();
}
