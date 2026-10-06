# Shared Vimeo lifecycle and USP cleanup — 6 October 2026

The USP ambient film already paused outside its 250px preparation area. A
deferred `player.ready()` could nevertheless finish after the visitor left and
start playback offscreen. This release closes that gap across the shared Vimeo
controller and keeps Designer responsible for the USP layout.

## Runtime changes

- Shared playback requests have a generation and current intent. Scrolling,
  manual pause, consent withdrawal and page suspension cancel pending requests.
  Eligibility is checked after SDK/player readiness and before/after playback.
- Hero, ambient and content videos share pause sequencing and page visibility
  handling. Pending pauses finish before a newer play request. Hidden documents
  and `pagehide` pause playback; return resumes only the previous intent, subject
  to current consent, viewport eligibility and manual pause decisions.
- Content videos remain manual and retain their sound configuration. Scrolling
  a content video offscreen does not introduce ambient autoplay/pause behaviour.
- Hero and ambient films share one cancellable poster reveal. The existing
  80ms timeupdate / 160ms playing delays, 450ms native fade and 520ms poster
  removal are retained. A cancelled animation frame cannot reveal a stale film.
- Responsive hero selection cancels an invisible candidate's pending playback;
  stale events cannot overwrite its visible replacement's controls.
- Consent remains required. SDK/iframe lazy loading, URLs, loops, muted
  backgrounds, content sizing, controls, buffering, pulses and full motion remain.

No new runtime dependency or USP-specific script. The loader and Vimeo/UI CSS
are unchanged. The shared controller is v1.2.0. It grows from 18,969 to 20,470
bytes (gzip 4,953 to 5,696) to include the lifecycle safeguards. The existing
loader remains 4,286 bytes; the normal global UI stylesheet supplies states.

## Designer changes

Site `677cf86cf9952f978d94d80c`, Home `677cf86df9952f978d94d8a9`.
USP root `70f2815a-6a14-fac4-1493-0f0aa6244c9f`, film `1047430580`.

- Four native `is-ambient` combos make the root, iframe wrapper, iframe and
  poster follow the existing fixed 100vw × 100vh parent. Base classes and
  other component instances are preserved.
- `min-width:178vh` and `min-height:58vw` remain on the iframe at every breakpoint.
  The parent still owns sticky positioning, viewport dimensions and clipping.
- Removed the USP's empty `vimeo-bg__before` spacer and six unused inherited
  attributes: activated, loaded, paused-by-user, playing, update-size and muted.
- Retained ambient-init, autoplay and video ID, poster asset, iframe title,
  lazy loading, empty authored src, overlay and native fade settings.

Full native before/after responses and exact mutation records are adjacent JSON
files. The removed spacer is recoverable from the before snapshot. The new
combos can be removed from these four elements to restore prior sizing.

## Verification before staging

13 deterministic jsdom/SDK contract tests pass against both source and dist:
consent gating; pending-ready exit/re-entry; late play; all-mode hidden-page
pause/resume; pending-ready suspension; pagehide/pageshow and return geometry;
poster timer/frame cancellation and timing; content pause during load, sound and
end/replay state; slow pause ordering; consent withdrawal while suspended;
responsive hero replacement; suspension before iframe setup; manual non-autoplay
hero resumption. These tests do not launch a browser or request third-party data.

Reproduction:

```sh
NODE_PATH=<modules-containing-jsdom> node --test tests/vimeo-shared-lifecycle.cjs
VIMEO_TEST_DIST=1 NODE_PATH=<modules-containing-jsdom> node --test tests/vimeo-shared-lifecycle.cjs
NODE_PATH=<modules-containing-terser-5.44.0> node tools/build-vimeo.cjs --check
```

The build command's outdated Terser comment is corrected to 5.44.0, matching the
existing loader artifact. All three Vimeo artifact checks pass; only the
controller artifact changes. No production/custom-domain publishing is allowed
for this review. Staging observations are recorded separately after publication.

Previous Vimeo loader pin for rollback:
`8fb72cf07dfa6cd48e14522d9ee6a7df78a69391/dist/tdb-vimeo-loader.js`.
Other agents' registry, styles and feature pins must be preserved on publication.
