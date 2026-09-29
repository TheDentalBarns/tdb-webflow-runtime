# Homepage desktop cleanup — 29 September 2026

Scope: Home, Webflow page 677cf86df9952f978d94d8a9. Initial fixes apply at width >= 992px. Requested follow-ups add review footer styling and static review metadata on mobile too. Staging only.

- Banner follows the existing navbar transform when navigation is revealed.
- Smile Gallery and Instagram use normal fades and tickers despite reduced-motion preference, on desktop Home only.
- Treatment banners use the service container width and visible neighbouring slides, preserving mobile full width.
- Embedded reviews use First Impressions dimensions: min(30vw, 28rem) wide, width × 4/3 + 12rem tall, 20px gaps, five virtual cells, one opaque centre, half-opacity neighbours and viewport overspill. Controls remain inside the centre card. Summary quotes are visible only in the centre; section and title spacing use the native 7rem desktop values.
- Desktop review locking preserves root/body overflow values and scroll geometry; inert siblings, wheel/touch guards, stopped Lenis and a scroll pin prevent background movement. Closing restores prior values and scroll handling.
- Review cards have a moving 6rem footer matching the quote header background. The stationary controls layer stays transparent, with dark cream arrow icons and outlines. This explicitly requested footer styling applies on mobile as well. No page-edge gradient is used.
- Fixed metadata panels preserve the positions of quote marks, author name, black clock, date, source icon and individual stars. Names and source changes follow carousel direction; dates roll chronologically; only changed stars roll between filled and faint. Quotes have a four-line maximum, vertically centred beneath fixed quote marks. These requested metadata changes apply to desktop and mobile Home.
- Quote marks and all metadata are visible only on the focused card. Neighbouring cards show only the faded review body; their Read more controls and historic-practice labels are hidden too.
- For a four-line quote, the space above the quote marks, between the marks and text, and below the text is equal. Shorter snippets stay vertically centred inside the same reserved four-line area.
- Previous-practice attribution sits at the bottom left of the review body opposite Read more. Both use dark cream and appear only on the focused card.

Deployed source baselines: reviews 505495841b73e48bfe768aece6bfedb636d13e5e; Instagram 2fad009b6d71d82938b09240cd47704a81fbb044. Review data stays with the existing page data provider. Instagram reads the same existing immutable public JSON; no content snapshots are uploaded. Home chooses the new review bundle at all widths for the explicitly requested metadata update. Only desktop Home chooses the Instagram bundle. Other pages retain their existing bundle URLs.

Webflow integration: append src/styles/tdb-home-desktop.css in a style block to Home head, followed by window.TDBHomeDesktopReviewSource containing the pinned homepage drawer URL and SHA-384 integrity. The Hero - Headline Power Snippets embed chooses that source only on Home before starting its existing lazy loader. Defining the source in the head avoids a footer/observer loading race. The Instagram URL and Smile Gallery reduced-motion getter in site footer check desktop Home. Roll back by removing the Home head additions, restoring the original data-based drawer loader, and reverting the two conditional changes in site footer. No CMS data or native layout elements are changed; only the requested review follow-ups affect mobile.
