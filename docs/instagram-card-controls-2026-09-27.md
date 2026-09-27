# Instagram card controls — 27 September 2026

Version 0.6.0 moves the existing Smile Gallery arrow buttons inside the card at the bottom right. One stationary frame is positioned over the active card, outside the translated Swiper wrapper. Each circular button keeps the existing SVG, 3rem diameter, 1rem spacing and a 20px backdrop blur.

The same stationary frame holds a single live count, a vertical separator and the existing black Instagram SVG at the top right. The Instagram link follows Swiper's real index, including loop transitions, so it opens the displayed post. The former bottom-right View post link and the external bottom count/control row are removed. Likes, comments and sharing remain in the lower left.

The shared TDBSliders runtime continues to own motion, loop handling, the introductory advance and counter updates. Existing slider-focus behaviour continues to handle page chrome. Cards retain their two 6rem mirrored glass bars, the approved 3px reflection clipping, original static TDB logo and responsive neighbouring-slide treatment. First-frame space reservation is reduced by the removed external 5rem control row.

All four feed types use the shared implementation. The 112 manual CMS posts, feed membership, tags, images and engagement numbers are unchanged. This change does not add a live Instagram connection.

Deploy the new immutable Instagram bundle pin and bootstrap, and replace only the named Instagram style block in fresh Webflow site custom code. Preserve current Smile Gallery, review and quote changes from other work. Publish to the Webflow subdomain for review.

## Static details refinement — v0.6.1

The fixed frame now also owns the TDB logo, account name, date, engagement icons and their number slots. These nodes stay in place while images and mirrored backgrounds move. The two faded neighbouring cards use decorative fixed panels with no duplicate keyboard stops. Counts, post links and sharing targets follow the active post; each count reserves the longest value in its feed so changes do not move the icons. Unknown engagement values remain blank.

Only the date fades: 150ms out during movement, then 400ms in after settling, with the hero parallax slider's 100ms next / 140ms previous delay and 60ms recovery after an abandoned drag. The new date is written while hidden. Reduced-motion preferences disable the fade. No parent class mutations are needed, avoiding Swiper observer churn.

## Smile Gallery tickers — v0.6.2

At the user's request, replace the date fade and instant value changes with the staging Smile Gallery v3 ticker: a 400ms vertical roll with ease-in-out timing, inside a stationary clipped viewport. The logo, account, SVGs, number slots and controls remain fixed. Likes and comments roll up for an increase and down for a decrease; unknown values remain blank. The date uses actual timestamps, rolling up for newer posts and down for older posts, including month/year and loop boundaries. Identical values do not animate.

Pagination matches Smile Gallery's two-digit current/total display and horizontal rule. It remains before the Instagram SVG, with the approved vertical separator between them. Only the current number rolls, following navigation direction through loop boundaries. This counter owns its content so the shared Swiper counter updater cannot replace its ticker elements. Interrupted tickers cancel cleanly, and reduced motion displays the latest value immediately.

## Video indicators — v0.6.3

Carry the existing imported CMS media type into the public snapshot. The 56 video covers display a white camera SVG with the same non-scaling 1px outline, square joins, glyph size and 44px frame as the Instagram icon. It sits over the image at the top right, using the same responsive side padding as the Instagram control and the same padding below the image's top edge. The indicator is part of the stationary detail layer and follows the current/adjacent posts; image and carousel posts have no marker. It is a labelled, non-interactive indicator. Existing images, dates, engagement values, feed memberships and player behaviour are unchanged.

## Initial last-to-first entry — v0.6.3

Rotate only the displayed cyclic track so its initial card is the last logical post. The shared slider's existing one-time viewport advance then lands on logical post 1 (the latest post), with correct pagination, links and neighbouring details. Original feed ordering in the snapshot stays intact.

Dates and engagement values start at zero opacity with their space reserved; pagination stays visible. While hidden, variable values update without ticker animation. The values reveal 100ms after the entry movement settles, with a 400ms fade; subsequent changes keep their established ticker. Readiness observes the existing first-view lifecycle and also handles a skipped entry, a single post or an interrupted drag. Only value leaves receive readiness classes, preserving fixed icons and avoiding parent observer churn.
