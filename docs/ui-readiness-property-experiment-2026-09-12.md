# UI readiness property experiment

Authorised staging-only experiment, stacked on the homepage VIP demand branch.

Remove only the `@property --tdb-ui-ready` registration from the global deferred UI stylesheet and rebuild its generated source/distribution bundles. Keep `html { --tdb-ui-ready: 1; }`, all drawer variable scoping, both homepage display guards, and every JavaScript runtime unchanged. Update the misleading old comment: a non-inheriting registration can itself cause document-wide style recalculation in Chromium.

The readiness consumers read the flag on `document.documentElement`. An unregistered marker preserves that contract, as in the earlier runtime architecture. This is an experiment, not a confirmed fix for the Webflow stylesheet coverage warning.

Validation before staging: the only active CSS difference is removal of this registration; footer, immediate and VIP runtime files remain unchanged. After publication, verify initial drawer dormancy, first-click open/close, scroll peek/hide, automatic VIP landing-page preparation and slider demand loading.

Use identical GTmetrix options before and after: London, Chrome, 4G 9000/5000/125, desktop viewport 1366x768 at DPR 1, video on, no ad blocking, and the UA from the supplied HAR. These form a new controlled desktop comparison; the historical report's full viewport settings were not available. Do not compare absolute desktop timings directly with the earlier mobile-shaped screenshots.

Prior global UI pin / rollback: `5f162a629a8ee7f5c8a1e79dc5206429c22961cf`. Restore this UI pin in the site head (normal and noscript links) and footer manifest, then publish staging only. All JS pins and homepage custom code stay unchanged throughout.

Production publication is not authorised.

## Result: unsuccessful, rolled back

Experiment CSS pin: `67b11ff0e4c453a8c5e1b82299b902c7af710bb5`. Its only active CSS change was removal of the registration. The 90-byte declaration was removed and its explanatory comment updated, giving a net 73-byte decoded bundle reduction (23,766 to 23,693 bytes). A release comment added 91 bytes to HTML during the experiment. No JS files or loading pins changed.

The unused Webflow page CSS warning appeared in all eight tests: 3 baseline, 3 experiment and 2 restored controls. Each report continued to attribute essentially the entire 17.5–17.7 KB transferred page stylesheet to potential savings. Removing this registration did not fix the warning.

Median TBT was 184 ms in the baseline, 297 ms with the registration removed, and 191 ms after restoration (two restored tests: 171 and 211 ms). This small A/B/A series supports keeping the previous registration. It does not isolate an exact causal millisecond cost; CPU work and server response varied. All runs made 55 requests. The large page-attributed main-thread tasks remained. Direct full Lighthouse JSON downloads returned HTTP 403, so exact style/layout-category attribution was not available for these new runs; metrics and task summaries came from the authenticated GTmetrix reports.

| Phase | Report | Performance | Structure | TBT ms | TTFB ms | FCP/LCP ms | SI ms | TTI ms | onLoad ms | Fully loaded ms | Requests |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | [zN9mKXCE](https://gtmetrix.com/reports/dentalbarns.webflow.io/zN9mKXCE/) | 61 | 96 | 200 | 2220 | 2789 | 3503 | 3909 | 3980 | 4150 | 55 |
| Baseline | [v9KmJRu3](https://gtmetrix.com/reports/dentalbarns.webflow.io/v9KmJRu3/) | 65 | 96 | 166 | 2070 | 2605 | 3250 | 3854 | 3774 | 4035 | 55 |
| Baseline | [GrwnCBTm](https://gtmetrix.com/reports/dentalbarns.webflow.io/GrwnCBTm/) | 90 | 97 | 184 | 442 | 993 | 1641 | 2080 | 2093 | 2314 | 55 |
| Experiment | [bSZtqfBl](https://gtmetrix.com/reports/dentalbarns.webflow.io/bSZtqfBl/) | 54 | 96 | 289 | 2356 | 2957 | 3739 | 4091 | 4173 | 4374 | 55 |
| Experiment | [u7Qec9oX](https://gtmetrix.com/reports/dentalbarns.webflow.io/u7Qec9oX/) | 78 | 97 | 365 | 444 | 986 | 1872 | 2230 | 2242 | 2551 | 55 |
| Experiment | [5mb4TswN](https://gtmetrix.com/reports/dentalbarns.webflow.io/5mb4TswN/) | 82 | 97 | 297 | 439 | 1005 | 1760 | 2380 | 2446 | 2641 | 55 |
| Restored | [C0PJmuq3](https://gtmetrix.com/reports/dentalbarns.webflow.io/C0PJmuq3/) | 61 | 96 | 211 | 2160 | 2720 | 3412 | 3863 | 3784 | 4038 | 55 |
| Restored | [8fOecvMY](https://gtmetrix.com/reports/dentalbarns.webflow.io/8fOecvMY/) | 91 | 97 | 171 | 433 | 968 | 1699 | 2072 | 2108 | 2334 | 55 |

The old UI pin was restored in site head, noscript and footer manifest and published to staging. Saved code was verified against the pre-experiment contents. Final staging publication: 2026-09-12T10:41:02.556Z. Production domains retained publication timestamp 2026-09-11T20:23:15.972Z; production homepage HTML also matched the initial snapshot byte-for-byte after experiment publication.

Browser checks of the experiment confirmed a fresh untouched homepage had readiness value 1, no drawer layout boxes or prepared attribute, and no drawer/slider scripts. Ordinary drawer open reached viewport top 0, Escape closed it, and slider assets loaded on proximity; after entry the second slide (index 1) was active and the entry-pending class cleared. An initial semantic click prepared the drawer without opening it in this browser; a subsequent visible-DOM click opened it. Do not claim a completed cold-click regression matrix for the experiment. Restored staging was separately checked at fresh load (drawer display none, zero drawer scripts, root readiness 1/body readiness 0), and a visible-DOM first click opened the drawer to top 0. No forms were submitted. Browser scroll acknowledgement timed out once although the scroll happened; the resulting DOM state was read before continuing. The wider landing-page/mobile matrix was not continued once the unsuccessful experiment was rolled back.

Recommendation: leave the registration in place. If further isolation is authorised, test homepage drawer variable scoping and the hidden guard separately while preserving demand loading. There is still no evidence that the whole Webflow page stylesheet is redundant. No production publication occurred.
