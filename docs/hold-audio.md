# Home first-visit speakers

Webflow's **Speaker — Hold to listen / Dark glass** component owns the real
button, speaker artwork and appearance. It reuses `vimeo-player__btn`
and `vimeo-player__btn-play-svg`, scoped through a component variant. Home's
existing overlay supplies the position and bottom inset. No head CSS or
runtime stylesheet is required.

Each photo frame has `data-tdb-audio-card` and `data-tdb-audio-src`. Its native
button has `data-tdb-hold-audio`, `type="button"` and a descriptive accessible
label. All three currently reference the existing Five Senses calm MP3.

`src/loaders/hold-audio-loader.js` is assembled into the small early entry so
it can record a held press while foundation/runtime are still downloading.
The consent-released runtime activates its loading gate immediately, before
the idle feature queue. Until then it makes no controller/audio requests.
Within 600px of the cards it loads the separate `tdb-hold-audio.js` controller.
Focus or a press can also request it. A cold press requests Web Audio resume
synchronously and is replayed only if still held when the controller arrives.
The original resume promise is shared with the controller; a pending audio
permission does not block audio downloading. Zoom, ripple and the word sequence
start together only after the context resumes, the sound is decoded and playback
starts. While waiting, only the existing loading/pressed feedback is active.
Waiting consumes none of the ten-second visual sequence or its words. Releasing
before readiness clears loading without starting return animations or playing
later; playback still respects browser permission.
The controller fetches and decodes the sound only on the first deliberate press,
then shares that buffer across the cards. Pointer/keyboard release, touch
cancellation, lost capture, blur and page hiding stop playback. A pending
download never starts playback after the press has ended. Failed downloads
can be retried on the next hold.

The shared native loading circle replaces the speaker icon while the controller,
audio context or sound is pending. The loader sets `data-tdb-loading` immediately
on press; the controller clears it when playback starts. Every release, failure
and teardown clears it as well. Early release still prevents late playback.
The speaker's Dark glass variant positions the spinner above the button so a
holding finger does not cover it. Its 3rem square matches the existing review
control indicator; it uses the exact shared SVG arc and rotation. Other
controls retain their existing spinner position.

The image uses an individual scale animation: a steady 6% increase over ten
seconds, then a fixed limit. Release returns it over 1.2 seconds. Existing
Home parallax translates the same existing photo inside its original image clip.
The nested-layer experiment was rejected by the phone test and removed. In the
review candidate, the native numeric variable `--tdb-photo-scale` supplies the
Home `Image 2` scale of 1.06 and describes its centred, full-frame resting crop.
The motion owner combines this scale with the current card rectangle, avoiding
animated image measurements. It re-reads the native variable on geometry/viewport
changes and explicit refresh. Missing/invalid tokens use ordinary measurement.
The resting/full-held scale remains 1.06/1.1236, including mid-hold mounting.
Sound fades out with an
exponential 600ms tail, and the shared playhead includes that tail. A quick
re-press reverses the fade on the same source; later presses resume at the saved
position. No audio is fetched merely by approaching the cards.

The existing native word elements are restored. The nine-word sequence is
authored in `data-tdb-audio-word-sequence`: HOLD, BREATHE, RELAX, UNWIND,
PEACEFUL, CALM, STILL, REST, EASE. Three words fade in and out per ten-second hold; the next
hold continues across any card. Releasing early cancels the remaining cues.
All three use the middle card's native `text-size-large` Home variant, centred
over the image with its existing smaller mobile size.

Designer owns `tdb-hold-image-clip`, `tdb-hold-blur-circle`, `tdb-hold-ripple-edge` and the centred word
style. The 22 October staging boundary candidate changes only the Home
`aspect-ratio-portrait` variant from `overflow:visible` to `overflow:clip`.
This bounds both ripple siblings to their own photo. The inner image
clip still preserves the original aspect ratio and crops zoom/parallax. The decorative
32px backdrop-blur circle lives in the native speaker overlay, sharing the
button's centre. Its soft radial mask leaves the centre and outside clear. The
ring reaches 2.4 times the speaker diameter in 150ms, then expands more gently
while dissolving. Its animated geometry still grows beyond the card, but its
visible paint now stops at the photo edge. Its separate native 2px cream outline begins
at 50% opacity and follows the same fade to transparent. The edge
is a sibling so its outline remains outside the mask and the photo backdrop
is not blocked by an ancestor's opacity. The review candidate keeps the same
1.2-second returning scale/easing, but fades from the current brightness to zero
instead of brightening to at least 0.65 first. An already-faded ripple stays
hidden; completed effects are cancelled rather than retained for a revival.
This is an intentional visual refinement for review. Words and controls sit
above it. The external
controller animates only scale/opacity with the Web Animations API, reverses from
the current appearance on early release/re-press, and cancels all effects/timers
on teardown. Inactive words, blur and outline are natively `visibility:hidden`.
The controller makes only the current effect visible until it finishes or is
cancelled, then restores the hidden state. A cancelled predecessor cannot hide a
new animation. This parks the oversized backdrop-filter surface after use while
preserving the expanding and returning ripple. Page hiding/exit cancels all
remaining visual and audio tails, including tails from a released session; a
later deliberate hold still resumes the cached audio playhead. No CSS or markup
is injected at runtime; no head blocks are added.

