# Home and Location native reviews — 27 October 2026

Reference: [TDB architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd).

## Accepted implementation

Home and Location share Review Introduction (`1e6d2fa0-eb51-af7e-5dc2-307ef04c9501`); Location uses Dark. Its existing collection now reads **Review Excerpts**. Existing elements were rebound in Designer: quote → Excerpt; author → Review / Reviewer display name; platform visibility → Review / Platform; quote identity → Review / Slug. No Home elements were added. Published counts remain Home 1,132, Location 1,606, introduction 39 including its root.

The new native **Review selection** Filters property (`fde33906-53c3-58f8-3f64-e017ddca2f27`) controls the initial quote. Both instances require Available on and Lead excerpt on, Rank ascending, limit 1, skip 0. Home defaults to Static context = Home. Location overrides that filter with Ranking topic = Location. The separate Review topic string remains `location` for contextual drawer ordering; it is not the native filter.

Home retains Louise Bishton (`louise-bishton-google-2025-06-20`). Location natively renders “The location is lovely with a lovely view of fields and streams”, attributed to the CMS name TheHayleyRose (`thehayleyrose-google-2025-03-07`). Its Google excerpt is the available lead at rank 2. The rank-1 Facebook cross-post has Lead excerpt off; editorial flags were preserved.

Designer and published HTML now contain the correct quote before JavaScript. The shared loader preserves the explicit native review ID and its quote/author. Shared selection also uses that ID as the contextual lead before duplicate grouping, so the native lead opens at position 1. The existing drawer ensures the matching master record. Unmigrated consumers retain their hydration path. The Location hidden-until-ready rule was removed from external feed-holder/UI CSS. This replaces the earlier `c676910d` workaround, which was not accepted as finished behavior.

## Rating, progression and editorial checklist

The user chose native fallback snapshots plus live enhancement, with an editorial reminder instead of a publishing automation. No new workflow or custom CSS was added to the head. Review Introduction properties are now **Average rating** (`4.94`) and **Review count** (`(90)`). Review Summary defaults, target attributes, inline/incoming text and accessible names were aligned. Native count styles are visible in Designer and before enhancement.

The shared introduction module hydrates full-index totals from the validated live feed. A WeakSet remembers primed count elements: first enhancement starts at n−1 and advances to n (currently 89 → 90), even with current native defaults. Remounting does not rewind settled counts. Reduced motion shows the real total immediately. The average remains the real value, not average minus 0.01. Existing shared ticker timing/motion services remain authoritative.

**Whenever reviews are added, changed, approved, excluded or removed:**

1. Maintain master reviews and Review Excerpts, including Available and Lead excerpt. A quote-only change may not change totals.
2. Check the published feed's full-index `total` and `average`; do not count only Location snippets.
3. Refresh shared Review Introduction defaults, not page-instance overrides. In Review Summary also align standalone defaults, both count target attributes, count/summary accessible labels, plain inline number, incoming ticker text, and rating target/label. These are native fallback snapshots; live JS does not write into Designer.
4. Keep native Review selection and drawer Review topic aligned. Preserve Available on, Lead excerpt on, Rank ascending and limit 1. Home uses Static context Home; Location uses Ranking topic Location.
5. Publish staging, refresh Home and Location, check quote/name/totals, observe n−1 → n and open/close the matching full review. Verify the native lead opens at **01 of the full total** from both quote and summary; Next must continue the contextual order, with the other platform cross-post retained later. Publish production only when authorized.

Fallback defaults can go stale until that editorial step; this was explained and accepted. Existing platform logos, stars and decorative artwork still use the shared lazy artwork service, so Designer does not fully display them. Published artwork was checked. No new workaround or Home elements were introduced for those assets.

## Release and verification

### Drawer ordering correction — current release

Runtime `04f43ff85413ccdb89701423fac37cafc310ec49`, staging publish `d7c5286a-61d8-478c-a7b5-dcad279c8b0d`. Only existing runtime pins advanced; no new head code, native elements, CSS, CMS filters, ranks or editorial flags were added or changed. Four public CDN files matched the tested build byte-for-byte.

The user identified a missed acceptance case: the initial correction opened the right Google review but at **87 of 90**. Shared selection ranked the Facebook cross-post first and demoted Google as a duplicate. The earlier browser checks verified identity, not its drawer position. The native master ID is now passed from `cms.js` to `selection.js` before ordering and duplicate grouping, and included in the session cache key. It is the authoritative lead, rather than a separate hardcoded JS identity. An unknown ID leaves normal ranking intact. Pages without a configured context retain their existing selection path. Explicit visitor filters and sort choices remain authoritative when applied.

Fresh published-feed comparison: Location Google 87 → 1; Facebook 1 → 87; Natasja, Andy and Chantelle remain positions 2–4; all 90 reviews retained. Home's Louise and the following three identities are unchanged. The lead is now in the first 20-body batch, so opening it no longer walks through the queue to fetch review 87. Existing consent, proximity/readiness, activation, cancellation, motion and focus/scroll services remain unchanged. This is a correction within the external shared review-data module, not compensation for incorrect Designer content.

