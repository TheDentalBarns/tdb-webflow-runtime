# Release and rollback

This candidate is based on staging's `9739d86106bac901252d0e9876468ebb82ad9bd3`, not the older `main` tree. Review it against that base first. Consolidating it into `main` is a separate reconciliation step; do not silently replace production's older behavior with staging's full collection.

The [15 October consolidation](consolidation-2026-10-15.md#deployment-groups-and-rollback) adds exact release groups. Pair the updated foundation/runtime, preserve or explicitly promote the VIP controller pin, and pair review CMS/loader for the combined data path.

## Prepare a release

1. Install the root lockfile with Node 24, format changed sources and build all manifest targets plus Swiper. Run the tests and deterministic build check. Confirm no unexplained output changes.
2. Review `config/build-artifacts.json` and the source-provenance record. Retain third-party licenses and the Swiper patch. The historical `.min.js` consent target is policy-only, not the full consent bundle.
3. Commit all source, generated output and documentation together on a release branch. Record its immutable commit SHA. Resolve the differences between standard/Home drawers, reviews and runtime explicitly.
4. Build the proposed Webflow pin/configuration diff from the captured baseline. Keep CSS and template pins together when a feature requires them. Relative URLs, native markup, JSON data, worker feeds and filenames under `/src/` also matter; a complete set of new JS files does not make a single global base URL safe yet.
5. Preserve the exact current site/page settings before any publish. The inventory is sufficient to audit script references; it is not a complete Webflow rollback export. Do not publish private page/CMS snapshots in this public repository.

## Validate on staging before calling it final

The automated suite covers behavior in simulated DOM fixtures. Two tests require explicit external fixtures (`TDB_BREVO_SDK` and `TDB_TRAM_SOURCE`); see their test files for the current fixture switch. A real browser pass is still required for layout, GPU/audio, Webflow/Tram and mobile interaction.

| Scenario | Required checks |
| --- | --- |
| Consent | Fresh, saved accept, saved reject, withdrawal; local features still work on reject; remote media/tracking obey their gates. |
| Navigation / USP / VIP | iPhone Safari and Chrome first tap, rapid taps, keyboard, opening then cancelling, reload, Back/forward, scroll retained. |
| Carousels / reviews / IG | Active and non-focus cards, swipe/reverse, focus, pagination/filter, late records, drawer close/reopen and removal/remount. |
| Forms / calculator | First submission during load, validation, submitter, previously edited values, reset, dynamic insertion, attribution fields. |
| Five Senses / Vimeo | Permission changes during load, loading cancellation, reopen, pagehide, media cleanup and restored scrolling/focus. |
| Network recovery | Block a request, retry explicit network error, simulate timeout and missing export; native fallback remains available. |
| Routes | Home, first visit, reviews, calculator, smile gallery, a service, a treatment and VIP variants using old inline handlers. |

Measure repeated comparable cold and warm runs. Report request/parse/main-thread timings separately from raw/gzip size. The TBT experiment is paused; the audit supplies no measured FCP/TBT improvement claim.

## Migrate in small cohorts

First promote the two runtime reliability fixes on their own pin after browser checks. Next promote minification-only/source-restoration cohorts with their existing gates. Then migrate old Instagram/review markup and delete their references per page. Move custom VIP/calculator transport to the shared registry independently. Only after those checks simplify to one tested release manifest with explicit exceptions.

Keep the previous release SHA and configuration attached to each migration. Roll back by restoring the previous immutable pins/settings and republishing the affected staging pages; no source rewrite, history reset or deletion of old commits is needed. Roll back a source change with an ordinary revert commit. Production publish is a separate action after approval of the concrete staging result.

## CI

The runtime and Swiper workflows validate the checked-out commit with read-only repository permissions. They no longer generate commits on `main`. UI validation is manual/read-only while CSS work is paused. Older one-off feature workflows are retained for their named historical work branches; they are not the canonical release pipeline and should be archived when those branches are reconciled.
