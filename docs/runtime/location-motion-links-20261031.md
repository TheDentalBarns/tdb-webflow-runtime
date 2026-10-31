# Location motion profile gaps — 31 October 2026

Location's content-video overlay and loading-exit transition retained fixed 300 ms and 450 ms durations. Several opacity fades used a fixed easing curve even when the shared character changed. The previous native timing inventory covered Home only, so it omitted the Location-specific video rules.

Refresh the existing timing-only projection from the shared, Home and Location native stylesheet exports. It now links the overlay duration, loading-exit duration and matching visibility delay, and iframe easing. The two page exports share identical navbar timings; their generated declarations preserve the existing cascade. Native layout, properties and states remain Designer-owned.

The Vimeo stylesheet explicitly links the overlay, poster and button opacity curves to the fade palette, retaining their linear defaults. Instagram's entry and card-opacity fades and the mobile navigation dropdown's opacity fade also use the existing fade token. These are component-owned bindings, not a new motion controller or a blanket replacement of linear curves. Spinner and discrete visibility curves remain linear.

`config/motion.json` remains at `pace: 1`, `character: "current"`. There are no JavaScript changes, added requests, animation loops or timing guards. The previous Instagram paint window, visible blur, reflections, looping, arrow input and Swiper behaviour are unchanged. Media playback and real-time input/network timers retain their own clocks.

## Validation

- Node 24 build and generated-output verification; full suite: 851 passed, 0 failed, 3 skipped.
- WebKit at the iPhone 16 Pro Max viewport: published baseline, local candidate with the current profile, and local candidate with a temporary `pace: 1.5` / `soft` profile, on both Home and Location. The temporary profile is not published.
- Default computed transition/animation durations, delays and curves match the published baseline for all inspected video, Instagram and navigation states, including loading entry and dropdown opening.
- At pace 1.5, Location's overlay is 450 ms; loading exit and visibility delay are 675 ms; iframe fade is 300 ms; loading entry and delay are 180 ms. Instagram entry and card opacity are 450 ms and Swiper speed is 600 ms. Newly linked opacity curves follow the selected palette; the lightbox spinner remains linear.
- Vimeo playback frames were isolated equally in the timing comparison because the provider's bot challenge interfered with automated WebKit. This checks the site's UI styles, not remote video playback.
- Separate WebKit touchscreen checks without playback isolation delivered 80 rapid next/previous pointerdown/click pairs per page. Both pages settled with visible cards, original 20 px blur, 14 enabled glass panels and no main-window JavaScript errors.

Physical iPhone Safari remains the acceptance test for the earlier webpage error. This release connects motion settings; it does not claim an additional Safari crash fix.

## Release

Base and rollback: `496645db7a195b7abab1e5525ef2d9c39fc16ffc`. Preserve exact head/footer backups outside git. Verify the immutable release assets, replace all four runtime references together, and publish only the Webflow staging subdomain. Production custom domains are excluded.
