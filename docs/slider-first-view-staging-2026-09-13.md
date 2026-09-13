# Slider first-view staging release — 13 September 2026

Highlight sliders now use version 0.4.2: 400 ms slide transitions, one advance when first actually in view, then manual navigation with autoplay disabled. Swiper's native `preventInteractionOnTransition` guard ignores extra commands while the current move runs. The next press works immediately at rest, with no stored commands, replay, extra settling timer or custom queue listeners. The user rejected the intermediate v0.4.1 queue, which is superseded by this release. No caption fading or image parallax is added. Existing parallax, native testimonials, layout and other runtime contracts remain unchanged.

The critical head rule in `src/styles/tdb-smile-initial.css` hides only `[data-tdb-smile-slider="true"] .smile-card` before IX2 starts. This matches all 32 audited smile instances (729 detail containers in the retained route captures), which have no authored inline opacity. Normal CSS priority allows existing inline reveal opacity to win. Do not set height, display, visibility or `!important`: IX2 clears its inline height after opening. Titles, prices, images and overlay interactions retain their existing styling. Insert this rule inline in the global head; a deferred stylesheet would allow the first-paint flash.

The 59-route audit mapped 50 highlight instances across 38 routes (32 smile, 16 treatment, one technology, one local business); the shared selector also covers dynamically inserted matching instances.

## Immutable chain

- Slider: `37d99ea79eca4481286aef7f82439f182bd57635`, `dist/tdb-sliders.js`
- Footer 1.4.4: `aad22e5f91b3fd650fe6063f0ca628459dcee275`, `dist/tdb-footer-runtime.min.js`
- Immediate 0.8.10-slider-rest-staging: use this commit's immutable SHA and `dist/tdb-immediate-runtime-batch.min.js`.
- Swiper core and CSS pins are unchanged.

## Validation

Run `node tools/runtime-tests/slider-first-view.test.mjs` for 37 deterministic full-controller checks. A separate local check using the retained real Swiper 8.4.7 core and Navigation module confirmed four immediate presses start only one full 400 ms move. The next press is accepted synchronously after transition end; ignored taps never replay, and previous rewind still works. CSS transition-end events were supplied explicitly in JSDOM; this is not a physical-device test. The critical rule was also checked before scripts and with inline reveal overrides. The retained footer and immediate artifacts were reproduced byte-for-byte before changing pins, using Terser 5.44.0 and the retained build input order. Browser/staging acceptance is recorded separately after publishing.

## Publishing and rollback

The user confirmed a native Webflow backup and explicitly approved GitHub changes and Webflow-subdomain publishing. Publish staging only, with an empty custom-domain selection. Preserve existing saved head/footer content and other editors' changes.

For rollback of this follow-up alone, restore immediate pin `c4f74ba45003ce5dd8b57e6da855754dd4a46cc5` and its prior manifest comments. That restores the accepted first-view release (footer `f2f27ea1ba3782c4d6ad4def71b85794f97b1fe6`, slider `0df9b1a1dfbf96cd9346ef17996cd5797dc99986`). Remove only the new `data-tdb-smile-details-initial` head style if the text fix itself needs reverting.

To roll back the entire slider release, restore immediate pin `38c70b683e60ec924767901f5f904d07bb389947` and its prior manifest comments. That restores footer `b12d8a2d308cdccc55485e4f70b0abc9d7490c32` and slider `31386d986982aa60eb6c9199b6e6b4c03693897b`. Preserve unrelated accepted edits and republish staging only. Production publishing requires separate approval.
