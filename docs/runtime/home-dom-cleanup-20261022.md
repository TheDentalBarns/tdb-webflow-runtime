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

Projected first-batch reduction: 74 initial HTML elements, to 1,333. Published
counts and browser interaction observations must be checked separately; runtime
mounts make the browser total different from the source HTML count. This is not
the completion of the sub-1,000 target.

CMS-bound text wrappers are retained where the connector cannot transfer their
bindings. Do not substitute hardcoded labels or prices to chase the count.

## Validation

New regression checks cover URL-keyed stamp titles, direct CTA text, preserved
busy state and treatment fade state without duplicated copy. Existing treatment
ticker, details and presentation checks remain in place. Run the release build,
full verification and formatting gates before publishing. A timing-sensitive
feature-loading test failed once under concurrent CPU load, then passed in
isolation. Six pre-existing formatting discrepancies were normalized; those
format-only edits do not change their minified runtime outputs.

Physical iPhone Safari/Chrome remains a separate visual check.
