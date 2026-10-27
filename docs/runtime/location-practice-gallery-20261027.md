# Location Practice Gallery

Location replaces its five manually authored, paired-image slides and repeated First Visit buttons with a native Practice Gallery CMS list. Each record has a title (Name), Blurb, Main image and Alt text. David chose one photograph per slide across breakpoints; the unused optional mobile field was removed. The five captions are editorial drafts for refinement.

## Native ownership

Home Services and Location have source-specific assembly components, **Parallax — Services** and **Parallax — Practice Gallery**. They share **Parallax — Card**, **Parallax — Navigation** and **Parallax — Progress**, and all existing `tdb-service-*` layout classes. Component conversion replaces existing Home elements in place. No additional Home wrapper, embedded CSS or custom-code installation block is introduced.

Webflow collection properties support query settings, not a per-instance collection source. A native slot adds a wrapper. The source-specific assemblies preserve the existing Home tree while keeping card and control maintenance shared. This constraint was disclosed before implementation.

The card exposes Blurb, Title, Image, Image description and an optional service destination. Home retains its Services bindings and curated selection. Location binds the same card to Practice Gallery fields; Use service link is false, with native omission of hidden markup to be verified in the published HTML. Location uses a curated five-record selection in this order: Thoughtful comforts; A calmer kind of care; Room to unwind; A warm welcome; Look up and relax. Its photographs are unlinked.

The native actions retain their direct text plus existing arrow element: Discover service on Home and First Visit on Location. A label property on the mixed-content link would replace the arrow, while a separate text wrapper would add Home markup. The two native labels therefore share `tdb-service-discover` styling and the same external interaction lifecycle. The native First Visit URL is `/first-visit` and works without JavaScript. Do not replace it with a placeholder or per-image hidden link.

## Runtime ownership and gates

`src/sliders/parallax-controls.js` recognises `data-tdb-parallax-link-mode="fixed"` on the gallery assembly. It reads the existing native action as the destination for each slide, then uses the unchanged CTA lifecycle: first arrow replay, movement suppression, hover/touch state, history restoration, disposal and remounting. Restored slide index takes precedence when every slide shares one destination. No gallery-specific motion engine, stylesheet, network fetch or generated CTA is added.

The existing slider loader, consent/preparation gates, CSS-before-mount requirement, shared Swiper adapter, rendered progress, focus and scroll locking remain authoritative. TDBMotionProfile/TDBMotion still own timing, easing, pace and the existing 20px blur. The code change is in the existing deferred parallax bundle; initial startup/foundation and shared CSS are unchanged.

## Assessment and validation

This change follows the [canonical engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd) and the site's home-engineering-standard, shared-artwork-and-html-budget and full-motion-design-review rules.

- Startup/LCP: one image per card and removal of repeated native links reduce Location markup; no new early script or stylesheet is requested. Published combined sizes and Home element parity must be checked before certification. This is not a measured speed claim.
- Interaction: gallery navigation and its fixed native action use the existing shared lifecycle; tests cover destination stability, busy-click suppression, disposal/remount and precise browser-Back restoration.
- Visual/readiness: the same native geometry, copy presentation, arrows, progress and motion are reused. Native CMS content is visible before enhancement; desktop/mobile and initial fallback checks are release gates.
- Maintenance: edit photographs, titles, blurbs and descriptions in Practice Gallery; edit order in its curated list. Shared card/control changes apply to both assemblies. No live CMS data is copied into JavaScript.

Build parity passed. The full suite passed 783 tests with three existing skips and zero failures on the final run. An earlier run hit an unrelated marquee strict floating-point comparison (89.30406400000001 versus 89.304064); its focused rerun and the complete rerun passed without changing marquee code. Browser, native HTML and combined payload evidence will be appended after staging verification. Physical-device compositor checks and new performance benchmarks are not claimed.

## Release and rollback

Staging only. The previous runtime installation is `d1f962b2a3849ac7c073d9a4997df29d7806afee`; restore its four immutable install references and publish only the Webflow subdomain to roll back runtime behaviour. Native baseline trees, exact install code and source image references are saved outside this repository in `location-gallery-evidence`. The original Location gallery must be restored together with an old runtime if removing the fixed-action contract. Keep the Practice Gallery CMS content available during rollback. Do not delete unrelated components or CMS records.
