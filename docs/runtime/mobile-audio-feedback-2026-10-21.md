# Home speaker feedback and mobile flashing investigation

## Release scope

David explicitly approved publishing the prepared source, generated bundles,
tests and notes to the existing public `TheDentalBarns/tdb-webflow-runtime`
repository and deploying to staging only on 21 October 2026.

The text alignment and dormant native spinner markup were published to staging
with `e256a697b1585259b662849bd9270b0d7f15c4fb`. This runtime and the three native
`visibility:hidden` declarations must be deployed together. Production domains
are excluded from this release.

## Investigation and prepared change

David reported severe flashing on the second photo, roughly half inside the
mobile viewport, after pressing and releasing the first speaker. Staging's
offscreen trial (`48d1503b900b44c4672919fbf3e599ff2e3bf282`) was rolled back to
`e256a697b1585259b662849bd9270b0d7f15c4fb`. This release builds on that pre-trial
commit: offscreen measurement skipping remains disabled.

The speaker remembers only the next word in its sequence and the audio playhead.
It does not use text scroll-position memory. Word changes are confined to the
pressed card; the page text observer ignores these text-node replacements.
The new regression checks also confirm that the neighbouring two cards remain
untouched by the first speaker's animation lifecycle.

The native blur circle is 240% of its overlay width, has a 32px backdrop filter
and can extend beyond its card. Previously its resting state was only zero
scale and opacity. The targeted mitigation parks inactive blur, outline and
words with native `visibility:hidden`, reveals them only while their effect is
running, then restores the hidden state on finish, cancellation and teardown.
Retained held endpoints still allow the same returning ripple. Stale animation
completion cannot hide a newer press. Timings, easing, zoom, ripple geometry,
word sequence and audio behaviour are preserved.

The cancellable-animation checks also exposed a rejected `finished` promise on
the old held zoom. Both held and returning zooms now consume cancellation; only
the current completed return releases its stored zoom state.

This is a plausible rendering-layer mitigation, not a confirmed physical-device
fix. The available desktop browser cannot reproduce the reported Android
flashing or prove its GPU cause. Recheck first-speaker press/release, then scroll
the second image halfway through the viewport in both directions on the phone.

## Designer changes

- Home trio component: `0a69bd83-503d-d529-c158-2aeb924dac15`.
- Home variant: `59399012-5ce8-ef3a-0d17-0752d014115e`.
- First word `f6f3e8f2-64c8-b43d-3e2a-623eda6d538d` and third word
  `33689d6d-92c4-8b0d-a321-d067e09d404b` now use `text-size-large`, matching
  the middle word's centred placement and responsive size. Their previous
  classes were `tdb-hold-word-top` and `tdb-hold-word-bottom` respectively.
- Add `visibility:hidden` to `tdb-hold-blur-circle`, `tdb-hold-ripple-edge` and
  the Home variant's `text-size-large` style. No other native properties change.
- Speaker component: `a813b302-d563-8d1f-3c2f-7354c438861a`. Existing icon
  `87a8d4fe-c82f-f17b-c86d-e9cdf3cd8ebe` gains `data-tdb-loading-content`.
- Loading wrapper `52bb1d13-9422-f989-cde5-687369029db7` reuses the existing
  `tdb-control-loading` class, SVG arc and shared CSS rotation. It is a child of
  speaker button `af67f689-367f-6b71-1601-afc9278cbdce`. No new CSS/keyframes.
- Loader/controller set `data-tdb-loading` from the first press through module,
  AudioContext resume and audio download/decode; all exits clear it.

## Checks and rollback

Source and generated-bundle checks cover visibility lifecycle, quick re-press,
completed long holds, cancellation, teardown and neighbouring-card isolation.
Existing audio tests cover lazy loading, early release, retry, shared playhead,
keyboard, pointer cancellation and hidden pages. Loading-state assertions cover
the cold module, pending sound, success, failure and cancellation paths.

Build and artifact checks pass. The full suite initially passed 493 checks,
skipped three optional external checks and exposed 18 hold-audio cancellation
failures. After fixing that lifecycle error, all 23 hold-audio checks pass,
including the source/bundle regression cases. The two changed runtime files add
349 raw bytes / 104 gzip bytes versus the pre-trial release. No new stylesheet,
keyframe, runtime dependency or scroll-frame work is added.

Runtime and native hidden states must be deployed together. To restore the
previous release, repin all first-party assets to `e256a697b1585259b662849bd9270b0d7f15c4fb`
and remove the three new native visibility declarations before publishing to
staging only. The centred text can remain independently. Remove the added
spinner wrapper and loading-content attribute only if reverting that UI too.

## Follow-up: scrolling during the return animation

David tested the published `407d046930ae1607e77cef01c8be90e4415c30a8`
release and reported that flashing remains when he releases a speaker and
scrolls before its animation finishes, then settles after completion. The
inactive-effect cleanup therefore does not resolve the reported overlap.

The return animates the masked 32px backdrop blur for 1.2 seconds. Live styles
showed no backdrop-root ancestor between that oversized circle and the document
root, so it could sample content from neighbouring cards. This is a plausible
cross-card rendering cause, not a physical-device reproduction or proven root
cause. The pressed image's concurrent scale also changes its measured parallax
crop; this is a separate remaining hypothesis, and no shared-motion changes
are included in this trial.

One native Home variant override is added to `aspect-ratio-portrait`:
`will-change:opacity`. The card's opacity stays at 1. This establishes a backdrop
root for its blur without clipping the outline's overflow. It confines the
blur input to the same card; the blur no longer samples neighbouring content
outside that card. Zoom, ripple geometry/timings, audio, words, loading feedback
and parallax code remain unchanged. No JavaScript bytes or scroll handlers are
added. Offscreen measurement skipping remains disabled.

The root behaviour is described in the CSS Filter Effects Level 2 editor's
draft, https://drafts.csswg.org/filter-effects-2/#BackdropRoot, and MDN's
backdrop-filter reference. Browser implementations and phone GPU behaviour
still require the user's repeat test. The hint can allocate a compositing
surface per card; no CPU/GPU or memory improvement is claimed.

This is a staging-only native-style trial; all first-party runtime pins remain
`407d046930ae1607e77cef01c8be90e4415c30a8`. Roll back this trial by removing
only `will-change` from the Home variant's `aspect-ratio-portrait` style and
republishing to the Webflow subdomain. Keep `overflow:visible`, the preceding
cleanup/loading fixes and centred word styles.

## Follow-up: the finger covers the loading feedback

David also reported that the centred spinner is hidden by the finger holding
the button. The speaker component's Dark glass variant
(`a5f48416-471f-de6e-d8ae-d0b5eaf4caa9`) now overrides only `tdb-control-loading`:
`top:calc(-100% - 0.75rem)`, `bottom:auto`, `height:100%`. The existing loading
circle is raised above the button. Its SVG, rotation, loading lifecycle and
other controls are unchanged. Remove those three variant properties to revert
only this positioning change. This native-style change also uses the unchanged
`407d046930ae1607e77cef01c8be90e4415c30a8` runtime on staging only.
