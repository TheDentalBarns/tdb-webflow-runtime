# Slider first-view staging release — 13 September 2026

Slider version 0.4.3 accepts new presses and touch swipes immediately while a previous move is running. Both highlight and parallax use `preventInteractionOnTransition: false`; parallax additionally uses `loopPreventsSlide: false` so its looping arrow controls respond like its touch swipes. There is no queue, replay, transition lock, settling timer or custom navigation listener. The user rejected both the intermediate v0.4.1 queue and the v0.4.2 wait-at-rest handling; this release supersedes them.

Highlight sliders retain 400 ms slide transitions, one advance when first actually in view, then manual navigation with autoplay disabled. No caption fading or image parallax is added to highlight sliders. Parallax changes only the two interaction-lock options; its existing image motion, caption effects, entry behaviour and layout remain intact. Native testimonials and other runtime contracts are unchanged.

The critical head rule in `src/styles/tdb-smile-initial.css` hides only `[data-tdb-smile-slider="true"] .smile-card` before IX2 starts. This matches all 32 audited smile instances (729 detail containers in the retained route captures), which have no authored inline opacity. Normal CSS priority allows existing inline reveal opacity to win. Do not set height, display, visibility or `!important`: IX2 clears its inline height after opening. Titles, prices, images and overlay interactions retain their existing styling. Insert this rule inline in the global head; a deferred stylesheet would allow the first-paint flash.

The 59-route audit mapped 50 highlight instances across 38 routes (32 smile, 16 treatment, one technology, one local business); the shared selector also covers dynamically inserted matching instances.

## Immutable chain

- Slider: `ac915795748e427b59302f57a6dc79cb64c4c1d6`, `dist/tdb-sliders.js`
- Footer 1.4.5: `e705688f77382f7f1a561581873bcc3767cd2b43`, `dist/tdb-footer-runtime.min.js`
- Immediate 0.8.11-slider-responsive-staging: use this commit's immutable SHA and `dist/tdb-immediate-runtime-batch.min.js`.
- Swiper core and CSS pins are unchanged.

## Validation

Run `node tools/runtime-tests/slider-first-view.test.mjs` for 37 deterministic full-controller checks. The retained parallax implementation is compared with only the two intended interaction options changed. A separate integration check using actual Swiper 8.4.7 Navigation and touch event handlers confirmed that both types accept three next presses, a previous press and two new swipes before the current 400 ms motion finishes. No movement replays after input ends. The JSDOM fixture supplies computed translation components and explicit CSS transition-end events; physical-device feel is not simulated. The critical opacity rule was checked before scripts and with inline reveal overrides. The retained footer and immediate artifacts were reproduced byte-for-byte before changing pins, using Terser 5.44.0 and the retained build input order. Browser/staging acceptance is recorded separately after publishing.

## Publishing and rollback

The user confirmed a native Webflow backup and explicitly approved GitHub changes and Webflow-subdomain publishing. Publish staging only, with an empty custom-domain selection. Preserve existing saved head/footer content and other editors' changes.

For rollback of this follow-up alone, restore immediate pin `c4f74ba45003ce5dd8b57e6da855754dd4a46cc5` and its prior manifest comments. That restores the accepted first-view release (footer `f2f27ea1ba3782c4d6ad4def71b85794f97b1fe6`, slider `0df9b1a1dfbf96cd9346ef17996cd5797dc99986`). Remove only the new `data-tdb-smile-details-initial` head style if the text fix itself needs reverting.

To roll back the entire slider release, restore immediate pin `38c70b683e60ec924767901f5f904d07bb389947` and its prior manifest comments. That restores footer `b12d8a2d308cdccc55485e4f70b0abc9d7490c32` and slider `31386d986982aa60eb6c9199b6e6b4c03693897b`. Preserve unrelated accepted edits and republish staging only. Production publishing requires separate approval.
