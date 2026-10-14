# Consent CSS and early UI loading — 14 October 2026

The consent browser/state CSS is included in the generated shared UI bundle. Consent startup v4.0.8 no longer creates a style element. The redundant dialog tap-highlight rule is omitted because the Webflow global critical base already applies it to all elements. The prefixed backface declarations remain for WebKit compatibility.

The Webflow global head uses a static stylesheet link after logo/font preloads and before deferred consent startup. The JavaScript-created print-media link and noscript import are removed. This restores immediate discovery and normal render-blocking stylesheet application. Both changed assets are pinned to e8f02cdb56ad0e0116fed768b8c98c8e13720045.

## Verification
GitHub Actions run 38532723557 built the artifacts with pinned Terser/CleanCSS, verified the readable CSS against the minified output, and passed the existing native consent contract test (fresh/saved/legacy choices, accept/reject, event order, focus, nested scroll locks and rapid reopen).
- UI CSS: 3,264 → 3,953 bytes.
- Consent startup: 10,356 → 9,162 bytes.
- Global Webflow head: 9,083 → 8,615 characters.

## Rollback
The sibling consent-ui-early-20261014-webflow-before.json contains the exact pre-change global head/footer. Restore only its head block, preserving any subsequent unrelated edits, and republish to staging.
Previous UI pin: d9aede36fbefe928fd108357fb560b2c16c70453.
Previous startup pin: a7d4fe2f1ccfc46404b107a5b65cf78c28853464.
Production custom domains were not published.
