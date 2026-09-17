# Five Senses — Surgery staging proof

Approved scope: a new, unlisted Webflow test page with an entry button, brief loading state and full-screen Surgery experience. Staging only. Reception and Lounge are intentionally outside this proof.

Webflow page: `6aaafc00c9c28643c83637b8`, `/five-senses-test`.

## Integration

The page owns only its native entry markup, scoped entry CSS, a noindex directive and one commit-pinned loader. Existing site head/footer code and runtime versions are preserved. The loader fetches the module and its CSS on entry; the module then fetches three WebP assets, followed by compressed audio. No core IX2, third-party animation package, new analytics or persistent browser storage is used.

The proof follows the current first-party `tdb-webflow-runtime` architecture and is based on the observed calculator staging commit `0eb5b0f9046449d5041b01af3285738b0daaf37e`, rather than the older default branch. It does not change the navbar, Gallery, consent or calculator lifecycle work.

Build: `node tools/five-senses/build.mjs`.

Lifecycle checks: `node tools/five-senses/check.mjs`.

## Registered scene and reveal

The supplied vertical photograph, `TheDentalBarns-076 (2).jpg`, is the visual reference. Following the approved review change, its 3:4 composition fills the viewport with a shared cover crop. Landscape framing favours the rear worktop. There is no outpainting, stretching, or camera movement between states. All authoring plates are 1086 × 1448. Two material plates and one transparent atlas replace a full image for every combination of senses.

The images are AI-assisted photographic prototype assets. Structural registration and object integration still require a professional retouching pass before a production launch. The generated blue chair deliberately has a conventional chair shape. This is an experiential comparison, not documentation of a real alternative surgery.

| Control | Owned state |
| --- | --- |
| Sight | Lighting, reflections and chair upholstery colour. ON gives the existing chair shape a warm pearlised mica treatment; OFF gives blue upholstery, brighter clinical light, narrow LED cores traced to the worktop/ledge with restrained bloom, textured floor reflections and a headrest glint derived from the existing upholstery highlights. All added window/leaf shadow effects have been removed for the cold-light review. |
| Sound | Uninitiated → calm TDB-inspired audio, then calm/clinical toggle; headphones appear with the calm state |
| Smell | Plant and faint botanical motes versus a very slight atmospheric veil |
| Touch | Chair shape and physical materials: premium chair, warm cabinetry and parquet versus a conventional chair, pale cabinetry, speckled lino and a yellow sharps bin. Upholstery colour belongs to Sight. |
| Taste | An Aesop-style mouthwash bottle on the rear worktop |

Revision 0.5 starts all five states OFF. Sound remains uninitiated and silent until a deliberate Sound gesture. Sight receives initial keyboard focus for this lighting review.

The renderer prepares the requested photograph once on a fixed 1086 × 1448 canvas and caches up to four complete scenes. Chair recolouring, clinical grading and static glare are baked during preparation, never during the reveal. A native CSS radial mask reveals the actual warm photograph from the Sight button over 1200ms. Turning Sight OFF places the cold photograph underneath and shrinks the outgoing warm photograph from the furthest viewport corner back into the button over 800ms. Both photographs use the same cover rectangle. The opaque mask edge travels past every corner, and completion explicitly leaves one unmasked scene.

Only the radius is updated by requestAnimationFrame during the 1.2-second ON / 0.8-second OFF reveal. No idle JavaScript rendering loop, repeated full-resolution filters, WebGL context, or live SVG blur is required. The latest review removes every custom window-frame and foliage shadow layer. Ordinary shadows already in the photograph remain. Cold LED glare and floor reflections are baked once. The front strip follows (382,231) → (1086,286), and the rear ledge follows (503,34) → (1086,54) in the registered 1086 × 1448 plate. The tap handle occludes the rear strip. Floor reflections retain the original lino grain and are masked behind the chair/armrest. A half-resolution headrest layer amplifies real photographic highlights, replacing the painted blue haze; its opacity variation is restrained. The existing global colour grade remains unchanged. No extra image download is needed. The cached warm/cold scenes are reused on repeated toggles.

Multiple rapid inputs preserve the active transition and coalesce into one latest pending state. Resize settles the active transition. Reduced motion uses a 180ms dissolve and disables motes/reflection animation. The pause control also stops the chair reflection.

## Asset provenance and size

`surgery-warm.webp` is a clean warm plate derived from the supplied photo, removing only the plant, headphones and counter bottle. `surgery-clinical.webp` was derived from that registered plate, changing material surfaces and chair while preserving the camera/framing; lighting remains neutral enough for independent Sight treatment. `surgery-objects.webp` is an AI-generated transparent atlas of the plant, headphones and bottle, positioned separately over either material plate. Original generation outputs remain available with the conversation.

