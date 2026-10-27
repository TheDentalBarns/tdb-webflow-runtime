# Page-break photograph quality

Home and Location now use the existing 3840 × 2560 original for their macaron page-break photograph. Both previously enlarged a 600 × 400 derivative across the viewport. This is an instance image-property correction in the existing native **Page Break Image** component (`30d55327-1ca1-3a76-9cf2-5722b1366486`), not a new component or runtime feature.

The changed instances are Home `c871f84f-300c-a7aa-1eb2-f468b580de75` and Location `97a8ba4e-74a2-50a0-d6ae-62832e93112f`. Their Image property now references asset `696a2a3e5ac98e888821da6d`, replacing `699ec8eaf11f86bd7bb308a5`. The same photograph and existing alt text are retained. No other instance image was reassigned; the component has 34 instances site-wide.

## Ownership and maintenance

Designer continues to own the image, responsive geometry, lazy loading and crop. Its native export now supplies responsive candidates from 500 to 3840px and `sizes="(max-width: 3840px) 100vw, 3840px"`. The original asset is 116,132 bytes; the previous derivative was 17,494 bytes. Browsers can select a smaller candidate instead of always fetching the original. This is an intentional deferred image-quality tradeoff, not an added initial script or stylesheet request.

The existing `src/runtime/page-break-loader.js` discovers `data-tdb-page-break` and delegates vertical movement to `TDBMotion.pageBreaks` in `src/shared/motion.js`. The existing 600px preparation proximity, consent/runtime lifecycle, shared motion policy and crop bounds remain unchanged. There is no new per-instance motion override, custom attribute, Designer CSS, injected element, head code or JavaScript patch. The runtime pin remains `6623aa6f837afabee6a609dcbf0ba20c44f815c9`.

For future full-width image changes, select an adequately sized original in the native instance Image property, then inspect the published `srcset`, `sizes` and actual browser-selected candidate. Retain one image element and the existing shared motion owner.

## Validation

- Published Home retains 1,133 initial elements; Location retains 1,543. Each page retains two page-break image elements. Native and external stylesheet URLs and external script URLs are identical to the previous publish.
- Location at 1280 × 720 and 1.5 device-pixel ratio selects the 2000px variant. Its frame remains 1280 × 360, image 1280 × 396, with vertical translation changing during scroll. At 390 × 844 and 1 device-pixel ratio, a fresh load selects the 500px variant; frame height is 253.20px and image height 295.40px. Neither check has horizontal page overflow, and the image covers the frame during observed movement.
- Home at 1280 × 720 selects the 1600px variant and retains the same 360px frame and shared scroll movement. Screenshots confirm the same photograph and framing on both pages.
- Initial HTML retains the image and responsive candidates independently of JavaScript. A separate JavaScript-disabled browser and physical-device performance were not tested. No new automated tests were appropriate for this native image-property edit, and the unchanged runtime suite was not rerun.

| Whole-page HTML | Raw byte change | Controlled gzip byte change |
| --- | ---: | ---: |
| Home | +982 | +55 |
| Location | +1,144 | +48 |

The whole-page comparison includes normal publish output beyond the two asset substitutions: Webflow remeasured native image `sizes` values, including both page-break instances on each page, and CMS partner lists changed output order. Their photograph selections and component structures were not edited. No custom sizing override was needed. These byte counts are not a speed or LCP measurement.

## Delivery and rollback

Published to the Webflow staging subdomain only, task `a1c7ac1c-b36d-4814-8953-6531105d64d2`. Before/after HTML, attribute comparisons, original instance values and desktop/mobile screenshots are saved in the workspace `page-break-evidence` directory. The existing engineering ownership and loading policies remain unchanged.

To revert the asset substitution, set the two named instances' Image property back to asset `699ec8eaf11f86bd7bb308a5` and republish staging. Do not change the shared component definition or runtime pin. Retain both assets for reversible selection.
