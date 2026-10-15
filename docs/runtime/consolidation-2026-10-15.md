# JavaScript consolidation — 15 October 2026

This extends the 14 October audit candidate in PR #27. Baseline: `4d7f0abd2196e1f40831e432cf530d252366798b`. JavaScript and generated bundles changed; Webflow settings and published sites are unchanged.

## Implemented merges

| Before | Maintained implementation now | Preserved behaviour |
| --- | --- | --- |
| VIP's private transport/retry code | `TDBModules.loadWithRecovery` | Same resolved pin for preload/controller; waits for global UI, VIP UI and chrome CSS; retains scroll seed, first intent and form fallback. |
| Calculator's private script/style transport | `TDBModules.load` | CSS before controller execution, required `open` export, concurrent loading, native navigation and inline proximity. Rapid clicks on the same busy trigger open once. |
| Archive's registry polling/insertion | `TDBModuleBootstrap.ensure`, shared with calculator | Reuses existing registry or in-flight foundation; one fallback request only when needed. Keeps decision/proximity/filter intent and CMS pagination. Rapid first clicks replay once. |
| Two copies of old Instagram rendering | `src/instagram/legacy-renderer.js` | Both filenames remain. Snapshot entry keeps its data; desktop entry fetches its existing immutable JSON. Same public API versions, post selection, markup and desktop motion option. |
| IG, First Impressions and legacy review tickers | `src/shared/value-ticker.js` | Private source assembled into feature bundles; same classes, labels, direction, interruption and 400ms easing. No extra request/global helper. |
| Separate review CMS and quote adapter requests | `tdb-review-cms.js` contains both definitions | New loader skips adapter request when present; older CMS pins retain an on-demand compatibility request. No eager data fetch or UI mount. |

The legacy renderer/ticker source group goes from **4,979 to 4,335 lines**, including the extracted snapshot/shared helpers: **644 fewer maintained lines**. Compatibility filenames remain available for existing pages and rollback.

## Shared transport contract

`TDBModules` **1.7.0** still deduplicates resolved URL/type flights and validates required exports. Errors distinguish `TDB_NETWORK`, `TDB_TIMEOUT` and `TDB_EXPORT`.

- An explicit network error removes an owned failed tag and permits retry. `loadWithRecovery` retries once after 250ms.
- A timeout rejects the caller but retains the original tag/listeners. It does not insert another copy of potentially executing code. A late success is adopted; an explicit late network error releases the URL for retry.
- A script missing its required export remains a terminal failure rather than being re-executed. A subsequently ready export can still be adopted.
- External tags remain externally owned. Stylesheet cascade placement/sentinels in `feature-css.js` retain their separate contract.

The standalone bootstrap follows the same timeout/network distinction. It adds no request when the shared registry already exists and adopts an in-flight consent foundation, preserving that owner's configuration.

Versions: runtime **1.5.0**, VIP loader **1.5.0**, review loader **4.1.0**, calculator loader **1.6.0**, archive loader **1.1.0**. Existing controller APIs and legacy IG version strings remain intact.

## Size and requests

Local gzip level 9, relative to the prior audit candidate:

| Scope | Raw change | Gzip change | Effect |
| --- | ---: | ---: | --- |
| Runtime | −842 B | −285 B | Removed private VIP transport/repeated recovery. |
| Consent registry + runtime | −461 B | −147 B | Includes stronger shared transport checks. |
| CMS + review loader + formerly separate adapter | +157 B | −229 B | One fewer request on the combined quote path. |
| CMS alone | +1,600 B | +501 B | Archive/data-only users carry the adapter definition without mounting or fetching content. |
| Calculator loader | +899 B | +312 B | Shared bootstrap, recovery semantics and export validation. |
| Archive loader | +887 B | +307 B | Reusable bootstrap, first-click/no-observer handling. |

All eleven changed outputs together increase **4,385 B raw / 1,575 B gzip**. This includes alternative routes and the registry twice (standalone and inside consent); it is not initial-page transfer. The earlier minification reductions remain separate. Old IG already selected one variant per page, so source consolidation cannot remove an additional request that never occurred. See [per-output sizes](consolidation-sizes-2026-10-15.json). No FCP/LCP/TBT improvement is claimed.

## Verification

**325 tests passed, zero failed, two existing fixture-dependent skips** (Brevo SDK and published Webflow Tram).

Added regression coverage: bootstrap reuse; network/timeout/late execution; missing exports; VIP pin/preload identity; CSS-before-calculator execution; first/rapid clicks; modified navigation; archive replay; older review CMS fallback; shared tickers; both IG entries.

Compared previous/current IG builds: all four captured feeds, widths 390/1440, both entry points, initial/forward/reverse markup and animation keyframes/timings match. This uses a simulated DOM/Swiper harness, not real Safari layout. See [verification and parity hashes](consolidation-verification-2026-10-15.json). Run `node tools/runtime-build/verify-legacy-ig.cjs` with the baseline Git object present to repeat that comparison. Build determinism, formatting and readable bundles are checked separately; vendor Swiper code is unchanged.

## Deployment groups and rollback

1. **Foundation/runtime:** promote consent/modules 1.7.0 with runtime 1.5.0. Preserve existing motion/carousel/drawer/availability bases and unrelated per-file pins. Explicitly pin `tdb-vip-drawer.js` to existing controller commit `405af73d4d62619c66bb1140ee6f1e6081b0559c` if that controller is not being promoted in the same trial. Without a per-file override, VIP now follows the runtime release. Footer DCL/fonts timing is unchanged.
2. **Review definitions:** promote CMS and review-loader pins together for the one-request quote path. Keep old adapter URLs for compatibility. Preserve Home/standard drawer, CSS and template cohorts.
3. **Standalone loaders:** verify calculator/archive sibling controllers, CSS and registry URLs. Calculator's existing CSS pin is retained. New recovery semantics require the foundation update above; an older registry retains older semantics.
4. **Legacy entries:** same IG, First Impressions and review-drawer filenames, now built from shared sources. Preserve markup, JSON and styles. Regenerate any existing Subresource Integrity value together with its exact script URL before replacing that URL.

Save exact current site/page settings privately before editing Webflow pins. Restore those settings and republish staging to roll back. Old immutable Git commits remain available. Main/production promotion remains separate from this candidate.

## Remaining boundaries

Native/legacy IG and review **markup migrations** are per-page work. Removing compatibility entries first would remove those pages' features. The legacy review snippet's integrity-bound drawer request remains paired with its authored URL/hash. Attribution keeps its separate repository and captured versions. Overlay/focus-stack and page-wide observer rewrites need separate browser measurements.

The native CMS ticker retains authored incoming/value nodes and restores them on teardown; its ownership contract differs from the fixed-slot legacy ticker. Swiper controllers, Five Senses, Vimeo and drawer templates retain their demand boundaries.
