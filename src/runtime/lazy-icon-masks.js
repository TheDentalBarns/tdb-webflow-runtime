/* Proximity releases shared SVG artwork; Designer owns appearance and dimensions. */
function prepareLazyIconMasks() {
  'use strict';
  if (window.TDBLazyIconMasks) return;
  const base = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/';
  const assets = {
    ig: '6ac8c5438b7e68a92fade1e2_tdb-icon-instagram.svg',
    smile: '6ac8f795d857a42b8d46b54c_tdb-exceptional-diamond.svg',
    review: '6ac7b973bb15c9b9f29a8d18_tdb-review-quote.svg',
    arrow: '6ac8c5037ecf8cf1ab74a93a_tdb-arrow.svg',
    star: '6ac7b973280ebf1329ec59f0_tdb-review-star.svg',
    google: '6ac7b972653444187f404ca8_tdb-review-google.svg',
    facebook: '6ac7b973ba7906fe700055be_tdb-review-facebook.svg',
    yell: '6ac7b973ba7906fe700055e8_tdb-review-yell.svg',
    doctify: '6ac7b973dd39bbf3927772e6_tdb-review-doctify.svg',
  };
  const arrows =
    '.carousel-arrow-icon,.icon-embed-xxsmall.tdb-direct-arrow,.tdb-arrow-asset,.tdb-mask-icon.is-arrow,.tdb-announcement-arrow';
  const seen = new WeakSet(),
    pending = new Set();
  let disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  function reveal(node) {
    if (!node.isConnected) return;
    if (node.hasAttribute('data-tdb-lazy-platform') || node.matches('.tdb-quotes_source')) {
      // A hydrated quote owns its CMS platform. Never overwrite it with the
      // authored Google fallback, even if hydration wins the proximity race.
      if (
        node.dataset.reviewPlatform ||
        node.style.backgroundImage ||
        node.childElementCount ||
        node.textContent.trim()
      )
        return;
      const platform = node.dataset.tdbLazyPlatform || 'google';
      const file = Object.hasOwn(assets, platform) && assets[platform];
      if (!file) return;
      if (node.tagName === 'IMG') {
        if (!node.hasAttribute('src')) node.src = base + file;
      } else node.style.backgroundImage = 'url("' + base + file + '")';
      return;
    }
    const kind =
      node.dataset.tdbNativeHolderIcon ||
      node.dataset.tdbLazyMask ||
      (node.matches(arrows) ? 'arrow' : 'star');
    const file = assets[{ instagram: 'ig', reviews: 'review' }[kind] || kind];
    if (!file) return;
    node.style.maskImage = 'url("' + base + file + '")';
    node.style.webkitMaskImage = node.style.maskImage;
  }
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            if (disposed) return;
            for (const entry of entries)
              if (entry.isIntersecting) {
                pending.add(entry.target);
                observer.unobserve(entry.target);
              }
            refresh();
          },
          { rootMargin: '400px' },
        )
      : null;
  function refresh() {
    if (!allowed()) return;
    document
      .querySelectorAll(
        '[data-tdb-native-holder-icon],[data-tdb-lazy-mask],[data-tdb-lazy-platform],.tdb-quotes_source,.tdb-review-summary-star-direct,.tdb-quote-decoration-stars,.tdb-quote-star-asset,' +
          arrows,
      )
      .forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        if (observer) observer.observe(node);
        else pending.add(node);
      });
    for (const node of pending) reveal(node);
    pending.clear();
  }
  const unsubscribe = window.TDBConsent?.subscribe(refresh);
  window.TDBLazyIconMasks = Object.freeze({
    refresh,
    destroy() {
      disposed = true;
      observer?.disconnect();
      pending.clear();
      unsubscribe?.();
    },
  });
  if (!unsubscribe) refresh();
}
