# Banner 1.6.0 reliability pass

Scope: native banner, its shared CSS readiness export, reproducible build and test/release checks. Existing visual CSS, consent decision gate, shell scroll thresholds, drawer routing, eight-second rotation, countdown, manual swipe and reduced-motion behavior are retained. Production rollout is separate from staging verification.

Changes:
- Bounded CMS fetch retries: one initial request, one automatic retry after 750 ms, and at most one connection/pageshow recovery. Each request has the existing four-second abort timeout.
- Validate exactly one of each expected field, correct active/preview slug, paired date/time and valid UK time before adopting a response. HTTP 200 error pages and partial dates are rejected.
- Network failure displays neutral enquiry copy; it does not assert availability or full booking. Successful recovery applies fresh CMS values without reloading or resetting manual swipe selection.
- Handle Web Animations cancellation as well as completion; detach both handlers before cancelling during settlement. Animation setup exceptions use existing CSS fallback.
- Await the existing shared UI stylesheet loader. Standalone load-event fallback checks readiness after the stylesheet target handler has applied it.
- Reuse Intl formatters and labels, avoid unchanged DOM attributes, and ignore root class mutations that do not change visibility. Hover remains paused when keyboard focus leaves the banner.
- Include native banner in the build. Reconcile shell source with the already deployed native implementation; previous source still recreated the retired Elfsight countdown. Align immediate-loader source and built footer pin. Add release checks and banner regression coverage.
- Repair existing test setup: declare PostCSS dependency, do not load deferred UI twice when testing the combined bundle, mark mocked VIP CSS ready, and assert the configured slider CSS release. These failures also occurred against the previous deployed bundle; no corresponding production slider/drawer behavior was changed.

Payload: standalone minified banner grows from 15,675 to 16,952 bytes; local gzip from 5,698 to 6,250 bytes. Combined footer gzip grows from 11,800 to 12,311 bytes. Recovery adds about 0.5 KB compressed. The settings request remains the existing 52,476-byte HTML response (16,227-byte observed gzip transfer). Do not claim payload reduction. The available Webflow tools cannot create the CMS bindings needed for safe shared-footer embedding; a minimal feed or embedded fields remains follow-up work. Do not replace this with a stale GitHub snapshot or expose the private appointment-sync Worker.

Verification: run `node tools/check-banner-release.cjs`; install tools/runtime-tests dependencies and run its suite with TDB_RUNTIME_FILE pointing to dist/tdb-footer-runtime.min.js and TDB_VIP_FILE to dist/tdb-vip-drawer.js. Also run announcement.test.cjs with TDB_BANNER_FILE pointing to the minified standalone banner. Live browser checks are recorded separately at rollout.

Rollback: restore the site's immediate-runtime pin to 6be69c94488e544258e469a160dac7e74cd81a13; that loads footer c82bc08889cab7fded72662e5cd8508aca01148c and banner 1.5.1. No CMS or Dentally configuration changes are part of this pass.

Local verification: all 85 runtime tests pass against the rebuilt footer; the banner suite also passes separately against minified output.
