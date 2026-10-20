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

Each frame also contains a native `data-tdb-audio-words` text element, with
`aria-hidden="true"`. The existing `text-size-large` class is scoped to the
Home first-visit component variant: absolute inset zero, flex centred, white,
2rem uppercase, 0.12em tracking, opacity zero and pointer events none. Designer
owns its initial appearance; the controller only changes the text and animates
opacity with the Web Animations API.

The reception word is first in its frame and uses the native first-child state
to align at the top with a 3rem inset. The lounge word is between the image and
button overlay, retaining the centred base state. The chair word is last in its
frame and uses the native last-child state to align at the bottom with an 8rem
inset, above the speaker button. These states belong to the Home component
variant; no new classes, head rules or runtime positioning are required.

The component's `data-tdb-audio-word-sequence` attribute stores the editable
pipe-separated sequence:
`HOLD.|BREATHE.|RELAX.|UNWIND.|PEACEFUL.|CALM.|STILL.|REST.|EASE.`
One shared cursor advances when a word starts, across all three cards. Each
press shows at most three words over ten seconds, including each word's fade in
and out. A held button never restarts the sequence automatically. A new press
continues at the next word, wrapping after nine; early release fades the
current word over 400ms. Music continues independently until release, retaining
its existing playhead. Page reload starts the words at HOLD again.

Validation: `node --test tests/hold-audio.test.cjs`. Staging browser checks cover
desktop and mobile native styling, actual Web Audio playback state, delayed
release, keyboard, touch cancellation, shared download, parallax separation,
the nine-word sequence, its ten-second cap and early-release opacity fade.
