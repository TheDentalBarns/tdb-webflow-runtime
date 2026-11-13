# Dedicated reviews page

Webflow page `6ac2a9ad6562ccc6531a8310`, `/reviews`, uses the Smile Gallery resource hero, availability, supporting components and footer. The hero badge and standalone review carousel were removed after review. The centred introduction shares Smile Gallery's title and paragraph classes and uses the existing full lotus asset. The native review CMS retains its first 20 full reviews and pagination as a fallback.

`src/reviews/native/archive.html` and `archive-drawer.html` record the native filter structure. The existing drawer template supplied the actual treatment, experience, platform, sort and rating choices. `archive-native.css` records Designer-owned layout; breakpoint properties were also set using the style API. CMS bindings for author, excerpt, date and complete text remain native.

`tdb-review-page.js` consumes the shared review feed, matcher, sorter, filters, sticky dock, drawer and counter. It requests at most 20 review bodies per batch, appends on scroll, and offers a retry/load-more button. Generation checks discard old batches after a filter change. Low ratings, unrated and historic reviews remain available, and published practice responses remain complete. Each Read more trigger carries the record identity for the shared review drawer.

Only page head/footer code is pinned for this feature. Site-wide runtime pins and custom production domains are outside this release. The page keeps its existing staging noindex directive.

Validation covers 91 unique full-text records across five batches, drawer draft/apply/reset behavior, the shared disclosure/scroll lock, low/unrated sorting, request races, retry after a failed batch, and restoration of native markup on teardown.

The shared native Navbar New component contains Reviews as the final Discover link, after 5 Senses Experience. This is a native page link. Filter options update the existing shared mark/tick state classes; Reset retains the shared `data-tdb-filter-reset` styling hook. The embedded action order/classes match Smile Gallery: Reset left and View reviews right. The shared stylesheet no longer overrides the Designer-owned Explore section padding (7rem desktop, 5rem mobile).

The floating filter uses the shared sticky dock with the review content as its upper boundary and the native bottom landing as its lower boundary, matching Smile Gallery. It rests at the first review when scrolling back above the results instead of following the introduction upward.

Both Reset controls use the existing shared disabled styling and are inactive at the default filter/sort values. The embedded control follows the applied selection, while the drawer control follows its draft; opening a disclosure alone does not enable Reset.
