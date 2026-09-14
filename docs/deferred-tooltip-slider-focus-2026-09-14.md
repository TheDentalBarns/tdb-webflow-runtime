# Tooltip and slider-focus extraction — 14 September 2026

Removes the two inline scripts from the Webflow site footer. The head, no-motion trial, Meta fallback, and slider movement settings are unchanged.

- `src/sliders/slider-focus.js` is bundled first in `dist/tdb-sliders.js`. It owns all shared chrome focus handlers: highlights, parallax, generic Swiper, native Webflow sliders, and logo strips.
- The existing slider motion loader retains its 800 px preparation margin and waits for both UI stylesheets and Swiper. The bundle can now arrive earlier for focus; motion initialization separately verifies slider CSS readiness.
- The focus-only loader watches 100 px around all supported slider roots plus pointer and keyboard intent. Native and logo strips do not request Swiper or slider CSS for focus. The two loading paths share the existing deduplicated script request.
- A bounded snapshot of the current pointer gesture or latest click/key preserves focus intent during a cold download. It does not replay DOM events or queue slide movements. A changed scroll position or a subsequent outside pointerdown discards that intent.
- `src/tooltips/tooltips.js` builds to `dist/tdb-tooltips.js`. The footer loader scans actual `.tooltip2_element-wrapper` targets. Pages without them request nothing and install no tooltip observers. On target pages, loading begins 600 px before the tooltip parent enters view, or on pointer/keyboard intent. The module retains edge flipping and pointer positioning, handles an already-hovered/focused tooltip, and observes added elements after loading.
- No tooltip markup was present in the inspected Home and Location pages or the saved crawl pages. Tooltip behavior was therefore verified with a fixture matching the selector/parent contract; no live tooltip visual check is claimed for absent elements.

Validation: 13 targeted tests passed, covering request gating, one request per module, all focus families, cold first clicks/drags without event replay, scroll cancellation, keyboard tooltip positioning, edge flipping, and slider stylesheet ordering/recovery.

Build selected outputs using `node tools/runtime-build/build.cjs dist/tdb-sliders.js dist/tdb-tooltips.js dist/tdb-footer-runtime.min.js`. The optional filenames let a partial checkout build only the changed outputs.

Deploy order: publish immutable module assets, pin those in the footer runtime, pin the footer runtime in the immediate loader, then update the Webflow footer to that immediate release and remove the two inline script blocks. Do not change CSS pins. Publish only to the Webflow staging subdomain.

Rollback: restore the saved pre-extraction Webflow footer and publish staging only. Its inline scripts and previous immediate-loader pin are self-contained; no Git history rewrite is needed.
