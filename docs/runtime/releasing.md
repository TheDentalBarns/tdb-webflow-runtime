# Release and rollback

## One version

`config/release.json` defines the collection. A release commit contains source, minified/readable outputs, CSS/templates and supporting assets. Webflow's head UI stylesheet and footer `tdb-start.min.js` use that one immutable SHA. Children resolve relatively; no separate drawer, review, carousel, Home or attribution versions are configured.

Component version strings describe their API revisions. `TDBRelease.version` describes the collection; `TDBRelease.commit` identifies the exact installed release.

## Prepare and publish staging

1. Format, run `npm run build:all`, `npm run verify` and `npm run format:check`. Commit generated outputs and metadata. Retain vendor licenses and the Swiper patch.
2. Reconcile the release branch with `main`, including unrelated work since divergence. Use an ordinary merge, never replace history.
3. Save exact current site/page custom code privately. Audit inventories do not constitute a Webflow backup. Never commit full settings, HTML or CMS snapshots here.
4. Verify declared release assets on jsDelivr. Replace all four live install references together (foundation preload, UI stylesheet, noscript UI stylesheet, startup entry). Remove old global startup tags and page release overrides; keep configuration that does not select code versions.
5. Publish **only the Webflow staging subdomain**, with no custom domains selected. This pass validates Home; other staging pages may break and are not a gate.
6. Check served HTML, requested script versions and actual interactions: fresh/saved consent, essential-only local features, first clicks, navigation, drawers, IG/reviews, form preservation, media cancellation and scroll restoration. Physical iPhone Safari/Chrome remains a separate check.
7. Record observations and limitations. Do not infer TBT from file size or delayed requests.

## Rollback

Restore saved global and affected page head/footer blocks, then publish staging only. Old immutable commits remain available. Later releases using the same entry can roll back by changing all four SHA occurrences together. Revert source changes with ordinary commits, not history deletion.

## CI and archived code

Runtime and Swiper workflows are the canonical JavaScript checks and use read-only permissions. Old branch-specific builders are archived in `docs/archive/workflows/` so they cannot generate conflicting bundles or commits. CSS checks remain manually gated while separate CSS/performance work is paused.

The manifest's `compatibilityOnly` outputs are built for traceability and are outside the normal current-entry path. `compatibilityFallbacks` records the specific active sources and reasons for guarded older-entry fallbacks; it does not enable loading or change runtime resolution. Other pages retaining direct/inline legacy calls need a later markup migration; do not add their exceptions back into the global resolver.

## Inventory and early CSS checks

`npm test` checks release coverage in both directions: every JavaScript build target must be classified, and literal release-relative JS/CSS filenames in active sources must be declared. This catches a built module or deferred stylesheet omitted from the release list. Keep computed dependency choices in explicit filename tables/readiness maps so the check can see each destination; arbitrary computed URLs, remote SDKs and Webflow assets are not a static reachability proof. Existing asset-existence and generated-parity checks remain separate. Run `node tools/runtime-build/release-inventory.cjs` for the focused inventory check.

`node tools/runtime-build/verify-ui.cjs` checks UI source/output parity and the current inline contract: native navbar motion stays disabled until enhancement, chevrons/disclosures stay still until control motion is ready, and inline CSS never claims full UI readiness. The same guard contract runs in `npm test`. Feature fades, animation definitions and phone-landscape styling are not required in the inline stylesheet merely because older releases placed them there.
