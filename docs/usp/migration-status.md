# USP native drawer migration — 8 October 2026

Completed after David approved the public repository upload and staging publishing.

- Runtime: src/usp/drawer.js and dist/tdb-usp-drawer.js v2.0.0.
- Published immutable runtime: e598d69c6385b6dd6df3c89f82a43fbb497a33d8.
- Webflow site: 677cf86cf9952f978d94d80c; staging only, no production domains.
- USP Drawer component: b0e9aba4-e002-1e83-1542-b8a3ea2bdecb.
- Shared Drawer Shell instance: cd5381d0-5d0c-07f8-b04f-b9b49009c052 inside Banner USP.
- Native launch controls display:flex. Source wrappers use tdb-usp_source only.
- Portrait banner-feature_item-content width is 100%, removing the legacy 6rem override.

Designer owns the strip, launch arrows, drawer surfaces, responsive layout and template.
The adapter uses shared TDBDrawer, TDBSwiper, TDBMotion and TDBNativeTicker through
the existing dependency registry; no CSS is injected. Five native content sources
retain their original component property bindings.

Published staging checks passed at 1440x1000, 834x1194, 390x844 and 852x393:
direct entry, next, Escape and closure; one shared drawer script and one Swiper
engine, no USP page errors. Native first-paint checks confirm hidden drawer/sources
and the 3+2 portrait layout with full-width triggers. Local checks additionally
cover wrap, drag, rapid navigation, scroll memory, focus trap, return and unlock.

Retired close/backdrop elements and Finsweet hooks were removed. IX2 list deletion
has no supported API: inspect other Modal 1 consumers before manually deleting
unused action lists. USP no longer uses the retired modal targets.

Prior approval block is resolved. Designer snapshots in this directory record the
pre-migration state; the CSS/HTML files document the native component import.
