# Service parallax ownership — 5 October 2026

This staging change consolidates the first homepage service parallax without
changing its current opening animation or phone-landscape behaviour.

## Ownership

| Owner | Responsibility |
| --- | --- |
| Webflow Designer | First service slider structure, responsive layout, typography, spacing, overlay/blur, controls, CTA, progress appearance and state classes |
| Services CMS | Service names, descriptions, images and destination links |
| Home native Collection List | Curated featured-service selection and order; no JavaScript reorder |
| `src/sliders/parallax.js` / `TDBParallax` v1.0.0 | Existing card conversion for other banner sliders, early controls, active CMS CTA, touch/hover/history state, native presentation classes and rendered progress geometry |
| `src/runtime/immediate-runtime-batch.js` v0.10.0 | Starts `TDBParallax.refresh()` before the existing deferred dependency loading |
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