Build and build:check passed. New tests first reproduced the failure, then verified lead/duplicate priority, full-index preservation, first-batch loading, cache identity, explicit filters/sorts and unknown-ID fallback. Full suite rerun: **783 tests, 780 passed, 3 skipped, zero failures**. The initial full run had one unrelated strict floating-point comparison failure in `marquee-interaction.test.cjs` (89.30521999999999 versus 89.30522); that file and the complete suite passed unchanged on rerun.

Published browser checks: Location desktop and 390px mobile open TheHayleyRose / Google at 01 of 90; desktop summary entry also opens 01, and Next opens Natasja at 02. Home opens Louise at 01. Close restores quote focus and releases scroll locking. Mobile has no horizontal overflow; captured warning/error log is empty. Native introductions are byte-identical to the preceding release. Home remains 1,132 elements, Location 1,606, each introduction 39. Evidence: `drawer-order-verification.json`, `drawer-order-html-verification.json`, test/build logs and `location-drawer-order-{desktop,mobile}.png` in task `review-alignment-evidence`.

Four perspectives: startup/layout/native content are unchanged; in-page ordering now agrees with the native lead and first-batch loading; visual motion and counter presentation are unchanged; maintenance uses the existing native ID and one shared ordering function. Combined delivery changes: initial HTML raw bytes remain Home 185,046 and Location 203,076; locally recompressed gzip is 32,432 / 37,252 (previously 32,429 / 37,260, reflecting serialization/pin changes). All CSS and startup JS bytes are unchanged. Only deferred `tdb-review-cms.js` changes: 23,971 → 24,210 raw, 8,184 → 8,235 locally recompressed gzip (**+239 / +51**). No extra request is introduced. These are byte measurements, not a performance benchmark. To roll back this ordering correction only, restore all four runtime pins to `c86188317e3e3c77d6982f4ce6c3e9ebe390ba5e` and publish staging; retain the native bindings and filters.

### Preceding native correction

Runtime `c86188317e3e3c77d6982f4ce6c3e9ebe390ba5e`, branch `fix/transparent-navbar-hero-hold-20261027`. Existing head/footer pins advanced; five public CDN files matched the tested build byte-for-byte. Staging publish `2ff253f4-839e-4914-b30b-2607aebcfe6d`. No production custom domain was published.

Build and build:check passed. Full suite: 781 tests, 778 passes, 3 skips, zero failures. New tests cover preserving native content against conflicting selection, missing cached detail and deferred-load failure; opening its own master review; and one-time progression with current defaults. Native HTML confirms both identities and unchanged DOM counts. Desktop and 390px mobile checks confirm the correct quote, 90 total, no horizontal overflow, matching Google full-review drawer and close/focus restoration with scroll lock released. Captured error/warning log was empty. Physical-device or new performance benchmarking is not claimed.

Evidence: task `review-alignment-evidence`, including `native-migration-before.json`, native HTML and extracted introductions, `native-html-verification.json`, `native-delivery-costs.json`, build/test logs, CDN copies and desktop/mobile screenshots. Synced `sources/` was not changed.

## Four perspectives and delivery cost

- Startup: correct native content and visible totals; no new Home nodes, requests, observers or early controller. Early UI CSS no longer hides the quote.
- In-page: native editorial choice survives enhancement; shared drawer opens that review. Consent, full-index totals, focus, scroll and motion remain shared.
- Visual: native Dark layout and reserved geometry remain; no data-dependent blank quote interval. Count progression and reduced-motion behavior remain.
- Maintenance: one native component and per-instance Filters property, one external runtime. Designer UI supplies bindings/filter props unsupported by the connector. Aggregate defaults are an explicit editorial snapshot.

Measured raw / locally recompressed gzip bytes (not network-transfer or speed claims):

| Payload | Before correction | After correction |
| --- | --- | --- |
| Home HTML | 184,964 / 32,420 | 185,046 / 32,429 |
| Location HTML | 202,991 / 37,313 | 203,076 / 37,260 |
| Home page CSS | 184,200 / 30,431 | 184,202 / 30,432 |
| Location page CSS | 183,632 / 30,241 | 183,634 / 30,240 |
| Shared native CSS | 31,579 / 8,370 | unchanged |
| Early UI CSS | 14,388 / 3,237 | 14,224 / 3,194 |
| Deferred introduction JS | 4,272 / 1,663 | 4,305 / 1,691 |
| Deferred loader JS | 11,318 / 3,787 | 11,381 / 3,793 |

Deferred scripts together add 96 raw / 34 gzip bytes; early UI loses 164 raw / 43 gzip. Foundation/startup, contextual CMS JS and existing Location compatibility/layout CSS are unchanged. Publication can vary HTML serialization; this is not an isolated speed claim.

## Rollback and retained cleanup

Revert this correction as a coordinated native/runtime change: restore the Review Topics source, original query and quote/name/platform bindings from `native-migration-before.json`; disconnect/remove only the new Filters property and native master-ID binding as needed; restore saved summary defaults/styles; restore runtime pins to `c676910d85db2c3acb9ba9d6832e6c1b76a3e0a2`; publish staging. Do not revert only the native source while leaving the readiness safeguard removed. The older full Location alignment rollback is retained in this document's previous Git version and `baseline-designer.json`.

The unused backup **Archive — Review Introduction before Location alignment 2026-10-27** (`98dde563-7e90-07e7-74ab-c03ea2200a75`) remains. Earlier automatic approval review rejected deletion without specific authorization. It adds no page DOM but emits variant CSS. It was not deleted during this correction.
