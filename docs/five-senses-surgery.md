# Five Senses — Surgery staging proof

Approved scope: a new, unlisted Webflow test page with an entry button, brief loading state and full-screen Surgery experience. Staging only. Reception and Lounge are intentionally outside this proof.

Webflow page: `6aaafc00c9c28643c83637b8`, `/five-senses-test`.

## Integration

The page owns only its native entry markup, scoped entry CSS, a noindex directive and one commit-pinned loader. Existing site head/footer code and runtime versions are preserved. The loader fetches the module and its CSS on entry; the module then fetches three WebP assets, followed by compressed audio. No core IX2, third-party animation package, new analytics or persistent browser storage is used.

The proof follows the current first-party `tdb-webflow-runtime` architecture and is based on the observed calculator staging commit `0eb5b0f9046449d5041b01af3285738b0daaf37e`, rather than the older default branch. It does not change the navbar, Gallery, consent or calculator lifecycle work.

Build: `node tools/five-senses/build.mjs`.

Lifecycle checks: `node tools/five-senses/check.mjs`.

## Registered scene and reveal

The supplied vertical photograph, `TheDentalBarns-076 (2).jpg`, is the visual reference. Its entire 3:4 composition is contained in the viewport with dark matte space where required; no outpainting or cropping is applied at runtime. All authoring plates are 1086 × 1448. Two material plates and one transparent atlas replace a full image for every combination of senses.

The images are AI-assisted photographic prototype assets. Structural registration and object integration still require a professional retouching pass before a production launch. The generated blue chair deliberately has a conventional chair shape. This is an experiential comparison, not documentation of a real alternative surgery.

| Control | Owned state |
| --- | --- |
| Sight | Warm neutral master versus restrained cool clinical grade; subtle moving leaf shadows only with Sight and plant on |
| Sound | Uninitiated → calm TDB-inspired audio, then calm/clinical toggle; headphones appear with the calm state |
| Smell | Plant and faint botanical motes versus a very slight atmospheric veil |
| Touch | Warm cabinetry, parquet and brown premium chair versus generic pale cabinetry, speckled lino, blue chair and a yellow sharps bin |
| Taste | An Aesop-style mouthwash bottle on the rear worktop |

The renderer composites only the old and next requested photographs. WebGL mixes those textures using a feathered circular distance mask originating at the actual selected button centre. The transition lasts 3200ms with smooth acceleration and settlement. It never swaps the entire image underneath an ornamental ring. Multiple rapid inputs preserve the current transition and coalesce into one latest pending state. Both textures use the identical photo rectangle.

WebGL is preferred for the soft edge and subtle lighting/atmosphere. If it is unavailable or its context is lost, Canvas 2D preserves the actual circular reveal with a hard edge and simplified lighting. Reduced motion uses a 180ms dissolve and disables ambient animation. Users can pause ambient motion independently.

## Asset provenance and size

`surgery-warm.webp` is a clean warm plate derived from the supplied photo, removing only the plant, headphones and counter bottle. `surgery-clinical.webp` was derived from that registered plate, changing material surfaces and chair while preserving the camera/framing; lighting remains neutral enough for independent Sight treatment. `surgery-objects.webp` is an AI-generated transparent atlas of the plant, headphones and bottle, positioned separately over either material plate. Original generation outputs remain available with the conversation.

Authoring directions were to keep the original portrait composition, avoid outpainting, use photographic materials, preserve fixed architecture, and make the conventional clinical state believable. The atlas is an actual transparent WebP, not a baked checkerboard.

The photographic WebP assets total approximately 383KB. They are hosted in TDB's Webflow asset folder `Five Senses — Surgery staging`, supplied through the page loader's asset manifest, and excluded from the public code repository. Two 48-second, 80kbps MP3 loops total approximately 962KB. Both tracks are deterministic original synthesized stand-ins created by `tools/five-senses/make-audio.py`: sparse piano-like notes and birds, and a restrained air/equipment/murmur soundscape. They are not recordings of The Dental Barns or licensed final music. Replace with approved audio masters before production. No artificial minimum delay is added to the loading circle.

## Lifecycle and accessibility

Native modal dialog supplies focus containment and background inertness. Close and Escape abort requests, stop/disconnect audio immediately, close the AudioContext, cancel pending transitions/animation, dispose of images and GPU objects, restore owned scroll state and return focus to the opener. Lenis is stopped and restarted only when this module owns that stop. A new entry starts Sound uninitiated again. Hiding the document also stops audio and requires a new Sound gesture.

The first Sound activation resumes the AudioContext synchronously inside the gesture, then decodes the prefetched audio. It schedules clinical ambience → near silence → quiet birds/piano over the reveal. Generation checks prevent late decode completion after closing from starting audio. Sound OFF deliberately means the conventional soundscape, not mute. The accessible description states this.

Buttons support Tab, Enter/Space, and Left/Right/Home/End navigation. Each sense exposes `aria-pressed`; first Sound exposes its Begin label and loading status. State changes are announced. The five controls use space-between across the same desktop 3vw and mobile 5vw gutters, not a centered cluster.

The render back buffer is capped at 2.2 million pixels and DPR 1.65. Only active reveals render continuously. Subtle ambient motion runs at a reduced cadence; pausing, reduced motion, document hiding and closing stop it. Diagnostic data attributes expose renderer, transition phase/progress, frame count and audio lifecycle for browser review.

Review URLs `?preview=mobile` and `?preview=tablet` create actual 390px and 768px iframe viewports. `?renderer=canvas` exercises the supported fallback. These are explicit QA query modes, not controls in the visitor experience.

## Before expanding to three rooms

Approve object ownership and the degree of clinical contrast. Retouch clean plates and alpha edges against the full-resolution master; supply additional lower-resolution versions and AVIF where beneficial. Replace synthesized audio with approved recordings/music and a room-aware mix. Add Reception/Lounge through a shared experience state and lazy scene manifests after this Surgery interaction is accepted. Validate physical iOS/Android performance and audio unlock, final colour/alpha registration, and assistive technology behaviour before any production-domain release.