Authoring directions were to keep the original portrait composition, avoid outpainting, use photographic materials, preserve fixed architecture, and make the conventional clinical state believable. The atlas is an actual transparent WebP, not a baked checkerboard.

The photographic WebP assets total approximately 383KB. They are hosted in TDB's Webflow asset folder `Five Senses — Surgery staging`, supplied through the page loader's asset manifest, and excluded from the public code repository. Two 48-second, 80kbps MP3 loops total approximately 962KB. Both tracks are deterministic original synthesized stand-ins created by `tools/five-senses/make-audio.py`: sparse piano-like notes and birds, and a restrained air/equipment/murmur soundscape. They are not recordings of The Dental Barns or licensed final music. Replace with approved audio masters before production. No artificial minimum delay is added to the loading circle.

## Lifecycle and accessibility

Native modal dialog supplies focus containment and background inertness. Close and Escape abort requests, stop/disconnect audio immediately, close the AudioContext, cancel pending transitions/animation, dispose of images and prepared canvases, restore owned scroll state and return focus to the opener. Lenis is stopped and restarted only when this module owns that stop. A new entry starts Sound uninitiated again. Hiding the document also stops audio and requires a new Sound gesture.

The first Sound activation resumes the AudioContext synchronously inside the gesture, then decodes the prefetched audio. It schedules clinical ambience → near silence → quiet birds/piano over the reveal. Generation checks prevent late decode completion after closing from starting audio. Sound OFF deliberately means the conventional soundscape, not mute. The accessible description states this.

Buttons support Tab, Enter/Space, and Left/Right/Home/End navigation. Each sense exposes `aria-pressed`; first Sound exposes its Begin label and loading status. State changes are announced. The five controls use space-between across the same desktop 3vw and mobile 5vw gutters, not a centered cluster.

Canvas preparation stays at the registered source resolution; cover positioning is CSS only. Four cached scenes bound working memory and are released when closed. Diagnostic data attributes expose version, scene build count/duration, reveal direction/phase/progress, visible sense state and audio lifecycle for review.

Review URLs `?preview=mobile` and `?preview=tablet` create actual 390px and 768px iframe viewports. These are explicit QA query modes, not controls in the visitor experience.

## Before expanding to three rooms

Approve object ownership and the degree of clinical contrast. Retouch clean plates and alpha edges against the full-resolution master; supply additional lower-resolution versions and AVIF where beneficial. Replace synthesized audio with approved recordings/music and a room-aware mix. Add Reception/Lounge through a shared experience state and lazy scene manifests after this Surgery interaction is accepted. Validate physical iOS/Android performance and audio unlock, final colour/alpha registration, and assistive technology behaviour before any production-domain release.

### Prototype 0.13.0 — props and Scent audio

The candle and clinical dispenser/sharps pair were generated in the registered warm room first, then extracted with alpha using built-in image generation. Prompt constraints: preserve camera, crop and all room geometry; infer the object tops and receding edges from the sink ellipse and worktop; add a small amber candle left of sink and modest clinical items right; match left-window light, contact shadows and background focus. Extraction preserves the object perspective; exports are fitted uniformly, without shear or rotation, to fixed countertop coordinates. Original Aesop and headphones remain unchanged.

Asset exports: `assets/five-senses/scent-candle-v3.webp` and `assets/five-senses/taste-clinical-v3.webp`, hosted in the Webflow asset library and mapped in the staging footer. Generated photographic files remain outside the public runtime repository.

Scent owns an independent, synthesized stereo air-rustle buffer. It uses filtered noise with slow gust envelopes and a blended loop boundary, prepared once after Start. It fades with Scent's reveal and continues with either Sound state. It has no extra download or idle JavaScript loop. Close and page hiding stop it with the rest of the audio. Reopening requires Start again.

Validation: original transition/late-decode checks plus independent Scent gain, fade targets, cleanup and buffer seam/amplitude checks; mobile staging visual and interaction review.

### Prototype 0.14.0 — countertop reflections

Moved the candle to the front-left countertop corner beside the basin (fixed image-space base 424,216). Added soft, fading alpha reflections beneath the candle, Aesop and clinical props, with a restrained amber candle glow. Reflections are derived from each prop and share its state layer; disconnected clinical silhouettes meet their own bases. A countertop mask excludes the basin and front fascia. These layers are prepared with cached scenes, adding no continuous drawing work or asset download.

Reduced Scent breeze gain from 0.30 to 0.12 (about 8 dB lower). Existing independence and cleanup checks pass with the revised target.

### Prototype 0.15.0 — upholstery edges and air details

