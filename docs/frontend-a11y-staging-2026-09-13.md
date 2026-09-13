# Staging candidate: VIP keyboard lifecycle and nested consent

This candidate preserves the approved homepage and other-page drawer runtimes separately. It adds a bundled focus/accessibility module before the footer loader starts preparing components. It adds only higher-cookie-dialog guards to the two drawer variants. Do not collapse them to one runtime or repoint to repository main.

## Sources and outputs

- `src/vip-drawer/vip-focus.js`: new focus module, bundled first into `dist/tdb-footer-runtime.min.js`; no extra request.
- `src/vip-drawer/vip-drawer.js`: homepage source, baseline0.5.1 →0.5.2, nested-consent guards only.
- `src/vip-drawer/vip-drawer-legacy.js`: other pages, exact deployed432ab3 readable source →0.5.0-a11y.1, same guards only.
- `dist/tdb-vip-drawer.js` and `dist/tdb-vip-drawer-legacy.js`: separate built distributions.
- `tools/runtime-build`: locked Terser5.44.0 build. The baseline footer/immediate rebuild byte-for-byte; homepage drawer matches when preserving its final newline.
- `tools/runtime-tests/vip-focus-layer.test.cjs`: focus lifecycle, value preservation, genuine legacy peek, nested dialog, close/reopen and initial hash checks.

The loader keeps its original pins until `tools/pin-runtime-release.py` is run with newly verified commit SHAs. The initial build is an offline candidate, not the final publishable chain.

## Ordered immutable commits (root agent only)

Starting parent: `c868196ea7711143c3182090246124a6c79b86b5` on `codex/frontend-housekeeping-20260913` (root's CSS-only commit). This specialist did not edit CSS.

1. **Commit A: guarded drawers and focus/build sources.** Include new sources, built drawer distributions, tests, build package/lock/workflow and this record. Keep existing loader pins for now. Verify both new drawer URLs at commit A return the exact locally built SHA256 bytes.
2. Run `python tools/pin-runtime-release.py drawers FULL_SHA_A`. This changes only the homepage/legacy drawer dependencies and footer version; updates the test's expected legacy URL. Run the locked build and tests. **Commit B: footer pinned to guarded drawers.** Verify its exact `dist/tdb-footer-runtime.min.js` response. It contains the early focus layer.
3. Run `python tools/pin-runtime-release.py footer FULL_SHA_B`. This changes only the immediate runtime footer dependency and its release label. Rebuild, verify unchanged siblings, and **commit C: immediate runtime pinned to B**. Verify its CDN bytes.
4. Root updates only the staging Webflow global footer's immediate URL/comment to commit C and publishes staging. Any separately tested CSS change is owned and recorded by root. No custom-domain publish.

Never invent a placeholder commit in a deployed URL. Never point the final immediate script to commit B unless B's footer really references commit A. Keep original pins recorded for rollback.

## Local build and checks

```sh
npm ci --ignore-scripts --prefix tools/runtime-build
npm run build --prefix tools/runtime-build
npm ci --ignore-scripts --prefix tools/runtime-tests
TDB_RUNTIME_FILE="$PWD/dist/tdb-footer-runtime.min.js" TDB_VIP_FILE="$PWD/dist/tdb-vip-drawer.js" npm test --prefix tools/runtime-tests
TDB_VIP_SOURCE="$PWD/dist/tdb-vip-drawer-legacy.js" node --test tools/runtime-tests/vip-focus-layer.test.cjs
```

The audit machine can use its already verified local Terser module via TDB_TERSER_MODULE, and installed jsdom via NODE_PATH. These are local dependency overrides only; CI uses the committed exact packages/lockfiles.

Baseline source differences and test results are preserved in the audit evidence. Initial integrated build is footer17,784 decoded bytes versus14,482 baseline (+3,302), same2,493-byte immediate prior to its pin change, homepage drawer9,834 bytes versus9,741, and minified legacy9,616 versus its15,617-byte readable deployed predecessor. Those decoded figures are not network savings or measured performance results.

## Browser gates

Verify homepage, VIP landing and Smile Gallery on desktop/tablet/mobile. Check cold keyboard use, no closed offscreen focus targets, explicit-open focus inside drawer without automatically focusing a text field, Tab/Shift+Tab wrapping, Escape/restored origin, values and native validation, pointer/touch open/close, scroll-peek thresholds, breakpoint changes and fresh#VIP URLs. Test cookie settings both already open and opened over VIP; both choices must work, upper dialog owns Escape/scroll, focus returns correctly. Keep each existing menu/gallery overlay state intact.

No form submission is needed for these checks. If the measured first-load result or visual/interaction behaviour regresses, restore the previous global footer string and publish staging. Keep source commits for review; never move production as part of this test.

## Rollback

Global immediate script before this candidate: `https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@fbeac3b3aba3c662aa2f89acba175616e85b4605/dist/tdb-immediate-runtime-batch.min.js`. Its footer is66a28eb, homepage drawer5f162a6, other-page drawer432ab3. Restore the exact saved global footer from root's baseline rather than manually reconstructing unrelated code.
