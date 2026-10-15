# Reviews JSON with requested batches

Home uses `/tdb-content/v2/reviews.json` through `data-tdb-reviews-feed` on its
existing empty lazy host. The template, CSS, controls and Swiper remain
demand-loaded. No review records are added to initial HTML.

The Cloud service reads the live Reviews, approved Review Responses and SEO
Reviews collections into one validated snapshot. Only approved, non-excluded
published records and the existing public UI fields are included. CMS credentials,
drafts, tagging guidance and capture/verification notes are not exposed.

## Requests and ordering

The initial v2 request returns a compact index: public identity, topics, available
excerpt topics, dates, ratings and editorial/context priorities, plus aggregate
figures and featured identities. It contains no full review, excerpt or response
text. The browser orders this metadata before requesting its first 20 bodies.

A request with `ids=slug-a,slug-b&revision=...` returns only those published
records, in the requested order, with a maximum of 20 per request. Selection does
not require fetching preceding feed positions. Filters can request any set of
IDs. The browser caches fetched bodies and requests only missing IDs; concurrent
identical requests are shared with independent caller cancellation.

Home preserves native editorial order. Opted-in nervous-patient, clear-aligner
and location pages use their CMS context priorities, then relevance and editorial
priority. Other known treatment contexts prioritise relevant topics/excerpts.
Each context retains all reviews in its full index; rating/date sorting and
filters operate over that complete index. The fixture verifies 10, 2, 4 as the
first nervous-patient selection and a different first selection for aligners.
The endpoint itself supports any caller-selected order.

The drawer continues 20-record visual/transfer batches; inline cards keep
eight-card visual batches. Existing named-introduction identity recovery still
advances the ordered session when necessary. Explicit filter/detail selections
use the direct ID API. Other Webflow pages are not automatically opted in:
their native markup and legacy HTML adapter remain, including the public
`/reviews` archive.

## Consistent snapshots

V1 and v2 share the existing five-minute refresh and isolated Reviews cache.
Before handing out an index, the service retains that revision in KV. Batch
requests use the same revision even if a newer CMS snapshot is published during
browsing. Revisions expire no later than one hour from their original check;
an expired session returns 410 and requires a refresh. Invalid IDs/oversized
requests are rejected; no caller can select an arbitrary CMS collection.

Cloud deployment: `a5a9fe9f-4dce-4d21-9d8f-4e1d5f1b9a21`.
The original v1 full response stays available for the previous runtime.

## Verification and size

All 85 records, their public fields, the 4.94/85 aggregate and published response
match the original content. API checks include requested order, 20-record bound,
revision isolation across refresh/isolate restart, expiry, cancellation,
malformed data and complete-source refresh failure.

Using consistent local gzip (not a new GTmetrix transfer measurement):

- First v2 index plus 20 bodies: 70,347 raw / 12,731 gzip bytes, two requests.
- Previous full v1 JSON: 130,052 raw / 23,719 gzip bytes, one request.
- Full v2 collection including the index: 154,529 raw / 30,386 gzip bytes,
  six requests. Chunking adds overhead but avoids downloading unneeded bodies.
- Legacy complete HTML feed: 388,893 raw / 59,416 gzip bytes, five requests.

The Instagram badge remains one white icon on the stationary focus frame,
with the existing video/photo toggle and entrance timing.

## Rollback

Restore the Home feed attribute to `/tdb-content/v1/reviews.json` and all three
runtime pins to `31001002a8ef76b14c2c539612195749332ba617`, then publish staging.
The additive v2 endpoint can remain unused; the preceding service deployment is
`ba087cd3-d9d0-42f4-a7e2-c1d7ebabdd66`. To return to the legacy HTML data adapter,
remove the Home feed attribute. Production publishing is not included.
