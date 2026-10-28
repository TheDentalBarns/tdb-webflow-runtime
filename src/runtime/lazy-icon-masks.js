/* Proximity releases shared SVG artwork; Designer owns appearance and dimensions. */
function prepareLazyIconMasks() {
  'use strict';
  if (window.TDBLazyIconMasks) return;
  const base = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/';
  const assets = {
    ig: '6ac8c5438b7e68a92fade1e2_tdb-icon-instagram.svg',
    smile: '6ac8f795d857a42b8d46b54c_tdb-exceptional-diamond.svg',
    review: '6ac7b973bb15c9b9f29a8d18_tdb-review-quote.svg',
    star: '6ac7b973280ebf1329ec59f0_tdb-review-star.svg',
    google: '6ac7b972653444187f404ca8_tdb-review-google.svg',
    facebook: '6ac7b973ba7906fe700055be_tdb-review-facebook.svg',
    yell: '6ac7b973ba7906fe700055e8_tdb-review-yell.svg',
    doctify: '6ac7b973dd39bbf3927772e6_tdb-review-doctify.svg',
  };
  const footerAssets = {
    facebook: '6ad9b3a76d179d46fbd1908a_tdb-footer-facebook.svg',
    instagram: '6ad9b3a79315a7ef5419673f_tdb-footer-instagram.svg',
    pinterest: '6ad9b3a73e1ea747bd20046e_tdb-footer-pinterest.svg',
    linkedin: '6ad9b3a79924db6726de68bc_tdb-footer-linkedin.svg',
    youtube: '6ad9b3a8542e7bfd46e1482f_tdb-footer-youtube.svg',
    tiktok: '6ad9b3a872dc432ccf277657_tdb-footer-tiktok.svg',
    google: '6ad9b3a8b8b29dfc7bad72a9_tdb-footer-google.svg',
  };
  const contactAssets = {
    email: '6ae1d46d1c1a9f383cd4de00_tdb-contact-email.svg',
    phone: '6ae1d46d041a7dac0cb8a184_tdb-contact-phone.svg',
    mobile: '6ae1d47136d7abfabc27512a_tdb-contact-mobile.svg',
    address: '6ae1d471041a7dac0cb8a2eb_tdb-contact-address.svg',
    instagram: footerAssets.instagram,
    facebook: footerAssets.facebook,
  };
  const journeyAssets = {
    clock: '6ac8c58089197784d522c2a2_tdb-review-clock-brand.svg',
    distance: '6ae1ea46056eef9c12179a64_tdb-journey-distance.svg',
    globe: '6ac9040240c896d539d1903d_tdb-globe.svg',
    parking: '6ac8f79471bd2b763b1aad60_tdb-location-parking.svg',
    barn: '6ac9119d7e007fc273d48477_tdb-barn-window-light.min.svg',
  };
  const seen = new WeakSet(),
    pending = new Set();
  let disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  function reveal(node) {
    if (!node.isConnected) return;
    if (node.hasAttribute('data-tdb-journey-icon')) {
      const file = journeyAssets[node.dataset.tdbJourneyIcon];
      if (file) node.style.setProperty('--tdb-journey-icon', 'url("' + base + file + '")');
      return;
    }
    if (node.matches('.tdb-contact-item')) {
      const kind = Object.keys(contactAssets).find((key) =>
        node.classList.contains('tdb-contact-' + key),
      );
      if (kind)
        node.style.setProperty(
          '--tdb-contact-artwork',
          'url("' + base + contactAssets[kind] + '")',
        );
      return;
    }
    if (node.hasAttribute('data-tdb-lazy-barns')) {
      node.style.setProperty(
        '--tdb-barns-artwork',
        'url("' + base + '6ac9119d7e007fc273d48477_tdb-barn-window-light.min.svg' + '")',
      );
      return;
    }
    if (node.hasAttribute('data-tdb-compact-speaker')) {
      node.style.setProperty(
        '--tdb-speaker-artwork',
        'url("' + base + '6ad9ca7c57ab5d384c7ffc5c_tdb-control-speaker.svg' + '")',
      );
      return;
    }
    if (node.matches('.footer1_social-link')) {
      const platform = Object.keys(footerAssets).find((key) =>
        node.classList.contains('tdb-footer-' + key),
      );
      if (platform)
        node.style.setProperty(
          '--tdb-footer-artwork',
          'url("' + base + footerAssets[platform] + '")',
        );
      return;
    }
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
    const kind = node.dataset.tdbNativeHolderIcon || node.dataset.tdbLazyMask || 'star';
    const file = assets[{ instagram: 'ig', reviews: 'review' }[kind] || kind];
    if (!file) return;
    const artwork = 'url("' + base + file + '")';
    node.style.maskImage = node.classList.contains('tdb-summary-stars')
      ? Array(5).fill(artwork).join(',')
      : artwork;
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
        '[data-tdb-lazy-barns],[data-tdb-compact-speaker],[data-tdb-journey-icon],.tdb-contact-item,.footer1_social-link[class*="tdb-footer-"],[data-tdb-native-holder-icon],[data-tdb-lazy-mask],[data-tdb-lazy-platform],.tdb-quotes_source,.tdb-review-summary-star-direct,.tdb-quote-decoration-stars,.tdb-quote-star-asset',
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
