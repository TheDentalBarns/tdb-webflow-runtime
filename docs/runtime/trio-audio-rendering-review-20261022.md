# Trio audio and rendering review — 22 October 2026

Baseline: staging runtime `357911beb2f4ee4b29435fb02743c7da5f1099e7`,
controller 1.3.6. David reports early holds stuck loading and persistent phone
flashing after release followed by scrolling. This review does not treat prior
desktop checks or mocked frame tests as proof of a physical-phone fix.

The sections below preserve the sequence of findings. The latest diagnostic is
the retained image-return comparison recorded near the end. Earlier native
photo-boundary and typography changes remain; the boundary trial did not fix
the reported Android flashing.

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

David initially reports the iPhone Safari presentation is fine, but subsequently
clarifies that he has **not confirmed whether its audio starts**. Safari is
therefore not yet a matched playback control. On Android Chrome, the
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

## Adjacent-image clarification — 22 October 2026

The affected image is the **next, untouched card**: after holding reception and
releasing/scrolling, the waiting-room image flashes or jitters; reception itself
looks comparatively stable. Do not record the defect as limited to the pressed
photo's own return zoom, or treat Safari as passing until audible playback is
confirmed there. There is not yet an owner result for the combined no-blur,
no-zoom comparison.

Source review confirms that `press()` scopes image, word and ripple targets to
the pressed button's closest audio card. Shared parallax updates each photo
independently. However, the native Home portrait variant has `overflow:visible`;
both decorative ripple siblings are 240% wide, outside the inner photo clip,
and can paint over adjacent cards. This is a concrete cross-card rendering path,
not proof that it accounts for all residual jitter. The no-blur comparison still
retains the oversized outline.

Audio readiness also matters to this comparison: normal visuals wait for the
context's actual running state, successful decoding and `source.start()`.
Safari that never reaches that point would exercise neither the same playback
nor the full visual path. A running context/source-start call still does not
prove sound reached the phone's speaker. On touch devices a completed first tap
may be needed to unlock audio before a subsequent held press; release must
continue to cancel the abandoned hold.

Use the existing staging `?tdb-speaker-test=no-visuals` comparison next. It keeps
audio, loading, release and page parallax, and disables photo zoom, words, both
ripple decorations and trio button backdrop blur. First confirm piano/birdsong
is audible, then release and scroll to the untouched waiting-room photo. If the
fault persists, investigate audio/shared-scroll work before changing decorative
effects. If it disappears, focus on the rendering interaction and the oversized
ripple's boundary. No new containment, clipping, audio lifecycle or default
design change is made on the basis of this clarification.

## Native photo-boundary candidate — 22 October 2026

David's next response, **"This is all fine"**, follows the audio-only
`?tdb-speaker-test=no-visuals` comparison. We interpret this as the interaction,
release and scroll to the adjacent waiting-room photo being smooth in that
comparison. This narrows the investigation toward the visual path. It does not
identify one effect conclusively, provide a frame trace, or separately confirm
audible Safari playback. No owner result is yet recorded for no-blur,no-zoom.

One native Home variant property now changes:

- Style: `aspect-ratio-portrait`.
- Home variant: `59399012-5ce8-ef3a-0d17-0752d014115e`, main breakpoint.
- `overflow:visible` → `overflow:clip`; no responsive overrides were present.
- Both decorative ripple siblings are consequently clipped to their own photo.
  Their 240% geometry and keyframes remain; the visible ripple now ends at the
  photo boundary instead of painting into surrounding content or another card.

This is a focused staging candidate, not a confirmed Android compositor fix.
The ordinary URL retains the 32px ripple blur, 20px button glass, outline,
words, zoom, parallax and actual audio lifecycle. The caption is outside the
clipped frame. No extra wrapper, containment layer, will-change, head style,
preload, audio asset or JavaScript change is introduced. To reverse the native
trial, set this one Home variant property back to `visible` and publish staging.

Staging publication: `3088c501-a3e8-4dc2-83ee-d3618e7dfb86`, Webflow subdomain
only, with `customDomains:[]`. Runtime remains pinned to
`3854317cf1be78533511b131e033d6c9e613e21c` (controller 1.4.1); the repository
follow-up records documentation only and does not require a CDN repin.
Home CSS is now `dentalbarns.webflow.677cf86df9952f978d94d8a9.f2e2b0f53.opt.min.css`;
shared CSS remains `dentalbarns.webflow.shared.e75a367bf.min.css`.

Verification on the ordinary staging URL:

- Native readback and all three live computed styles show `overflow:clip`;
  the original inner image clip remains `hidden` and both blur values remain.
