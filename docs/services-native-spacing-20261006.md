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
not certified by these Chromium checks. The published release was verified as follows:

- Staging published at 2026-10-06 13:39:44 UTC using runtime commit
  `241c6478ed08edf1b54a99a31753849442eb732c`.
- Published homepage CSS `b81ee181b` contains the native changes. All 21
  cold/delayed cases passed again against the actual published HTML/CSS,
  with no synthetic CSS overrides.
- Live browser at 1363px loaded the new registry and parallax plugin. The
  rendered gap was 29.828px versus a 29.8398px native/inline margin; focused
  slide alignment differed by only 0.047px. Arrow navigation updated the
  Cosmetic Dentistry CTA, focused copy settled at opacity 1, adjacent blur
  remained 20px and both progress markers were present.
- All four custom production domains retained their 1 October publish date.
- Only the registry URL was changed in the freshly read shared head block;
  surrounding concurrent code and separate module pins were preserved.

## Follow-up: mobile gutter and Designer controls

The user reported a left strip in small-phone simulation. The shared
`.padding-global` changes from 3% to 5% padding at the small breakpoint, but
the shared parallax component kept `margin-left: -3vw` until tiny. At
667x375 this put the Services viewport at x=13.34375px and its right edge at
680.34375px. The first spacing checks had verified slide alignment relative
to the carousel viewport, and did not catch that viewport-to-page mismatch.

Native changes saved on 6 October 2026:

- `.parallax-swiper_component.tdb-service-parallax`: small
  `margin-left: -5vw`, inherited by tiny. Tablet and desktop remain unchanged.
- `.swiper_functions-btm.tdb-service-controls` and `.tdb-service-cta`:
  remove base `visibility: hidden`. Their existing native elements and
  responsive styles now render in Designer and before JavaScript.

The CTA and arrow buttons were already native Webflow elements. The runtime
adds `is-ready`, binds navigation, and updates the shared CTA from the active
slide's CMS link; it does not create these native controls. The existing
readiness hooks are retained, and this follow-up changes no runtime source,
loader, script pin, consent gate, motion or progress behaviour.

The native style properties were read back across all seven Webflow
breakpoints. The Designer snapshot endpoint returned an error, so the
follow-up visual/geometry checks use exported native CSS in Chromium.
Fifteen cold/delayed and initialized viewports passed:
320x700, 375x812, 478x850, 479x850, 568x320, 667x375, 767x430, 768x1024,
844x390, 991x1100, 992x900, 1280x900, 1440x900, 1920x1080 and 2560x1440.
Below 992px the Services viewport runs exactly from x=0 to the viewport width.
CTA and arrows are visible without readiness classes. Initializing Swiper
preserves the edges and native gap, with only the existing subpixel desktop
rounding. Six next and six previous actions at 320, 667 and 1440 cross both
loop seams and preserve CTA destinations. Seven breakpoint resizes retain the
active service and correct edge alignment.

Staging was published at 2026-10-06 13:55:48.845 UTC. Published homepage CSS
`30dde1c19` contains the fix, and the same checks passed using the actual
published HTML/CSS without overrides. The live page was reloaded and verified.
All four production domains retain their 1 October publish timestamps.
No shared head/footer block or other carousel style was edited.

## Follow-up: native progress bar in Designer

The progress track was still hidden by its base visibility until JavaScript
added `is-ready`. The Services track now has the existing `is-ready` combo
saved natively, so it is visible in Designer and before scripts run.
The shared base progress class is unchanged, preserving other carousels.

The two native Services markers now have dedicated starting styles:

- `.tdb-service-progress-fill.is-services-initial`: width 20%.
- `.tdb-service-progress-fill.is-services-wrap`: width 20% and
  `translateX(-500%)`, placing the second marker one full track to the left.

Twenty percent represents the current five CMS slides. The existing runtime
still measures the actual slide count and track width, writes pixel widths
and both marker positions, and handles dragging, resizing and wrap seams.
The first marker's initial combo is removed by the existing runtime class
reset; the wrapped marker's native values are overridden by the existing
inline geometry. These changes require no JavaScript, loader or script-pin edit.

The three native elements and style inheritance were read back from Designer.
Native, delayed-script and initialized geometry passed at 320, 375, 667
landscape, 767, 820, 992, 1280, 1440, 1920 and 2560 widths. The five-pixel
track stays immediately below the viewport, with one visible initial segment
and the second parked outside it; startup adds no full-width fill flash.
Six next and six previous moves cross both loop seams, and four breakpoint
resizes preserve marker sizing and position. The existing progress test also
passes reverse motion, idle movement, dynamic slide counts, DPR and visibility.

Published to staging only at 2026-10-06 14:13:05.171 UTC. Homepage CSS
`c1c680f0a` and native classes were verified, then all ten cases passed again
against the published HTML/CSS without overrides. Production publish dates
remain 1 October. Concurrent homepage edits were preserved.

## Follow-up: landscape first paint and iPad Mini order

The visible landscape controls initially used the normal small-breakpoint
2.5rem bottom inset. The later `is-phone-landscape` class switched both arrows
and CTA to 2rem. Wider landscape phones also needed their native landscape
position selected before the external presentation controller loaded.

`src/sliders/services-layout-boot.js` v1.0.0 is copied verbatim into a single
`data-tdb-services-layout-boot` script at the start of the homepage head.
It selects existing Designer classes while Services markup is parsed.
It contains no CSS values, animation, Swiper initialization or network request.
Its child-list observer ends at DOMContentLoaded; its temporary orientation
listeners hand over when the existing controller has prepared Services.
The physical-phone test matches the existing site classifier, including the
portrait-keyboard safeguard. It does not change the global classifier or
touch other components. Existing motion, lazy/consent gates and all script
pins are unchanged. Fresh head content was read immediately before writing
and read back verbatim, preserving concurrent page work.

The iPad Mini screenshot showed the tablet flex order was reversed.
Native `.showcase-content_btm.tdb-service-heading-row` now has `order: -1`
at medium and `order: 0` at small. This puts the title at the top and blurb
at the bottom on tablets while preserving the existing smaller-mobile order
and the more-specific phone-landscape variant. Desktop is unchanged.

Chromium first-frame and delayed-runtime checks passed for landscape phones
568x320, 667x375, 844x390 and 932x430; portrait 375x812; portrait physical phone
with an open-keyboard-sized 375x300 viewport; iPad Mini 768x1024; tablet
820x1180; 1024x768; and desktop 1440x900. CTA and both arrow bounds agree
before preparation, after preparation and after Swiper initialization.
Tablet headings precede the blurb before scripts and after initialization.
Six next/six previous moves cross both seams, and four orientation/keyboard
changes verify handover. Existing progress regression checks pass.

Published staging only at 2026-10-06T14:31:27.221Z.
Published CSS `299256ca3`, head-script placement and exact source match were
verified; all ten cases passed again against published HTML/CSS without
synthetic style overrides. All production domains retain their 1 October
publish dates. This remains Chromium emulation, not a physical Safari test.
