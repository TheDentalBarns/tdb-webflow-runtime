# Five Senses performance pass — 17 September 2026

## Baseline and scope

Approved baseline: `b8591da2f38c16e634d63fd07a25b3d4336aeef8` (v0.23.3), retained on `checkpoint/five-senses-approved-v0.23.3`. Changes are confined to the Surgery prototype and its build/test documentation. No production publication.

Keep the approved photos, state ownership, five concurrent channels, reversing reveals, button-edge origins, first-start blur, Sound double pulse and audio scheduling, independent mute/waveform, text fades, and staggered All ON/OFF sequence.

## Findings and changes

- The browser available for this review reports WebGL unavailable. The old fallback created 24 full-screen compositing layers, 15 canvases, and up to six expanding DOM rings with 90px inset shadows. Only 4–5 render calls were observed in individual 0.8–1.2s transitions, despite a maximum JavaScript submission time of 1.4ms. These observations identify a slow fallback, but cloud scheduling prevents treating the counts as an iPhone FPS measurement.
- The new fallback uses a single bounded Canvas 2D surface plus four persistent ambient layers. It prepares resized plates and cropped prop buffers once per viewport, shares each active channel's alpha mask, and skips objects fully inside/outside the mask. The moving photograph uses at most 185,000 working pixels; the settled image returns to the existing source-quality ceiling (up to 1.6M pixels). HTML controls and text retain their resolution. This trades temporary fallback photo detail for motion responsiveness; GPU rendering retains its existing resolution.
- The GPU shader avoids sampling all four photographic plates when Sight or Touch is settled, and avoids hidden or unused prop variants. It still uses one draw call and preserves the premultiplied object/reflection treatment.
- Hidden ambient animations pause without disconnecting or restarting their nodes. Visible flowers keep their drift. Shared mask strings, a stable RAF callback, fewer diagnostic DOM writes and removal of redundant resize drawing reduce repeated work.
- Decoded source ImageBitmaps are closed after prepared plates/sprites are complete. Context-loss fallback disposes the failed GPU resources. Normal close cancels rendering, timers and audio and frees all canvas buffers.

## Evidence

Controlled software OpenGL ES benchmark, 1086 × 1448, median of 20 measured draws after warm-up; same textures and Linux software GL backend. This is rendering workload evidence, not real Safari performance.

| Shader case | Baseline median | Optimised median |
| --- | ---: | ---: |
| Settled state | 15.06ms | 9.41ms |
| Sight ripple | 12.99ms | 8.82ms |
| Five ripple masks | 15.75ms | 9.68ms |

Native Canvas software stress test at a 390 × 844 viewport:

- First canvas candidate, five concurrent masks: 60.53ms median / 89.44ms p95.
- Final shared-mask/bounded-buffer implementation: 30.51ms median / 42.16ms p95.
- One or two concurrent masks: approximately 15–16ms median, 21–23ms p95.

The five-mask software fallback stress case remains above a 60Hz frame budget. Do not describe this as guaranteed 60/120 FPS across devices.

Correctness checks:

- All 32 settled fallback photographic states: pixel-identical to the approved composition functions at original resolution.
- Independent concurrent fallback masks select the expected photographic state at sampled regions.
- Real OpenGL ES compile/upload and image comparisons: maximum per-channel difference 1/255; overlapping Sight/Touch mask mean difference 0.0153/255.
- Regression checks pass for full viewport coverage, independent transitions, stale completion, reversal, Sound second pulse, reduced motion, idle scheduling, cancellation, and audio cleanup/late decode cancellation.

## Reproduction and device verification

`node tools/five-senses/check.mjs` runs the core checks.

`node tools/five-senses/render-check.cjs` additionally needs `@napi-rs/canvas` and the local photographic assets (optionally `TDB_SENSES_ASSETS`). It does not upload or include those images in the code repository.

Append `?senses-profile=1` on staging to collect a bounded window of animation-frame intervals during active reveals. At idle, `.tdb-senses-stage` exposes `data-frame-profile`, `data-renderer`, `data-max-submit-ms` and `data-draws`. It sends no telemetry and adds no idle RAF loop. Large browser scheduling gaps remain in the measurements rather than being filtered out.

Real iPhone/iPad Safari is not available in this environment. Use Safari Web Inspector's Frames, Layout & Rendering and CPU timelines on the affected device to check first-start blur, three rapid taps, All OFF/ON, repeated open/close and sustained use. Compare the pinned approved version under the same device/power conditions. The remaining initial backdrop blur is a specific item to profile on-device; it has not been claimed fixed by the cloud benchmark.

References: https://webkit.org/web-inspector/timelines-tab/ and https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
