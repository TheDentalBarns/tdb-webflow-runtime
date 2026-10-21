# Home speaker/parallax refinement for review

## Status and decision

David's latest physical-phone test rejected the nested-image-layer release
`cc1a123db61c256f955eb3394cbf284c6348f39e`: more flashing, not an improvement.
Do not describe that experiment as fixed or restore its wrappers.

The original three images were moved back into their original clips; the three
new empty wrappers were removed. Home `Image 2` scale returned to 1.06 and all
four global runtime pins returned to `8f2a1e48f1dfa6c8d8d6290cb151dc79513dc7ce`.
This rollback published to staging at **2026-10-21T22:06:21.868Z**. Live desktop
DOM confirmed zero experiment wrappers, all three direct image parents and
scale 1.06. All four production domains retained 2026-10-01T10:10:45.669Z.

The candidate below is prepared for review, not a proven physical-device fix.
Its tested source/bundles are commit `e56f6efb510da0ef966683c60db67fc8cc9f77f1`.
Check `mobile-speaker-progress.json` for the latest trial/restoration result.
The overnight follow-up should critically review this candidate and fill a
concrete remaining evidence gap, not add another speculative layer or repeat
completed tests. No physical Android/Safari browser is available here.

## Tested explanations

| Explanation | Evidence | Conclusion |
| --- | --- | --- |
| Text position memory corrupts the next card | Words have sequence memory only; lifecycle tests leave neighbouring cards untouched. | No supporting code evidence. |
| Animated image height is mistaken for a layout change | Real controller/discovery/motion code with interpolated zoom rectangles fails release-scroll and offscreen crop checks. Original single-photo fixture: 8 of 10 checks fail before the fix, across source and built code. | Proven geometry defect, not proof of the phone GPU symptom. |
| An extra moving parent solves the whole problem | Model passed, but David reports considerably worse flashing. | Rejected by the actual device. All three extra elements removed. |
| Release itself creates a brightness flash | Existing return keyframes raise opacity to at least 0.65, even from zero after a completed hold. Both new source/bundle assertions fail on that behaviour. A live 11-second hold also reveals the zero-opacity full-size ripple again immediately on release. | Proven intentional revival; remove it in the review refinement. |
| Page exit stops all animation work | Four regressions fail: pagehide/hidden after pointer release leave returning effects alive because there is no active session. | Proven cleanup defect; cancel all tails even without an active hold. |
| Large backdrop blur contributes to cross-card GPU flashing | The 240%-wide masked 32px backdrop circle can overlap the next photo; no-blur was better on the phone. Button backdrop blur is separate and remains 20px. | Plausible contributor; no device GPU trace proves the cause or a full fix. |

The existing staging `?tdb-speaker-test=no-blur` diagnostic suppresses the large
ripple blur, **not** the button blur. Its result must not be interpreted as a
test with every backdrop filter disabled.

## Prepared refinement

1. Keep one existing image per card. Designer's native numeric variable
   `tdb-photo-scale` is 1.06; Home `Image 2` uses `var(--tdb-photo-scale)`.
   Both CSS and parallax therefore use one resting scale. The geometry owner
   uses the current card rectangle and this native value instead of reading
   the animated image rectangle. It caches the scale only, not card position.
   Size/viewport changes and explicit refresh re-read it. Missing or invalid
   tokens fall back to the original image measurement. This contract is only
   enabled for the centred photos that fill these existing card clips.
2. Keep the outward ripple, real blur, outline and returning scale. Returning
   brightness now decreases from its current value to zero; it never rises.
   If the ripple has already vanished after a long hold, release leaves it
   parked. Completed invisible effects are cancelled and removed from the map.
   **This is a visible choreography refinement:** it removes the bright
   returning pulse; it does not preserve that unwanted pulse exactly.
3. Reuse one effect cleanup path. Page hiding/exit immediately clears all
   visual/audio tails, including ones that started before the current hold
   ended. It starts no new return animation while hidden. Re-entry still
   requires a deliberate hold; cached audio resumes from its saved position.
4. Avoid reading the button's rectangle during release: its size is needed
   only to seed the outward ring. No new observer, continuous loop, runtime
   stylesheet, photo asset, dependency or element is introduced.

Audio lazy fetching, shared decode, playhead including the normal 600ms fade,
quick re-press, original-gesture cold holds, consent, above-finger shared
spinner, keyboard, cancellation and word sequence remain. Zoom stays linear
for ten seconds and returns over 1.2 seconds with its original easing. Ripple
return duration/easing also remain 1.2 seconds. Offscreen measurement skipping
remains disabled. Refresh, orientation, restoration and BFCache keep their
existing owner; there is no cross-module animation-position memory.

## Verification and cost

`npm test`: **541 checks, 538 pass, zero failures, three optional skips**.
`npm run build:check` passes. The new checks include actual source/bundle owners
with 30fps/60fps zoom interpolation, safe offscreen completion without a final
frame, mid-hold mounting, fractional sizing, viewport/native-scale changes,
refresh, restoration, re-press, missing/invalid tokens and hidden-page tails.
The fade test verifies no brightness increase from five starting opacities.

In the geometry fixture, 100 ordinary scroll updates read **zero animated
photo rectangles and zero additional native-scale styles**, compared with 300
photo rectangle reads before. This is an operation count in a deterministic
model, not a measured browser frame-rate, CPU/GPU time or battery improvement.
Real crop positions are still measured on every scheduled scroll pass.

