# Smile Gallery staging verification — 6 October 2026

The native Gallery migration is on `https://dentalbarns.webflow.io/` and `https://dentalbarns.webflow.io/smile-gallery`. No custom production domain was published. The final staging publish task was `85c8c6ba-d3d4-4c12-9ebc-e5c6ddfa6f0c`.

## Release pins

| Asset | Commit |
| --- | --- |
| Shared dependency registry; motion 1.8.0; filters 1.1.0; shared ticker and Swiper | `4fae51eda544e5b4cc149442119b0fa38a61e37c` |
| Reusable Gallery presentation 4.0.1 (initial total ticker) | `4fae51eda544e5b4cc149442119b0fa38a61e37c` |
| Full-page Gallery plugin 25.0.2 | `16edb39cf5d6d5c9361f8d13b7db6e1b46267be8` |
| Gallery interaction-state CSS | `4415bdb40d508fc03ff34a4ee9664b01dd6929ec` |

The reusable carousel's native migration began at `1209513b0c6dcee0c0fcb920974e6f6efcb02e73`. Unrelated feature pins and freeform code were preserved through scoped updates. The cleanup branch is `cleanup/smile-gallery-20261006`; it includes earlier work by other agents, so review the Gallery commits before merging.

## Native layout and appearance

- The reusable component retains its Home and Dark variants and CMS bindings across 13 instances. Its presentation, facts, icons, counters and breakpoint sizing are native Designer elements/styles.
- The standalone page uses 121 native style aliases and native templates, including filter controls, cards, before/after labels, viewer, counter and close/navigation controls. Runtime code populates/clones them.
- Native breakpoint readback verified 64 literal properties plus one variable reference across 21 responsive styles at main/991/767/479.
- Before/after desktop comparison matched all recorded properties for 26 measured elements. The measurements include size, padding, gaps, typography, colour and borders; see [desktop-layout-comparison.json](desktop-layout-comparison.json).
- Browser inspection retained square CMS photography, dimmed neighbouring slides, scroll-region fades and viewer chrome. See [native-viewer.jpg](native-viewer.jpg).

## Clock alignment

Designer originally reserved the intrinsic width of “10 months”; runtime hydration reserved every CMS duration including “180 minutes”. A centred duration group consequently moved its clock left when the content grew.

The native `tdb-smile-fact-ticker is-duration` combo now owns `width:7.5em`, `flex-basis:7.5em` and `grid-template-columns:minmax(0,1fr)`. Inherited shrinking accommodates narrow cards. There is no JavaScript icon offset. The style is on component element `9036191c-370e-59a0-eee4-9f4e8e7568e0` and inherits across all breakpoints/variants.

On staging at 1363×936, the slot measured 75px before and after hydration. Its clock's x-position stayed 196.890625px across next/previous changes from “2 Hours” to “9 Months” and back. See [native-clock.jpg](native-clock.jpg).

## Interaction checks

- All 34 CMS cases load; the first 12 are shown and Show more expands to 24.
- Combined Clear Aligners and Enlighten filtering returned 18 matching cases; each visible case contained both treatments. Reset restored all 34.
- Floating filters open and outside dismissal consumes the closing gesture without opening a case.
- Pointer opening, next/previous navigation and a real pointer drag worked in the native viewer. The rendered image URL remained the exact CMS source.
- The shared counter followed navigation; rapid carousel next/next/previous changes settled to one consistent presentation.
- Close/Escape restored the original summary focus and released page scroll lock.
- A reused-neighbour scroll-memory defect was reproduced (110px returned as 0px). In 25.0.2, scrolling case index 5 to 110px, navigating forward, then back restored 110px. The automated regression also failed before this fix and passed afterward.
- Browser DOM inspection found one copy of each requested shared dependency, and no Gallery runtime errors were observed. Browser-extension metadata errors were unrelated.

## Automated and build checks

All 13 targeted tests passed after the final fix: Gallery page/presentation/shared behaviour, Swiper plugins, carousel loader, shared dependency identity and the full-motion policy. Shared artifact verification checked 27 generated files, the minified Gallery artifact matched its build, and `git diff --check` passed.

The final CDN asset was byte-identical to the committed 28,351-byte minified file (SHA-256 `41c3b0f5f081a472caf25147ea954a2b0857580e70757c754afbd690c9e94101`).

## Remaining review

The live Designer MCP connection was unavailable; saved native element/style APIs were used successfully. This browser session did not expose mobile viewport emulation, so mobile wrapping is covered by automated tests and responsive native style readback, not a physical-device visual check. Review the clock, fades, dragging and vertical case scrolling on a phone before production publishing.

Payload reductions are recorded in [README.md](README.md). No real-device timing, Lighthouse score or total network transfer improvement is claimed.

## Initial total counter follow-up

The top-right total now retains Designer’s `01` until `TDBNativeTicker` is ready, then uses the same 400ms upward transition as the current-card number. Refreshing during that transition does not restart it. Ticker failure falls back to the accurate CMS total. The total slot’s positioning, size and clipping remain native Designer styles.

The new regression failed against the plain-text replacement and passed after the fix; all four targeted Gallery/shared-module tests passed. Staging showed `01 / 01` before initialization and the ticker-owned `11` afterward, with the counter retaining exactly the same 62.78125×15px rectangle at x366.765625/y116.28125. The CDN Gallery asset matched the committed source. See [native-total-counter.jpg](native-total-counter.jpg).
