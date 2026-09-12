# VIP CSS diagnostic experiments — 12 September 2026

## Conclusion
Neither restoring homepage VIP variables to html nor removing both hidden-drawer guard copies cleared the recurring Webflow page stylesheet warning. A full documented pre-VIP runtime rollback reduced the unused estimate to 11 KB in both runs; restoring the current demand-loaded architecture returned it to 17.5–17.7 KB in both runs. This establishes a repeatable association with the combined deployment, but does not isolate the responsible JavaScript or CSS interaction. The warning persists even under the rollback.

No permanent optimisation was retained. Original saved site/page code was verified exactly restored and published to staging. All four production domain timestamps remain 2026-09-11T20:23:15.972Z.

## Matched measurements
London Chrome, desktop 1366×768, DPR 1, 4G 9/5 Mbps and 125 ms latency, video enabled, custom Chrome 142 Linux UA, no adblock. These settings are consistent within this experiment, not identical to the user's historical mobile-shaped report. Server response varies markedly; performance scores must not be used as proof of CSS causation. Two tests per variant are insufficient for a stable TBT effect estimate.

| Configuration | Report | Unused CSS estimate | TBT ms | TTFB ms | Requests | Total decoded CSS bytes |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Baseline | [CmNxYYvX](https://gtmetrix.com/reports/dentalbarns.webflow.io/CmNxYYvX/) | Potential savings of 17.6KB | 252 | 1331 | 55 | 163383 |
| Variables restored to html | [9PzKMssW](https://gtmetrix.com/reports/dentalbarns.webflow.io/9PzKMssW/) | Potential savings of 17.6KB | 174 | 2451 | 55 | 163131 |
| Variables restored to html | [Q5P9LMKO](https://gtmetrix.com/reports/dentalbarns.webflow.io/Q5P9LMKO/) | Potential savings of 17.5KB | 227 | 444 | 55 | 163131 |
| Both guards removed | [hsPiiyXN](https://gtmetrix.com/reports/dentalbarns.webflow.io/hsPiiyXN/) | Potential savings of 17.6KB | 235 | 2287 | 56 | 163188 |
| Both guards removed | [4tL1BmnL](https://gtmetrix.com/reports/dentalbarns.webflow.io/4tL1BmnL/) | Potential savings of 17.5KB | 206 | 454 | 56 | 163188 |
| Full pre-VIP control | [Z80BwGaa](https://gtmetrix.com/reports/dentalbarns.webflow.io/Z80BwGaa/) | Potential savings of 11.0KB | 344 | 2082 | 57 | 162772 |
| Full pre-VIP control | [AEmpNeqF](https://gtmetrix.com/reports/dentalbarns.webflow.io/AEmpNeqF/) | Potential savings of 11.0KB | 238 | 431 | 57 | 162772 |
| Current configuration restored | [lNNbbUre](https://gtmetrix.com/reports/dentalbarns.webflow.io/lNNbbUre/) | Potential savings of 17.7KB | 125 | 2218 | 55 | 163383 |
| Current configuration restored | [yasCyPXj](https://gtmetrix.com/reports/dentalbarns.webflow.io/yasCyPXj/) | Potential savings of 17.5KB | 155 | 438 | 55 | 163383 |

## Exact changes
- Variable-only experiment: commit 7eec568f5428ddfcb000cfc20dc41046f4203e1b; replace homepage/non-homepage VIP variable selectors with html in shared and desktop CSS. Retain readiness @property, both drawer guards, all JS. UI 23,514 bytes versus original 23,766.
- Guard-only experiment: commit 3c27197538c899c922b40b01e2b03e2e6b859973; remove only the 195-byte homepage display:none guard from src/styles/tdb-deferred-ui.css and regenerated UI bundles, plus the equivalent 246-character homepage head block. Restore original variable scoping. UI 23,571 bytes; JS unchanged.
- Full documented pre-VIP control: UI 87f6c34ef90d66430dd443246c41d9f82d94a3d9; immediate 3d392f3a5bc4e1ab0ed775171aa9e0868d47d954; footer 0cc87ff5e83d802a9cdffc27b757c071001af96e; homepage guard absent. Tooltip consolidation and forms/slider recovery retained.
- Final restored configuration: UI 5f162a629a8ee7f5c8a1e79dc5206429c22961cf; immediate 360877d9d623b3b2b95c56c4b4ee9ad601a92da4; footer 8b96b2cb5aa58bdef1d078002a88f4503bc49396; original homepage guard restored.

## Verification and limits
CDN experiment bytes matched built files. Published DOM and each test's decoded resource sizes verified variant propagation. Saved code was checked before edits to avoid overwriting concurrent work. A transient Webflow 429 during final publication was retried successfully.

Variable variant: initial drawer display:none, no VIP runtime; first visible Join VIP click opened it. Guard variant: initial drawer display:flex, visibility:hidden, offscreen full-height layout; no VIP runtime. Guard removal added one initial image request. Full pre-VIP control automatically loaded the legacy VIP script and total requests rose from 55 to 57. Final published page restored display:none and no initial VIP runtime.

The previously supplied cumulative interactive Coverage export recorded roughly 54% usage of this essential Webflow page stylesheet; it is not a matched initial-load Lighthouse capture. The full-unused estimate must not be interpreted as permission to delete the stylesheet. No full duplicate was established. The historical and current staging page CSS URL share the 717969311.opt.min.css suffix.

The previously tested readiness @property removal also did not clear the warning. It was restored before these tests.

## Next bounded investigation
Retain demand loading. Compare old/new loader initialization with identical current CSS and capture initial-load rule-usage plus a Performance trace under the same browser/Lighthouse settings. Determine which rules change their recorded usage and what style recalculation or cache event accounts for the difference. The leading remaining area is src/runtime/site-asset-loader.js and the presence/absence of early VIP initialization, including interactions with CSS readiness. This is a hypothesis, not yet isolated causation. Do not add synthetic reflows, early drawer initialization, or delete essential Webflow CSS merely to silence the audit.
