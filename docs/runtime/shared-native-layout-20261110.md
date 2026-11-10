# Shared native layout corrections

These changes are authored in Webflow Designer. They add no runtime CSS, JavaScript or embed. The runtime remains pinned to `63f9e476c2d314838d7bdfd0becdfbb0dcdbb546`.

## Hero play control

The base `.vimeo-controls-layer.tdb-hero-toggle` had `padding-left: 2%` and `padding-right: 2%` overriding its existing `padding: 0px 0px 1rem 1rem`. The pulse pseudo-element is positioned at `left: 1rem; bottom: 1rem`, so the glass control drifted right on desktop. Remove the two percentage overrides. The native shorthand restores the matching inset; the medium/mobile overrides and the pulse animation are unchanged.

## Background section

Home and Pricing already used `Component 1 - Bg image` (`492cd62a-b903-e2d4-f435-238f82e688a2`) but selected its older `Scroll media` layout. Both now select the existing `Service scroll media` variant (`900ba2eb-3d91-913c-652e-e7ca8592d1d1`) used by the Services template. This gives them the same full-width heading/benefits row, lower right copy and responsive layout. Their content, media and button properties remain unchanged. Both variants are already supported by the shared background-motion controller.

Changed instances:

- Home `677cf86df9952f978d94d8a9` / `83594d66-709e-dbb3-1e6c-3a9213afc199`.
- Pricing `677cfbbb752fa1bb44264481` / `efffb49c-1e44-0564-e0b7-426d31219221`.

## FAQ introduction

The shared `.tdb-service-faq-intro` lower margin now matches the native `.padding-section-large` top padding: 7rem at main, 6rem at medium, 4rem at small and 8rem at tiny. The change is in the component's shared native class, so every rendered Services FAQ instance receives it. The FAQ copy, buttons and disclosure behaviour are unchanged.

## Rollback

Restore the hero's two main-breakpoint percentage padding overrides. Set the two background instances' Variant property (`360be618-b3cb-1dfe-a888-ce146e7d571d`) back to `39349468-08e4-a5fc-a1d3-bb55f3e3452b`. Restore FAQ main margin-bottom to 4rem and remove the medium/small/tiny overrides. Publish only the Webflow staging subdomain. Exact native before/after snapshots and screenshots are retained privately outside this repository.

## Staging verification

Published to the Webflow subdomain only, task `a418a81e-8a22-480d-bfb7-56086b137e93`.

- Home hero at 1280px and 1920px: glass and pulse left/bottom coordinates agree within 0.01px. At 390px, the control retains its original 13.625px left position and 54.51px diameter.
- Home, Pricing and Signature Assessment publish `service-scroll-media`. At 1280px their benefits rows all span the 1203.21px content width, with lower copy in the right 601.60px column. At 390px, all use the same 351px single-column layout without horizontal overflow. Height remains content-dependent, as on Services.
- FAQ top padding and bottom margin match at every checked breakpoint: 103.835px at 1280px, 86.0045px at 800px, 56.5038px at 600px, and 109.021px at 390px.
- These are native geometry changes; browser measurements and screenshots were used for validation. No runtime build or new JavaScript tests were needed.
