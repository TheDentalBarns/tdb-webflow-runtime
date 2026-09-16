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
