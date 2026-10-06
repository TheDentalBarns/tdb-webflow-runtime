# Smile Gallery native migration — 6 October 2026

The reusable Gallery and full `/smile-gallery` page now separate Designer layout from runtime behaviour. This branch preserves the earlier service, owner quote, navbar and page-break integrations. Production publishing is outside this review.

| Owner | Responsibility |
| --- | --- |
| Webflow Designer | CMS bindings, responsive layouts, Home/Dark variants, square images, cards, facts, treatment rows, filter controls, viewer shell and native templates |
| `TDBSwiper` + Gallery plugin | Reusable carousel engine, loop/sort integration and Gallery lifecycle |
| `TDBNativeTicker` | Carousel facts/counts and full-page viewer count; rapid interruptions settle to the latest value |
| `TDBMotion` | Existing carousel fades and motion policy; shared scroll-region DD fades |
| `TDBFilters` | Shared outside-gesture isolation and native filter-panel primitive |
| `TDBSmileGallery` | CMS normalization, AND treatment/clinician filters, 12-case batches and the tuned full-page viewer |
| Gallery UI CSS | Interaction states, hover/focus feedback, scroll lock and existing chrome transitions |

The full-page viewer keeps its established custom drag choreography in the Gallery plugin: desktop ends, mobile wrap, interrupted drags, per-case scroll memory and 420/600 ms closing sequences. Replacing that contract with generic Swiper navigation would be a separate behaviour change. The reusable Gallery already runs on shared Swiper.

`TDBUI` remains the common UI stylesheet. Gallery layout is not added to it; its generic controls and tokens continue to be reused. Shared filters gained one reusable gesture helper without changing their mount API. Shared motion gained `ddRegion` without changing existing consumers. The dependency registry pins a single motion/filter/ticker/Swiper release.

## Performance and dependency findings

- Reusable Gallery migration removed about 32.5 KB of inline presentation/controller code plus the separate Home Gallery loader.
- Full-page migration removes 33,282 bytes of page-inline style blocks and the 36,236-byte inline controller (plus its small held-control helper).
- The published full-page controller is a cacheable 28,351-byte external file: 22% less JavaScript than the old inline controller. Local gzip comparison is 9,364 versus 11,902 bytes; these are payload comparisons, not measured network transfer or paint timings.
- Native templates replace runtime construction of layout, SVG markup and style rules. Dynamic content fills/clones those templates.
- Scroll-region DD work is scoped to intersecting content and stops scheduling frames once the fade settles; hidden documents do no fade work.
- Shared scripts retain the registry's in-flight request deduplication. Unrelated feature loaders, consent gates and release pins are retained.
- Moving layout into Designer moves CSS into Webflow's generated stylesheet. Total page transfer and real-device interaction timings still need measurement; no Lighthouse or real-user performance score is claimed.

## Verification

Thirteen targeted tests cover numeric sorting, AND/clinician filtering, 12-case batches, image source identity, desktop bounds, mobile wrapping, counter updates, Escape/focus/scroll-lock restoration, outside-click isolation, DD settling/teardown, rapid carousel changes, remounts, shared request identity and the owner-enabled full-motion policy.

The initial reusable carousel staging pass matched the recorded desktop geometry, including card/media, title, controls and facts. Native ticker text has subpixel width/height differences from the former JavaScript measurement. Home and Services carousels were exercised in the browser.

The complete page's staging browser verification and final release pins are recorded in [verification.md](verification.md). Responsive styles are native at main/991/767/479 breakpoints. Automated mobile navigation tests do not substitute for touch-device visual review.

## Build and rollback

Run `node tools/build-shared-runtime.mjs`. Install the pinned dependencies in `tools/runtime-build`, then run `node tools/runtime-build/build-gallery.cjs` (`--check` verifies the committed minified artifact). Tests require jsdom.

`designer-layout.json` records full-page base styles and breakpoint changes. `../smile-gallery-native-migration-20261006.json` records reusable component styles and variants. `native-templates.html` and `native-card-strip.html` preserve the intended semantic markup; Webflow stores controls as DOM elements tagged `button`.

Runtime rollback must be coordinated with the native templates. Do not restore a pre-native Gallery script alone. The previous v24 page head/footer and original element snapshot were captured before migration; the Git branch preserves prior releases. Do not reset unrelated site code or other agents' component edits.

## Clock alignment follow-up

The duration slot now has the native `tdb-smile-fact-ticker is-duration` combo: width/flex-basis `7.5em`, with inherited shrinking for narrow cards. Designer used to size its placeholder "10 months" intrinsically, while the hydrated ticker reserved the widest live value ("180 minutes"); centering that larger group shifted the clock left. The slot now has the same Designer-owned width before and after hydration. JavaScript does not offset the icon.

A separate desktop viewer edge case was also corrected: when a neighbouring slide is reused, its saved scroll position is restored before navigation. The regression check fails without the fix and passes with it.
