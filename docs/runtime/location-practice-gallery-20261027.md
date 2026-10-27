# Location Practice Gallery

Location replaces its five manually authored, paired-image slides and repeated First Visit buttons with a native Practice Gallery CMS list. Each record has a title (Name), Blurb, Main image and Alt text. David chose one photograph per slide across breakpoints; the unused optional mobile field was removed. The five captions are editorial drafts for refinement.

## Native ownership

Home Services and Location have source-specific assembly components, **Parallax — Services** and **Parallax — Practice Gallery**. They share **Parallax — Card**, **Parallax — Navigation** and **Parallax — Progress**, and all existing `tdb-service-*` layout classes. Component conversion replaces existing Home elements in place. No additional Home wrapper, embedded CSS or custom-code installation block is introduced.

Webflow collection properties support query settings, not a per-instance collection source. A native slot adds a wrapper. The source-specific assemblies preserve the existing Home tree while keeping card and control maintenance shared. This constraint was disclosed before implementation.

The card exposes Blurb, Title, Image, Image description and an optional service destination. Home retains its Services bindings and curated selection. Location binds the same card to Practice Gallery fields; Use service link is false. Published HTML confirms zero anchors inside Location slides, five image elements and one native First Visit action. Location uses a curated five-record selection in this order: Thoughtful comforts; A calmer kind of care; Room to unwind; A warm welcome; Look up and relax. Its photographs are unlinked.

The native actions retain their direct text plus existing arrow element: Discover service on Home and First Visit on Location. A label property on the mixed-content link would replace the arrow, while a separate text wrapper would add Home markup. The two native labels therefore share `tdb-service-discover` styling and the same external interaction lifecycle. The native First Visit URL is `/first-visit` and works without JavaScript. Do not replace it with a placeholder or per-image hidden link.

## Runtime ownership and gates

`src/sliders/parallax-controls.js` recognises `data-tdb-parallax-link-mode="fixed"` on the gallery assembly. It reads the existing native action as the destination for each slide, then uses the unchanged CTA lifecycle: first arrow replay, movement suppression, hover/touch state, history restoration, disposal and remounting. Restored slide index takes precedence when every slide shares one destination. No gallery-specific motion engine, stylesheet, network fetch or generated CTA is added.

The existing slider loader, consent/preparation gates, CSS-before-mount requirement, shared Swiper adapter, rendered progress, focus and scroll locking remain authoritative. TDBMotionProfile/TDBMotion still own timing, easing, pace and the existing 20px blur. Initial startup/foundation and shared CSS are unchanged.

Vertical page-scroll parallax also belongs to the shared gallery. `src/runtime/page-break-loader.js` discovers `.tdb-service-parallax .swiper` on every page, outside the Home-only photo opt-in. It passes the existing `.showcase_image` elements to `TDBMotion.pageBreaks`, retaining its proximity gate, bounded native crop, visible-frame preservation, scroll-driven movement and teardown. The same owner applies vertical CSS `translate` to originals and loop clones while Swiper retains horizontal `transform`. No separate Location scroll engine, timing constant or Designer attribute is needed. Other Home-only photo surfaces retain their opt-in; unrelated feeds remain excluded.

## Assessment and validation

This change follows the [canonical engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd) and the site's home-engineering-standard, shared-artwork-and-html-budget and full-motion-design-review rules.

- Startup/LCP: one image per card and removal of repeated native links reduce Location markup; startup/foundation and shared CSS are unchanged. Published combined sizes and Home element parity are recorded below. This is not a measured speed claim.
- Interaction: gallery navigation and its fixed native action use the existing shared lifecycle; tests cover destination stability, busy-click suppression, disposal/remount and precise browser-Back restoration.
- Visual/readiness: the same native geometry, copy presentation, arrows, progress and motion are reused. Initial HTML contains CMS content and the First Visit URL before enhancement. Browser checks cover desktop, 390px portrait and an 844×390 short viewport.
- Maintenance: edit photographs, titles, blurbs and descriptions in Practice Gallery; edit order in its curated list. Shared card/control changes apply to both assemblies. No live CMS data is copied into JavaScript.

Build parity passed. The final full suite passed 784 tests with three existing skips and zero failures (787 total). Coverage includes fixed-link restoration, shared gallery discovery outside Home, unique ownership across refresh and crop-safe image movement. The old Home-only discovery assertion was updated for the intended shared contract. An earlier run hit an unrelated marquee strict floating-point comparison (89.30406400000001 versus 89.304064); its focused rerun and the complete rerun passed without changing marquee code.

Published initial elements: Home remains 1,132, including 49 descendants inside the gallery. Location falls from 1,606 to 1,555; gallery descendants fall from 95 to 44. Home retains all five service images, links, titles and blurbs. Its normalized gallery differences are image attribute ordering and removal of a redundant static CTA aria-label; visible native text supplies the same accessible name before enhancement. No Home wrapper was added.

| Affected delivery versus review-counter release | Raw bytes | Controlled gzip bytes |
| --- | ---: | ---: |
| Home HTML | +2 | +4 |
| Location HTML | −15,092 | −965 |
| Home native CSS | 0 | 0 |
| Location native CSS | +1,105 | +121 |
| Existing deferred parallax JS | +149 | +65 |
| Existing deferred runtime JS | +24 | +2 |
| Startup, foundation and shared UI CSS | 0 | 0 |
| Combined affected Location delivery | **−13,814** | **−777** |