| Bundle | Baseline bytes | Candidate bytes | Raw delta | Gzip delta |
| --- | ---: | ---: | ---: | ---: |
| `tdb-start.min.js` | 7,706 | 7,708 | +2 | +3 |
| `tdb-runtime.js` | 67,535 | 67,580 | +45 | +30 |
| `tdb-motion.js` | 24,235 | 24,676 | +441 | +158 |
| `tdb-hold-audio.js` | 5,603 | 5,503 | -100 | -13 |
| Total change | | | **+388** | **+178** |

The speaker controller is smaller; the whole runtime is slightly larger.
Compared with the failed nested-layer experiment, the DOM is three elements
smaller. Compared with the restored baseline there are no additional elements.
The published Home CSS increased by **52 raw bytes**; shared CSS was identical.
Do not claim overall code savings.

## Completed desktop staging trial

The candidate published temporarily at **2026-10-21T22:24:50.325Z** after all
66 CDN assets matched their local SHA-256 hashes. Native scale resolved to 1.06
on all three original images with zero added wrappers. All three resting image
heights and card heights matched the baseline exactly.

Initial HTML remained **213,938 bytes / 1,443 elements**. The trio remained
**12,810 bytes / 79 elements including its section root**. Its entire HTML hash
and all image sources, responsive sources, alternative text and parents were
identical. The earlier 78-element count excluded the section root.

A warmed eleven-second hold retained photo scale 1.1236 at release, while the
completed ripple stayed **hidden, scale 0, opacity 0**. Baseline release had
revealed that ripple at scale 1 and opacity 0 before its forced brightening.
After release/scroll, every crop remained covered and all photos returned to
1.06. A mid-return DOM sample showed the first photo at 1.08724, with equivalent
translations to the neighbours and covered crops. Immediate keyboard-scroll
samples had not advanced position, so they do **not** prove simultaneous live
scroll progress. That overlap is validated by the deterministic model, not a
device trace. No application errors were observed; extension metadata errors
were excluded.

The first eleven-second click began while the controller was still loading,
so its actual visual hold was shorter; it is not used as a completed-hold test.
The warm repetition above is the valid comparison.

Baseline restoration published at **2026-10-21T22:29:18.780Z**. Both global
code blocks match the saved baseline byte for byte. The native scale is 1.06;
the trial-created variable was removed, and the original 45 native variables
match their pre-trial inventory exactly. Published CSS URLs, HTML byte/element
counts, trio hash, photo metadata and release URL all match the pre-trial
snapshot. Live desktop DOM confirms the old release, absent token and original
image parents. All four production timestamps remain unchanged.

See `mobile-speaker-evidence-2026-10-22.json` for the measurements, asset hashes,
test counts and explicit browser limitations. No experimental release remains
on staging at this checkpoint.

## Native trial and rollback

Site `677cf86cf9952f978d94d80c`, Home `677cf86df9952f978d94d8a9`.
Home component `0a69bd83-503d-d529-c158-2aeb924dac15`, variant
`59399012-5ce8-ef3a-0d17-0752d014115e`, style **Image 2**.

The supported Variables API creates Number variable `tdb-photo-scale` in
`collection-432e8337-c0cc-5509-bf0b-a4b20ddbe948`, value 1.06. Trial ID:
`variable-25d50a2f-82fc-4d79-4094-c441ddb863b7` (removed after the trial; discover
or create a fresh variable by name for any final deployment). A `property_value` of
`var(--tdb-photo-scale)` on the native scale property round-trips as that native
variable binding. Arbitrary custom style properties are rejected by Webflow;
do not inject a replacement stylesheet or retry the rejected property route.
The direct `variable_as_value` number/scale route also rejects this type; the
CSS variable expression is accepted and converted into a native binding.

Before any trial, re-read current native styles and global pins. Preserve newer
legitimate edits. Verify every CDN release asset hash before pinning a candidate.
Publish only `customDomains:[]`, `publishToWebflowSubdomain:true`.

After the desktop trial, restore `Image 2` scale **1.06**, restore the four
baseline pins and remove only the unused variable created for this trial if
supported. Never remove an existing user's variable. Publish staging and verify
live source/DOM and the four production timestamps. Preserve early-hold, spinner
and centred-text fixes. The removed nested wrappers stay removed.

The overnight follow-up may deploy the critically reviewed candidate once to
staging for David's morning phone review under his existing staging-publish
authorization. First re-read current pins, native values and any new feedback.
If a substantive issue remains, keep the restored baseline and explain it.
Passing desktop checks is sufficient to prepare a labelled staging candidate;
it is never evidence that the Android/Safari flashing is resolved.

## Device acceptance before declaring success

On Android Chrome and iPhone Safari: hold the first speaker for two seconds,
release and immediately scroll until the second photo is half visible; reverse
direction before the 1.2-second return ends. Repeat after five seconds, after
eleven seconds, and with a quick re-press. Scroll away and back. Check that crops
stay covered, no photo flashes, words stay centred, the spinner clears, and
audio fades/resumes. Also start a cold hold without releasing during loading,
then background/restore the browser during a release tail.

If the candidate still flashes with correct geometry and no brightness rebound,
the next isolated comparison is the existing no-large-blur mode versus normal,
then a separately prepared all-speaker-blur-disabled diagnostic. Do not silently
remove all blur or replace it with a gradient and call that zero visual loss.
Avoid canvas snapshots or duplicated blurred photos: they add alignment,
memory and asset work and do not reproduce dynamic neighbouring backdrops.

## Primary-source context

WebKit explains that backdrop effects read the content behind an element and
require additional rendering passes. That supports investigating the large
moving blur; it does not prove this particular phone defect:
https://webkit.org/blog/3632/introducing-backdrop-filters/.

The CSS working group's blur-quality discussion records continuing performance
tradeoffs and proposals, not a portable implemented quick fix to deploy here:
https://github.com/w3c/csswg-drafts/issues/13997.
