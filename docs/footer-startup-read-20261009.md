# Footer startup position — 9 October 2026

Footer 1.6.4 moves the existing initial scroll snapshot into
`src/runtime/initial-position.js`, first in both footer build paths. Previously
the snapshot was first only within `site-asset-loader.js`; the bundled VIP focus
initializer had already changed classes and inert state before it ran.

The rest of the footer source is unchanged apart from the version. The existing
shared pageshow snapshot, lazy modules, native announcement asset, focus and
restoration behavior are retained. The build stays based on the deployed
`39648a92ae514e7a05bba9e90a469f58b6b20986` release.

The home-page candidate passed on mobile and desktop with motion 1.19.4 and
consent 3.0.1, including exact scroll and image-position restoration after reload.
No JavaScript errors were observed. This snapshot can still flush work pending
from other scripts; moving it first prevents the footer's own VIP initialization
from dirtying layout before the read.

Deploy by changing only `data-tdb-runtime-base` on the immediate runtime script.
Keep other loader, carousel, style and navbar references intact. Publish staging
only. Roll back that base to the previous SHA above if needed.
