# Hero spinner: animate only while shown

The hero's native SVG `animateTransform` repeated indefinitely while its loading
wrapper was hidden. The 12 October trace attributed 296 small layouts to that
path after initialisation. This change removes that unnecessary idle work.

## Changes

- Keep the native Hero - Vimeo artwork and 100 × 100 view box.
- Add `data-vimeo-loading-shape=""` to its existing path.
- Add `begin="indefinite"` to its existing `animateTransform`; retain the original
  element and all other attributes for straightforward rollback.
- Vimeo state CSS now rotates the inner path around the same 50,50 centre, at
  one revolution per second, only in loading, awaiting-consent, or playing with
  buffering states. Its 120 ms delay matches the loading indicator's reveal.
- All other states have `animation: none`. The outer SVG remains available to
  the existing Home entrance fade. No new JavaScript, observers or requests.

The shared UI bundle before this change was byte-identical to the published
`edd01dfc7eb3c660ad262e0f642a2bed4bdb0ed1/dist/tdb-ui.css` captured in the trace.
Build only this bundle with `python tools/build-ui.py --global-only`.

## Native component references

Site: `677cf86cf9952f978d94d80c`. Home: `677cf86df9952f978d94d8a9`.
Component: `b1a810af-870e-98e2-c9cd-c1f7607452ce` (Hero - Vimeo).

- Path: `b1a810af-870e-98e2-c9cd-c1f7607452e3`
- Animation: `b1a810af-870e-98e2-c9cd-c1f7607452e4`

Original animation attributes:

```text
attributeName=transform
attributeType=XML
type=rotate
dur=1s
from=0 50 50
to=360 50 50
repeatCount=indefinite
```

## Rollback

Remove the two added native attributes (`data-vimeo-loading-shape` on the path,
`begin` on the animation), and restore both shared-UI CSS URLs in the site head
to commit `edd01dfc7eb3c660ad262e0f642a2bed4bdb0ed1` while preserving the existing
`?announcement-native=1` suffix. Publish only to the Webflow staging subdomain.

Hero photographs, poster loading/fades, play/pause controls, consent behaviour,
fonts and all other runtime pins are outside this change.
