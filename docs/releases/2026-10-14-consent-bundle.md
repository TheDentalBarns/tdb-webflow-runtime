# Consolidated consent entry point

The existing native banner (4.0.8), shared scroll lock (1.0.3), Modules registry (1.6.0), and deployed consent controller (0.6.1) are built together as `dist/tdb-consent.js`. The readable constituent sources remain separate. The consent controller is copied from the currently deployed 1d859948eb2f5daee81e6f44e9536caec05573af release; the base branch had an older controller.

Replace the three deferred head tags with one deferred consent tag at the former native-startup position. Preserve every Modules data attribute, including asset pins, motion/carousel/drawer/availability roots and the availability feed. Retain data-cookie-script-js and data-tdb-consent-js compatibility markers. All three globals remain available.

This is a packaging change only. Modules is still registered immediately. Vimeo still requires functionality permission; quotes still release after either decision or direct interaction; analytics retain their existing policy. The wider page loaders have not been moved or gated. Consent CSS stays in the early external tdb-ui.css.

Build: node tools/runtime-build/build-preservation.cjs dist/tdb-consent.js
Validation: node tests/consent-native.test.cjs (requires jsdom; TDB_JSDOM may select its installed path). This exercises the actual bundle, native motion/event/focus contracts, registry configuration and retry, fresh and saved decisions, and existing quote interaction.

Historical standalone build targets remain for reproducibility; they are no longer included as separate tags in staging.
Rollback: restore the head from 2026-10-14-consent-bundle-head-before.html. Footer and production are unchanged.
