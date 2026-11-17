# Native lazy masks without head overrides

The icon masks in Smile Gallery, service FAQ categories, the calculator and the treatment guide previously needed nine rules in both the global head and asynchronous UI sheet to override eager native SVG URLs. Designer now owns their variable-driven mask-image values, including the FAQ pseudo-elements and responsive guide barn overrides. The obsolete shared override source is removed from both bundles.

The existing TDBLazyIconMasks controller still releases the same shared asset URLs after consent and within 400px of the viewport. Guide ticker copies inherit the section artwork variables. No observer, DOM node, animation or appearance change was added. Header/control startup guards remain in the critical CSS.

On 17 November David explicitly approved empty decorative icon slots in Designer and without JavaScript. Reserved geometry and all text remain native. Published icons appear when the existing lazy controller runs; blocked JavaScript leaves the decorative slots empty. There is no preview-only patch or replacement head script.

`config/native-lazy-masks-designer.json` records the exact 24 native property updates across 21 styles. The prior guide configuration is updated to the same ownership. Existing standalone Smile icon classes are retained for other consumers; the current gallery combo classes own the deferred values.

The release starts at 53925ff1007a65fe1159d4ec70d9daf65cfe5b43, preserving the current Home hero work and the earlier Instagram/carousel fixes. It descends from current main. No production publication is part of this change.

## Acceptance

- Critical CSS contains no mask property or artwork URL; shared UI has no replacement rules for these native masks.
- Native published CSS owns the transparent fallback before JavaScript, including all guide barn breakpoints.
- Offscreen mask URLs remain unset; the existing proximity callback releases the correct artwork without changing dimensions.
- Guide ticker copies retain artwork. Service FAQ headings, calculator trigger and Smile filters/cards remain usable after scroll and interaction.
- Existing consent, teardown and no-IntersectionObserver behavior passes the focused tests.
- Check native CSS, shared CSS, generated output and browser appearance separately. Bundle byte savings alone do not establish a performance gain.

## Rollback

Restore the saved 17 November Webflow style properties and global head/footer blocks, then publish staging. The private pre-change snapshots stay outside the repository in native-lazy-masks-20261117. Source rollback is an ordinary revert; immutable deployed releases remain available.
