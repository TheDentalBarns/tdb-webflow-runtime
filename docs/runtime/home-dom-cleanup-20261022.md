# Home initial DOM cleanup, 22 October 2026

## Decorative-row consolidation after the accepted audio fix

The next approved staging pass removes ten native children from two existing
owners: five review-summary star spans and five decorative wellness barn images.
Starting published source count: 1,186 body descendants; published source count
after this pass: 1,176. This is a structural reduction, not a measured cold-visit
runtime count or a verified speed gain.

- The review summary reuses `tdb-quote-decoration-stars` with a native
  `tdb-summary-stars` combo: five .8rem stars in a 5rem row, the original .25rem
  trailing margin and #fbbc04 colour. Its existing accessible numeric rating and
  review trigger stay intact; the decorative owner is aria-hidden.
  Five explicit mask layers keep the original spacing; `space` repetition at
  this width would fit six stars and was rejected during the visual check.
- The existing `margin-bottom margin-small _5-barns` owner keeps its reveal hooks,
  3rem top padding and 100vh bottom spacing. Its `tdb-barn-row::before` decoration
  paints the original white barn SVG at 0%, 25%, 50%, 75% and 100%. Desktop, tablet,
  landscape and portrait sizes remain 4rem, 3rem, clamp(3rem,12vw,4rem) and 3rem;
  portrait retains .5 opacity on the decoration independently of the row reveal.
- The original SVG is supplied through `--tdb-barns-artwork` only after the shared
  consent/proximity loader permits it, using its existing 400px approach margin.
  Before that, the background is `none`; stars retain the existing transparent
  mask fallback. No new asset, loader, wrapper or inline head CSS is added.
- Native tree comparisons verify that only these two rows changed. All CMS
  bindings, native links, image crop/parallax and hold-audio 1.5.3 remain intact.
  The accepted page-wide ripple and 500ms release dissolve are not touched.

The eight lazy-artwork tests pass, including independent row proximity,
consent-before-release, no generated children, and preserved CMS platform artwork.
Published-source verification confirms 1,176 elements, 98 CMS items, 16 CMS lists
and 109 unchanged native links. HTML is 190,219 bytes, down 1,485 bytes. Inline
head CSS, CMS item content (allowing the existing random partner order) and audio
cards are unchanged. The barn row's desktop bounds
match the preceding release, and its five SVGs appear only after approaching the
section. Physical Android Chrome and iPhone Safari verification remains separate
from desktop browser inspection. Recheck the explicit five-star correction on
ordinary staging after deploying the follow-up runtime pin.

Baseline: staging HTML contains 1,407 body descendants. The pinned runtime is
`e56f6efb510da0ef966683c60db67fc8cc9f77f1`; the source pin is on
`pin/home-before-dom-cleanup-20261022`. The owner explicitly waived the native
Webflow backup step and approved cleanup. Publish staging only.

## First batch

- Remove repeated hidden treatment titles/descriptions. Keep the native CMS-bound
  URL, price and duration anchor in each image card, and read the visible stamp's
  title by matching URL. This preserves CMS editing without a separate price table.
- Keep treatment copy fade state on the existing image card; the visible details
  mirror that state. Keep the slider, image, blur, and text motion layers.
- Move treatment paragraph typography and fade onto its CMS paragraph. Remove its
  wrapper and redundant detail URL anchor.
- Give service paragraphs their existing copy layout/fade and service titles the
  former row ordering. Keep native source anchors and their URL bindings, with no
  source-only or title-row wrappers.
- Consolidate equal desktop/mobile service images into one bound responsive image,
  preserving the scale, transforms, XXL width and phone height.
- Move native text nodes directly into 18 static navigation, social and CTA links
  or toggles. No link destinations or text are recreated.

Verified first-batch reduction: 74 initial HTML elements, to 1,333. All 98 CMS
items and 16 lists remain. Service and treatment text geometry matches the desktop
baseline. Both carousels update their destinations, labels and treatment prices.
Fresh-visitor GTmetrix reports `qsVF02tI` (desktop) and `dnJxjNd7` (iPhone 15/16
simulation) record 1,333 and 1,335 elements respectively, with CLS 0. The page uses
runtime `356884561770f702adbf6cce4516494d70f311a4`. This is not completion of the
sub-1,000 target.

