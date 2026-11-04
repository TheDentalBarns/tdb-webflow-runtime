# Safari scrolling and Pricing follow-up, 4 November 2026

Starting staging runtime: `19e50835d505534c3b962d74c67183aaf0289611`.
Includes the later documentation-only `2b16352129070ac12cee6c62a2e7309e837b6c3f`.
Reference: [Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd).
Release scope is the Webflow staging subdomain only.

## Evidence and changes

David reports that repeated rapid vertical scrolling still causes the Safari
error on both Home and Location, while Pricing does not exhibit it. This
supersedes the earlier report that Location was unaffected. No physical-device
crash log or GPU-memory measurement is available: rendering pressure remains a
hypothesis, not a proven diagnosis or a certified fix.

The existing runtime paint window was Home-only. It now identifies the shared
native service/gallery assembly, covering Home and Location while leaving
Pricing outside the trial. In addition to disabling distant 20px backdrop
filters, its existing idle state hides offscreen Swiper track descendants and
releases their will-change hints. This preserves layout geometry, image sources,
carousel identity and selection. The same 1500px preparation buffer, 180ms
departure debounce, immediate return restoration, breakpoint reset, bfcache
reset and teardown remain. Visible motion, consent and media policy are unchanged.
This is a staging mitigation requiring another iPhone rapid-scroll test.

Pricing category links previously opened General Dentistry without acquiring
shared chrome focus. Cosmetic Dentistry's ID was on an inner heading label,
which also bypassed the opening handler. The shared disclosure owner now resolves
nested category anchors and signals the existing price-focus owner. That owner
holds the navbar, announcement, review badge and VIP handle through native anchor
arrival and while the selected category is visible. Leaving the category releases
the hold. Fresh scroll/pointer intent cancels an unfinished offscreen journey.
Native Webflow still owns anchor movement, history and focus.

The exact `Cosmetic-Dentistry` ID is moved natively from the inner text node
`928e32af-f19e-c241-7bfd-7455c2fbeb50` to the category wrapper
`928e32af-f19e-c241-7bfd-7455c2fbeb4e` on Pricing page
`677cfbbb752fa1bb44264481`, so the complete cream band is the destination.
The existing URL spelling and link targets are preserved.

Desktop browser reproduction: after opening Root Canal Treatment and scrolling
its details, closing left its header at -337.17px instead of its prior 0px, with
scrollY essentially unchanged (4600 to 4601). The shared disclosure controller
now measures the clicked header before and after a user toggle and compensates
only for actual displacement, using immediate native/Lenis movement. Notification
to the shared chrome owner follows compensation, so collapse movement does not
release the menu hold. Programmatic mounting still preserves authored state
without a scroll or startup animation. The 20px gap/reveal motion is retained.

## Ownership, delivery and trade-offs

Designer retains native geometry and first paint; only one native ID moves.
Foundation owns disclosure state and the existing price/chrome handoff. Its
increase is needed before deferred features or consent to preserve first input.
Post-decision runtime owns the shared offscreen guard; shared UI owns its idle
state. No new script, request, wrapper, dependency or loading phase is added.

| Delivered asset | Raw delta | Local gzip delta |
| --- | ---: | ---: |
| Foundation | +910 | +239 |
| Shared UI CSS | +145 | +22 |
| Post-decision runtime | -14 | -3 |
| Combined changed delivery | +1041 | +258 |

These are matched local byte counts, not measured transfer, TBT or GPU savings.
Startup cost increases modestly; interaction correctness gains are concrete.
Polish retains native bands, motion and visible blur. Maintenance reuses the
existing disclosure, focus, navigation and paint owners. The paint trial needs
physical Safari verification and must not be described as a confirmed crash fix.

## Validation

Focused tests cover nested category links, native arrival and departure, interrupted
journeys, initial deep links, sticky collapse with native scrolling and Lenis,
Home/Location retirement/restoration, Pricing exclusion, repeated reversals,
stale observer callbacks, bfcache, breakpoint changes and teardown.
Full verification: 922 tests, 919 passed, three existing skips, zero failures.
Generated-source parity, locked custom Swiper build/check, formatting and diff
whitespace checks passed. Browser verification after publication is recorded below.

## Rollback

Restore the four site install references together to
`19e50835d505534c3b962d74c67183aaf0289611` and publish staging only.
The previous exact site custom code is privately retained outside the repository.
Move `Cosmetic-Dentistry` back to the inner text node above and clear the wrapper's
domId if reverting the native anchor move. No other Designer styles or CMS data
were modified. Revert source normally; do not rewrite shared history.
