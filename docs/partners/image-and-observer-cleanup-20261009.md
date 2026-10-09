# Partner marquee 0.14.1 — image sizing and observer cleanup

## Scope

Follow-up to 0.14.0, preserving the motion engine, loop copies, first-activation image preparation, reserved panel dimensions, CTA/icon feedback, timings and consent/proximity gates.

The shared native tooltip image now has `data-tdb-partner-image-sizes="12.1rem"`, matching `.tooltip2_image-wrapper` in Designer. Webflow continues exporting `sizes="100vw"` for hidden CMS images and rejects direct authoring of the reserved sizes attribute through its element API. Direct image-width authoring was trialled and did not change that export; the original `width:100%` image layout was restored.

`primeTooltipImage` copies the authored hint to `sizes` before setting eager loading or calling decode. It does this only for responsive raster images with srcset. SVGs retain their existing loading behaviour. No new observer, script or stylesheet is added for image sizing. If the Designer image slot changes, update its size hint with it.

Resize monitoring now observes each original logo and its track, rather than also observing identical marquee clones. On the homepage this reduces marquee resize targets from 64 to 33 (31 original logos plus two tracks). The separate Brands tooltip observer remains; Awards no longer creates an empty card observer or installs card-only resize, visual-viewport, scroll or document keyboard listeners. Outside-click resume, keyboard logo selection and original-image load measurement remain intact. Clone-image load listeners are omitted.

## Verification

- Desktop (1440px) and mobile (390px) interaction regression with the minified runtime: rapid navigation, loop centring, previous/next, resizing, close/reopen interruption, Escape, single CTA destinations and destroy/remount. Alignment remained within 0.01px.
- Instrumented old/new runtime: same initial loop widths; resize targets 64 to 33; clone targets 31 to zero; empty card observers one to zero.
- Viewport resize and subsequent original-logo dimension change both trigger correct remeasurement. Offscreen suspension/resume and Awards selection/outside-click resume are retained.
- Responsive photo requests are checked before and after first activation at desktop DPR 1 and mobile DPR 3. The authored hint must be applied before any tooltip photo request; no 1080/1600/2000/2600px photo variants should be requested in these checks.

Staging only. The native image data attribute and 0.14.1 runtime ship together. The loader stays at 1.2.1; its immutable commit pin changes to pick up the sibling minified runtime.
