# Patient review trio: targeted loading

Scope: the existing patient quote trio on Home. Keep the shared quote engine,
consent/proximity gates, carousel timings, and drawer opening behaviour.

- Loader 3.9.2 resolves `data.featured` through `fetchRecords` before mounting.
  This uses the shared identity cache and does not advance `data.records` or its
  pagination cursor. It does not change the cards' batch sizes.
- Adapter 2.1.0 reads selected records with `getCached`, in the supplied order.
  No patient names, feed positions, or special-case review IDs are encoded.
- Each native `.tdb-quotes_source` span is the logo slot. Designer owns its size,
  fit, spacing, grayscale and default Google artwork. The adapter resolves the
  canonical asset URL from the existing shared footer template once per platform
  and assigns the background image; it no longer clones SVG wrappers or paths.
  Unsupported platforms retain the existing text fallback.
- The temporary slide template is cloned only when the selection needs more
  cards than are authored. Existing cards remain in place.
- The loader requests the 1.8 KB minified review adapter. Readable source and
  distribution copies are retained.

Future snippet-CMS binding should supply the selected review IDs/order rather
than depend on the shared feed's page positions. Drawer reordering is deliberately
deferred. Today its existing `ensure` and editorial order still apply on opening,
and the clicked review ID is passed through unchanged.

Build: run `node tools/build-shared-runtime.mjs` for readable artifacts, then
`node tools/runtime-build/build-review-quotes.cjs` using the pinned Terser package
in `tools/runtime-build`. `TDB_TERSER_MODULE` can specify that installed module's
absolute path. Use `--check` to verify the minified output.

Validation: review-trio-loading, review-loader, review-shared-quotes, and
review-pagination tests pass (8 tests). These cover deferred mounting, no feed
advance, selected identity/order, consent cancellation/remount, carousel looping,
drag suppression, keyboard activation, shared requests, retry and pagination.
The existing Playwright filter-index suite could not launch because its Chromium
executable is not installed; filter/index implementation is unchanged.

Deployment: release from the currently deployed review-loader tree so unrelated
relative dependencies retain their bytes. Fresh-read the Home footer and replace
only the review-loader URL, preserving other edits. Publish staging only.
