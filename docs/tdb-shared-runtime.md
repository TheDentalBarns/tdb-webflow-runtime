# TDB shared runtime

Webflow owns native component structure, layout, responsive styling, controls and CMS content. GitHub owns behaviour. No review records are stored in these modules.

- `tdb-modules.js`: one in-flight request per dependency URL, retry after failure.
- `tdb-motion.js`: shared durations, fades, ticker timing and Swiper interruption handling.
- `tdb-sliders.js`: existing carousel adapters, using the shared motion policy.
- `tdb-drawer.js`: native drawer opening, closing, focus, scroll locking and cleanup.
- `tdb-ticker.js`: native numeric slots, reduced motion and interruption-safe settlement.
- `tdb-review-cms.js`: reads published native CMS markup and its aggregate.
- `tdb-review-introduction.js`: summary tickers and accessible drawer triggers.
- `tdb-review-quotes.js`: shared Swiper adapter for the native CMS-selected quote template.
- `tdb-reviews.js`: review content binding, filtering, pagination and the drawer slider.
- `tdb-reviews-loader.js`: permission, component discovery and proximity/intent preloading.

Permission is independent of component existence, proximity and playback. The default review policy waits for a saved cookie-banner decision; it does not require marketing consent. A feature with an actual consent dependency may supply `TDBReviewOptions.permission()` and `subscribe(callback)` before the loader. Withdrawal destroys mounted instances, aborts pending CMS work, restores native fallbacks and prevents reinitialisation until allowed. Downloaded definitions remain reusable.

The review drawer, quote carousel and existing slider loader all request the same pinned Swiper URL through the registry. Loading definitions does not mount a component. Native summary controls remain disabled until the service is available; the authored quote and reserved numeric slots remain visible.

The native CMS source currently has a 100-item export limit. The source parser deliberately fails at that boundary rather than silently omitting reviews; native pagination must be configured before reaching it.
