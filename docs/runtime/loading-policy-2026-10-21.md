# Shared feature loading

`src/shared/feature-loading.js` is included in `tdb-runtime.js`, after the shared cookie decision. Either Accept or Essential only permits these functional features. It adds no head code or stylesheet.

| Feature | Preparation trigger |
| --- | --- |
| Review, Instagram and Smile Gallery embeds | 700px above or below the viewport |
| Review drawer, USP drawer, partner tooltip | A visible trigger after 200ms without scrolling, or immediate pointer-over, focus or pointer-down |
| VIP drawer and its form content | Its calling banner is ready/present, after cookie decision and announcement readiness; direct activation also waits for announcement readiness |

The panel intent observer and delegated listeners are shared. Preparation does not open a panel. Concurrent preparations reuse the module registry and each feature's existing data promise. Failed speculative requests do not retry continuously; explicit activation retains recovery.

Review entry points include the review count, power review, quote trio and dynamically created embedded review cards. They share one drawer, template and CMS data cache. Inline content remains independently gated at 700px.

The Smile Gallery retains its existing minimum neighbour window and also loads every card within the visible horizontal viewport, plus one card-width beyond either edge. This covers wide desktop overhang without downloading every case. Image dimensions and layout are unchanged.

The Smile embed mounts once its 700px preparation finishes instead of waiting for the generic carousel's second 100px observer. Its first-view entrance animation still waits for visibility. This avoids a preparation timeout when someone pauses between those distances or scrolls past quickly.

Validation: 499 tests pass, 3 intentional skips; all generated bundles pass `build:check`. Coverage includes all review entry points, dynamically inserted triggers, consent, scrolling settlement, retry/teardown, repeated marquee logos, USP warmup, VIP sequencing and wide Smile Gallery image coverage.

Historical release notes describe the earlier gates; this document supersedes their loading timings. Legacy modules retain fallback behavior when used without the shared runtime helper.