The attempted `will-change:opacity` backdrop boundary did not resolve the
reported phone flashing and has been removed. The normal page keeps the full
effect. On the staging hostname only, `?tdb-speaker-test=no-blur` suppresses
only the blur animation to isolate it; outline, zoom, words and audio remain.
The query has no effect on production domains.

Controller 1.4.1 also accepts comma-separated staging comparisons:
`?tdb-speaker-test=no-blur,no-zoom` retains the button glass, outline, words,
audio and parallax, but removes the large blur and photo zoom. This changes
only zoom relative to `no-blur`, which David reports removes Android Chrome
flashing but leaves post-release scroll jitter. These query flags do not change
the ordinary URL's full effect; the later native boundary candidate applies to
every staging mode, including the ordinary URL.

David's subsequent "This is all fine" follows the `no-visuals` comparison and
is treated as a smooth audio-only interaction/release/adjacent-scroll result.
It is not a device trace or an explicit separate confirmation of Safari sound.
The native photo boundary is the next staging trial, retaining full blur,
outline, zoom, words and audio. Desktop verification confirms all three computed
overflows are `clip`, neighbouring words/zoom remain idle, and release clears
pressed/loading state. Physical Android smoothness remains to be checked.
Runtime stays pinned to `3854317cf1be78533511b131e033d6c9e613e21c`;
this native-only refinement adds no markup, head CSS, assets or runtime code.

Validation: `node --test tests/hold-audio.test.cjs tests/home-speaker-parallax.test.cjs`.
Combined motion checks model changing zoom rectangles at 30fps and 60fps,
offscreen completion, mid-hold mounting, orientation, refresh, pageshow and
cleanup. Existing speaker checks cover audio, keyboard, cancellation and shared
downloads. Available staging browser verification is desktop Chrome; physical
Android/Safari smoothness still requires a device check.

## Playback-ready visual start — 22 October 2026

David requested that the trio's animation and words begin only when its sound
is ready. Controller 1.3.6 moves zoom, ripple and word scheduling to the existing
successful playback handoff, after context resume and sound download/decode.
Pending or failed presses do not consume words; a pending release does not
create a return animation. Existing loading feedback, continuous held-input
handoff, audio caching/playhead, fade tail and visual durations are preserved.
This is a focused timing change; the separate mobile flashing investigation
remains paused. Native markup, styles, preloads and loading policy are unchanged.

The six new source/bundle readiness cases failed against 1.3.5 and pass against
1.3.6. They cover delayed download/decode, delayed permission, release before
readiness, the unconsumed word sequence and failure without visual playback.
The existing motion fixtures now explicitly make audio ready before exercising
the visual lifecycle. Combined speaker/parallax checks: 54 passes. Release build,
generated-artifact consistency, the sequential full suite and formatting pass.
Simulated readiness tests do not establish physical-device audio latency or a
fix for the separately reported phone flashing.

## Loading recovery and rendering review — 22 October 2026

David reported that an early hold still remained on the spinner and reopened
the mobile flashing investigation. Controller 1.4.0 and its entry loader now:

- Retry a suspended, already-created AudioContext on a native activation
  (`pointerup`, `touchend`, `mousedown`, or `keydown`). They never start an
  abandoned hold. A fresh touchscreen's first finger-down is not necessarily
  an activation; the platform may require completing a tap before holding.
- Require the actual `running` state, observe state changes, and recheck that
  state after a slow download. A resolved resume promise alone is insufficient.
- End a stalled hold after 30 seconds. Download/decode has its own bounded
  flight; an expired flight is evicted so a later press can retry. A timeout
  clears busy/pressed feedback and supplies a retry description. It is not
  permission to play on release. No automatic replay occurs after interruption.
- Stop active visual/audio effects if the audio device becomes interrupted or
  suspended. Cancellation removes readiness listeners. Failed source startup
  cannot throw out of cleanup and strand the loading indicator.
- Read the current zoom/ripple/word styles before beginning animation writes.
  This removes repeated read/write alternation during start and release while
  keeping the same scale, opacity, durations, outline, words and normal blur.

The controller's `press()` now returns its readiness/settlement promise. The
early loader keeps its deadline until that settles. Both artifacts must ship
from the same release, as enforced by the four shared Webflow release pins.

Staging-only diagnostics add `no-backdrop` (large ripple and button blur both
off), `no-zoom` (hold zoom off, parallax retained), and `no-visuals` (audio and
loading control retained; decorative hold effects and both backdrops off).
The existing `no-blur` disables only the large ripple blur. There are no extra
asset requests for these modes, and production hostnames ignore them. The
normal staging URL keeps all effects. Diagnostic inline button styles are
restored on teardown; no head CSS or native markup is changed.

See [the detailed review](runtime/trio-audio-rendering-review-20261022.md) for
resource measurements, evidence limits and the next rendering decision.
