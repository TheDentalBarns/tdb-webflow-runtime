# Home initial DOM cleanup, 22 October 2026

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

The corrected source count is expected to be 1,217 and needs published-source
verification. The responsive browser fixture was unavailable because the browser
blocks data URLs; do not claim a mobile browser or physical-device visual pass.

Release build, build consistency and formatting pass. The sequential full suite
records 539 passes, 3 skips and one failure in the existing timing-sensitive
feature-loading-policy case. Its complete nine-test file passes in isolation.
No JavaScript or assertion was changed for this CSS release.
