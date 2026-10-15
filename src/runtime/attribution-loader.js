/* Consent releases this loader; the attribution module still owns storage permission. */
function prepareAttributionLoader() {
  if (window.TDBAttribution || document.querySelector('script[data-tdb-attribution-js]')) return;
  window.TDBModules.load(new URL('tdb-attribution.min.js', TDBRuntimeModuleRoot), {
    attribute: 'data-tdb-attribution-js',
    ready: () => Boolean(window.TDBAttribution),
  }).catch((error) => console.warn('TDB attribution unavailable.', error));
}