CMS-bound text wrappers are retained where the connector cannot transfer their
bindings. Do not substitute hardcoded labels or prices to chase the count.

## Second batch

Verified reduction: 107 additional initial HTML elements, to 1,226. GTmetrix
reports `b8fbScVX` (desktop) and `LzNxlyNa` (iPhone 15/16 simulation) record 1,226
and 1,228 elements, respectively, with CLS 0. These are not physical mobile tests.

- Nine loading graphics use the exact original two-arc artwork through native
  pseudo-elements (27 elements removed). The raised speaker variant retains its
  separate position. Runtime state styles support both compact and existing
  indicators, including the full-motion policy.
- Five USP arrows retain the original loading/rotation owner without an inner
  icon wrapper (5). Closed and open angles retain the original composition.
- Seven footer social icons use exact copies of their original vector artwork as
  native link decorations (21). Visible text and hrefs remain native.
- Twelve disclosure triggers retain their text directly and use native decorative
  chevrons (24). State follows aria-expanded and motion still starts after a user
  toggle. Five Five Senses outer wrappers are removed (5).
- Seven original award lists retain all list items and emphasis, become their own
  reveal/typography owner and lose the surrounding rich-text containers (7).
- Eighteen section padding wrappers move their spacing to existing section
  owners (18). Responsive breakpoints, treatment variant spacing and the form's
  additional 2.5rem padding remain explicit native styles.

The benefit artwork is component-property-bound, including nested property
forwarding. Keep it editable rather than replacing those bindings with static
CSS URLs. The original model needs reconciliation for that constraint.

## Validation

New regression checks cover URL-keyed stamp titles, direct CTA text, preserved
busy state and treatment fade state without duplicated copy. Existing treatment
ticker, details and presentation checks remain in place. Run the release build,
full verification and formatting gates before publishing. A timing-sensitive
feature-loading test failed once under concurrent CPU load, then passed in
isolation. Six pre-existing formatting discrepancies were normalized; those
format-only edits do not change their minified runtime outputs.

Second-batch release build and format gates pass. Full verification: 543 tests,
540 passed, 3 skipped, none failed. The UI preservation gate first rejected a
combined legacy selector; its original rule was kept intact alongside the new
compact rule, and the gate passed. No preservation assertion was removed.

Physical iPhone Safari/Chrome remains a separate visual check.

## Spacing regression correction and pending artwork completion

The owner's phone screenshots exposed gutters around the wellness video,
location photograph and crafting/wireframe background. Moving horizontal padding
from the removed wrappers onto these three outer sections also inset their
in-flow sticky backgrounds. The earlier desktop content-only comparison missed
this regression. Do not treat that comparison or CLS 0 as visual equivalence.

The correction restores the original unpadded section classes. Their existing
content containers retain the original maximum width and receive 94% width
(90% below 768px), with automatic horizontal margins. This preserves the original
3%/5% content inset while leaving sibling backgrounds full width, without adding
wrappers or changing parallax code. Check background bounds as well as content
bounds on future wrapper changes. No further reduction work proceeds until this
correction is checked.

The previously prepared icon changes are completed in the same staging release:
one shared SVG sheet replaces eight separate artwork requests, retaining the
original vector geometry. Three speaker SVG trees use the same sheet (9 elements
removed), with their original 1.75rem variant dimensions and loading visibility.
Native award-list items restore the original last-child bottom-margin rule.

The published source count is 1,217, with all 98 CMS items and 16 lists retained.
Desktop verification finds each affected background at x=0 with width=1363px
in a 1363px viewport. All three section heights match the prior build, and content
widths differ only by 0.03125px from percentage rounding. The award list matches
its original 156.5625px height, and all seven social links/text remain unchanged.
The responsive browser fixture was unavailable because the browser
blocks data URLs; do not claim a mobile browser or physical-device visual pass.

Release build, build consistency and formatting pass. The sequential full suite
records 539 passes, 3 skips and one failure in the existing timing-sensitive
feature-loading-policy case. Its complete nine-test file passes in isolation.
No JavaScript or assertion was changed for this CSS release.

Published verification also exposed Webflow's invalid `:after:where()` and
`:before:where()` output for newly added component-variant pseudo rules. Their
dimensions did not apply. Those overrides are removed. Native pseudo styles now
read inherited tokens, supplied for the existing dark-glass variant by the
critical control CSS. This narrow compatibility exception preserves its original
icon and raised spinner dimensions before first paint; defaults keep native
fallback values. No parallax or hold-audio JavaScript is changed.

