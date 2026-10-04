# Standalone review archive

Webflow page: Patient Reviews (`/reviews`), page ID `6ac2a9ad6562ccc6531a8310`.
Staging only during the initial rollout. Existing home/location components and loader pins are unchanged.

## Ownership

- Webflow owns the native nurture header, navigation/footer instances, CMS collection bindings, full text/name, card appearance, responsive columns/gaps, the existing review-card image/blur treatment and quote artwork, filter controls, availability strip, and native pagination links.
- `tdb-review-list-loader.js` owns presence/proximity and the performance gate. A saved CookieScript decision (accept, reject or close) releases enhancement near the list. Explicit filter intent or a filter preset URL also releases this first-party functional feature. No new marketing-consent requirement is introduced. CMS HTML and native pagination always work.
- `tdb-review-list.js` owns archive rendering, measured masonry grid placement, batches of 20, near-button prefetch, filter state/URL history, and accessible status updates. It measures Webflow's column count, gap and card heights; it has no duplicated breakpoint, card-width or typography constants. It does not load Swiper or mount a modal review drawer.
- Existing `tdb-filters.js`, `tdb-motion.js` and `tdb-ticker.js` own filter panel/dimming/accordion/icon animations and animated result counts.
- `tdb-review-cms.js` owns the shared native CMS parser, same-origin request deduplication, record cache, responses, source icons and metadata. v1.4 adds `fromDocument`, `matching`, `ordered` and `nextURL`, preserving existing consumer APIs. The archive is seeded from its own server-rendered first batch.
- `tdb-review-availability.js` reads the existing active Banner Settings CMS feed and handles refresh, stale visibility return, expiry and reduced-motion-aware refresh feedback. No appointment data is hardcoded.

## Content and ranking boundary

The archive displays complete reviews with the existing native CMS featured excerpt in a blurred quote panel. This is an editorial default, not a personalised excerpt. Default order is the existing Full review rank. The new Review Excerpts/Page Contexts CMS wiring remains a separate phase. That phase should supply one selected excerpt per full review and one shared relevance order; neither review copy nor editorial ranks belong in JavaScript.

Ratings/platforms are unions within their category; treatments/experiences require all selected topics. Clear aligners and Invisalign share the existing canonical topic. Only platforms present in the approved native filter UI are exposed.

Presets use URL fragments, e.g. `/reviews#treatment=veneers` or `/reviews#platform=Google%2CDoctify&rating=4%2C5`. Filter/sort state is restored by Back/Forward. Native next-page URLs remain ordinary query URLs so later batches can be crawled independently. Filters do not create separately indexed pages.

## Layout and loading

Native fallback: three desktop columns, two tablet, one mobile, with natural-height cards and real pagination. Enhancement packs cards into the shortest column while preserving DOM order. New batches append without repacking earlier cards at the same width. Resize/font changes remeasure existing content. The first three reviews start across the top.

The cards show source attribution/link, rating, date (including approximate dates), historic-practice labels, and the CMS response where available. No review content or author names are stored in the repository.

A review without an authored featured excerpt retains its full text and metadata; the quote panel is omitted during enhancement. No excerpt is invented.

Staging validation: all 85 records in batches 20/40/60/80/85, unique identities, stable earlier card positions on append, 3/2/1 responsive columns, one-star response, URL preset and history restoration, consumed outside tap, phone landscape filter scrolling, and native page-five fallback. No Swiper or duplicate shared module requests were observed on the archive.
