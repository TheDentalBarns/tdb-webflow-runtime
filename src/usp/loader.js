/* Shared registry selects the Home trial; other pages retain their current USP adapter. */
(() => {
  'use strict';
  window.TDBModules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@3217122904abee907bac1af3c23c28320e421219/dist/tdb-usp-drawer.js', {
    ready: () => Boolean(window.TDBUSPDrawer)
  }).catch(error => console.error('Practice highlights could not load', error));
})();
