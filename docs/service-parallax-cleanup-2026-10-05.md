# Service parallax ownership — 5 October 2026

This staging change consolidates the first homepage service parallax without
changing its current opening animation or phone-landscape behaviour.

## Ownership

| Owner | Responsibility |
| --- | --- |
| Webflow Designer | First service slider structure, responsive layout, typography, spacing, overlay/blur, controls, CTA, progress appearance and state classes |
| Services CMS | Service names, descriptions, images and destination links |
| Home native Collection List | Curated featured-service selection and order; no JavaScript reorder |
| `src/sliders/parallax.js` / `TDBParallax` v1.0.1 | Existing card conversion for other banner sliders, early controls, active CMS CTA, touch/hover/history state, native presentation classes and rendered progress geometry |
| `src/runtime/immediate-runtime-batch.js` v0.10.1 | Starts `TDBParallax.refresh()` before the existing deferred dependency loading |
| `src/sliders/sliders.js` v0.10.0 | Swiper configuration, opening sequence, copy choreography and shared slider focus |
| Existing custom Swiper and `TDBMotion` | Shared movement, interruption handling and duration policy; unchanged |

The parallax source is compiled into `tdb-immediate-runtime-batch.min.js`. It does
not add another network request. `tdb-home-service-progress.js` and its separate
page-footer load are removed. Presentation, controls and progress now have one
public `TDBParallax` API; the three former presentation/control globals are retired.
The existing slider discovery calls the same shared refresh path.

## Native content order

Home's Services Collection List is curated in this order:

1. Smile Design
2. Signature Assessment
3. Cosmetic Dentistry
4. Restorative Dentistry
5. Nervous Patient Care

The initial Discover service link remains Smile Design. The existing first-view
advance settles on Signature Assessment and updates the stationary CTA to match.
Back navigation retains the existing saved-slide behaviour.

The collection has reached Webflow's 60-custom-field limit, so no extra ordering
field was added. Edit this featured selection/order in the native Collection List
settings; edit all service content in CMS. The `Sorting` values used elsewhere
are untouched. `Is Featured on Homepage?` no longer selects membership for this
curated list. Location's different, static gallery is unaffected by removing the
old guarded service reorder script.

The service wrapper's inherited `aria-hidden="true"` is removed so the entire
service content is no longer hidden from assistive technology.

## Boundaries

The first service slider has no separate head styling override. Its native
classes remain from the preceding Designer migration. Other banner/treatment
sliders still use their existing custom CSS and card conversion; this change does
not claim they have been migrated into Designer. The site-wide phone orientation
detector, service landscape classes, layout and timing are unchanged. Other
unrelated inline footer features remain outside this cleanup.

## Build and staging

Run `node tools/runtime-build/build-service.cjs` with the pinned build dependencies.
It builds the immediate, slider and footer artifacts plus the unchanged banner CSS.
Webflow's immediate script uses an immutable commit pin; it resolves the footer
and slider runtime from that same release. Keep the unchanged shared engine,
motion and stylesheet pins intact.

Validation covers JavaScript syntax, reproducible build output, native CMS order,
initial and settled CTA state, arrow navigation, progress and treatment regression.
Phone-landscape behaviour is intentionally left for a later pass.

The preceding staging release is `03c81b0287e9b5a262b85396913466a21483cd50`.
A private restore snapshot preserves Webflow code, native structure, CMS items and
list settings from before this pass. To roll back, restore the previous immediate
pin, homepage progress tag, inline reorder and dynamic list settings from that
snapshot, then publish the Webflow subdomain only. No custom-domain publish or
merge to `main` is part of this release.

## Progress and filter-scroll refinement

The next pass caches logical slide indices/count until direct slide membership or
index changes, and measures progress-track width on layout/resize. Each visible
frame still samples every slide's rendered rectangle, including after idle frames;
a single scan finds the bracketing slides without allocating and sorting points.
The same modulo interpolation, two-marker loop seam and physical-pixel rounding
are retained. Offscreen and hidden-page suspension are unchanged. This applies to
the existing shared Home service and treatment progress path.

`node tests/parallax-progress.test.cjs` exercises the actual production progress
block with geometry fixtures. An additional comparison against the preceding
source matched 12,864 service/treatment positions across loops, reverse travel,
variable widths, pixel ratios and DOM order. Stable frames perform no index
attribute or track-width reads, while slide geometry continues to be sampled.

Designer now names the first carousel `Services` and stores the existing arrows'
button roles, keyboard tab stops and labels in native markup. The proposed change
from Block/div controls to literal button elements remains deferred: Webflow
rejects that tag in place, and automatic approval review rejected the replacement
step over a temporary duplicate-control risk. The original two arrows and SVGs
remain, with the existing shared interaction and animation handling.

The Review Drawer definition also gains one native `tdb-review-filter_body`
wrapper (element `799e55da-a7d6-10f1-2ab7-07858579e6fd`) around its status and filter
groups. Header and actions remain siblings inside the same animated filter panel.
The outer `tdb-review-filter_scroll.is-drawer` frame uses hidden vertical overflow
and flex-shrink 1. The body uses overflow auto, min-height 0, flex-grow 1 and
inherited flex-shrink, so only its content scrolls/bounces in portrait and desktop.
Native header/footer padding, safe-area allowance and slide-up animation remain.

The existing phone-landscape detector still toggles `is-phone-landscape`. Its new
three-class frame combo restores outer overflow auto and sets flex-shrink 0. The
body inherits 0 and expands to its content height; the entire panel then scrolls
in the existing landscape flow, including its header and footer. No new review
JavaScript, stylesheet request, injected CSS, custom touch handler or archive
filter change is involved. These layout rules live in Designer.

The refinement restore baseline is commit
`f2231fc4c07c218b43fff586a48fb73f8ca67425` and private snapshot
`TDB-Parallax-Scroll-Restore-2026-10-05.json`. Restore the captured native structure,
styles, attributes and immediate pin for a complete rollback. Physical mobile
overscroll remains a device verification item; desktop checks cannot reproduce
the browser's touch rubber-band rendering.
