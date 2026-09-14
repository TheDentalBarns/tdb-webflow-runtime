# Separate slider presentation from the shared UI bundle

The published shared UI bundle included a copy of the standalone slider controls.
Slider-only controls, fade transitions, native slider dot colours and Swiper live-announcement styling now belong to `src/styles/tdb-slider-ui.css` and its generated `dist/tdb-slider-ui.css`.

The shared UI retains the initial hidden-state guards and the coordinated nav, VIP drawer and Elfsight focus transitions. All existing CSS declarations, priorities and media conditions are preserved. The new non-inheriting readiness flag is the only added CSS behaviour.

Webflow head must request both immutable CSS URLs, in UI-then-slider order, with the existing nonblocking media-print/onload pattern and a noscript fallback. The footer runtime v1.4.8 waits for both sheets before requesting the unchanged slider runtime. Stylesheet recovery retains the original cascade position and one retry. The slider loader is v0.2.2; its proximity and intent gates are unchanged.

Validation: 5 stylesheet dependency/recovery tests against source and the built footer, plus 17 existing loader regression tests. Parsed declaration comparison confirms the same 376 original declarations across both bundles. Live staging verification is recorded separately in the release archive.

Deployment scope: staging only, on the existing `codex/slider-cdn-designer-20260914` branch. The slider runtime, card motion, first-view advance, infinite loops, caption rules in Designer and production website are unchanged.

Rollback: restore the saved before-head and before-footer blocks together and republish the Webflow subdomain only. These restore UI commit ea70a57b7cec51fa7b6d29b4f168bed15cd4cd5f and the prior footer/bootstrap delivery.
