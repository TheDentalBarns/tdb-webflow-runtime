# Instagram deferred CSS trial

Staging only. The initial carousel is a reserved-size white holding image with an Instagram link. The CMS-bound native source stays in an inert HTML template; its native class assignments are carried as data attributes, so Webflow can omit the IG rules from the homepage stylesheet. CMS content is not copied into JavaScript.

After the shared consent decision and 400px proximity, the runtime loads the deferred feature. It requests the extracted IG stylesheet and the existing native controller through the shared registry, restores classes on an imported copy, parks photo URLs before connection, and lets the original controller preserve its 5/3 image windows, Swiper, motion and tickers. Reveal waits for styling, controller readiness and the first post image. Failures retain the linked holding image; online/pageshow/manual refresh or later focus/hover can retry. Teardown cancels preparation and retains the authored template.

This is a CSS and active DOM deferral trial. The CMS template remains in initial HTML; no HTML-transfer saving is claimed. Only runtime, deferred feature and IG CSS receive Home-specific pins. The existing Instagram, Gallery, Swiper, ticker and all unrelated pins stay unchanged.

The full native rollback and page-code snapshot is saved privately as `TDB-Instagram-Rollback-2026-10-14.zip`. Restore native class assignments, move the original CMS root out of the template into its original location, remove the holder/template, restore Home custom code, and publish staging. No CMS field must be reconstructed.

Validation: 24 existing Instagram lifecycle/metadata checks and 5 new deferred-loading checks passed. Staging delivery and browser verification will be recorded after publication. These tests are not a real-device iPhone result.