Native Location CSS growth is the compiler export of reused CTA/progress definitions and repeated declarations; no new style definition was authored. Home native CSS is byte-identical. HTML totals include publication-dependent bytes; compression is consistent local gzip, not observed network transfer. The five checked CDN assets match committed build bytes. The combined table excludes photographic transfer and unrelated resources.

At 1280×720, both galleries measure 1203.21×756px; at 390×844 both measure 390×886.20px. Location's title, copy, image, native action and arrows render correctly at portrait width; short viewport controls fit without horizontal page overflow. Next and Previous work. First Visit from Room to unwind opens `/first-visit`; browser Back restores slide 3/5. Home's Discover service continues to follow its active service. Vertical page-scroll checks show image translation changing from about −4.64px to +3.62px with horizontal transforms preserved. No TDB warnings/errors were captured in the checked Location tab. The standard Swiper loop still creates its normal runtime clones; five native image nodes does not imply five runtime nodes.

Native fallback was verified from published HTML, not a separate JavaScript-disabled browser run. The 844×390 check uses a desktop pointer and is not physical-phone landscape certification. Physical-device compositor checks, touch-fling acceptance and new performance benchmarks remain unverified. Desktop/mobile screenshots, raw HTML, CSS diffs, size calculations, CDN copies and browser scroll observations are saved in `location-gallery-evidence` outside the repository.

## Editorial maintenance

Edit **CMS → Practice Gallery**: Name supplies the slide title, Blurb supplies its short description, Main image supplies the single photograph at every breakpoint, and Alt text describes that photograph. Update the existing record to retain its curated placement. To add or reorder a photograph, edit the Practice Gallery assembly's curated Collection List selection. Keep Use service link false; change the assembly's First Visit destination property only if its common destination changes. The five supplied titles/blurbs are drafts for David to refine. Do not create separate hidden mobile images or per-slide First Visit links.

## Release and rollback

Staging only. Current runtime installation is `6623aa6f837afabee6a609dcbf0ba20c44f815c9`, following gallery component/fixed-action commit `2256a14ae686f936b66bafd109e374963acaf0bf`. The previous runtime installation is `d1f962b2a3849ac7c073d9a4997df29d7806afee`; restore its four immutable install references and publish only the Webflow subdomain to roll back runtime behaviour. Native baseline trees, exact install code and source image references are saved outside this repository in `location-gallery-evidence`. The original Location gallery must be restored together with an old runtime if removing the fixed-action contract. Keep the Practice Gallery CMS content available during rollback. Do not delete unrelated components or CMS records.

## Supporting CTA component follow-up

On 27 October David explicitly approved one additional Home wrapper to make the sentence and button below the slider a shared component. **Section — Supporting CTA** (`5dc739f7-c60e-66f2-5376-5df7b8995c10`) now has two instances. Its single unstyled root wraps the existing paragraph and button-group. The paragraph retains `text-size-small text-align-center tdb-flat-service-copy`; the group retains `button-group is-center tdb-flat-service-cta`. It nests the existing **Button - Secondary** component without modifying that global button definition. Location's former copy/button wrappers were replaced with this same structure.

Edit Supporting text on the section instance. Within Button - Secondary, edit Button label, Destination, Variant and Show button; select the applicable Right arrow, Down arrow or Up arrow. One unused inherited duplicate down-arrow property was kept private rather than exposed in the new component. Home uses its existing sentence, Explore treatments, `#All-treatments`, Base and Down arrow. Location uses Discover The Dental Barns in person., Join VIP, `#VIP`, White and Up arrow. Native copy, link and variant properties remain accurate in Designer and published HTML. Background and text colour inherit their existing page context.

This is a native composition change: no JavaScript, motion timing, stylesheet source, head installation, loading gate or request was added. Existing shared button and drawer/anchor handlers remain authoritative. The runtime pin remains `6623aa6f837afabee6a609dcbf0ba20c44f815c9`.

Published Home elements increase exactly one: 1,132 → 1,133. Location decreases four: 1,555 → 1,551. Home's native stylesheet URLs are unchanged. Location's native CSS is −28 raw/+1 controlled gzip bytes, comprising an unused max-width utility removal and compiler repetition of the existing text-align declaration. Whole HTML deltas are Home −46 raw/−37 gzip and Location −191 raw/+5 gzip, including publication-dependent IDs/attributes; these are not a speed claim. No new native style definition was authored.

At desktop width, both instances have approximately 103.83px from gallery bottom to paragraph and 22.25px between paragraph and button. Location fits at 390×844 without horizontal overflow. Home's action scrolls to `#All-treatments`; Location opens the existing VIP drawer, closes with Escape, returns focus to the prompt button and releases scrolling. No new automated test was added for this native-only change; published HTML and browser behaviour were checked directly. Prior full-suite results above apply to the unchanged runtime. Initial fallback was inspected in HTML, not a JavaScript-disabled browser run.

Rollback this follow-up natively: on Home, unlink the new section instance and move its existing paragraph/button-group back to the gallery parent before removing the one empty wrapper. On Location, restore the saved pre-change copy/button wrapper trees and instance values. Keep the shared button definition and gallery assemblies intact. Evidence and screenshots are in `supporting-cta-evidence` outside this repository; publication was to the Webflow subdomain only.
