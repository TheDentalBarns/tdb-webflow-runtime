# UI ownership follow-up — 13 October 2026

Base: the exact staged `716f48d913168ce00cfcc2546fb594ebe5182ebe` release. Unrelated runtime pins are preserved.

- Slider focus coordination moves to `tdb-slider-ui.css`; the standalone focus loader now waits for that CSS too.
- VIP navigation coordination loads in `tdb-vip-chrome.css` before VIP JavaScript, including native Designer drawers that bypass legacy VIP layout CSS.
- Announcement ready/hide states and its gallery/VIP/navbar relationships move to `tdb-announcement.css`.
- All original motion declarations, including return/resting states, remain with their owners. Feature styles stay applied after closing.
- Shared 420ms clock, pulse/spinner effects and reveal variables remain in global UI.
- Native `tdb-copy-paragraphs` styles preserve literal line breaks in 19 shared component elements and 5 Services template elements.
- DD opacity guards are removed from global UI. Designer owns the visible baseline: the benefit strip was 0.5 and is now 1; other inspected targets already compute to 1. Explicit native defaults were also added to shared tagline, mini-review, footer-copy and icon styles.
- The empty quote-section CSS hiding rule is removed as requested.

## Deliberate exception

Paragraph sibling spacing remains in UI. Webflow's native style tool cannot create the exact `.w-richtext > p + p` selector, and WHTML explicitly rejects child/sibling combinators. Replacing it with blanket paragraph margins would change typography. No head/footer CSS workaround was added. Existing general 1.25em and section-specific 1em spacing remains exact.

## Size and checks

Global UI: 6,501 → 3,264 bytes (49.8% smaller); gzip 1,786 → 1,248 bytes. This is mostly deferred ownership, not deleted functionality. VIP adds one small conditional 405-byte stylesheet.

`tests/ui-modular.test.cjs` checks declaration preservation except the explicitly removed/native replacements, consent/video/announcement dependencies, focus CSS readiness, and native VIP coordination readiness. The generated UI and footer runtime are checked against their sources and JS syntax.

Browser checks with global UI and JavaScript excluded confirmed opacity 1 and native pre-line text on 10 representative pages/templates, including VIP, Services, Treatments, About and Home (289 DD targets, 84 line-break targets). Results are recorded in `ui-ownership-native-checks-20261013.json`.

Desktop (1440px) and mobile (390px) browser checks verified VIP coordination CSS is present before opening, VIP open/close, the existing 420ms navbar return transition, slider focus activation and release after scrolling, and native line breaks. No page JavaScript errors were reported. These pre-publication checks route only this release’s changed assets locally; the final CDN pins are checked after publication.

Native replacements are published first with the existing runtime intact. Then update only the global UI URLs and the site/home footer runtime-base overrides to this release. Publish to the Webflow subdomain only.

Rollback: `ui-ownership-before-20261013.json` preserves custom code, affected native styles and element style lists. Restoring the old runtime pins immediately restores the old global guards; the equivalent native defaults can remain during rollback.
