/* Smile Gallery Explore count v1.1.0. Designer owns layout; shared ticker owns motion. */
(() => {
  'use strict';
  const scriptBase = new URL('./', document.currentScript.src);
  // Native CMS output is already in the page: no Gallery HTML request.
  const source = document.querySelector('[data-tdb-gallery-count-source]');
  if (!source?.querySelector('.w-dyn-items, .w-dyn-empty')) return;
  const count = source.querySelectorAll('[data-tdb-gallery-count-item]').length;
  document.querySelectorAll('[data-tdb-gallery-ticker-link]').forEach(link => {
    if (link.dataset.countPrepared) return;
    const slot = link.querySelector('[data-tdb-gallery-count-slot]');
    if (!slot) return;
    link.dataset.countPrepared = 'true';
    let visible = false, played = false, ticker = null, ready = false;
    if (slot.textContent.trim() === count.toLocaleString('en-GB')) return;
    function play() {
      if (played || !visible || document.hidden || !ready) return;
      played = true;
      const text = count.toLocaleString('en-GB');
      const noun = count === 1 ? 'smile transformation' : 'smile transformations';
      link.querySelector('[data-tdb-gallery-count-noun]').textContent = noun;
      link.setAttribute('aria-label', `Explore ${text} ${noun}`);
      if (ticker) ticker.update(text);
      else slot.textContent = text;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', play);
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25);
      play();
    }, {threshold: .25}) : null;
    if (observer) observer.observe(link);
    else visible = true;
    document.addEventListener('visibilitychange', play);
    window.TDBModules.load(new URL('tdb-motion.js', scriptBase), {
      ready: () => Boolean(window.TDBMotion)
    }).then(() => window.TDBModules.load(new URL('tdb-ticker.js', scriptBase), {
      ready: () => Boolean(window.TDBNativeTicker)
    })).then(() => {
      ticker = window.TDBNativeTicker.mount(slot, {
        valueClass: 'tdb-gallery-count-value', incomingClass: 'tdb-gallery-count-value'
      });
    }).catch(() => {
      // If optional motion fails, reveal the correct total without animation.
    }).then(() => { ready = true; play(); });
  });
})();