Extended the Touch-ON/Sight-OFF upholstery contour along the backrest's lower lip and around the rear/right seat cushions. A local underside guard retains the metal support's colour. Chair texture, stitching and shaded volume remain derived from the photograph.

Smell ON now carries seven small five-petal blossoms and two leaf sprigs. Smell OFF retains its haze and adds 26 sparse, softly blurred round airborne specks. Both live inside each scene's photographic mask, pause with ambient motion, and show static restrained details for reduced motion. No additional image downloads or continuous JavaScript rendering.

### Prototype 0.16.0 — responsive toggles and continuous ambient motion

Flowers and sprigs are anchored in image coordinates around the plant and candle (21–40% across, 17–53% down), so they follow the same responsive crop and remain near their source.

The loader now prepares all four Sight/Touch surfaces and nine compact, transparent prop variants before revealing the experience, yielding between tasks and honouring Close. Sense taps only composite cached artwork into one opaque canvas. Four finished scenes remain cached; cold headrest motion uses a small cropped canvas instead of a full-frame transparent layer. All prepared resources are released on close. Image downloads, registration, reflections, sense ownership and reveal timings are unchanged.

Ambient CSS animations join one shared timeline when scenes enter the stage. Transition completion removes only the outgoing scene; it no longer detaches and reinserts the surviving one. This prevents flowers, spores, haze and the headrest glint from restarting or jumping when another sense changes. Pause holds that same timeline, including newly revealed scenes. Particle motion uses composited transforms and opacity; soft round specks use their existing gradient instead of per-particle blur filters.

Validation: expanded lifecycle checks exercise continuous phase, pause/resume during scene changes, both Sound rings and scene attachment continuity. A native-canvas comparison against the previous composition produced identical pixels in four representative warm/cold and premium/clinical combinations, including all props, shadows and countertop reflections. Reveal diagnostics also record frame counts, gaps over 50 ms and the largest gap without adding an idle rendering loop.

### Approved checkpoint — 0.16.0

David approved the botanical placement and smooth cached version on 17 September 2026. Preserve `checkpoint/five-senses-approved-v0.16.0` at commit `726591dc5caf534ce95126e4ce61fb82800e9716`. To restore it, pin the test page's existing loader URL to that commit; its Webflow photographic asset map remains unchanged. This is the reference for subsequent ripple work.

### Prototype 0.17.0 — independent organic ripples

Each sense now owns one spatial reveal. Tapping different controls starts overlapping ripples immediately. At their intersection, Sight and Touch independently determine lighting/upholstery and material geometry; Sound, Smell and Taste control their own props. Re-tapping the same sense reverses from its current radius without jumping or accumulating history. The previous serial pending-state queue is replaced with per-sense completion tracking, so an older completion cannot restore stale settings.

The ripple radius uses `1 - (1 - progress)^2.2`: a brisk opening followed by a gentle deceleration, with no elastic bounce. The approved 1200 ms ON and 800 ms OFF durations remain. Cream circle lines have a restrained inner shadow and fade near completion. Sound retains its leading second pulse.

A small WebGL compositor uses five textures (four approved photographic plates and a 1024px alpha atlas), one draw call per frame, a capped 1.6-megapixel drawing buffer and one shared RAF for up to five active reveals. No texture uploads, image filtering or full-scene construction occur on taps. Rendering stops when all waves settle. Ambient flowers, spores, haze and headrest motion remain in permanent CSS layers, preserving their phase. Graphics resources and audio are disposed on close.

If WebGL is unavailable or its context is lost, a fixed set of prepared CSS layers applies the same independent masks. The fallback uses isolated alpha blending for props and intersected masks; `?senses-renderer=css` selects it explicitly for review. Reduced motion uses short independent dissolves. Resize settles current targets, while closing cancels them.

Validation: deterministic checks cover three simultaneous reveals, independent completion, stale callbacks, repeated reversals, bounded wave counts, both Sound rings, reduced motion, one RAF, zero idle scheduling and audio cleanup. The actual OpenGL ES shader compiles and matches six approved photographic combinations within one 8-bit channel value. A separate full-frame test of overlapping Sight/Touch masks, including both feathered boundaries, matches the independently composed reference within 1.04 channel values. Engineering reference: [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).


Staging verification for 0.17.0: five concurrent desktop ripples and three concurrent mobile ripples were observed. All settled to the requested combined state; the scheduler returned to idle without building any additional photographs. Rapid double-taps retained only one wave for that sense. This cloud browser does not expose WebGL, so browser interaction checks exercised the CSS fallback; the GPU shader was validated separately in an actual OpenGL ES context. Physical-phone frame rates remain unmeasured.

### Prototype 0.17.1 — longer ripple shadows; silent Smell

