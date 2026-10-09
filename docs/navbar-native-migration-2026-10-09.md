# Navbar native foundation v1.0.0

Replace the Navbar New IX2 visual layer while preserving native Webflow navbar
and dropdown input, ARIA, focus, keyboard, link navigation and breakpoint logic.
The existing v1.0.0 consent-gated navbar loader and v1.4.4 enhancement remain at
commit `8dda1ef4d208309ee6715f4a122a2ee0196aa131` without modification.

## Ownership

- Designer: component structure, content, bindings, shared artwork and layout.
- Shared disclosure CSS: opt-in `data-tdb-chevron` rotation, normally 300ms ease.
  An accordion can override `--tdb-chevron-duration:400ms` when migrated later.
- `TDBDisclosure.observe(trigger, render, read?)`: small state observer available
  immediately, independent of the navbar and of consent. It does not add input
  handlers or overwrite the component's accessibility state.
- Navbar CSS: hamburger movement/rotation/width; basic desktop dropdown fade;
  mobile dropdown fade/lift and delayed 20px sibling spacing.
- Existing enhanced navbar: measured desktop panel heights, surface/text motion,
  scroll thresholds, scroll locks, focus handling, backdrop and consent handoff.

## Deployment

Add `data-tdb-navbar-native="1.0.0"` to the Navbar New root and
`data-tdb-chevron=""` to its Services and Discover icon embeds. Include generated
`dist/tdb-navbar-native.css` and `dist/tdb-navbar-native.js` once in the site head,
before Webflow runs. Inline inclusion is intentional: the selective IX2 handoff
must happen while the navbar is parsed, without a network race or a consent wait.
The release comment identifies the immutable Git commit containing that source.
The shared observer is bundled into the initial navbar script, not loaded twice.

The handoff disconnects only the three exact Navbar New interaction handles,
preserving their values in `data-tdb-nav-previous-id`. Those handles map to
`e-298`, `e-299`, and `e-588` through `e-595`. All other IX2 triggers are retained.
Webflow's available tools cannot remove legacy IX2 definitions: those definitions
remain dormant in Designer and the published IX2 bundle. They can be removed
manually after review, followed by removal of this parser bridge. Do not delete
shared action lists without checking other Navbar instances.

## Preserved motion

| Effect | Open | Close |
| --- | --- | --- |
| Chevron | 180deg, 300ms ease | 0deg, 300ms ease |
| Hamburger top/bottom translation | +/-8px, 400ms inOutQuint | 0px, 600ms inOutQuint |
| Hamburger top/bottom rotation | -/+45deg, 600ms inOutQuint | 0deg, 400ms inOutQuint |
| Hamburger middle width | 0px, 200ms | 24px, 200ms after 400ms |
| Mobile dropdown | -20px to 0, 300ms outQuad; linear opacity | native immediate hide |
| Mobile sibling spacer | 20px, 300ms outQuart after 300ms | 0px, 300ms outQuart |

The original polynomial easings are sampled for CSS `linear()` with standard
cubic-bezier fallbacks. Breakpoint remains 992px: tablet, mobile landscape and
mobile portrait receive the same mobile rules. Existing scroll/surface logic
retains its separate 768px breakpoint and full-motion review policy.

## Build and rollback

Validation completed before deployment: three automated checks cover selective
IX2 isolation, rapid native state changes/closing, and use of the shared observer
without a navbar. Additional checks against the current Home, First Visit and
Location HTML preserve all 34 navbar links on each page, retain all unrelated
IX2 handles and correctly associate both dropdown spacers. JavaScript syntax
checks pass. The existing desktop Services menu was also inspected in-browser.

Live testing of the replacement remains pending deployment, including mobile
and tablet visual checks. David approved publication to the existing runtime
repository on 9 October 2026; deployment is to staging only.

Run `node tools/build-navbar-native.cjs` with terser installed, then
`node --test tests/navbar-native.test.cjs` with jsdom installed.

Rollback: remove only the `data-tdb-navbar-native-foundation` script/style blocks
from site head and publish staging. The original authored IX2 handles and event
definitions are still present, so they take ownership again on reload. Remove
the opt-in component attributes when abandoning the migration permanently.
No production-domain publish is part of this release.
