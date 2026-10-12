# Consent geometry and background coverage

Staging-only fix for the 26px mobile banner growth in the 12 October traces.
At 375px the Sweet Sans heading wraps to two lines, while its late-loading
fallback fits on one. Fixed pixel heights would be wrong at other widths,
zoom levels, and after text changes.

## Changes

- `src/consent/critical-fonts.html` defines a private `TDB Consent` family with
  the original Sweet Sans glyphs used by this banner. Both WOFF2 subsets total
  4,560 bytes; the one-time head fragment is 6,482 bytes. Their advances and
  line metrics match the source fonts. There are no additional font requests.
- The four native consent text classes use this family. The browser can lay
  out the correct responsive height before the panel appears, independently
  of the full site's external fonts. Startup waits for only these two embedded faces to decode before opening;
  it never waits for `document.fonts.ready` or the external site fonts. A
  failed decode falls back to the system font without trapping consent.
- Native `.tdb-consent-scroll` clips its content to the cream surface while
  opening/closing. The clip and surface use the same duration, easing, and
  frame. Desktop's 24px offscreen offset and mobile's flush bottom remain.
- Startup 4.0.5 toggles `is-consent-content-open` with the surface state.
  Text still starts after 70ms, fades over 350ms, and closes over 420ms.
  Consent dispatch/focus/scroll-lock cleanup still completes after 470ms.
- No fixed height, external-font wait, added DOM wrapper, height animation,
  layout measurement loop, or change to the video's consent gate.

## Native values

`tdb-consent-scroll`, `tdb-consent-title`, `tdb-consent-description`, and
`tdb-consent-button`: `font-family: TDB Consent, sans-serif`.

`tdb-consent-scroll` at main:

```
clip-path: inset(calc(100% + 24px) 0px 0px 0px)
transition-property: clip-path
transition-duration: var(--tdb-peek-duration,420ms)
transition-timing-function: var(--tdb-peek-ease,cubic-bezier(.4,0,.2,1))
```

At small: `clip-path: inset(100% 0px 0px 0px)`.
Combo `is-consent-content-open`: `clip-path: inset(0px 0px 0px 0px)`.

## Maintenance and rollback

Regenerate the critical font fragment after changing consent text:
`python tools/runtime-build/build-consent-fonts.py` (fonttools + Brotli).
Replace the existing `data-tdb-consent-fonts` head block; never append copies.
The source URLs and hashes are in `src/consent/critical-fonts.json`.

Rollback all three parts together: remove that head block, restore the four
native font-family values to `Sweet Sans Pro x, sans-serif`, and remove the
new clip/transition values at main/small. The unused open combo can remain.
Restore the startup pin to
`169c84dd2e92b0649bdf18eafbcfa07e85a7f31f` and publish staging.
Original native main values are in `consent-native-before-20261012.json`.
All unrelated runtime pins and the disabled viewport-memory block stay intact.

## Validation

- Native consent contract suite passes fresh/saved/legacy choices, category
  dispatch after the 470ms exit, double click, keyboard trap and focus return,
  independent scroll-lock owners, rapid reopen, and synchronized clip state.
- Font glyph advances and ascender/descender/line-gap values match both source
  weights exactly. The head defines each face once and contains no layout CSS.
- Live staging and throttled mobile checks are recorded after publishing.
