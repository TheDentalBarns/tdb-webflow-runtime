# Homepage responsive layout ownership

Services and Treatments native phone-landscape classes are now owned by the existing deferred immediate runtime batch (0.11.12), called from the global footer. The homepage inline layout boot is retired. No additional script request or parsing observer is introduced.

This change starts from the exact deployed `dead3424dcad0607b95fe5b3704ab5247de45869/dist/tdb-immediate-runtime-batch.min.js`, expanded for source maintenance. This preserves deployed optimisations that were newer than this branch's previous source. The layout controller now detects physical phones using the same coarse-pointer, screen-short-side <=600px, physical orientation and viewport orientation checks as the retired inline boot. It discovers both homepage slider roots after parsing, before lazy carousel initialisation, and uses its existing rotation listeners. Treatment roots no longer skip this step on the homepage. Other pages retain the previous treatment behaviour.

The consent dependency retains the exact prior release URL. Footer/VIP dependencies still use the existing `data-tdb-runtime-base` and homepage override, so deploying the batch does not repin those assets. Carousel motion, blur, progress, animation and data selection are unchanged from the deployed baseline.

Eight targeted checks cover wide/small landscape phones, tablet-sized screens, portrait keyboard resizing, desktop, rotation before carousel mounting, early script execution and non-home treatment pages. These are simulated layout-detection checks, not physical iPhone/iPad testing.

Trade-off accepted: native landscape classes are applied when the deferred batch executes, rather than before first paint. These sections are below the initial viewport, but on a slow connection or restored deep scroll a brief default layout remains possible.

Rollback: restore the immediate-batch URL to `dead3424dcad0607b95fe5b3704ab5247de45869`, then restore only the `data-tdb-services-layout-boot` block from the adjacent before-head snapshot. Preserve other subsequent page code changes. Publish staging only.
