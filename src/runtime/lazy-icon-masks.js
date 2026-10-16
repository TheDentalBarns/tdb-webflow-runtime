/* Decorative masks use one SVG per shape; Designer owns colour and dimensions. */
function prepareLazyIconMasks() {
  "use strict";
  if (window.TDBLazyIconMasks) return;
  const base = "https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/";
  const assets = {
    ig: "6ac8c5438b7e68a92fade1e2_tdb-icon-instagram.svg",
    smile: "6ac8f795d857a42b8d46b54c_tdb-exceptional-diamond.svg",
    review: "6ac7b973bb15c9b9f29a8d18_tdb-review-quote.svg",
    star: "6ac7b973280ebf1329ec59f0_tdb-review-star.svg",
  };
  const seen = new WeakSet(),
    pending = new Set();
  let disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  function reveal(node) {
    const kind = node.dataset.tdbNativeHolderIcon || node.dataset.tdbLazyMask || "star";
    const file = assets[{ instagram: "ig", reviews: "review" }[kind] || kind];
    if (!file || !node.isConnected) return;
    node.style.maskImage = 'url("' + base + file + '")';
    node.style.webkitMaskImage = node.style.maskImage;
  }
  const observer =
    "IntersectionObserver" in window
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
          { rootMargin: "400px" },
        )
      : null;
  function refresh() {
    if (!allowed()) return;
    document
      .querySelectorAll("[data-tdb-native-holder-icon],[data-tdb-lazy-mask],.tdb-review-summary-star-direct,.tdb-quote-decoration-stars,.tdb-quote-star-asset")
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
