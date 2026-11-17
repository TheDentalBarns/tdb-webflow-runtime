# Native lazy masks without head overrides

The icon masks in Smile Gallery, service FAQ categories, the calculator and the treatment guide previously needed nine rules in both the global head and asynchronous UI sheet to override eager native SVG URLs. Designer now owns their variable-driven mask-image values, including the FAQ pseudo-elements and responsive guide barn overrides. The obsolete shared override source is removed from both bundles.

The existing TDBLazyIconMasks controller still releases the same shared asset URLs after consent and within 400px of the viewport. Guide ticker copies inherit the section artwork variables. No observer, DOM node, animation or appearance change was added. Header/control startup guards remain in the critical CSS.

On 17 November David explicitly approved empty decorative icon slots in Designer and without JavaScript. Reserved geometry and all text remain native. Published icons appear when the existing lazy controller runs; blocked JavaScript leaves the decorative slots empty. There is no preview-only patch or replacement head script.

`config/native-lazy-masks-designer.json` records the exact 24 native property updates across 21 styles. The prior guide configuration is updated to the same ownership. Existing standalone Smile icon classes are retained for other consumers; the current gallery combo classes own the deferred values.

The release starts at 53925ff1007a65fe1159d4ec70d9daf65cfe5b43 and merges the concurrent hero update 03343bef2f4a35b7eb7510be943d9015d1ba6c7c, preserving the current Home hero work and the earlier Instagram/carousel fixes. It descends from current main. No production publication is part of this change.

## Acceptance

- Critical CSS contains no mask property or artwork URL; shared UI has no replacement rules for these native masks.
- Native published CSS owns the transparent fallback before JavaScript, including all guide barn breakpoints.
- Offscreen mask URLs remain unset; the existing proximity callback releases the correct artwork without changing dimensions.
- Guide ticker copies retain artwork. Service FAQ headings, calculator trigger and Smile filters/cards remain usable after scroll and interaction.
- Existing consent, teardown and no-IntersectionObserver behavior passes the focused tests.
- Check native CSS, shared CSS, generated output and browser appearance separately. Bundle byte savings alone do not establish a performance gain.

## Rollback

Restore the saved 17 November Webflow style properties and global head/footer blocks, then publish staging. The private pre-change snapshots stay outside the repository in native-lazy-masks-20261117. Source rollback is an ordinary revert; immutable deployed releases remain available.

## Staging verification, 17 November 2026

- Deployed runtime: `2097ee5687d95e8298f23dcb3322ca852fdd310a`. All four global runtime pins use this release. Webflow publish task: `8af5e97d-24f0-436d-9824-cd180b807434`; `customDomains: []`, `publishToWebflowSubdomain: true`.
- Full build passed. After merging the concurrent hero update, the complete verification suite passed: 1,188 tests, 3 skipped, 0 failures. Focused mask checks passed before the merge as well.
- The public CDN matches the exact committed critical CSS, shared UI CSS, foundation, startup and motion artifacts. Critical CSS is 306 bytes; shared UI CSS is 27,394 bytes. The mask removal saves 2,158 raw bytes in each CSS location.
- Published source checks passed for Home, Pricing, Careers, Hygiene Care, Smile Gallery and Veneers: no critical-head mask declarations, no removed shared-UI overrides, and all 24 native property/breakpoint checks correct.
- Browser checks at 1280px and 390px confirmed transparent offscreen fallbacks and SVG artwork after proximity. The guide group released when its intro reached 827px in a 720px viewport; the calculator remained deferred further down and rendered at 482px without a size change.
- Guide chapter changes, mobile barn artwork, FAQ category expansion, gallery filters and cards, and the mobile filter drawer retained their icons. Hidden filter artwork became available on opening. The temporary viewport override was reset.
- Private screenshots and source verification reports are retained outside this repository in the task folder. Production was not published.
