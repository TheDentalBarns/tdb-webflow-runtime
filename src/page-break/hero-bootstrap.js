/* Temporary Hero IX2 handoff v1.4.0. Remove after retiring a-25/a-33/a-71/a-72/a-84 and the home e-334 trigger (About still uses a-29).
 * Disconnect only the audited scroll triggers, before Webflow initialises.
 * Designer nodes, classes, bindings and static appearance stay intact.
 */
(() => {
  'use strict';
  const selector = '[data-tdb-page-break="sketch"] [data-w-id="94493afe-30c7-9440-a2bd-977434185495"], [data-tdb-page-break="vimeo-hero"] :is([data-w-id="b1a810af-870e-98e2-c9cd-c1f7607452e7"],[data-w-id="2fb12fc5-2a95-dd7d-550c-a03fc28d7921"]), [data-tdb-page-break="vip-hero"] [data-w-id="64581252-2f29-f066-541f-ebb869d0fae7"], [data-tdb-page-break="bg-image"]:is([data-w-id="492cd62a-b903-e2d4-f435-238f82e688a2"],[data-w-id="24531960-8b97-adbf-a87b-45e808b048bd"])';
  const detach = () => document.querySelectorAll(selector).forEach(node => node.removeAttribute('data-w-id'));
  const observer = new MutationObserver(detach);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  detach();
  document.addEventListener('DOMContentLoaded', () => { detach(); observer.disconnect(); }, { once: true });
})();
