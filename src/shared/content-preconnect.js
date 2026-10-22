/* All pages share this origin for announcement and public CMS JSON. */
(() => {
  const origin = 'https://tdb-public-availability.david-070.workers.dev';
  if (
    [...document.querySelectorAll('link[rel~="preconnect"]')].some(
      (link) =>
        new URL(link.href, document.baseURI).origin === origin &&
        link.hasAttribute('crossorigin') &&
        link.crossOrigin !== 'use-credentials',
    )
  )
    return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  link.setAttribute('data-tdb-content-preconnect', '');
  document.head.append(link);
})();
