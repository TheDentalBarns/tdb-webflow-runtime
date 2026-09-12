# UI readiness property experiment

Authorised staging-only experiment, stacked on the homepage VIP demand branch.

Remove only the `@property --tdb-ui-ready` registration from the global deferred UI stylesheet and rebuild its generated source/distribution bundles. Keep `html { --tdb-ui-ready: 1; }`, all drawer variable scoping, both homepage display guards, and every JavaScript runtime unchanged. Update the misleading old comment: a non-inheriting registration can itself cause document-wide style recalculation in Chromium.

The readiness consumers read the flag on `document.documentElement`. An unregistered marker preserves that contract, as in the earlier runtime architecture. This is an experiment, not a confirmed fix for the Webflow stylesheet coverage warning.

Validation before staging: the only active CSS difference is removal of this registration; footer, immediate and VIP runtime files remain unchanged. After publication, verify initial drawer dormancy, first-click open/close, scroll peek/hide, automatic VIP landing-page preparation and slider demand loading.

Use identical GTmetrix options before and after: London, Chrome, 4G 9000/5000/125, desktop viewport 1366x768 at DPR 1, video on, no ad blocking, and the UA from the supplied HAR. These form a new controlled desktop comparison; the historical report's full viewport settings were not available. Do not compare absolute desktop timings directly with the earlier mobile-shaped screenshots.

Prior global UI pin / rollback: `5f162a629a8ee7f5c8a1e79dc5206429c22961cf`. Restore this UI pin in the site head (normal and noscript links) and footer manifest, then publish staging only. All JS pins and homepage custom code stay unchanged throughout.

Production publication is not authorised. Test results and final experiment pin will be recorded after verification.
