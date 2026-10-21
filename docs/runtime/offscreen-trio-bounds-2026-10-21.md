# Offscreen trio and animated bounds — 21 October 2026

Baseline and rollback release: `e256a697b1585259b662849bd9270b0d7f15c4fb`.

## Scope and behaviour

Only the three Home audio-photo cards opt in to offscreen measurement skipping.
The carousels, sticky background crops, overflowing candle and legacy fade/memory
owners retain full measurement. No layout, artwork, animation timing, easing,
audio, consent, reduced-motion policy or carousel behaviour is changed.

A photo must already have reached its offscreen endpoint and cleared its
correction before any detailed image read can be skipped. A cheap, fresh wrapper
rectangle is still read each scroll frame. Measurement resumes within one viewport
above or below the visible area. Changes to wrapper position/height or viewport
dimensions, an entry or a jump to the opposite side also force full measurement.
Controllers and position state remain alive; the batch's last scroll position
continues to advance. This avoids the wrong-return-position behaviour produced by
the earlier visible-only and buffer-only prototypes.

The audio zoom marks its image with `data-tdb-bounds-changing` and emits the
bubbling `tdb:boundschange` event when it starts, finishes or is cancelled. A
marked image remains fully measured on every normal update, even while offscreen.
The completion event invalidates the next normal read, including when a whole
animation completed between scroll frames. It does not start an animation-frame
loop or perform a layout refresh. A cancelled predecessor cannot clear the marker
for a newer zoom. Initial setup also recognises a zoom started before motion loaded.

Resize notifications force measurement without changing the existing rebase
semantics. Explicit refresh, image/font load, visibility restoration and pageshow
keep their existing full passes. Shared ownership, clone refresh/detach and final
cleanup are retained. The existing style-write pass is unchanged.

`offscreen: true` is deliberately opt-in. Future owners must report independently
changing bounds with the same marker/event, or refresh after non-animated layout
changes. An unreported transform can bypass ResizeObserver; the earlier broader
prototype was not safe to apply to arbitrary images.

## Validation and limits

Source and built-bundle tests compare opted-in updates against full measurement
for gradual exit/reversal, fast jumps, zoom/release/re-press, cancellation,
completion between frames, initial active zoom, resize, font/image load,
page restoration, hidden tabs, clone replacement and reference-counted cleanup.
Release tests verify that zoom, word and ripple animation effects are cancelled
after their return completes. No idle frame is added by bounds notifications.

The serial full suite passes 527 tests, with three optional external fixtures
skipped (530 total). The deterministic build and custom Swiper checks pass.
Changed source and test files pass formatting. The repository-wide format check
still reports the same seven unchanged files as the baseline release.
The already-active audio bundle is now listed in the release asset inventory.

This first trial can avoid up to three detailed photo measurements per normal
scroll update while all three cards are settled beyond the buffer. The earlier
25-to-17 diagnostic covered a broader synthetic gate; it is not the saving claimed
for this narrower release. No device CPU, GPU, TBT or FPS improvement is claimed.

Combined minified size for motion, audio and runtime increases by 993 bytes;
the same local compression settings add 323 bytes gzip / 289 bytes Brotli. This
step reduces eligible scroll work rather than download size.

David reported flashing after using a speaker and scrolling away/back on his
device. The existing staging build's desktop inspection returned all three images
to their base scale and full opacity, with ripple opacity/scale back at zero; it
did not reproduce that device-specific flashing. Animated-bounds protection fixes
the demonstrated offscreen-cache regression, not a confirmed compositor defect.
Physical Android Chrome and iPhone Safari checks remain necessary.

## Staging and rollback

Publish only `dentalbarns.webflow.io`, with no custom domains selected. Keep all
four global runtime URL pins on one immutable commit, including the foundation
preload and noscript stylesheet. Home currently has no page-level freeform code.
Exact current code and publish status were saved privately before changing pins.
Restore all four pins to the baseline above for rollback.
