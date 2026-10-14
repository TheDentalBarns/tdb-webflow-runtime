# Native Instagram consent/runtime migration — 14 October 2026

## Release
- Source commit: 12618f46254ab2e533924414b26a1a4ddef494e8
- Built release: e82b05e374538ef451a88271ad72fc96f2ad22fe
- Branch: work/instagram-loader-20261014
- Staging only: https://dentalbarns.webflow.io/
- Runtime 1.4.1, Instagram 2.2.0, Gallery 1.2.4.
- Original Instagram source imported without altering its visuals from deployed 2a64430197b9e16a32874f33aebde99d2381fce2.

## Ownership and behaviour
The shared cookie decision releases the existing runtime. Its definition-only Instagram starter checks for native CMS roots, then loads the feature through TDBModules. The feature retains its 400px proximity gate for shared dependencies and mounting. No new pre-consent executable is added. This is native Webflow CMS content, not an Instagram embed; either cookie decision permits the optional enhancement.

The private registry bootstrap is removed. Online/pageshow/manual refresh permit retries. Permission changes cancel pending consumers; destruction releases handlers, observers, image bookkeeping and tickers. A failed partial mount returns the same CMS nodes in their original order, restores native control attributes and image sources, and resets the shared Gallery first-view observer so retry works.

Required viewport/track structure is checked before mutation. Optional metric/date/video/notice elements are guarded. Nested custom controls support Enter/Space, native button activation is preserved, and repeat/concurrent sharing is suppressed. URL duplicate detection normalises host aliases, scheme, query, fragment and trailing slash without silently removing cards.

Native image loading, desktop/mobile 5/3 windows, entry advance, shared ticker and existing timings remain. Live inspection found lazy image attributes and no active global data-tdb-ig-loading gate; no new image hiding CSS was introduced.

## Consumers
All 61 page custom-code blocks were inspected. Home is the active consumer of the native 2.1.5 tag; it now uses the runtime. The historical payload experiment retains its own native version and is guarded against duplicate startup. Sixteen page/template blocks contain an older separate Instagram feed bootstrap; these are not native-controller consumers and were left untouched in this release.

## Automated verification
GitHub Actions run 38583676318, job 115919869609: 54 passed, 0 failed.
Includes Instagram lifecycle and 16-record metadata fixture, shared Gallery behaviour and count, runtime ownership and navbar handoff.
Built runtime: 52,841 bytes. Instagram: 13,832 bytes. Gallery: 16,456 bytes.

## Deployment
Global pins for runtime, native Instagram and Gallery point to the built release. Ticker and all other module pins remain unchanged.
Home footer's standalone Instagram tag was removed; Home head entrance CSS and other code were preserved.
Staging publish task: bfe01053-f2d5-47c0-b490-fa45c051e6a3.
Staging publish timestamp: 2026-10-14T14:48:37.103Z.
Production domains remain at 2026-10-01T10:10:45.669Z.

## Browser and delivery verification
The initial uncached runtime CDN request timed out. Direct HTTP verification subsequently returned 200 for runtime (52,841 bytes), Instagram (13,832 bytes) and Gallery (16,456 bytes). A fresh browser load then completed successfully.

On staging, the old standalone native tag is absent. The runtime inserts data-tdb-instagram-feature with the new pinned URL. The native controller reports version 2.2.0 in its DOM ready attribute. The first-view state is advanced, showing Post 1 of 16. Clicking Next shows Post 2 with its matching Instagram URL; pressing Enter on Previous returns exactly to Post 1. The date and counter settle to 10 Jan 2026 and 01, with total 16. Visual presentation was checked, and no Instagram warning/error was logged. Pre-decision gating and mobile 3-image behaviour were covered by automated tests; browser verification used a saved decision and desktop viewport.