Following the immediate review, extended the travelling circle's inner shadow from a 30px to a 90px falloff, retaining its restrained opacity and narrow cream line. The CSS fallback uses a matching broader inset shadow. Removed the Smell breeze source, generated buffer, gain and automation entirely. Smell now changes only its visual elements; Sound retains the calm birds/piano and conventional soundscapes. The Start gesture and all close/reopen audio safeguards remain. Updated the audio lifecycle check to verify exactly two Sound tracks and their gain targets.


### Prototype 0.18.0 — editorial copy and separated Sound pulses

Increased the Sound leading-pulse separation from 175ms to 300ms without changing the reveal duration or adding rendering work. Rewrote all ten Before/After descriptions using the supplied TDB details. Retained the page's existing Sweet Sans Pro x font, with a larger sense name, a restrained uppercase state label and readable 13px description. No new font requests. Smell remains silent.


### Prototype 0.18.1 — fuller explanations and hero shade

Expanded all ten captions to explain the contrast and TDB design decisions. Retained Sweet Sans and the readable 13px body. Removed text shadows, replacing them with a static left-weighted dark gradient fading across and down behind the UI. No animation, filter, extra font or JavaScript rendering work is added.


### Prototype 0.18.2 — caption fades

Descriptions fade out over 180ms before the latest requested description fades in over 380ms. First appearance fades in directly. Opacity-only Web Animations avoid frame-by-frame JavaScript; repeated taps cancel the previous animation at its current opacity and only the latest caption is applied. Closing or hiding the page cancels pending caption work. Reduced motion switches text immediately.


### Prototype 0.18.3 — wider Sound wave spacing

Doubled the Sound leading-wave gap from 300ms to 600ms. Each wave retains its existing duration and organic easing. Caption fades and audio playback timing remain unchanged.


### Prototype 0.18.4 — breathing space between captions

Added a 220ms blank interval after an existing caption fades out, before its replacement fades in. Initial caption appearance has no added delay. The animation holds zero opacity during the delay and remains cancellable on rapid taps or close. Includes the 600ms Sound wave gap from 0.18.3.


### Prototype 0.18.5 — consistent touch feedback

Disabled the browser tap-highlight colour for every experience button, including Start and utility controls. Existing focus-visible keyboard indicators remain. Includes the longer Sound gap and caption pause.


### Prototype 0.19.0 — blurred introduction

Opening UI and scene sit beneath a 20px backdrop blur, with the central Start button remaining sharp. The deliberate Start gesture unlocks music and opens one expanding clear aperture on the existing Sound reveal clock, with no echo or leading delay. Later Sound toggles keep their two waves 600ms apart. The blur layer is removed after entry, so it incurs no continuing filter cost. Reduced motion dissolves it; resize completion, page visibility reset and close follow the existing lifecycle.


### Prototype 0.20.0 — all-sense controls and clear opening title

Added All on / All off above the sense controls. A batch checks requested states and triggers only mismatches, 180ms apart, with each ripple originating at its own sense button. Repeated batch commands replace pending triggers; an individual toggle cancels remaining triggers, retaining already active independent reveals. Close and page visibility reset cancel the timer. Controls unlock only after Start. Reduced motion omits the stagger. Sound OFF retains its established conventional soundscape. The opening title now sits above the 20px blur alongside Start.


### Prototype 0.20.1 — slower all-sense sequence

Doubled batch trigger spacing from 180ms to 360ms. All on orders Sight, Smell, Touch, Taste, then Sound, skipping matching states. All off retains sense order at the slower spacing. Individual ripple durations are unchanged.


### Prototype 0.20.2 — Sound pause follows the two pulses

On a normal Sound ON toggle, road/clinical audio fades to zero in 150ms. Piano/birdsong remains silent until 600ms, matching the second pulse, then fades in over 600ms. The single-circle introductory Start retains its own early music onset. Audio scheduling remains on the audio clock and is cancelled by toggles/close. The 360ms batch spacing and Sound-last All on order remain.


### Prototype 0.21.0 — complete-experience batch captions

All-sense actions fade out the caption immediately and suppress individual descriptions during the sequence. A global Before/After caption fades in only once the batch timer and every active reveal have finished, including both Sound pulses. The After explains five senses working in harmony; Before describes the functional but clinical experience TDB wanted to move beyond. Individual actions cancel pending batch messaging. Includes second-pulse calm audio and slower Sound-last batches.


### Prototype 0.21.1 — calm batch pacing and state-aware actions

Batch controls fade in over 450ms after the opening reveal enables interaction. All on is disabled/subdued when all requested states are on; All off behaves symmetrically. During a batch its own target is disabled while the opposite remains available to reverse pending work. Trigger spacing is now 540ms, 50% longer than 360ms. Sound remains last for All on. Reduced motion omits fades and stagger.
