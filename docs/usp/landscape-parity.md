# USP landscape reading and shared arrow feedback — 8 October 2026

USP adapter `src/usp/drawer.js` / `dist/tdb-usp-drawer.js`: version 2.1.0.

The USP drawer now uses the review drawer's phone-landscape condition:
landscape orientation, width at most 991px, height at most 500px and a coarse
pointer. A wide desktop window does not activate this mode.

Designer owns seven new `is-phone-landscape` combo classes. The existing USP
content root becomes the single scrolling pane; the header, carousel viewport
and footer sit in normal flow. Slides use their natural content height without
nested scrolling or the fixed-header/footer padding. The close button uses the
existing shared Drawer Shell landscape class, keeping its position and blurred
background above the scrolling content.

The adapter switches native classes and Swiper's existing `autoHeight` option.
It follows the review drawer's scroll-anchor rules: preserve the reading offset,
or the distance from the bottom when the footer is in reach. This keeps the
arrows accessible while moving between cards of different heights, including
loop wraparound. Rotation restores the usual fixed header/footer arrangement
and removes Swiper's landscape track height. No stylesheet, control markup,
layout CSS or IX2 interaction is added by JavaScript.

Touch navigation was functional but had no visible focus state. The shared
Designer `tdb-review-drawer_nav-button` class now has a native focus state matching
its existing hover/active colours. Both USP and review arrows highlight after
a tap and return to the resting colour when focus moves away. Disabled review
arrows retain their neutral style. No separate touch handler or arrow pulse is
required.

Local candidate checks passed against current staging HTML and assets at
852×393 and 667×375 with touch input, 390×844 portrait and 1440×1000 desktop:

- Real vertical touch gestures scroll the landscape pane and header; X stays put.
- Previous/next taps work, with six forward steps covering loop wraparound.
- The footer stays at the bottom of the visible pane as card height changes.
- Native focus feedback appears after a tap and clears when tapping elsewhere.
- Landscape → portrait → landscape rotation restores each layout and navigation.
- Shared review-arrow focus feedback also works in landscape.
- No browser errors in these checks; landscape screenshots visually inspected.

Designer style additions are recorded in `landscape-native-styles.json`.

Published to `https://dentalbarns.webflow.io/` only with immutable runtime pin
`ec30e1200c1a629bde020d0b75dd3d3b48a1ceee`. The CDN file matches the source.
All four viewport checks above passed again against the published Webflow HTML,
native CSS and runtime, without temporary CSS or a substituted adapter. Actual
Chromium touch events were used for landscape scrolling and arrow taps; this
was browser touch emulation, not a physical-device Safari test. Published
landscape and portrait screenshots were visually inspected. Syntax and diff
whitespace checks passed. No production domain was published.
