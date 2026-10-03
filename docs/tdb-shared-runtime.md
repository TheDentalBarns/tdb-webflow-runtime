# TDB shared runtime

Webflow owns native component structure, layout, responsive styling, controls and CMS content. GitHub owns behaviour. No review records are stored in these modules.

- `tdb-modules.js`: one in-flight request per dependency URL, retry after failure.
- `tdb-motion.js`: shared durations, fades, ticker timing, the existing DD scroll-opacity effect and Swiper interruption handling.
- `tdb-sliders.js`: existing carousel adapters, using the shared motion policy.
- `tdb-drawer.js`: native drawer opening, closing, focus, scroll locking and cleanup.
- `tdb-ticker.js`: native Webflow span templates (so their styles survive export), reduced motion and interruption-safe settlement.
- `tdb-review-cms.js`: reads published native CMS markup and its aggregate.
- `tdb-review-introduction.js`: summary tickers and accessible drawer triggers.
- `tdb-review-cards.js`: native review preview cards, fixed artwork and the shared Swiper engine.
- `tdb-review-legacy-loader.js`: previous review patches only on pages still using the old component.
- `tdb-review-quotes.js`: shared Swiper adapter for the native CMS-selected quote template.
- `tdb-reviews.js`: CMS content binding, pagination, a bounded horizontal drawer slider and stationary quote artwork.
- `tdb-reviews-loader.js`: permission, component discovery and proximity/intent preparation.

Permission is independent of component existence, proximity and playback. The default review policy waits for a saved cookie-banner decision; it does not require marketing consent. A feature with an actual consent dependency may supply `TDBReviewOptions.permission()` and `subscribe(callback)` before the loader. Withdrawal destroys mounted instances, aborts pending CMS work, restores native fallbacks and prevents reinitialisation until allowed. Downloaded definitions remain reusable.

The review drawer, quote carousel and existing slider loader all request the same pinned Swiper URL through the registry. Loading definitions does not mount a component. Native summary controls remain disabled until the service is available; the authored quote and reserved numeric slots remain visible.

The native CMS source currently has a 100-item export limit. The source parser deliberately fails at that boundary rather than silently omitting reviews; native pagination must be configured before reaching it.

The drawer enters from the right at every breakpoint. Webflow owns its dark bars, close circle, SVG stars, quote frame, gutters and responsive dimensions. The summary arrow starts left and begins its clockwise turn as soon as the trigger is activated. Summary, quote and attribution activate the same service. CMS collection lists own ordering and quote selection; the runtime preserves that order and resolves an activated quote to its CMS record.

A hidden native ticker template keeps both numeric layer styles in the Webflow export. Runtime spans are absolute inside the reserved slot, so old and new values overlap vertically without changing layout. Both displayed totals share the same target value and timing. The DD effect restores the existing viewport opacity keyframes with a single shared listener set and teardown on withdrawal.

Review preparation starts within 700px of an eligible section, after permission. It loads the shared code and CMS data, binds the hidden native drawer and measures Swiper before activation. The closed native Webflow drawer uses visibility hiding, remains inert and does not lock scrolling or take focus. Activation reuses the prepared instance; withdrawal destroys it, including an interrupted opening. Native responsive sizing remains the measurement source.

Review movement follows the Location reference: outgoing excerpt fades over 400ms while the slide travels with ease timing; the incoming excerpt remains hidden until settlement, then fades after 100ms forwards or 140ms backwards. Opening waits 500ms; a cancelled drag waits 60ms. Repeated transition events cannot restart a fade. The drawer's singleton speech mark stays fixed for unscrolled slides; for a scrolled review it fades with the outgoing slide, is reparented after movement and returns with the next quote. Preview-card artwork stays fixed. Reduced motion settles immediately.