## Artwork loading correction

The owner confirmed the corrected mobile spacing, then requested consistent icon
loading and no new inline head CSS. The combined footer/control sheet is removed
from active native styles. Footer decorations now reuse their individual original
SVG assets through the existing consent/proximity observer (400px). The speaker
uses a separate 264-byte SVG through the same observer. The spinner's separate
SVG is referenced only by the active loading state in external control CSS.
This prevents an early control from downloading all footer artwork.

The navigation and compact accordion chevrons use a native CSS polygon matching
the original 16x16 SVG's M3 6 L8 11 L13 6 path, 1.5 stroke, butt ends and miter
join. Their original box, colour/filter and rotation state remain. This eliminates
the chevron request while keeping navigation chevrons visible before runtime.
Drawer-specific artwork remains deferred with its existing drawer feature.

Compact-chevron state and speaker variant size rules move from the critical
inline source to external control effects. The critical block is restored exactly
to the pre-cleanup 305-byte contents (530 added bytes removed). The existing
622-byte base block is retained. No inline style block or head preload is added.

Validation: build consistency, targeted lazy artwork/UI/hold-audio tests and
format checks; verify published CSS and computed states after staging publication.
The initial source DOM is expected to remain 1,217; no elements were added.

## Transparent masks and navigation/footer wrapper batch

Published to the Webflow staging subdomain only on 22 October 2026. Runtime
remains pinned to ec95e57030e3b8436c6fef84d8d2dea1ea12e3fb; this batch changes
native Webflow markup and styles, with no JavaScript release or inline head edit.

Unloaded footer, speaker and spinner masks now use a transparent gradient instead
of `none`. Their reserved dimensions remain unchanged. The footer's common mask
properties live on `footer1_social-link::before`; each icon combination only
enables its pseudo-element. Consent/proximity release and active-loading spinner
artwork remain owned by the existing runtime and external control CSS.

Removed six navigation column/list wrappers and five footer tagline/menu
wrappers. CMS wrappers, lists, items, native links and bindings remain intact.
The retained CMS envelopes use one shared fit-content class. The Discover
content column owns its link grid; its existing heading-to-link spacing is
preserved. The footer's retained introductory text owns its original width,
bottom spacing, responsive ordering and reveal attributes.

The eleven proposed navigation image-wrapper removals are withheld. Inspection
confirmed they provide the 16:9 clipping window for an image scaled to 1.03,
including its hover transition to 1. Removing them would require replacement
clipping mechanics or change the visible crop/zoom. They are functional wrappers,
not an unconditional permanent saving.

Published source comparison against the preceding ec95 staging build:

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Body descendant elements | 1,217 | 1,206 | -11 |
| HTML bytes | 193,159 | 192,660 | -499 |
| Native page CSS bytes | 176,341 | 177,384 | +1,043 |
| Native page CSS, locally gzipped | 28,938 | 29,051 | +113 |
| CMS items / lists | 98 / 16 | 98 / 16 | unchanged |
| Native links | 109 | 109 | unchanged |

Webflow already grouped identical icon declarations in its compiled CSS, so
consolidating their authoring source does not yield the initially anticipated
large CSS saving. Net growth above includes the transparent fallbacks and the
layout rules needed by the retained elements. Redundant grid declarations were
removed before final publication. Both authored inline head CSS blocks are
byte-for-byte unchanged. No asset preload was added.

All native link destinations and body text match; all 98 image attribute sets
match as a multiset (the existing random-order partner CMS list republished in a
different order). Source count is 201 below the measured 1,407-element original
pin. Reaching fewer than 1,000 still requires 207 further removals.

Desktop verification at 1363x936: Services link, image and column geometry match
exactly; Discover link/card geometry matches within floating-point rounding;
footer CMS geometry and the following left-column content position match exactly.
The plain Discover/Blog headings now have content-sized boxes without a visible
text or position change. Pointer opening, menu switching and keyboard Escape/
Enter were exercised. Existing scroll-driven footer text reveals remain active.
At the top of the final page, all seven footer masks and all three speaker masks
compute to transparent gradients with no artwork URL; on approaching the footer,
the seven individual SVGs appear in the same 1.2rem boxes. Spinner fallback is
also transparent. Final native CSS fingerprint: b242264bf.

