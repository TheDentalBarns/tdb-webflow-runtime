# Native treatment startup — 8 October 2026

The current Designer component `Sldier - Treatments` already owns layout,
CMS markup, its visible CTA, controls and progress track. Initial investigation
used an older checkout; its legacy conversion was not the current native path.
This release hardens that existing migration rather than recreating it.

TDBParallax 1.2.1 / immediate bundle 0.11.3:

- Native Treatments and Services explicitly bypass the legacy banner converter.
- Native controls do not trigger the legacy document layout classes or move
  into another container.
- The existing CTA and its container are not cloned, re-appended or stripped
  of authored IDs. Missing native CTAs cannot invoke legacy generation.
- Native slide link sources are not removed by the legacy button cleanup.
- An unavailable native link disables the CTA without hiding its layout box.
- Native progress tracks and markers remain in their authored DOM order.
- CMS link updates and carousel motion, progress, entry and focus behavior
  remain shared. Swiper still controls track motion and carousel geometry;
  the treatment section height and control positions remain Designer-owned.

No Designer styles were changed. The current mobile treatment height is
`max(70svh, 35rem)` with `35rem` minimum, already present before runtime.
Legacy non-native banner behavior is retained for the other consumers.

Validation: Chromium fixture reconstructed from the current component tree
and current Designer styles, using staging's actual Swiper, motion and
parallax assets. Nine viewports: 320x568, 375x812, 390x844, 667x375,
767x393, 852x393, 820x1180, 1024x768 and 1440x900. Root, viewport, CTA,
arrows, progress and following content had no measurable box change
(tolerance 0.02px) through preparation, initialization and navigation.
Native preparation emitted no child-list mutations; the same CTA node and
ID survived and the CMS href followed the active slide. Missing-CTA fallback
did not generate a replacement. Source syntax and minified build passed.

This is an isolated component test, not a full live-page or physical Safari
reload trace; the user's reported small refresh shift is not independently
confirmed as resolved.

Only the immediate bundle pin changes, retaining its existing
`data-tdb-runtime-base`. Shared registry pins and all other site code remain
at their current releases. Publish to Webflow staging only.

Follow-up v1.2.2 / immediate v0.11.4: preserve the native CTA's visible label
and text node. Hidden CMS sources use `Discover Treatment`; the authored
visible control says `Discover treatment`. CMS still updates href/target/rel
and the treatment-specific accessibility label. The regression fixture now
uses this case mismatch and verifies that sentence case and text identity
survive preparation, engine initialization and slide navigation.
