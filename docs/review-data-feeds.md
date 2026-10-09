# Native review data feeds

The shared source starts at `/review-content`. Its first response includes 20
full records, the filter index, published responses, featured identities and
artwork templates. The existing source remains available to earlier consumers.

The full-record Collection List declares `data-tdb-review-pages="/review-pages"`.
CMS source v1.5.0 resolves its native Next query against that continuation path.
`/review-pages` contains only the full-record list and aggregate summary. The
initial index and responses stay in the shared session; late records receive
their published response when appended or fetched individually.

Both pages are native Webflow CMS output, with no copied review content or API
credentials in this repository. Their pages have noindex/nofollow/noarchive.

## Authored contract

- Initial source page: `6ac111e37b3cce1614a981dc`.
- Continuation page: `6ac8dd0d4a5ab337ff5e09b9`.
- Both record lists use element `041387ed-8ee6-a808-e877-e912cc075f69` in their
  respective page components. Page duplication preserved its pagination key,
  verified as `2f25360b_page` on both published pages on 9 October 2026.
- Keep the two lists' collection, filters, sort, fields and 20-record pagination
  aligned. Approved reviews are included, excluded reviews are omitted, and
  ordering remains editorial priority ascending. Changing review content in the
  CMS automatically updates both; this is a template contract, not duplicate data.
- If either list is recreated, verify the native Next query on both pages before
  publishing. Do not invent or hard-code an unrelated pagination identifier.
- The archive continues to use its own native pagination. Index pagination
  remains on the original source, including when the index exceeds 100 records.
- Imported icon templates belong to the live document. Do not retain a fetched
  DOM document, or clone its nodes without importing them: ownerDocument would
  retain the otherwise-unused document.

The card DOM starts with eight records and grows in batches of eight. Each native
card now has 30 elements (31 after its measured body-preview child is prepared).
Five star images carry data-tdb-star directly, and the clock image owns its sizing.
There are no separate star or clock wrapper elements.

Card measurements run only for appended cards, or for all cards after a layout
change. Progress retains actual rendered-position tracking through CSS motion;
stable widths, spacing and padding are cached until layout changes. Resizing
during a slide schedules the full update for settlement. Drawer warming,
backward navigation, shared motion policy and consent handling are unchanged.

## Focused verification

Run `tests/review-native-cms.test.cjs` and
`tests/review-card-measurements.test.cjs` with node --test and jsdom available via
TDB_JSDOM_PATH. These cover lean pagination, concurrent requests, cancellation,
retry, response/index retention, source-icon document ownership, incremental
measurements and resizing during movement. Live staging checks must additionally
cover batch boundaries, reverse navigation, drawer identity and filter results.
