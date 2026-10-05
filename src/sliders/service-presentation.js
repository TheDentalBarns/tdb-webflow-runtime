/* TDB service presentation v1.0.0. Webflow owns every visual rule.
 * This adapter selects native classes; it never creates a stylesheet.
 */
(() => {
  'use strict';
  if (window.TDBServicePresentation) return;
  const roots = new Set();
  const portrait = matchMedia('(max-width:767px) and (orientation:portrait)');
  const landscape = matchMedia('(orientation:landscape)');
  const desktop = matchMedia('(min-width:992px)');
  const layoutSelector = '.tdb-service-content,.tdb-service-heading-row,.tdb-service-title,.tdb-service-copy,.tdb-service-link-source,.tdb-service-controls,.tdb-service-buttons,.tdb-service-cta';
  const owns = root => root?.classList.contains('tdb-service-parallax');
  function layout(root) {
    const phone = landscape.matches && document.documentElement.classList.contains('tdb-phone-landscape');
    root.querySelectorAll(layoutSelector).forEach(node => node.classList.toggle('is-phone-landscape', phone));
    root.dataset.tdbServiceLayout = phone ? 'phone-landscape' : portrait.matches ? 'portrait' : desktop.matches ? 'desktop' : 'tablet';
  }
  function prepare(root) {
    if (!owns(root)) return;
    roots.add(root);
    layout(root);
    root.querySelectorAll('.tdb-service-controls,.tdb-service-cta').forEach(node => node.classList.add('is-ready'));
  }
  function setMoving(root, value) {
    if (owns(root)) root.querySelectorAll('[data-tdb-service-copy]').forEach(node => node.classList.toggle('is-moving', value));
  }
  function setEntry(root, value) {
    if (owns(root)) root.querySelectorAll('[data-tdb-service-copy]').forEach(node => node.classList.toggle('is-entry-pending', value));
  }
  function bind(root, swiper) {
    if (!owns(root)) return;
    const current = () => {
      const index = swiper.slides[swiper.activeIndex]?.getAttribute('data-swiper-slide-index');
      swiper.slides.forEach((slide, i) => slide.querySelector('.tdb-service-card')?.classList.toggle('is-current', index === null || index === undefined ? i === swiper.activeIndex : slide.getAttribute('data-swiper-slide-index') === index));
    };
    layout(root);
    current();
    swiper.on('slideChange loopFix resize update', current);
    swiper.on('beforeDestroy', () => {
      roots.delete(root);
      swiper.off('slideChange loopFix resize update', current);
      root.querySelectorAll('.tdb-service-controls,.tdb-service-cta').forEach(node => node.classList.remove('is-ready'));
    });
  }
  function resize() {
    roots.forEach(root => { if (root.isConnected) layout(root); else roots.delete(root); });
  }
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize);
  screen.orientation?.addEventListener('change', resize);
  portrait.addEventListener('change', resize);
  landscape.addEventListener('change', resize);
  desktop.addEventListener('change', resize);
  window.TDBServicePresentation = Object.freeze({version:'1.0.0', prepare, bind, setMoving, setEntry});
})();
