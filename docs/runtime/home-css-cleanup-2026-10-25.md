# Home CSS ownership cleanup 25 October 2026

Implemented against staging release `075679c6aaa6e8d16ad0e4413f1f88cf152d3f3b`.

Governing reference: [TDB Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd). Always consult that standard and applicable site rules before subsequent improvements.

## Ownership and behaviour

- Designer retains native geometry and transitions. Shared pace/easing references now live in 51 native style/breakpoint records. Preserve each original curve with a fallback and scale duration/delay exactly once. Existing JavaScript-resolved duration variables are final.
- The generated native timing adapter now retains only necessary Webflow stock controls, component variants, pseudo-elements and equal-specificity cascade guards. Audited export URLs, hashes and sizes live in `config/native-motion-provenance.json`; generation refuses unrecognised inputs. This is a build-time tool, with no new browser framework or request.
- Smile retains its complex local transitions and now consumes the control-easing token. Vimeo poster removal follows the profile's 450ms fade plus its existing 70ms allowance.
- Home's native Smile landscape holder uses its existing `data-tdb-home-smile-responsive` embed. Global UI excludes native-marked holders with zero-specificity exclusions; legacy selector specificity is preserved. The orientation/height condition is a documented existing-embed exception, not a new head style.
- Removed 26 exact repeated declarations from six feature sheets. Preserved vendor-prefixed blur transitions, 20px blur, all dimensions and deliberate state overrides.
- Review summary hydration updates accessible labels and visible ticker targets from one validated payload. Review clock/arrow failures recover after a bounded 1500ms wait, with labelled Prev/Next controls and reserved clock space; aborts and essential-image failures still reject.
- Quote refresh keeps the 800px preparation gate and shares pending enhancement. Explicit intent, retries and first-key replay remain supported. Runtime teardown invokes Smile disposal and clears busy state.
- Release inventory now checks JavaScript build targets and active literal JS/CSS dependencies in both directions, with compatibility fallbacks classified. Early UI verification tests current native/control readiness rather than obsolete fade rules.

Native export review caught and corrected Webflow's expansion of backdrop-filter into prefixed and standard properties: mobile menu timing lists now have four aligned entries. VIP arrow fallback delay is explicitly zero, matching the previous published stylesheet; existing focus logic remains the sole owner of its measured opening delay.

IX2 removal, new preparation distances, hero-priority experiments and the paused audio/Safari investigation remain separate work.

## Size comparison

Exact bytes, minified delivered files. Gzip uses Node level 9; Brotli uses Node defaults. These are consistent local compression comparisons, not measured CDN wire bytes. Six deferred sheets are counted once; unchanged stylesheets do not affect the net change.

| File | Raw before | Raw after | Raw change | Gzip before | Gzip after |
| --- | ---: | ---: | ---: | ---: | ---: |
| `dist/tdb-drawer.css` | 2,536 | 2,498 | -38 | 886 | 884 |
| `dist/tdb-instagram-native.css` | 11,523 | 11,513 | -10 | 2,677 | 2,674 |
| `dist/tdb-review-cards.css` | 13,487 | 13,468 | -19 | 3,331 | 3,329 |
| `dist/tdb-review-drawer.css` | 27,489 | 27,139 | -350 | 4,590 | 4,564 |
| `dist/tdb-smile-feed.css` | 22,326 | 22,312 | -14 | 3,483 | 3,477 |
| `dist/tdb-ui.css` | 30,558 | 19,005 | -11,553 | 4,704 | 3,930 |
| `dist/tdb-vip-content.css` | 11,755 | 11,558 | -197 | 2,385 | 2,371 |
| `native-0.css` | 31,579 | 31,579 | +0 | 8,358 | 8,358 |
| `native-1.css` | 177,736 | 186,469 | +8,733 | 29,798 | 30,377 |

Shared UI: **30,558 → 19,005 bytes**, down **37.8%**; gzip **4,704 → 3,930**, down **16.5%**.

Native Webflow CSS grows **8,733 bytes raw / 579 gzip**. Shared UI plus native CSS is down **2,820 raw / 195 gzip**. Including the six cleaned feature sheets, the net CSS saving is **3,448 raw / 248 gzip / 399 Brotli**. This separates deletion from moving bindings into Designer. Webflow's reserialization also expands some equivalent border/radius declarations; initial native CSS is larger, so this is not evidence of an LCP improvement.

The six distinct changed JavaScript bundles grow **1,662 raw / 397 gzip** for the approved correctness and recovery fixes (the quote alias is not double-counted). Across these CSS and JS assets together, raw bytes fall **1,786**, while gzip grows **149**. The principal result is clearer ownership and corrected behaviour; overall compressed transfer is effectively flat. No new network request is introduced.

Home HTML remained **184,915 raw bytes** through native publication. No head CSS was added.

## Acceptance and release

- Four engineering reviewers cross-reviewed the CSS, motion, lifecycle and fallback changes. Their findings produced the menu timing correction, zero-specificity holder exclusion and essential-image failure guard.
- `npm run build:all` passed, including the existing patched Swiper artifact check; the unchanged Swiper output remains 97,544 bytes.
- Final `npm run verify`: **757 passed, 3 skipped, 0 failed**. Covers generated parity, motion scaling/cascade, readiness, first input, quote eligibility/retry, artwork recovery/abort, summary hydration and disposal.
- Formatting, release inventory, standalone UI verification and `git diff --check` pass.
- Publish only to `dentalbarns.webflow.io`; never custom domains. Record the immutable install commit, CDN verification and live browser observations in the canonical architecture Page after release.
- Physical mobile Safari/Chrome and controlled network-failure visual checks are separate from the automated source tests and desktop staging smoke checks. No performance metric improvement is inferred from bytes.

## Rollback

Restore all four install references to the baseline commit together and republish staging only. The old adapter is compatible with the newly linked timings. For an exact native rollback, restore the saved Designer timing properties as well (including the original mobile timing lists and authored VIP delay) using the private pre-change snapshot, then publish staging. Exact global/Home custom code and Designer properties are retained in the private rollback archive, outside this public repository. Revert source with ordinary commits; do not rewrite history.
