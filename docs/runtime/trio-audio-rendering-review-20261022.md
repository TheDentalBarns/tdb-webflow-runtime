# Trio audio and rendering review — 22 October 2026

Baseline: staging runtime `357911beb2f4ee4b29435fb02743c7da5f1099e7`,
controller 1.3.6. David reports early holds stuck loading and persistent phone
flashing after release followed by scrolling. This review does not treat prior
desktop checks or mocked frame tests as proof of a physical-phone fix.

## Findings and actions

| Area | Evidence | Action / conclusion |
| --- | --- | --- |
| Gesture permission | The loader resumes only on pointerdown/keydown. A touch pointerdown is not an activation-triggering event; an unresolved resume can remain pending. | Retry within genuine activation events for the existing context. A completed first tap may still be required by the browser. Releasing never starts sound or visuals. |
| Indefinite waits | Consent/runtime waits and fetch/decode had no component deadline. A hung cached promise could be reused forever. | 30-second hold deadline; bounded download/decode flight, abort, eviction, safe retry. Successful long holds are not cut off. |
| Readiness drift | The old code used Promise.all(resume, decode). Permission could resolve before a slow download, then the device become suspended; there was no final state check. | Check actual running state again at playback, observe changes and cancel readiness listeners on release. |
| Interrupted playback | No audio-state listener stopped words/zoom when the device interrupted playback. | Clear active effects/audio when the running device stops. A new deliberate hold is required to resume. |
| Failed cleanup | A source is registered before start(); if start fails, stop() can also throw, skipping button cleanup. | Remove the voice once and tolerate stop failure so remaining cleanup completes. |
| Rendering reads | Start/release alternated computed-style reads with WAAPI writes for photo, circle and words. | Snapshot first, then perform writes. Tests enforce the order. |
| Cross-card blur | Native circle is 240% of card width, with a radial alpha mask and 32px backdrop blur. It deliberately overflows its card. Button has a separate 20px backdrop blur. Both can run over a translating/zooming photo. | Strong rendering suspect, not a proven GPU diagnosis. Keep normal appearance; add isolated staging comparisons before choosing a visual simplification. |
| Parallax / zoom | Separate translate and scale properties share one photo; resting crop token prevents animated-rectangle feedback. Existing interpolation tests cover release/scroll, viewport changes and remounts. | No new geometry defect established. Do not restore rejected nested image wrappers. |
| Text memory | One bounded nine-word index, two word timers per active hold. Neighbour cards untouched. | No evidence of text-memory corruption. Preserve sequence and cancellation. |
| Work when inactive | No component rAF loop or per-scroll handler. WAAPI effects are parked/cancelled at completion; return zoom is discarded. One cached sound shared by all three cards. | No unbounded card/effect growth found. Heavy active paint and audio decode are more credible costs than the module's size alone. |
| Preferences | Shared `TDBMotionPolicy` intentionally forces full motion for the owner's design review. Browser reduced-motion preferences are consequently not followed in this module. | Preserve the explicit site policy in this fix. If the policy changes later, word fades also need review; they currently retain their timing even when scale/ripple durations become zero. |

## Sound resource cost

The current CMS URL returns an MP3 of **3,171,100 bytes**, **132.101 seconds**,
**44.1 kHz stereo**, about **192 kbps** (HEAD headers plus local ffprobe).
Web Audio waits for the complete response and decode; this is not streaming.
It is shared by all three cards, not downloaded three times.

Uncompressed float PCM is approximately 46.6 MB at 44.1 kHz or 50.7 MB if
resampled to a 48 kHz AudioContext. These are calculations, not measured heap
or device memory. Decode can temporarily retain compressed and intermediate
buffers as well. This affects first-use delay and memory pressure; it does not
prove the reported compositor flashing.

The next resource reduction worth assessing is a shorter, carefully auditioned
seamless loop. A 30-second loop at the same format would be roughly one quarter
of the download/PCM size. This changes the audible loop and needs listening
review. Streaming HTML audio could avoid full-file decoding but is a different
playback design, with implications for seamless shared playhead and fades;
do not silently swap it in. No sound asset was replaced or preloaded here.

## Rendering comparisons

Use the same device, viewport and release-scroll action in each mode. These
are opt-in staging settings; the ordinary URL retains the existing effect.

| Query | Large blur | Button blur | Hold zoom | Ripple outline and words |
| --- | --- | --- | --- | --- |
| No query | On | On | On | On |
| `?tdb-speaker-test=no-blur` | Off | On | On | On |
| `?tdb-speaker-test=no-blur,no-zoom` | Off | On | Off | On |
| `?tdb-speaker-test=no-backdrop` | Off | Off | On | On |
| `?tdb-speaker-test=no-zoom` | On | On | Off | On |
| `?tdb-speaker-test=no-visuals` | Off | Off | Off | Off |

