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
