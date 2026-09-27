# Instagram card controls — 27 September 2026

Version 0.6.0 moves the existing Smile Gallery arrow buttons inside the card at the bottom right. One stationary frame is positioned over the active card, outside the translated Swiper wrapper. Each circular button keeps the existing SVG, 3rem diameter, 1rem spacing and a 20px backdrop blur.

The same stationary frame holds a single live count, a vertical separator and the existing black Instagram SVG at the top right. The Instagram link follows Swiper's real index, including loop transitions, so it opens the displayed post. The former bottom-right View post link and the external bottom count/control row are removed. Likes, comments and sharing remain in the lower left.

The shared TDBSliders runtime continues to own motion, loop handling, the introductory advance and counter updates. Existing slider-focus behaviour continues to handle page chrome. Cards retain their two 6rem mirrored glass bars, the approved 3px reflection clipping, original static TDB logo and responsive neighbouring-slide treatment. First-frame space reservation is reduced by the removed external 5rem control row.

All four feed types use the shared implementation. The 112 manual CMS posts, feed membership, tags, images and engagement numbers are unchanged. This change does not add a live Instagram connection.

Deploy the new immutable Instagram bundle pin and bootstrap, and replace only the named Instagram style block in fresh Webflow site custom code. Preserve current Smile Gallery, review and quote changes from other work. Publish to the Webflow subdomain for review.

## Static details refinement — v0.6.1

The fixed frame now also owns the TDB logo, account name, date, engagement icons and their number slots. These nodes stay in place while images and mirrored backgrounds move. The two faded neighbouring cards use decorative fixed panels with no duplicate keyboard stops. Counts, post links and sharing targets follow the active post; each count reserves the longest value in its feed so changes do not move the icons. Unknown engagement values remain blank.

Only the date fades: 150ms out during movement, then 400ms in after settling, with the hero parallax slider's 100ms next / 140ms previous delay and 60ms recovery after an abandoned drag. The new date is written while hidden. Reduced-motion preferences disable the fade. No parent class mutations are needed, avoiding Swiper observer churn.
