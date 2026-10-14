/* Owned by tdb-gallery.js. CMS supplies the total; the shared ticker supplies motion. */
function createGalleryExploreCount() {
  const records = new Map(), base = document.currentScript?.src;
  let observer, tickerFlight, listening = false;
  const format = value => value.toLocaleString('en-GB');
  function write(record) {
    const {slot, text} = record;
    if (slot.children.length === 1) slot.firstElementChild.textContent = text;
    else slot.textContent = text;
  }
  function syncListening() {
    const pending = [...records.values()].some(record => !record.played);
    if (pending === listening) return;
    listening = pending;
    document[pending ? 'addEventListener' : 'removeEventListener']('visibilitychange', onVisibility);
  }
  function complete(record) {
    record.played = true;
    observer?.unobserve(record.link);
    syncListening();
  }
  function tickerReady() {
    if (window.TDBNativeTicker) return Promise.resolve();
    return tickerFlight ||= Promise.resolve().then(() =>
      window.TDBModules.load(new URL('tdb-ticker.js', base), {
        ready: () => Boolean(window.TDBNativeTicker)
      })
    ).catch(error => { tickerFlight = null; throw error; });
  }
  async function play(record) {
    if (record.played || record.loading || !record.visible || document.hidden) return;
    if (!record.count || window.TDBMotion?.reduced.matches) { complete(record); return; }
    record.loading = true;
    try {
      await tickerReady();
      if (records.get(record.link) !== record || !record.link.isConnected) return;
      if (!record.visible || document.hidden) return;
      record.ticker = window.TDBNativeTicker.mount(record.slot, {
        valueClass: 'tdb-gallery-count-value', incomingClass: 'tdb-gallery-count-value'
      });
      // Keep the true total in native HTML; understate only for this single transition.
      record.ticker.update(format(Math.max(0, record.count - 1)), 1, false);
      record.ticker.update(record.text);
      complete(record);
    } catch (_) {
      if (records.get(record.link) === record) {
        record.ticker?.destroy(); record.ticker = null;
        write(record); complete(record);
      }
    } finally { record.loading = false; }
  }
  function onVisibility() {
    if (document.hidden) records.forEach(record => record.ticker?.settle());
    else records.forEach(play);
  }
  function prune() {
    for (const [link, record] of records) {
      if (link.isConnected && record.slot.isConnected && link.contains(record.slot)) continue;
      observer?.unobserve(link); record.ticker?.destroy();
      link.removeAttribute('data-count-prepared'); records.delete(link);
    }
    if (!records.size) { observer?.disconnect(); observer = null; }
    syncListening();
  }
  function refresh() {
    prune();
    const source = document.querySelector('[data-tdb-gallery-count-source]');
    if (!source?.querySelector('.w-dyn-items, .w-dyn-empty')) return;
    const count = [...source.querySelectorAll('[data-tdb-gallery-count-item]')]
      .filter(item => !item.closest('.swiper-slide-duplicate')).length;
    const text = format(count), noun = count === 1 ? 'smile transformation' : 'smile transformations';
    for (const link of document.querySelectorAll('[data-tdb-gallery-ticker-link]')) {
      const slot = link.querySelector('[data-tdb-gallery-count-slot]');
      if (!slot) continue;
      const label = link.querySelector('[data-tdb-gallery-count-noun]');
      if (label) label.textContent = noun;
      link.setAttribute('aria-label', `Explore ${text} ${noun}`);
      let record = records.get(link);
      if (record) {
        if (record.count !== count) {
          record.count = count; record.text = text;
          if (record.ticker) record.ticker.update(text, 1, false); else write(record);
        }
        continue;
      }
      // Historical pages still running the standalone loader retain their owner.
      if (link.dataset.countPrepared) continue;
      record = {link, slot, count, text, visible: false, played: false, loading: false, ticker: null};
      records.set(link, record); link.dataset.countPrepared = 'true'; write(record);
      if ('IntersectionObserver' in window) {
        observer ||= new IntersectionObserver(entries => {
          for (const entry of entries) {
            const record = records.get(entry.target);
            if (!record) continue;
            record.visible = entry.isIntersecting && entry.intersectionRatio >= .25;
            if (!record.visible) record.ticker?.settle();
            play(record);
          }
        }, {threshold: .25});
        observer.observe(link);
      } else { record.visible = true; play(record); }
    }
    syncListening();
  }
  return Object.freeze({refresh, prune});
}
