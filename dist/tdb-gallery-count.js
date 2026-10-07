/* Smile Gallery Explore count v1.0.0. Designer owns layout; shared ticker owns motion. */
(() => {
  'use strict';
  const scriptBase = new URL('./', document.currentScript.src);
  document.querySelectorAll('[data-tdb-gallery-ticker-link]').forEach(link => {
    if (link.dataset.countPrepared) return;
    const slot = link.querySelector('[data-tdb-gallery-count-slot]');
    if (!slot) return;
    link.dataset.countPrepared = 'true';
    let visible = false, played = false, ticker = null, count = null;
    function play() {
      if (played || !visible || document.hidden || count === null) return;
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
    const ready = window.TDBModules.load(new URL('tdb-motion.js', scriptBase), {
      ready: () => Boolean(window.TDBMotion)
    }).then(() => window.TDBModules.load(new URL('tdb-ticker.js', scriptBase), {
      ready: () => Boolean(window.TDBNativeTicker)
    })).then(() => {
      ticker = window.TDBNativeTicker.mount(slot, {
        valueClass: 'tdb-gallery-count-value', incomingClass: 'tdb-gallery-count-value'
      });
    }).catch(() => {});
    const data = fetch(link.getAttribute('href'), {credentials: 'same-origin', priority: 'low'})
      .then(response => { if (!response.ok) throw Error('Gallery unavailable'); return response.text(); })
      .then(html => {
        const source = document.createElement('template');
        source.innerHTML = html;
        const cases = source.content.querySelectorAll('[data-tdb-sg-list] [data-tdb-sg-case]');
        if (!cases.length) throw Error('Gallery count unavailable');
        return cases.length;
      });
    Promise.all([ready, data]).then(([, total]) => { count = total; play(); }).catch(() => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', play);
      // Keep the usable link and reserved slot without advertising a stale count.
    });
  });
})();
