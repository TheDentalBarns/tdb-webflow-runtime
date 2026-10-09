/* Treatment presentation options; all carousel behaviour stays shared. */
(() => {
  'use strict';
  window.TDBTreatmentParallax = Object.freeze({
    version: '1.0.0',
    selector: '[data-tdb-treatment]',
    matches: root => root?.hasAttribute('data-tdb-treatment') === true
  });
})();
