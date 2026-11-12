# First Visit CSS cleanup — 12 November 2026

The First Impressions stylesheet contained superseded versions of its layout and controls. The cleanup consolidates the final live styles and removes unused selectors while preserving the published carousel. It follows the [First Visit standards audit](first-visit-audit-20261112.md); it does not change that audit's IX2 boundary.

## Change and ownership

Release `d7d1bcd7a137ad1e2890ac4bcdb3815963759dc8` changes only `src/styles/tdb-first-impressions.css` and its generated `dist/tdb-first-impressions.css`.

- Removed overwritten centred/absolute-card layout declarations and duplicate width, height, offset, banner, navigation, date and counter rules.
- Removed selectors for old inline SVG controls and per-card metadata that the current renderer does not produce. The eight obsolete selector groups also had zero matches in the captured hydrated DOM.
- Removed two unused custom properties. Kept the hidden legacy CMS-feed selector because the renderer still supports that fallback.
- Preserved the native frame, left focus, contained portraits, mirrored strips, 20px blur and 150% saturation, shared motion, breakpoints, controls, keyboard behavior and hidden holding state. Source is formatted for maintenance.

Designer still owns static layout and reserved holding geometry. The deferred feature stylesheet owns the generated carousel internals. No HTML, JavaScript, media, loading gate, consent rule, readiness contract, fallback or request count was changed.

## Cost

| First Impressions CSS | Before | After | Saving |
| --- | ---: | ---: | ---: |
| Delivered raw bytes | 7,627 | 5,939 | 1,688 (22.1%) |
| Local gzip level 9 bytes | 2,074 | 1,797 | 277 |
| Rules | 72 | 50 | 22 |
| Declarations | 271 | 212 | 59 |

These are stylesheet measurements, not a whole-page transfer, timing or Lighthouse improvement claim. The stylesheet remains deferred behind its existing preparation gate.

## Validation and staging

- `npm run build:all` passed. The locked custom Swiper build remains 99,100 bytes.
- `npm run verify`: 1,103 tests, 1,100 passed, three existing skips, no failures. Prettier and `git diff --check` passed. No incoming changes were found in a fresh fetch of `main`.
- At 1440×1100, 768×1024 and 390×844, 45 computed properties on 17 representative nodes matched the previous release exactly when compared on the same initial slide/state. No horizontal page overflow was detected. Desktop next/previous controls and mobile left/right keyboard navigation worked. The loading holder, images, reflection/glass, focus outline and initially closed USPs were observed in the separate in-app browser. No browser errors were logged; temporary viewport overrides were reset.
- All 78 declared release assets were retrieved. 77 matched the built bytes exactly. jsDelivr adds a 341-byte informational skipped-minification comment to `tdb-logo-marquee.min.js` at this release; after verifying that exact CDN comment and immutable source path, its full executable body matched the local build and committed blob byte-for-byte. This is unrelated to the CSS change. The raw saving across those two affected delivered files is therefore 1,347 bytes.
- All four install references use the new immutable release. Only the Webflow subdomain was published, with `customDomains: []`; publication task `dbbd932b-b5b6-463d-8621-aff2deb6b1e8`. The browser loaded the new First Impressions stylesheet and a single runtime release.

Private source backups, size/CDN reports, computed-style comparisons, rendered HTML and screenshots are retained in the task's `css-cleanup` evidence directory. No new test or audit framework was added. A new Lighthouse run and physical Safari test were not performed.

## Remaining cleanup boundary and rollback

Unused shared Webflow classes and the site-wide IX2 engine remain candidates for a separate cross-page/component usage inventory. Absence from First Visit alone is insufficient evidence for deleting shared authoring styles. Historical compatibility assets remain in the repository but are not installed by First Visit's empty compatibility feature list or present in its captured runtime script URLs; deleting them would not reduce this page's downloads.

Rollback: restore all four custom-code references together to `57b420c8ae1e4196e8d70e9f6b07a8823027aa00` using the exact private head/footer backup, then publish staging only. No native Designer rollback is needed. Revert source through a normal commit without rewriting history.
