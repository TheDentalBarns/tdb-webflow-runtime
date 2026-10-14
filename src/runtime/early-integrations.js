/* Arrival capture retains its own consent-aware storage; do not load it twice. */
(() => {
  const modules=window.TDBModules;
  if(!modules)return;
  if(!window.TDBAttribution&&!document.querySelector('script[data-tdb-attribution-js]')) {
    modules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-attribution@6fa2423188ddccf9ef354132d3c1a303245e17a5/dist/tdb-attribution.min.js',{
      attribute:'data-tdb-attribution-js',ready:()=>Boolean(window.TDBAttribution)
    }).catch(error=>console.warn('TDB attribution unavailable.',error));
  }
  // Native navigation marks its scroll-lock ownership before this check.
  // Preserve the old-page fallback until all remaining hooks are migrated.
  if([...document.querySelectorAll('[fs-scrolldisable-element]')].some(node=>
      node.getAttribute('fs-scrolldisable-element')!=='preserve'&&!node.hasAttribute('data-tdb-nav-scroll-lock'))) {
    modules.load('https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1.6.2/scrolldisable.js',{
      attribute:'data-scrolldisable-js'
    }).catch(error=>console.warn('TDB legacy scroll lock unavailable.',error));
  }
})();
