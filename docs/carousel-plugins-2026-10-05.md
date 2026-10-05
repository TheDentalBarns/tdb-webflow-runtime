# Shared Swiper and carousel plugins — 5 October 2026

The custom Swiper remains the existing 8.4.7 build, its selected vendor modules
and security backport. This refactor adds the common plugin interface to that
same download; it does not replace the engine or change component layouts.

## Owners

| Layer | Source / artifact | Responsibility |
| --- | --- | --- |
| Shared engine/controller | `src/sliders/swiper-behaviour.js`, `swiper-duration.js`, `swiper-plugins.js` → `tdb-swiper-8.4.7.min.js` | `TDBSwiper` 1.2.0: create, bind, register, mount, observe, refresh, prune, watchDuration; one instance per viewport/plugin root; teardown; existing loop/interruption and release curve |
| Shared motion | `src/shared/motion.js` → `tdb-motion.js` 1.5.0 | Width-sensitive duration; existing 100/140/60ms next/previous/settle delays; 120/100/300ms entry timings; fades, DD, drawers and tickers |
| Parallax plugin | `src/sliders/parallax-plugin.js` → `tdb-parallax.js` 1.0.0 | Existing entry, reveal, loop, auto-width/banner, navigation and Swiper options |
| Gallery plugin | `src/sliders/gallery-plugin.js` → `tdb-gallery.js` 1.0.0 | Existing highlight/Smile Gallery carousel options, counts, first view, looping and clone interactions |
| Reviews | `src/reviews/native/cards.js`, `quotes.js`, `drawer-content.js` → `tdb-review-cards.js` 1.2.0, `tdb-review-quotes.js` 1.2.0, `tdb-reviews.js` 3.13.0 | Registered `review-cards`, `review-testimonials`, `review-drawer` plugins; preserve their CMS, filter, spinner, badge, reveal, scroll and responsive behaviour |
| Early preparation | `src/sliders/parallax.js` 1.1.0 inside immediate runtime 0.11.0 | Native state/CTA preparation, treatment-card conversion, current card and progress; retains early execution before lazy Swiper |
| Shared focus | `src/shared/slider-focus.js` → `tdb-slider-focus.js` 1.2.0 | Existing focus/nav behaviour, extracted unchanged; can serve native Webflow sliders without the engine |
| Loading | `src/runtime/site-asset-loader.js` / footer 1.6.0; reviews loader 3.5.0; registry 1.4.0 | Component discovery and existing gates, one release and one engine request, per-feature lazy downloads |
| Webflow Designer/CMS | Existing native markup/classes and collections | Styling, layout, responsive variants, control artwork, service order and content |

The early parallax module is intentionally still in the immediate bundle: moving
it behind the engine download would reintroduce first-frame/CTA control changes.
The full Smile Gallery page's filtering/overlay and the homepage gallery CMS
intro/outro/count helper remain separate feature behaviour. Native Webflow-only
sliders, the partner marquee and Vimeo are not converted to new engines here.

## Loading and compatibility

The footer discovers carousel roots within its existing 800px preparation margin
or on intent. It loads only the required parallax/gallery plugin plus shared
dependencies; plugin mounting retains the existing 100px margin. It continues
discovering later CMS roots and the other plugin kind. Review permission,
presence, 700px proximity, playback, cached CMS requests and cancellation gates
remain in the review loader. An introduction without a drawer still needs no Swiper.

Registry 1.4.0 canonicalises the engine, motion, focus and carousel/review plugins
to the registry script's immutable commit. Different legacy request pins cannot
select an older engine merely by reaching it first. Unrelated shared modules
keep their existing loader-owned pins. An old adapter does not satisfy readiness.

`TDBSliders.refresh/activate` remain compatibility facades, with no duplicate
implementation. The current loader does not request `tdb-sliders.js`. Feature APIs
remain usable by older review callers; every feature creates its Swiper through
the common controller. Frozen feature APIs are wrapped, never mutated.

Common mounting does not impose identical feature options: finite review paging,
looping galleries, banner auto-width, direction-specific reveals, reduced motion
and review permission teardown retain their previous behaviour. Parallax installs
its banner-width override before binding shared interruption handling, as before.

## Validation

Build the shared/native artifacts, service plugins/footer and custom engine with
their existing build scripts. `tools/custom-swiper/check.mjs` checks the security
backport, controller inclusion and artifact size. The following Node tests cover
the changed paths (JSDOM is required for the DOM fixtures):

- `tests/swiper-behaviour.test.cjs`: interrupted movement, touch release, cancelled
  gestures, previous/disabled branches, loop continuity, binding and teardown.
- `tests/swiper-plugins.test.cjs`: real built engine with both carousel plugins,
  duplicate prevention, next/previous, remount and frozen review API lifecycle.
- `tests/shared-modules.test.cjs`: both load orders, cross-pin request deduplication,
  registry-owned release, old-adapter rejection and retry.
- `tests/carousel-loader.test.cjs`: no eager carousel download, per-kind loading,
  shared dependencies and later component discovery.
- `tests/review-loader.test.cjs`: permission/presence/proximity, plugin routing,
  optional engine, duplicate prevention and permission teardown/regrant.
- `tests/parallax-progress.test.cjs`: loop/reverse progress, geometry caching,
  visibility, resize, CMS structure changes and native component reuse off Home.
- Existing shared DD motion and 108-record review pagination fixtures.

Before deployment, all five feature constructor option trees were compared with
the restore point and matched exactly, including event callbacks/breakpoints.
Live staging checks follow publication; physical mobile orientation and touch
feel remain a device review, not something JSDOM can verify.

## Deployment and restore

Restore point: branch HEAD `563f5dccbe0c054ed24d1612db2b0bd01ac8a876`.
The private restore snapshot includes the complete pre-change site/Home code.
Only three asset pins and their release comments need changing for this pass:

| Webflow block / asset | Previous pin |
| --- | --- |
| Site head / `tdb-modules.js` | `263b14c235daef35452a3a582437d6bac8903e45` |
| Site footer / `tdb-immediate-runtime-batch.min.js` | `7bc0bfa1ceadc5b6cbb99352c5a7db0741a1d1e8` |
| Home footer / `tdb-reviews-loader.js` | `db61bf01ab662a514f826a22f3a6918e357fec7a` |

Set all three to the same immutable refactor commit and publish the Webflow
subdomain. No production-domain publication, native-style edit or component
conversion is part of this deployment. To restore, replace all three pins with
the values above and republish staging; GitHub history need not be rewritten.
