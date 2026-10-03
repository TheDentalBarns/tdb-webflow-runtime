/* Keep existing review patches available only to components awaiting migration. */
(() => {
 'use strict';
 if(!document.querySelector('.button.is-review,[data-tdb-embedded-review-loader]'))return;
 window.TDBModules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@efdd9b2de97df36e0d5c9389b505b030d58d0fc7/dist/tdb-review-summary-card.js',{attribute:'data-tdb-review-summary-card'}).catch(()=>{});
 if(!document.querySelector('[data-tdb-mobile-review-drawer]')){
  const link=document.createElement('link');link.rel='stylesheet';link.setAttribute('data-tdb-mobile-review-drawer','');
  link.href='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@dc3024b113674b1f0ec1038f3c28f58c554b7e09/dist/tdb-mobile-review-drawer.css';document.head.append(link);
 }
})();
