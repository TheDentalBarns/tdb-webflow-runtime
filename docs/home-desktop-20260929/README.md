# Homepage desktop cleanup — 29 September 2026

Scope: Home, Webflow page 677cf86df9952f978d94d8a9, width >= 992px. Staging only.

- Banner follows the existing navbar transform when navigation is revealed.
- Smile Gallery and Instagram use normal fades and tickers despite reduced-motion preference, on desktop Home only.
- Treatment banners use the service container width, preserving mobile full width.
- Embedded reviews use First Impressions dimensions: min(30vw, 28rem) wide, width × 4/3 + 12rem tall, 20px gaps, five virtual cells, one opaque centre, half-opacity neighbours and viewport overspill. Controls remain inside the centre card.
- Desktop review locking preserves root/body overflow values and scroll geometry; inert siblings, wheel/touch guards, stopped Lenis and a scroll pin prevent background movement. Closing restores prior values and scroll handling.

Deployed source baselines: reviews 505495841b73e48bfe768aece6bfedb636d13e5e; Instagram 2fad009b6d71d82938b09240cd47704a81fbb044. Review data stays with the existing page data provider. Instagram reads the same existing immutable public JSON; no content snapshots are uploaded. Only desktop Home chooses the two new bundles. Other pages and mobile retain their existing bundle URLs.

Webflow integration: append src/styles/tdb-home-desktop.css in a style block to Home head; set Home footer preview.drawerScript and drawerIntegrity on desktop; use a desktop-Home condition for the Instagram URL and the Smile Gallery reduced-motion getter in site footer. Roll back by removing the Home page additions and reverting the two conditional changes in the site footer. No Webflow elements, CMS data or mobile rules are changed.
