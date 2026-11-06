(() => {
  const icon =
    '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="6" width="36" height="52" rx="3"/><rect x="21" y="14" width="22" height="13" rx="1"/><path d="M22 36h3m6.5 0h3M22 44h3m6.5 0h3M22 52h3m6.5 0h3M41 36h2m-2 8h2m-1 0v8"/></svg>';
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