- Desktop held input advances the reception word to BREATHE and scales that
  photo while the other two remain at HOLD and 1.06. Release clears pressed
  and loading state. All three controls remain inside their photo frames.
- Screenshot captures the reception outline stopping at both photo edges;
  the neighbouring photos, buttons and captions remain in their normal layout.
- Published source still has **1,186 body descendant elements**, and the two
  existing inline head style blocks are byte-identical to the preceding release.
  This is a source count, not a measured cold live DOM or speed improvement.
- The first browser load missed the newly published Home stylesheet; one reload
  loaded it successfully. The final source request returns CSS HTTP 200 and the
  new variant rule. No missing-style screenshot is used as proof of the result.

Next owner check: on Android Chrome at the **ordinary staging URL**, hold
reception until sound starts, release, and scroll to the untouched waiting-room
image. Confirm audible playback separately on Safari before comparing the two.
No paid test or production publication was performed.

## Clipping result and smaller words — 22 October 2026

David reports **"still all flash on scroll"** with the clipped-photo candidate.
The boundary change did not resolve the physical-device defect. It must not be
reported as a verified fix. His follow-up asks for current JS/CSS links and
whether all three cards share preparation. Source inspection confirms that
controller and audio loading are shared; photographs and icon visibility still
prepare per element. The hold controller does not fetch words on scroll.
Parallax reads wrapper geometry and writes photo `translate`, while held/release
WAAPI changes that same photo's `scale`. Words are an absolute opacity overlay.
Image/font completion and layout changes can refresh geometry. These are
plausible overlapping paths, not a measured root cause or evidence that one
card starts the next card's hold animation.

Separately, David requests the mobile word styling at every breakpoint.
The native `text-size-large` Home variant's main `font-size` changes from
`2rem` to `1.125rem`, the existing mobile size. Readback preserves its other
properties and all seven breakpoint reads show no additional variant override.
Staging-only publish: `de888df4-aa3f-4c10-8e2a-8d0b79532021`.
Current Home stylesheet:
`dentalbarns.webflow.677cf86df9952f978d94d8a9.379ae5493.opt.min.css`.
Runtime pin remains `3854317cf1be78533511b131e033d6c9e613e21c`.
Live desktop computed sizes for all three word overlays are 16.7849px with a
14.9199px fluid root (1.125rem). Native source and desktop checks verify the
typography; this is not an Android flashing fix. No new head CSS or elements.

## Isolated completed-image return comparison — 22 October 2026

Following review of the proposed compositor brief, the owner approved trying
only retained image-zoom completion. Controller 1.4.2 adds the staging query
`?tdb-speaker-test=retain-zoom`. It skips cancellation/deletion of a completed
image return; resting scale remains 1.06 and all animation frames and timings
are unchanged. It makes no transform-property migration, containment change,
visibility-cleanup change, permanent will-change hint, or new CSS/DOM addition.

The retained record is bounded to one per used image. A new hold replaces it;
page hiding, page exit and teardown cancel it. It remains during scrolling so
the experiment does not merely move the suspected cleanup into the scroll.
Untouched cards receive no image animation. Words, both ripple layers and audio
still clean up normally; the ordinary URL and production ignore this behavior.

The brief's proposed carousel-observer loop does not describe this trio: these
cards are a grid outside the observed service/review tracks, and the progress
helper calls getAnimations() without the descendant option. Release already
batches its style reads. GPU demotion/re-rasterization remains an unmeasured
hypothesis, not an established root cause. The test preserves the existing
individual scale and native crop to avoid compounding scale with transform.

Owner comparison: at the retain-zoom URL on Android Chrome, hold reception
until sound starts, release, then scroll to waiting room, including after the
1.2-second return completes. Compare the same action with the ordinary URL.
Validation: 88 focused source/bundle audio and parallax checks pass, along with
generated-artifact consistency and formatting. Only the deferred controller
changes: 7,109 to 7,140 raw bytes (+31; local gzip estimate +12). The early
entry, other executable bundles and all CSS remain byte-identical.
Physical-device outcome is pending; desktop verification cannot resolve it.

## Primary-source references

- WebKit, activation-triggering events and sticky activation:
  https://webkit.org/blog/13862/the-user-activation-api/
- Chromium, autoplay and Web Audio resume:
  https://developer.chrome.com/blog/autoplay/
- Chromium AudioContext implementation (resume, interruption and source startup):
  https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/modules/webaudio/audio_context.cc

Browser policy references explain plausible blocked paths; they do not identify
which path occurred in David's particular phone session without its state trace.
