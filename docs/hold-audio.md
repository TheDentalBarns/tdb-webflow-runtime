# Home first-visit speakers

Webflow's **Speaker — Hold to listen / Dark glass** component owns the real
button, inline speaker vector and appearance. It reuses `vimeo-player__btn`
and `vimeo-player__btn-play-svg`, scoped through a component variant. Home's
existing overlay supplies the position and bottom inset. No head CSS or
runtime stylesheet is required.

Each photo frame has `data-tdb-audio-card` and `data-tdb-audio-src`. Its native
button has `data-tdb-hold-audio`, `type="button"` and a descriptive accessible
label. All three currently reference the existing Five Senses calm MP3.

`src/loaders/hold-audio-loader.js` is assembled into the existing consent-released
runtime. Within 600px of the cards it loads the separate `tdb-hold-audio.js`
controller. Focus or a press can also load it. A cold press unlocks Web Audio
synchronously and is replayed only if still held when the controller arrives.
The controller fetches and decodes the sound only on the first deliberate press,
then shares that buffer across the cards. Pointer/keyboard release, touch
cancellation, lost capture, blur and page hiding stop playback. A pending
download never starts playback after the press has ended. Failed downloads
can be retried on the next hold.

The image uses an individual scale animation: a steady 6% increase over ten
seconds, then a fixed limit. Release returns it over 1.2 seconds. Existing
parallax retains ownership of translate/transform. Sound fades out with an
exponential 600ms tail, and the shared playhead includes that tail. A quick
re-press reverses the fade on the same source; later presses resume at the saved
position. No audio is fetched merely by approaching the cards.

The existing native word elements are restored. The nine-word sequence is
authored in `data-tdb-audio-word-sequence`: HOLD, BREATHE, RELAX, UNWIND,
PEACEFUL, CALM, STILL, REST, EASE. Three words fade in and out per ten-second hold; the next
hold continues across any card. Releasing early cancels the remaining cues.
Reception places the word at the top, lounge in the middle, chair near the bottom.

Designer owns `tdb-hold-image-clip`, `tdb-hold-blur-circle`, `tdb-hold-ripple-edge` and the two word
position classes. The Home variant allows frame overflow; its new inner image
clip preserves the original aspect ratio and crops zoom/parallax. The decorative
20px backdrop-blur circle lives in the native speaker overlay, sharing the
button's centre. Its soft radial mask leaves the centre and outside clear. The
ring starts just outside the speaker, expands beyond the card while dissolving,
and has a separate native 1px cream outline following the same fade. The edge
is a sibling so its outline remains outside the mask and the photo backdrop
is not blocked by an ancestor's opacity. The ripple reverses into the speaker
on release. Words and controls sit above it. The external
controller animates only scale/opacity with the Web Animations API, reverses from
the current appearance on early release/re-press, and cancels all effects/timers
on teardown. No CSS or markup is injected at runtime; no head blocks are added.

Validation: `node --test tests/hold-audio.test.cjs`. Staging browser checks cover
desktop and mobile native styling, actual Web Audio playback state, delayed
release, keyboard, touch cancellation, shared download and parallax separation.
