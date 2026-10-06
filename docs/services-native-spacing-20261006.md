# Services slide spacing — 6 October 2026

Webflow now reserves the actual Services slide spacing before JavaScript.
The change is limited to the native Services classes and the Services branch
of the parallax plugin. The shared Swiper engine is unchanged.

## Native styles

- `.swiper-slide.is-showcase.tdb-service-slide`: main `margin-right: 2rem`;
  tablet (`medium`) `margin-right: 0px`, inherited by both mobile breakpoints.
  Larger desktop breakpoints inherit the main value.
- The same Services slide class: small `width: 100%`, matching the existing
  initialized slide width. This overrides the shared `is-showcase` 85vw rule
  before initialization without changing other carousels.
- `.parallax-swiper_component.tdb-service-parallax`: remove the redundant
  `column-gap` token. This block was not the flex track and did not reserve
  space between its slides.
- `.swiper-wrapper.is-3-grid.tdb-parallax-initial-pose`: include the 2rem
  spacing in the desktop saved-index transform; retain a zero-gap transform
  at medium and below. The first slide stays at its existing starting edge.

Outer padding, container maximum width, card height, typography, controls,
phone-landscape classes, blur and native copy transitions are unchanged.
The prior native properties are recorded in `services-spacing-before-20261006.json`.

## Runtime

`src/sliders/parallax-plugin.js` / `dist/tdb-parallax.js` v1.0.1 reads the
Services slide's authored right margin for `spaceBetween` at every breakpoint.
During a resize it temporarily removes the old inline margin, reads the native
computed margin, and restores the inline value in the same synchronous call.
Swiper then updates its existing geometry and writes the equivalent pixel margin.
There is no intermediate rendered frame and no added flex gap.

`spaceBetween`, its `beforeResize` / `breakpoint` updates, Swiper's inline
margins, fixed-width sizing, snapping and loop calculations are deliberately
retained. Deleting that geometry would make the native spacing invisible to
Swiper. Other parallax carousels retain their existing gap-reading path.

The shared registry points at the new immutable release so it resolves the
updated parallax plugin. All other registry-routed artifacts are byte-identical
to the previously deployed `336d76648a3395fad41dd5bec9749b3554f14c34` release.
The navbar, immediate runtime, motion engine, review loaders, consent gates and
proximity/intent loading are not edited or repinned by this change.

## Verification

The Designer API was read before edits and its saved properties were read back
across main, large, xl, xxl, medium, small and tiny. A Designer component snapshot
was also inspected.

Isolated Chromium tests use captured staging markup and styles, the matching
native property changes, and the actual deployed custom Swiper/motion plus
updated parallax plugin. No mocked slider or geometry is used.

- 21 cold/delayed initialization sizes: 992, 1024, 1279, 1280, 1439, 1440,
  1919, 1920, 2560; tablet 991, 820, 768; portrait 767, 479, 478, 375, 320;
  landscape 667x375, 844x390, 926x428 and 568x320.
- Native margins and Swiper `spaceBetween` agree throughout. Actual rendered
  gaps differ by at most 0.014px due to CSS subpixel rounding. No doubled gap.
- The two initially visible slide positions change by at most 0.49px on engine
  initialization (existing integer client-width rounding), with zero shift at
  1440/1920 and all tablet/mobile sizes. The former approximately 30px jump is gone.
- All five native saved-index poses align before initialization, tested on
  desktop, tablet, portrait and landscape.
- Seven next and seven previous navigations per test size cross both loop
  seams; rapid alternating navigation, dragging in both directions and keyboard
  navigation settle on the correct geometry at 1440, 820, 375 and 667 widths.
- Eleven consecutive resizes between desktop/tablet/portrait/landscape retain
  the active service and immediately update the native/Swiper spacing.
- Adjacent-card 20px blur, focused-card clear state, hidden neighbour copy,
  parallax transform, matching CMS CTA and both progress markers were checked.
  Existing progress tests also cover reverse/loop wrapping and idle movement.
- Existing progress, shared Swiper behaviour/plugin and full-motion-policy tests
  pass. Full motion remains enabled when the test device requests reduced motion.

Staging is the only publishing target. Physical device/Safari touch behaviour is
not certified by these Chromium checks. The live staging verification is recorded
after the immutable release and native CSS have been published together.