Parallax, real button, audio, loading feedback and release remain in every mode.
These modes do not remove other unrelated blurs elsewhere on the homepage.
If no-backdrop removes flashing, distinguish the button contribution from
no-blur before selecting a remedy. If no-zoom removes it, investigate combined
photo scale/translate composition. If no-visuals still flashes, the investigation
must broaden beyond the decorative hold effects. Do not call a visually calmer
desktop screenshot proof of the phone result.

The preferred next rendering change, **if the device comparison confirms
backdrop composition**, is to remove or contain the oversized live blur while
retaining the light outline, words and sound. That would be a visible refinement,
so it is not silently enabled in the ordinary page by this audit. Adding more
GPU layers, blanket will-change, or duplicating blurred photos would add memory
and does not address the evidence reliably.

## Verification and limits

Regression checks exercise source and built controller: stalled downloads,
fresh retries, late permission, state changes before and during playback,
failed source start, release during every wait, no late playback, shared
download/playhead, fades, neighbouring cards, geometry read/write order and
diagnostic isolation on staging versus production. The built early entry is
also tested for cold held-input capture, touch-release unlock and a bounded
pre-runtime wait. Normal timings and all original visual keyframes remain.

No native markup, CSS, extra preload or early audio download is introduced.
The additional JavaScript is correctness/recovery and opt-in diagnosis work;
the precise bundle byte deltas are recorded with release validation.
Available live browser verification is desktop Chrome. Physical Android/iPhone
GPU flashing and audible hardware latency remain unverified here. No paid
performance test or production publication is part of this change.

Release validation: generated-artifact consistency and formatting pass;
**573 checks: 570 passed, 0 failed, 3 skipped**. The early entry changes from
7,708 to 8,082 raw bytes (+374), 3,074 to 3,189 local gzip bytes (+115).
The deferred audio controller changes from 5,510 to 7,155 raw bytes (+1,645),
2,335 to 2,891 local gzip bytes (+556). These are local byte measurements,
not measured network transfer or speed improvements. Only these two executable
artifacts change; the stylesheet and other runtime bundles remain identical.

## Android follow-up — 22 October 2026, controller 1.4.1

David reports normal iPhone Safari playback is fine. On Android Chrome, the
no-backdrop comparison improves the flashing; the subsequent no-blur comparison
has **no flashing, but still jitters while scrolling after use**. These are
owner device observations, not traces captured in the desktop test environment.
Do not combine the remaining jitter and the earlier flashing into a single
proven root cause, or assume other heavy effects must have the same behaviour.

The remaining source-level distinction is the photo's **1,200ms return scale
animation overlapping scroll-driven translation on that same photo**. Other
features can be visually heavy without this exact interaction. Parallax uses
stable resting geometry, and its scroll tests pass; that does not measure
Android compositor timing or frame pacing. Completed effects are cancelled,
word timers cleared, and the controller adds no continuous frame loop.

The controller also never explicitly suspends its AudioContext after the final
600ms source fade. That is an idle-resource cleanup candidate, not evidence of
an expensive continuously running JavaScript loop or a confirmed cause of the
scroll symptom. Actual device cost has not been measured. Its global activation retry would
also need scoping if deliberate idle suspension were added, so ordinary touches
do not wake an idle context. Do not silently change this during a zoom test.

Controller 1.4.1 allows comma-separated staging diagnostic flags. The next
comparison is `?tdb-speaker-test=no-blur,no-zoom`: compared with the owner's
no-flashing `no-blur` result, **only held/releasing photo zoom is removed**.
Button glass, ripple outline, words, audio, the 600ms fade, parallax and loading
remain. Normal URL and production behaviour remain identical. No native CSS,
head CSS, markup, assets, loading policy or audio lifecycle changes are included.

Differential source/bundle tests compare complete start and release keyframes
with no-blur, assert that only image animations disappear, preserve the audio
fade and word progression, and confirm production ignores combined flags.
If Android jitter disappears, this isolates the zoom/scroll combination for a
targeted refinement. If it persists, use the existing no-visuals comparison and
device profiling to distinguish audio/input work from the remaining visuals.
This diagnostic release is not a claimed performance fix.

Validation: **78 focused audio/parallax checks passed**, generated-artifact
consistency and source formatting passed. Only the deferred audio executable
changes: 7,155 to 7,109 raw bytes; 2,891 to 2,889 local gzip bytes. This tiny
byte difference is not a measured speed improvement. The early entry, other
runtime bundles and stylesheets are byte-identical.

## Primary-source references

- WebKit, activation-triggering events and sticky activation:
  https://webkit.org/blog/13862/the-user-activation-api/
- Chromium, autoplay and Web Audio resume:
  https://developer.chrome.com/blog/autoplay/
- Chromium AudioContext implementation (resume, interruption and source startup):
  https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/modules/webaudio/audio_context.cc

Browser policy references explain plausible blocked paths; they do not identify
which path occurred in David's particular phone session without its state trace.
