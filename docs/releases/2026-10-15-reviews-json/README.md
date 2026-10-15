# Reviews JSON staging migration

Home opts into `/tdb-content/v1/reviews.json` through `data-tdb-reviews-feed` on
its existing empty `data-tdb-review-lazy` host. The drawer already had no inline
layout or CMS data: the host was 35 bytes. Its template, CSS, controls and Swiper
remain demand-loaded. No additional inline records or startup script are added.

The Cloud app reads the live Reviews, Review Responses and SEO Reviews collections.
Only approved, non-excluded published reviews are projected. Unpublished drafts,
tagging guidance, capture details, verification notes and other internal fields
are excluded. The public projection preserves full text, authored display dates,
ratings, source links, historic/approximate flags, topic excerpts, ranking and
duplicate grouping, published responses, aggregate figures and featured identities.
Machine dates become ISO calendar dates; visible date labels are unchanged.

All 85 current reviews, their ordering, the 4.94/85 aggregate, three featured
identities and the published response match the prior HTML feed. The route has
its own memory/KV snapshot and refresh backoff, like Instagram and Smiles. All
three source reads must succeed before replacing the previous snapshot.

The client validates the JSON and derives its filter index locally. It exposes
the existing CMS session API with 20-record display batches, complete filter
metadata and cached detail access. Inline review cards still append their own
eight-card batches. Filters and late review responses no longer require HTML
continuation/detail requests on the opted-in Home page. Other pages retain the
legacy HTML adapter; `/reviews` remains the existing public archive.

The old data pages remain available for those legacy consumers and rollback.
This migration creates no new feed page or sitemap entry. The JSON is public
and sends noindex headers; these are indexing preferences, not authentication.

The Instagram video badge already existed once in its stationary focus frame.
Its existing video-only visibility and entrance timings are retained. The same
shared black SVG is made white with a CSS brightness/invert filter; no duplicate
asset, per-card icon or new JavaScript handler is added.

The live JSON is 130,052 bytes before compression. Its 85 records and featured
selection exactly match the validated native-data comparison. Cloud deployment
`ba087cd3-d9d0-42f4-a7e2-c1d7ebabdd66` serves all three feeds.

## Validation and rollback

The release includes projection/privacy, complete-snapshot failure, cache
isolation, filter/batch compatibility, request-sharing/cancellation, invalid
payload and same-origin URL tests. Browser checks cover opening, next/previous,
filtering to the one-star review and its response, reset, desktop/mobile layout,
and the single Instagram video badge. No TBT improvement is claimed.

To roll back Home's data adapter, remove `data-tdb-reviews-feed` from the lazy
host and publish staging. Restore all three runtime pins to
`e25d477dfb06f3f4fb564afec1a20faa7d27837a` for the complete prior runtime.
The additional Cloud route can remain unused. The preceding Cloud deployment
is `ed6e3df7-7f72-4905-a032-baa79ec9fce8`. Production publishing is not included.
