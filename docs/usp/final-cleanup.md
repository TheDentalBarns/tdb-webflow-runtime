# USP final cleanup — 8 October 2026

Adapter: `src/usp/drawer.js` / `dist/tdb-usp-drawer.js`, version 2.1.1.

The five Banner USP item wrappers now use native `tdb-usp_item`, with the same
base and mobile layout properties as their former `banner-feature_item` class.
This detaches the component from four class-targeted IX2 click events:

| Event | Action | Name |
| --- | --- | --- |
| e-109 | a-15 | Modal 1 [Open] |
| e-686 | a-94 | Modal 1 [Open] 2 |
| e-750 | a-96 | Modal 1 [Open] 3 |
| e-832 | a-98 | Modal 1 [Open] 4 |

Those global action definitions remain in Webflow for other page consumers.
The MCP interactions surface supports IX3, not deletion of legacy IX2
definitions. No runtime event suppression or IX2 reinitialisation is used.

The USP pagination now uses the review drawer's native
`tdb-review-drawer_position`, `tdb-review-drawer_current` and
`tdb-review-drawer_rule` classes. It inherits the same cream footer colour and
tabular numbers, and uses the same separator line. Both arrow SVGs retain their
shared class and previous-arrow rotation; the redundant USP sizing token is
removed.

The following native classes were removed after their component uses were
replaced and a home-page query found no remaining consumers:
`tdb-usp_arrow`, `tdb-usp_arrow-icon`, `tdb-usp_position`, `tdb-usp_number`.

Content and launch binding now use explicit data attributes:
`data-tdb-usp-source-title`, `data-tdb-usp-source-logo`,
`data-tdb-usp-source-body`, `data-tdb-usp-trigger-zone` and `data-tdb-usp-label`.
All existing component property bindings and content remain on their native
elements. The adapter no longer queries legacy modal/design class names for
content, or the banner layout class for activation. Unused `last` state was
removed. Shared drawer, Swiper, motion, ticker and loading behavior are retained.

Earlier HTML/CSS files in this folder are historical migration snapshots, not
current stylesheets or templates to reimport. Designer is authoritative for the
current structure and native style definitions.

Published to the Webflow staging subdomain only with immutable runtime
`7ac3cc08d2c849d7291471016f637450fdd0dfbd`.

Published-asset checks passed in Chromium at 1440×1000, 390×844, 852×393 and
667×375. The smaller viewports used touch emulation. All five source records
resolve through their new data hooks; no old USP control/ticker class remains
in the section, and no published IX2 event target matches the USP root or any
of its descendants. Native item dimensions and computed layout match the
pre-cleanup published class at every tested width. The old class is omitted
from the home page's optimized CSS after removal from the component.

USP/review ticker colour, font family, size, weight, number variant and spacing
match exactly at each viewport. Touch navigation, loop wraparound, vertical
landscape scrolling, floating X, footer anchoring, portrait/landscape rotation,
shared arrow focus feedback and closure all passed. No browser errors were
reported. Published portrait/landscape screenshots were visually inspected;
syntax and whitespace checks passed.
