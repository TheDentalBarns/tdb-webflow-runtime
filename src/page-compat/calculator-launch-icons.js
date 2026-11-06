(() => {
  const icon =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect vector-effect="non-scaling-stroke" x="5" y="2" width="14" height="20" rx="1.2"/><rect vector-effect="non-scaling-stroke" x="8" y="5" width="8" height="5" rx=".5"/><path vector-effect="non-scaling-stroke" d="M8.2 14h.6m2.9 0h.6m3 0h.6M8.2 18h.6m2.9 0h.6m3-4v4"/></svg>';
  function update() {
    document
      .querySelectorAll(
        '[data-tdb-calc-open],a[href$="#treatment-calculator"],a[href="#dental-calculator"]',
      )
      .forEach((a) => {
        if (!a.matches('.button') && !a.closest('[data-tdb-calc-entry]')) return;
        if (a.querySelector('[data-calculator-icon]')) return;
        a.querySelectorAll('.icon-embed-xxsmall,.icon-embed-xsmall').forEach((n) => n.remove());
        const i = document.createElement('span');
        i.className = 'icon-embed-xxsmall w-embed';
        i.dataset.calculatorIcon = '';
        i.innerHTML = icon;
        a.append(i);
        a.classList.add('is-icon');
      });
  }
  update();
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', update, { once: true });
})();
