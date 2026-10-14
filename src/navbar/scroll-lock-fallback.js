/* Retain scroll locking for remaining native Webflow navigation hooks. */
(() => {
  const modules=window.TDBModules;
  if(!modules)return;
  // Native navigation marks its scroll-lock ownership before this check.
  // Preserve the old-page fallback until all remaining hooks are migrated.
  if([...document.querySelectorAll('[fs-scrolldisable-element]')].some(node=>
      node.getAttribute('fs-scrolldisable-element')!=='preserve'&&!node.hasAttribute('data-tdb-nav-scroll-lock'))) {
    modules.load('https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1.6.2/scrolldisable.js',{
      attribute:'data-scrolldisable-js'
    }).catch(error=>console.warn('TDB legacy scroll lock unavailable.',error));
  }
})();
