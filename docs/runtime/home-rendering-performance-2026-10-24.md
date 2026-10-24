# Home rendering work — 24 October 2026

Baseline: `3c3e254f2d77dbfbe473234f90b8be214c774cf8`.
Scope: reduce recurring rendering-related work while preserving the approved
layout, effects, motion profile, responsive geometry and native Designer styles.

## Applied changes

- Treatment uses the same progress invalidation rule as Services. Styles on
  inner `img.showcase_image` nodes affect artwork, not the slide rectangles
  sampled by horizontal progress and details. These changes no longer wake that
  sampler. Track/slide widths, transforms, classes, copy reveals, child changes,
  resize, visibility and in-flight track transitions still do.
- Review and USP drawers reuse their Swiper ResizeObserver through the shared
  reading controller. Both adapters disable the competing default full resize
  update. The reader batches deliveries in one animation frame, waits for touch
  or transition settlement, retains the selected slide and reading anchor, and
  skips zero-width/hidden-tab work. Destruction cancels pending work and removes
  the listener. Landscape auto-height output still does not cause a full update.
- The USP duration CSS variable is written only when its value changes.

No CSS, DOM structure, motion settings, image assets or request additions.

## Evidence

`tools/benchmarks/native-progress-work/` runs the actual progress, rendered
sampler and treatment-detail controllers in an isolated native-style fixture.
Start `node tools/benchmarks/native-progress-work/server.cjs`, open
`http://127.0.0.1:8771/`, and use **Run comparison**. Baseline comes from the
immutable commit above. This is a callback/layout-read benchmark, not a
whole-page CPU or GPU profile. Its `paints` count means calls to our paint
callback, not browser Paint events.

Two desktop Chromium runs, 420px-wide fixture:

| Workload | Before | After |
| --- | ---: | ---: |
| 120 vertical image updates: progress callbacks | 60 | 0 |
| Same workload: rectangle reads | 480 | 0 |
| Callback time across the two-second workload | 3.4–5.0 ms | 0 ms |
| 120 horizontal updates: progress callbacks | 60 | 60 |
| Same horizontal workload: rectangle reads | 480 | 480 |

The horizontal progress transforms and native text positions match exactly at
the end of both runs. Horizontal callback timings vary in both directions;
there is no supported claim of faster horizontal swiping from this change.

Drawer regression fixtures confirm eight resize notifications produce one
layout refresh, no refresh occurs during a touch or transition, and one pending
refresh runs after settlement. Tests using the real bundled slider confirm one
viewport observer, retained selection, and deferred geometry in both finite
(reviews) and looping (USP) configurations. Separate checks cover landscape
footer/reading anchors, zero-width drawers, disposal, and default-resize ownership.

## Other areas inspected

- Shared scroll motion already batches geometry reads before writes, shares
  rectangles within a frame, skips unchanged transforms and suspends when hidden.
  Cross-frame geometry caching was not added: sticky positions, restoration and
  responsive crops still require fresh geometry.
- Carousel image transforms retain the existing Safari-sensitive writes during
  timed transitions. No new transform deduplication is applied there.
- Marquee motion already has viewport and document-visibility gates. Quote entry
  timers, media playback and progress sampling also have existing visibility
  policies. No additional global observer or animation loop is introduced.
- Review quote marks remain attached to the reading layer when settled.
  Filter button fitting runs on opening/content/size changes and already skips
  self-induced unchanged geometry. Rewriting its small number of conditional
  layout reads is lower priority than a measured bottleneck.
- Native treatment side panels use a 20px backdrop blur and animate card width.
  Drawer glass and Instagram glass also remain. These are plausible paint/
  compositing costs, not a measured GPU diagnosis. Preserving their appearance
  takes precedence over a speculative layer/blur rewrite.
- Permanent opacity/transform `will-change` hints were inventoried. A computed
  hint does not establish GPU allocation or memory cost, so none was removed
  without a device trace.

The available browser interface does not expose DevTools tracing, CPU throttling,
GPU counters or physical iOS/Android frame measurements. Device frame rate,
whole-page CLS/INP and GPU savings are therefore not claimed by this audit.
The current motion profile stays at pace 1 / current.
