/* Preserved treatment matcher from deployed parallax 2afb6b9. */
(() => {
  'use strict';
  window.TDBTreatmentParallax = Object.freeze({
    version: '1.0.0',
    selector: '[data-tdb-treatment]',
    matches: (e) => !0 === e?.hasAttribute('data-tdb-treatment'),
  });
})();
