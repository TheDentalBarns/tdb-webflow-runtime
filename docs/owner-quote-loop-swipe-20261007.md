# Owner quote loop and swipe recovery

Owner Quotes 3.1.0 uses shared TDBSwiper 1.3.0 helpers:

- `matchingSlides(swiper, slide?)` returns all physical copies of a logical slide; non-loop slides match themselves.
- `onSettled(swiper, callback)` reports completed transitions, same-slide snap-backs and releases with no animation. It skips internal loop corrections, coalesces callbacks, waits until Swiper processes touch release, and returns a cleanup function.

The quote plugin applies visibility and byline entrance to matching copies. It keeps accessibility on only the physical active slide, skips presentation resets during loop correction, and cancels the special opening state on manual touch. Designer classes and existing Motion timings are unchanged.

Validation: `NODE_PATH=<jsdom installation>/node_modules node --test tests/quote-loop-swipe.test.cjs tests/team-quotes.test.cjs tests/swiper-behaviour.test.cjs tests/swiper-plugins.test.cjs`.
The new regression tests run the real custom Swiper bundle and quote plugin in JSDOM. The older adapter test harness now provides the event listener mocks required by the already-current Motion module.

Deployment: update the site-head owner quote and shared module commit pins together. Start from the latest shared module release so unrelated carousel/motion updates remain intact. Staging only; no production publish.
Previous pins at preparation: quotes b2d00675ce622a390921ef3787ad815622f432c2; modules 6c8665ebfc98058634e28b0d8626aecceba84174.