The owner subsequently reported that mobile seems okay and approved updating
this audit in GitHub. This records an owner-reported mobile visual check, not an
automated mobile measurement.

This is a source-count and desktop rendering verification in an accepted-consent
session, not a measured cold first visit without saved consent or proof of speed
gains. No paid test or production publish ran.

Next proposed batch: six trio caption/heading wrappers (H02), five duplicated
USP item containers (C07), six static position dividers (C05), and three inner
arrow wrappers (C04). These twenty candidates remain in the published source;
their projected count is 1,206 to 1,186, conditional on preserving layout,
reveal targets, trigger mapping, arrow animation and loading feedback. This
batch is not implemented by the documentation update. Preserve the current
asset-loading policy and add no inline head CSS. The separate hold-audio
flashing investigation remains paused until the DOM work is complete.

## Completed twenty-node caption, USP, divider and arrow batch

The owner approved this next batch, and all twenty candidates were implemented
and published to https://dentalbarns.webflow.io/ on 22 October 2026. This supersedes
the preceding pending-batch note. Production was not published.

- H02: removed the three trio alignment wrappers and three heading spacers.
  Existing captions own left alignment; existing headings own their responsive
  bottom spacing and the former inline line-box descent. Heading roles, text,
  description reveal attributes and hold-audio subtrees remain unchanged.
- C07: removed five outer USP item containers. The retained trigger zones reuse
  the native item class, responsive sizing and hover state. Their original
  content-sized desktop click areas, buttons and loading children are retained.
- C05: replaced six decorative divider spans with one shared native pseudo rule,
  enabled only on the migrated counters. Current/total ticker nodes, labels,
  live-region attributes and the treatment counter's positioning are retained.
- C04: removed three inner arrow spans. The existing owners reuse the shared
  arrow-artwork class and one reverse-direction combination. No copied mask
  declarations, new artwork URLs or runtime selectors were needed.

Published source comparison:

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Body descendant elements | 1,206 | 1,186 | -20 |
| HTML bytes | 192,660 | 191,704 | -956 |
| Native page CSS bytes | 177,384 | 177,409 | +25 |
| Native page CSS, locally gzipped | 29,051 | 29,053 | +2 |
| CMS items / lists | 98 / 16 | 98 / 16 | unchanged |
| Native links | 109 | 109 | unchanged |

Webflow's page CSS omits several selectors made unused by this batch, largely
offsetting the retained elements' layout rules. This is the measured net CSS
change, not a prediction. Local gzip sizes are a consistent comparison, not a
claim about actual CDN transfer encoding. Native CSS fingerprint: 8c66991e9.

Both authored head style blocks, script sources, preloads, native link targets,
body text, image attribute sets, USP launch attributes, trio description reveal
attributes and complete hold-audio subtrees match the preceding publication.
No new CSS asset URL appears. Runtime remains pinned to
ec95e57030e3b8436c6fef84d8d2dea1ea12e3fb; no JavaScript release was required.

Desktop verification at 1363x936 found identical caption outer boxes, heading
text positions, paragraph positions, all five USP trigger rectangles, all six
counter rectangles/current/total positions, and all three arrow rectangles.
The title box includes the transferred 0.78125px descent padding; the visible
text and following paragraph positions match. The pseudo dividers retain the
original 1px height and 1.8em width. Existing responsive USP rules are unchanged;
the trio heading spacing keeps the previous 1.5rem/1.25rem breakpoints.

Services next/previous navigation preserved the expected service link targets.
The review-summary trigger opened its drawer, and Escape restored trigger focus.
The first USP trigger zone opened Tranquil Location; keyboard Enter on the fifth
opened Personalised Care with the settled 05/05 counter. Close/Escape restored
focus to the corresponding launch button. The team-quote keyboard control
advanced its live label and settled ticker to 2 of 3 / 02. Idle spinner masks
remain transparent, with no residual busy/disabled state after opening.
Scroll reveals and the trio's visible layout were inspected on staging.

The source is now 221 elements below the measured 1,407-element original pin;
187 further removals are required to reach 999. This verification used the
existing accepted-consent desktop session. It does not establish a fresh mobile
visual pass, a measured cold first visit without saved consent, or speed gains.
The owner's earlier mobile feedback applies to the preceding batch. No paid
tests ran. The separate hold-audio flashing investigation remains paused.
