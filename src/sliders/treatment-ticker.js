/* Native Designer slots; CMS facts come from each rendered treatment item.
 * No feed request or duplicated price table. Only the value spans animate.
 */
window.TDBTreatmentTicker ||= (() => {
  const instances = new WeakMap();
  const base = new URL('./', document.currentScript?.src || location.href);
  function prepare(root) {
    if (!root.hasAttribute('data-tdb-treatment-postage')) return null;
    if (instances.has(root)) return instances.get(root);
    const owner = root.closest('[data-tdb-treatment-layout]') || root;
    const position = root.querySelector('[data-tdb-treatment-position]');
    const current = position?.querySelector('[data-tdb-treatment-current]');
    const total = position?.querySelector('[data-tdb-treatment-total]');
    const price = owner.querySelector('[data-tdb-treatment-price]');
    const duration = owner.querySelector('[data-tdb-treatment-duration]');
    const slots = [current, price, duration];
    if (!slots.some(Boolean)) return null;
    const mobile = matchMedia('(max-width: 767px)');
    let swiper,
      mounted = false,
      disposed = false,
      previous = null,
      loading;
    const tickers = [];
    const clean = (text) =>
      String(text || '')
        .replace(/\s+/g, ' ')
        .trim();
    function paint(animate = true) {
      if (!mounted || !swiper || disposed) return;
      const slides = [...swiper.slides];
      const originals = slides.filter(
        (slide) => !slide.classList.contains('swiper-slide-duplicate'),
      );
      const index = Number(swiper.realIndex) || 0;
      const slide = originals.find(
        (slide, i) => Number(slide.getAttribute('data-swiper-slide-index') ?? i) === index,
      );
      const source = slide?.querySelector('[data-tdb-treatment-price-source]');
      const amount = clean(source?.getAttribute('data-tdb-treatment-price-source'));
      // Webflow's Low Price field renders a number, without a currency symbol.
      const formattedAmount = /^\d+(?:,\d{3})*(?:\.\d+)?$/.test(amount)
        ? new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
          }).format(Number(amount.replaceAll(',', '')))
        : amount;
      const time = clean(
        slide
          ?.querySelector('[data-tdb-treatment-duration-source]')
          ?.getAttribute('data-tdb-treatment-duration-source'),
      );
      const values = [
        String(index + 1).padStart(2, '0'),
        formattedAmount
          ? /^from\b/i.test(formattedAmount)
            ? formattedAmount
            : 'From ' + formattedAmount
          : '',
        time,
      ];
      const direction =
        swiper.params?.loop && swiper.swipeDirection
          ? swiper.swipeDirection === 'prev'
            ? -1
            : 1
          : previous === null || index >= previous
            ? 1
            : -1;
      tickers.forEach((ticker, i) =>
        ticker?.update(values[i], direction, animate && mobile.matches && previous !== null),
      );
      if (total) total.textContent = String(originals.length).padStart(2, '0');
      position?.setAttribute('aria-label', `${index + 1} of ${originals.length}`);
      previous = index;
    }
    function mount() {
      if (mounted || disposed || !window.TDBNativeTicker || !window.TDBMotion) return;
      slots.forEach((slot, i) => {
        tickers[i] =
          slot &&
          window.TDBNativeTicker.mount(
            slot,
            i === 0
              ? {}
              : {
                  valueClass: 'tdb-smile-fact-value',
                  incomingClass: 'tdb-smile-fact-value',
                },
          );
      });
      mounted = true;
      paint(false);
    }
    function changed() {
      paint(true);
    }
    function resize() {
      paint(false);
    }
    function sync() {
      if (disposed) return;
      const candidate = root.querySelector(':scope > .swiper')?.swiper;
      if (candidate && candidate !== swiper) {
        swiper?.off('slideChange', changed);
        swiper?.off('beforeDestroy', dispose);
        swiper = candidate;
        previous = null;
        swiper.on('slideChange', changed);
        swiper.on('beforeDestroy', dispose);
        if (mounted) paint(false);
      }
      if (window.TDBNativeTicker) mount();
      else if (!loading && window.TDBModules) {
        loading = window.TDBModules.load(new URL('tdb-ticker.js', base), {
          ready: () => Boolean(window.TDBNativeTicker),
        })
          .then(mount)
          .catch(() => {
            loading = null;
          });
      }
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      swiper?.off('slideChange', changed);
      swiper?.off('beforeDestroy', dispose);
      mobile.removeEventListener('change', resize);
      tickers.forEach((ticker) => ticker?.destroy());
      instances.delete(root);
    }
    mobile.addEventListener('change', resize);
    const api = { sync, dispose };
    instances.set(root, api);
    sync();
    return api;
  }
  return { prepare };
})();
