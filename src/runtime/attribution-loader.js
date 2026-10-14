/* Consent releases this loader; the attribution module still owns storage permission. */
function prepareAttributionLoader() {
  if (window.TDBAttribution || document.querySelector('script[data-tdb-attribution-js]')) return;
  const home = document.documentElement.dataset.wfPage === '677cf86df9952f978d94d8a9';
  const release = home
    ? 'ed91771d20a0bffa5c79baa3be9b3203bdebac83'
    : '6fa2423188ddccf9ef354132d3c1a303245e17a5';
  window.TDBModules.load(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-attribution@' +
      release +
      '/dist/tdb-attribution.min.js',
    {
      attribute: 'data-tdb-attribution-js',
      ready: () => Boolean(window.TDBAttribution),
    },
  ).catch((error) => console.warn('TDB attribution unavailable.', error));
}
