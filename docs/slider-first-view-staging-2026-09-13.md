# Slider first-view staging release — 13 September 2026

Highlight sliders now use version 0.4.0: 400 ms slide transitions, one advance when first actually in view, then manual navigation with autoplay disabled. No caption fading or image parallax is added. Existing parallax, native testimonials, layout and other runtime contracts remain unchanged.

The 59-route audit mapped 50 highlight instances across 38 routes (32 smile, 16 treatment, one technology, one local business); the shared selector also covers dynamically inserted matching instances.

## Immutable chain

- Slider: `0df9b1a1dfbf96cd9346ef17996cd5797dc99986`, `dist/tdb-sliders.js`
- Footer 1.4.2: `f2f27ea1ba3782c4d6ad4def71b85794f97b1fe6`, `dist/tdb-footer-runtime.min.js`
- Immediate 0.8.8-slider-first-view-staging: use this commit's immutable SHA and `dist/tdb-immediate-runtime-batch.min.js`.
- Swiper core and CSS pins are unchanged.

## Validation

Run `node tools/runtime-tests/slider-first-view.test.mjs` for 37 deterministic full-controller checks. The retained footer and immediate artifacts were reproduced byte-for-byte before changing pins, using Terser 5.44.0 and the retained build input order. Both candidate artifacts pass syntax checks. Browser/staging acceptance is performed after publishing and is recorded separately; this commit does not claim it has passed.

## Publishing and rollback

The user confirmed a native Webflow backup and explicitly approved GitHub changes and Webflow-subdomain publishing. Publish staging only, with an empty custom-domain selection. Preserve existing saved head/footer content and other editors' changes.

For rollback, restore immediate pin `38c70b683e60ec924767901f5f904d07bb389947` and its prior manifest comments in the current Webflow footer, then republish staging only. That restores footer `b12d8a2d308cdccc55485e4f70b0abc9d7490c32` and slider `31386d986982aa60eb6c9199b6e6b4c03693897b`. Preserve any unrelated accepted edits. Production publishing requires separate approval.
