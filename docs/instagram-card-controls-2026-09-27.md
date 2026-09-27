# Instagram card controls — 27 September 2026

Version 0.6.0 moves the existing Smile Gallery arrow buttons inside the card at the bottom right. One stationary frame is positioned over the active card, outside the translated Swiper wrapper. Each circular button keeps the existing SVG, 3rem diameter, 1rem spacing and a 20px backdrop blur.

The same stationary frame holds a single live count, a vertical separator and the existing black Instagram SVG at the top right. The Instagram link follows Swiper's real index, including loop transitions, so it opens the displayed post. The former bottom-right View post link and the external bottom count/control row are removed. Likes, comments and sharing remain in the lower left.

The shared TDBSliders runtime continues to own motion, loop handling, the introductory advance and counter updates. Existing slider-focus behaviour continues to handle page chrome. Cards retain their two 6rem mirrored glass bars, the approved 3px reflection clipping, original static TDB logo and responsive neighbouring-slide treatment. First-frame space reservation is reduced by the removed external 5rem control row.

All four feed types use the shared implementation. The 112 manual CMS posts, feed membership, tags, images and engagement numbers are unchanged. This change does not add a live Instagram connection.

Deploy the new immutable Instagram bundle pin and bootstrap, and replace only the named Instagram style block in fresh Webflow site custom code. Preserve current Smile Gallery, review and quote changes from other work. Publish to the Webflow subdomain for review.
