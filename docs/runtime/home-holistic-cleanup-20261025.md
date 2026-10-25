# Home integrated DOM, CSS and pagination cleanup — 25 October 2026

Governing reference: [TDB Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd). Read that standard and the site rules before subsequent improvements.

Staging release: `34520173d263a2497ed3481a4b4eec3b3e59f757`. Compared with `8915e4a23f12be724e6f1c2a99d3c4ef13ee1f3a`. Publication targets only `dentalbarns.webflow.io`; acceptance covers Home.

## Changes and ownership

- Removed unused unmarked-feed-holder layout and icon fallbacks from initial UI. Home's three reserved cards use Designer geometry and native artwork. Kept the busy ring, proximity mask parking, borrowed review-progress visibility and existing narrow-landscape review holder adjustment. The latter remains a documented compatibility exception; no additional head CSS was added.
- IG, Smile, review cards, review drawer and USP drawer now share `tdb-pagination-number` and `tdb-pagination-rule`. `src/styles/tdb-pagination.css` is the single source for their common number frame and separator geometry. The build composes it into the five existing deferred feature stylesheets. There is no extra request or readiness dependency. Features retain typography, positioning, value styling and complex motion. Smile keeps its existing controller hook. The existing shared `TDBNativeTicker` continues to animate values; it was not changed.
- Six Home sections now reuse Designer's existing `padding-global` utility instead of six per-element inset classes. These are the team quote, reviews, awards, awards banner, first-visit grid and partner banner. Empty Designer combo records inherit the existing global rule: 3% horizontal padding, 5% at widths up to 767px. The six redundant style definitions were removed after verifying the complete matching padding cascade.
- Kept the outer `All-treatments` anchor. Renamed the nested CMS section IDs to `treatment-stamps` and `treatment-details`. Their data hooks, CMS structure, six treatment links and controller selectors remain intact.

## Decisions from the whole-page review

No element-count target was applied: the initial document still contains 1,129 elements. The padding consolidation removes duplicate CSS without restoring wrappers. Existing content/background boundaries, clipping, reserved cards and treatment relationships remain intact. The compact hero control retains its separate feedback fade and spinner-continuity behavior; a structural reversal had no demonstrated net benefit in this pass. Audio investigation remains paused.

No module motion was moved into shared UI or Designer. This pass does not complete a universal removal of native module-looking classes. In particular, the treatment price ticker consumes Smile-named base styles, and the deferred Smile stylesheet is scoped to its feed; deleting native rules solely by their names would be unsafe. Loading distances, consent boundaries, first-input replay, motion timings and the 20px blur are unchanged.

Shared source does not require shared network delivery. Small common rules may be composed into independent feature files when a new dependency would complicate first use. This saves maintenance effort; measure compression separately rather than claiming that every shared class reduces bytes.

## Delivered size comparison

Exact bytes; gzip uses Node level 9 consistently. These are local compression comparisons, not CDN transfer measurements or an LCP benchmark.

| Layer | Raw before | Raw after | Raw change | Gzip change |
| --- | ---: | ---: | ---: | ---: |
| Home HTML | 184,915 | 184,860 | -55 | -10 |
| Native Webflow CSS, both files | 218,048 | 216,796 | -1,252 | -153 |
| Initial UI CSS | 19,005 | 15,148 | -3,857 | -626 |
| TDB startup + foundation JS | 37,432 | 37,432 | 0 | 0 |
| **These initial layers combined** | **459,400** | **454,236** | **-5,164** | **-789** |
| Five affected deferred CSS files | 82,227 | 82,183 | -44 | +76 |
| Five affected deferred JS/template bundles | 87,100 | 87,098 | -2 | +48 |
| **All affected delivered assets** | | | **-5,210** | **-665** |

UI is 20.3% smaller raw and 15.9% smaller gzip (3,930 → 3,304). Pagination consolidation is effectively byte-neutral raw (-46 across its CSS and templates) and adds 124 compressed bytes across five independently loaded features. That small deferred cost buys one source and common classes without growing initial assets. The post-consent runtime remains 70,373 raw bytes; the shared ticker remains 1,967.

Native CSS is still the largest stylesheet cost. This bounded cleanup reduces unnecessary initial work; it does not establish a measured speed improvement or restore the earlier October footprint.

## Verification

- Full suite: 757 passed, three existing tests skipped, zero failures. The targeted interaction/loading subset passed 43 tests.
- Build parity passed. Native timing projection regenerated from the new audited CSS hashes with no output change.
- All 13 checked CDN files match local bytes, including every changed served feature file and the unchanged startup/foundation. All four published release pins match the immutable release.
- Published HTML has one `All-treatments` ID, both unique inner IDs, six treatment links and no missing label/ARIA references. Parsed element count remains 1,129.
- Six section widths, content offsets and padding match the desktop browser baseline; the published padding rules match the original desktop/mobile cascade.
- Desktop staging checks exercised review-drawer first opening and next navigation, Smile next, review-card next, IG next and USP first opening/next. Each counter settled to the expected next value with a clipped, relatively positioned frame. Local headings and card presentation remain independent.
- Related `/smile-gallery`, `/first-visit` and `/five-senses-experience` markup contains no consumers of the removed legacy holders. This is a targeted compatibility check, not certification of all pages.
- Physical mobile devices, forced network failures and new performance runs were not part of this pass.

## Rollback

The exact six native style records, old/new assignments and inner IDs are in [home-holistic-cleanup-20261025-rollback.json](home-holistic-cleanup-20261025-rollback.json). Restore those records and assignments, restore the previous inner IDs if an exact historical rollback is needed, and repin all four site references to `8915e4a23f12be724e6f1c2a99d3c4ef13ee1f3a`. Publish staging only. Revert repository code with ordinary commits.
