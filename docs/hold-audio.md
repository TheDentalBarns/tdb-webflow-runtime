# Home first-visit speakers

Webflow's **Speaker — Hold to listen / Dark glass** component owns the real
button, inline speaker vector and appearance. It reuses `vimeo-player__btn`
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
permission does not block visuals or audio downloading. Playback still respects
browser permission and never starts after release.
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
style. The Home variant allows frame overflow; its inner image
clip preserves the original aspect ratio and crops zoom/parallax. The decorative
32px backdrop-blur circle lives in the native speaker overlay, sharing the
button's centre. Its soft radial mask leaves the centre and outside clear. The
ring reaches 2.4 times the speaker diameter in 150ms, then expands more gently
beyond the card while dissolving. Its separate native 2px cream outline begins
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

Validation: `node --test tests/hold-audio.test.cjs tests/home-speaker-parallax.test.cjs`.
Combined motion checks model changing zoom rectangles at 30fps and 60fps,
offscreen completion, mid-hold mounting, orientation, refresh, pageshow and
cleanup. Existing speaker checks cover audio, keyboard, cancellation and shared
downloads. Available staging browser verification is desktop Chrome; physical
Android/Safari smoothness still requires a device check.
