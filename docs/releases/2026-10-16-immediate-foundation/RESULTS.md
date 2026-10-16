# Staging experiment results — 16 October 2026

Deployment: `288233d67fa73830562fa059d9ce5b5098df25f8` on https://dentalbarns.webflow.io/ at 07:55 UTC (08:55 London).
Rollback: `584765c8615827bc6364a1f629a67f9c32a7a0e9`, with the saved before head/footer blocks in this directory.
Production custom domains were not published. No merge to main was made.

## What changed

Foundation is requested as soon as the deferred entry executes with a ready DOM. The explicit font-ready promise, animation-frame wait and 50ms settling timer are removed. The DOM-readiness guard remains for safe manual/non-deferred entry use. Initial navbar, hero controls/poster and first-visit consent entrances are static. Consent closing/settings reopening and ongoing playback, navigation and carousel motion are retained.

The shared `tdb-ui.css` bytes and both published Webflow stylesheet URLs are unchanged. The only style edit is the dedicated initial-entry block in the global head.

## Three completed GTmetrix tests

All three used Chrome, London, 4G 9/5 Mbps with 125ms latency, video and the same custom Chrome 154 user agent. No device override or cookies were supplied; the documented default viewport is 1366 × 768.

| Run | Performance | Structure | FCP / LCP | TBT | TTI | Fully loaded | TTFB | HTML cache |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [1](https://gtmetrix.com/reports/dentalbarns.webflow.io/qwkEIu4x/) | 57 | 96 | 3,249ms | 203ms | 3,907ms | 4,197ms | 2,615ms | MISS |
| [2](https://gtmetrix.com/reports/dentalbarns.webflow.io/wSyqLpNH/) | 84 | 97 | 1,106ms | 248ms | 1,715ms | 2,026ms | 439ms | HIT |
| [3](https://gtmetrix.com/reports/dentalbarns.webflow.io/mU0LVQNz/) | 86 | 97 | 1,085ms | 215ms | 1,696ms | 2,019ms | 448ms | HIT |
| Median, all three | 84 | 97 | 1,106ms | 215ms | 1,715ms | 2,026ms | 448ms | — |

All three made 31 requests, transferred about 383.3KB including response overhead, and recorded CLS 0.000461. The first result is retained: its HTML response was a confirmed Cloudflare cache miss, dominating its poor timing. The later two were HTML cache hits, not repeat-browser-cache runs.

## Interpretation and limits

- These results do not establish a performance improvement. The earlier 28-request baseline fetched the mobile hero `-mb-p-800.webp`; these runs fetched the desktop `-p-1600.webp`, two more award SVGs and a chevron. GTmetrix groups them into a distinct test-settings profile. Exact viewport equivalence with the earlier baseline could not be verified, so overall size, request and CPU differences must not be attributed to the code change.
- Foundation started at 1,710ms and 1,693ms in runs 2 and 3, respectively, finishing at 1,863ms and 1,849ms. Removing the settling gate does not make it start at navigation: the deferred entry remains behind the existing Webflow script execution/DOM processing. FCP/LCP already occurred before foundation.
- Reported JavaScript execution was 103ms and 158ms in runs 2 and 3. TBT was 248ms and 215ms. These are observed readings, not a demonstrated CPU saving. No full trace attribution was available; direct Lighthouse JSON retrieval returned HTTP 403.
- The loader shrank by 184 raw bytes; foundation grew by 365 bytes for immediate initial-consent handling. Combined initial custom JavaScript is **181 raw bytes larger**, with only **11 compressed response-body bytes** difference in the observed HARs. Locally reproduced gzip differs by +1 byte. There is no meaningful JS payload saving.
- Published HTML is 196,487 bytes versus 197,008 before: **521 raw bytes smaller**. The shared stylesheet is unchanged. Raw HTML plus the two initial custom scripts is 340 bytes smaller overall.

## Validation and disposition

390 automated tests passed, 3 existing optional tests skipped, none failed. Build/catalog/readable parity and diff checks passed. The GitHub release tree exactly matched the tested local tree (`30eb279ae7027c9494cac9fa7bebe98fba1b39a9`).

Browser smoke checks confirmed visible static navbar/poster states, loaded release scripts, settings reopening and dialog focus, essential-only consent closing with empty Vimeo iframe URLs, the hero play button reopening consent after decline, and accepting all restarting gated runtime. The browser reused a prior consent choice, so initial first-visit instant rendering is covered by the automated test rather than a clean-cookie browser assertion. No application JavaScript error appeared during these checks; browser-extension metadata errors were unrelated.

The experiment remains on staging for review. Rollback is prepared; restoring the saved before head/footer together restores startup timing and entrance behaviour. Reconcile any later unrelated CSS/custom-code edits before applying rollback. Production remains at its prior publication.
