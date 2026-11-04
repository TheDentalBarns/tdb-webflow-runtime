# Pricing ownership cleanup — 4 November 2026

This pass starts from staging runtime `5347b62b71fac05304dfe50505504984fbe74b4d` and follows the native Home/Location ownership contract. Release only to the Webflow staging subdomain.

## Changes

- Removed Pricing's duplicate page-head selection/tap CSS; the existing shared selection source already owns that behaviour. Pricing's price-schema footer remains unchanged.
- Moved price-header typography, metadata dividers/icons, the full-width category panel, and the expanded header's 20px/150% glass treatment into native Webflow combo styles. The existing disclosure controller toggles the same `is-open` state. No extra DOM or new CSS/JS bundle was introduced.
- Preserved all consumers of the retired broad presentation selectors: Pricing item, Careers Item, the Careers page and VIPs template. Shared state CSS still owns hidden/expanded states, the 20px reveal gap, the compact expanded header and empty-CMS-image handling.
- Removed two already-hidden superseded categories from Pricing's Designer tree: old General Dentistry and Teeth straightening. The visible General Dentistry category, anchor and current Cosmetic aligner entries remain. These hidden blocks were not in the published page, so this is Designer cleanup rather than a claimed network saving.
- Removed the calculator's unused `animateLive` fade and its unused instance fields. Value changes continue through the shared ticker. Semantic `data-output` keys preserve the relevant output slots during calculator reconciliation.
- Shared ticker 1.4.1 settles to the latest value if either Web Animation is cancelled; stale callbacks cannot settle a newer transition. This addresses an unhandled cancellation path. The reported physical-phone disappearance was not reproduced in the 320px desktop browser check, so device confirmation remains necessary.
- Closing the last visible expanded price keeps the shared chrome-focus hold until the existing scroll-distance controller releases it. Collapse/resize/observer callbacks alone do not reveal the navbar, announcement, review badge or VIP handle. Reopening and re-entering an expanded category still reacquire the hold.

## Inventory and retained code

The native inventory covers all 65 pages and 128 component definitions, including drafts, templates and retained archives; every read completed successfully after rate-limit retries. Older pricing classes remain in templates or the Pricing plan/Careers components, so they were not deleted by name. A rejected removal of a duplicated category-heading style was left intact rather than forced.

All three staged pages have zero matching IX2 event targets. Webflow's shared bundle still contains 189 event definitions for other consumers, so the sitewide Webflow bundle is retained. Shared consent, foundation/start loading, module proximity gates, photo motion and carousel behaviour are unchanged. No page-specific script tag or compatibility stylesheet was added.

The UI stylesheet is 22,632 bytes minified, down from 24,102 bytes. This is an ownership transfer into native Webflow CSS, not a claim of an equivalent whole-page saving or a TBT improvement. Full before/after HTML, CSS, initialization and interaction evidence is kept privately outside this repository.

## Checks

- Locked custom Swiper build and check: 98,893 bytes, unchanged.
- Runtime generated-source parity and motion stylesheet checks passed.
- Full suite: 918 tests, 915 passed, 3 existing skips, no failures.
- Required source/build-tool formatting check passed. Existing deferred-feed formatting was normalized without changing its behaviour.
- Tests cover cancellation of either ticker animation, stale callbacks and sequence settlement; disclosure focus retained on close/geometry callbacks and released by the shared scroll controller; default authored disclosure state and calculator loading dependencies.
- Three stale test expectations were updated to the current loader/API contract. The marquee drag test now allows sub-nanopixel floating-point rounding while retaining all movement and write-count assertions; marquee source did not change.

The release must verify native Webflow CSS (including Safari's backdrop-filter prefix), fresh/saved consent, narrow-phone output sizing, desktop/mobile price open/close/re-entry, General Dentistry anchor expansion, FAQ defaults, review/VIP/feed controls, and Home/Location smoke checks. Physical iPhone Safari remains a separate user check.

## Rollback

Restore the privately saved site head/footer and Pricing head/footer, and publish staging only. Restore/revert the native combo assignments and removed hidden categories from Webflow history if rolling the native ownership migration back as well. Do not roll only the runtime forward while omitting the native styles: the new release deliberately removes their external duplicates. Immutable previous runtime assets remain available.
