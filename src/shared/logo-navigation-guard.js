/* Logo controls must not follow their CMS links before the lazy marquee starts.
 * Keep this tiny guard in the existing early bundle, with no discovery or loads. */
(() => {
  'use strict';
  if (window.TDBLogoNavigationGuard) return;
  function guard(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.logo-slider .tdb-partner-logo') &&
        !target.closest('.tdb-partner-source')) event.preventDefault();
  }
  document.addEventListener('click', guard, true);
  document.addEventListener('auxclick', guard, true);
  window.TDBLogoNavigationGuard = true;
})();
