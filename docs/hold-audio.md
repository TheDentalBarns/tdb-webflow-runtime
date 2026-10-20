# Home first-visit speakers

Webflow's **Speaker — Hold to listen / Dark glass** component owns the real
button, inline speaker vector and appearance. It reuses `vimeo-player__btn`
and `vimeo-player__btn-play-svg`, scoped through a component variant. Home's
existing overlay supplies the position and bottom inset. No head CSS or
runtime stylesheet is required.

Each photo frame has `data-tdb-audio-card` and `data-tdb-audio-src`. Its native
button has `data-tdb-hold-audio`, `type="button"` and a descriptive accessible
label. All three currently reference the existing Five Senses calm MP3.

`src/components/hold-audio.js` is assembled into the existing consent-released
runtime. It fetches and decodes the sound only on the first deliberate press,
then shares that buffer across the cards. Pointer/keyboard release, touch
cancellation, lost capture, blur and page hiding stop playback. A pending
download never starts playback after the press has ended. Failed downloads
can be retried on the next hold.

The image uses an individual scale animation: 6% above its Designer scale over
2.2 seconds, returning over 0.9 seconds. Existing parallax retains ownership of
translate/transform. Sound fades in over 180ms and out over 160ms.

Validation: `node --test tests/hold-audio.test.cjs`. Staging browser checks cover
desktop and mobile native styling, actual Web Audio playback state, delayed
release, keyboard, touch cancellation, shared download and parallax separation.
