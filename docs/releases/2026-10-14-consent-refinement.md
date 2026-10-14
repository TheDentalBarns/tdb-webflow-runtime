# Consent v0.6.2 scoped refinements

Scope: consistent performance consent validation, one DOM-first startup refresh, and bounded analytics network retries. Native banner, scroll lock, Modules, CSS, asset pins and wider page loaders are unchanged.

All analytics entry points (including public calls and category/AcceptAll events) require a saved accept decision with the performance category through the existing allows() helper. Event details alone cannot override the current saved decision.

prepareGates() is idempotent and performs the initial readiness refresh after DOM detection. Readiness/settlement events received before preparation are covered by that initial refresh. The normal deferred deployment still starts returning visitors immediately after parsing.

GA4, Intellimize and Meta script requests track requested, loaded and failed states separately from boot configuration. An explicit error removes only the owned failed tag and schedules one retry after 1,000 ms. There are at most two attempts per provider per page. Consent is rechecked before retry; withdrawal cancels pending retries. A later accepted decision may use a remaining attempt. Slow requests are not retried on a timeout, preventing a late script from duplicating execution. Existing scripts owned elsewhere are retained as existing unless their data-tdb-loaded marker already confirms loading.

TDBConsent.status() preserves its three boolean flags as request/boot indicators, resetting an affected flag on error, and adds scripts: {analytics|intellimize|meta: {status, attempts}}. Loaded means the script load event fired, not that a third-party service received tracking data. GA configuration and Meta init/PageView are queued once; retry never requeues them.

Validation: existing native contract suite plus consent-startup-analytics.test.cjs against the real compiled bundle. Covers denied/malformed decisions, early events, saved choices, duplicate events, success/failure, per-provider retry caps, withdrawal and renewed acceptance, silent decision changes, slow loads and externally owned tags.

Rollback: restore the saved before-head. Deploy staging only.

Built asset: 1f0f736df4452c2a9f90df4e37aae3a814a9eb45/dist/tdb-consent.js, 20,478 bytes (+474 from the consolidation). GitHub Actions run 38536510626 passed the native contract suite and all 10 scoped startup/analytics checks. The after-head snapshot contains the exact staging pin and preserved configuration.
