# Motion startup and per-frame measurements — 9 October 2026

Motion 1.19.5 builds on the deployed `033d31958a6bce661b7a6ee9f08cd59fe2a3ca1a`
release. Its existing read/write scheduler remains in place.

## Changes

- DD registration no longer synchronously reads scroll position or computed
  opacity. The first shared read phase captures both; it reuses the computed
  style already needed to check visibility. Authored/restored first paint is
  retained, and an explicit quote entrance before that phase takes precedence.
- All queued DD and page-break controllers share lazily sampled viewport
  metrics and rectangles within one read phase. Document scroll height is
  sampled once, rather than once per DD element. Nothing is cached across
  frames, so sticky positioning, layout changes and carousel motion stay fresh.
- Multi-element DD entrances measure the complete group before any opacity
  writes. The existing progress and fade calculations are unchanged.
- Page-break initialization keeps its synchronous first-paint pass, but no
  longer takes a redundant scroll reading before that pass.

The footer's initial position snapshot is retained: it drives VIP restoration
and already precedes the footer's own writes. Cookie and IX2 work are separate.
No change to styling, policy, timings, consent, assets or carousel release pins.

## Verification

`motion-measurements.browser.cjs` compares the previous release and candidate on
1440×900 and 390×844 with 24 DD nodes and two page-break clients:

| Read | Previous | Candidate |
| --- | ---: | ---: |
| Scroll reads at DD mount | 1 | 0 |
| Computed-style reads at DD mount | 24 | 0 |
| Scroll reads in shared frame | 3 | 1 |
| Viewport-height reads in shared frame | 3 | 1 |
| Viewport-width reads in shared frame | 26 | 1 |
| Document-height reads in shared frame | 24 | 1 |

The deferred frame still measures the 24 text elements. The change consolidates
necessary reads; it does not claim to eliminate all layout work or save a
particular number of milliseconds. Group entrances changed from alternating
reads/writes to all reads followed by all writes.

- 49 DD, mobile momentum, lifecycle and reload-memory tests passed.
- Shared-frame browser tests passed on desktop and portrait phone, including
  nested scroll roots, full-motion policy, idle stability and cancellation.
- Page-break browser tests passed at 1440×900, 834×1112, 667×375 and 390×844,
  including both directions, crop, restoration, resize, lazy images and BFCache.
- Module registry identity/deduplication and source syntax checks passed.

## Deployment

Update only the immutable `tdb-modules.js` URL in the global head. Preserve
`data-tdb-carousel-base` exactly; all other shared modules remain on their current
release. The registry resolves motion consumers to this release.

Publish the Webflow subdomain only. Rollback restores the registry URL at
`033d31958a6bce661b7a6ee9f08cd59fe2a3ca1a`; no markup or style rollback is needed.
