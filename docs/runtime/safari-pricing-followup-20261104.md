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

## Follow-up from the staging review

All six Pricing category bands now have a native SVG tag immediately before the
label. The existing tag path is reused with a Designer combo class inheriting
the heading colour. No script creates these icons. Cosmetic's inner label has
the distinct `Cosmetic-Dentistry-label` ID; the hero link now targets the category
wrapper directly. Browser inspection found one matching category ID, not two.

Webflow's Pricings collection received optional Feature 14–16 fields. Both
Signature Assessment records include Dürr VistaCam iX HD Smart intraoral/IR
images, AI-assisted X-ray analysis and AI-assisted scan analysis. The shared
Pricing item component exposes these through optional native CMS-bound rows.
Both Smile Design records retain their original eight inclusions; empty extra
rows stay hidden. The calculator reads the same rendered CMS inclusions.
The £450 assessment, £225 deposit and £225 Smile Design fee are unchanged.

The hygiene allowance now reuses the calculator's existing appointment-choice
card, checkbox, typography and price icon. Its optional selection and estimate
math are unchanged. In an actual staging reproduction, information panels still
computed a 20px backdrop blur, but their two ancestor disclosure reveals retained
`animation-fill-mode: both` and transforms after finishing. A calculator-scoped
CSS rule releases those finished layers while preserving the opening animation.
The separate Home/Location paint guard never targets calculator tooltips.

The calculator drawer previously reset `scrollTop` on every opening. It now
restores the last reading position after rendering/modal focus, and cancels an
unfinished estimate-scroll animation on close. A new-context notice still starts
at the top. A regression test simulates modal focus resetting the scroller and
checks restored position, selected treatments, quantity and keyboard focus.

The standalone calculator page was still pinned to the old `0ca09e55` controller
and a different CSS release. Its existing controller, stylesheet and loader
references are advanced together with this follow-up. There are no new script
tags, dependencies or requests. Calculator behavior continues to use the existing
externally hosted shared runtime; it is not a purely native Webflow implementation.
The existing calculator loader references on the Services, Treatments and Areas
CMS templates are advanced too, so treatment-page estimate drawers receive the
same correction. Their script count is unchanged.

Staging confirmed the blur fix: the gumline quantity tooltip retains its 20px
blur, the two finished ancestor animations compute `backwards`/`transform: none`,
and the underlying paragraph is blurred. All six category icons compute the
same `rgba(0, 0, 0, 0.55)` as their labels and sit to the left. The optional hygiene
card has the same black background as the appointment cards and adds £195 once.

A real treatment-page drawer test retained scrollTop 1217 on close/reopen and
page scrollY 4713, but exposed a second defect: fixed estimate/close controls
temporarily appeared at -1217px/-1107px during the opening transform. The estimate
strip is now a direct child of the drawer root and both controls use native
sticky positioning. This removes the containing-block switch and the previous
scripted closing offset, preserving the outer slide animation and reading position.

Follow-up verification: 923 tests, 920 passed, three existing skips, zero failures;
generated parity, formatting and whitespace checks passed. A direct browser click
closed Signature Assessment at header top -0.41px and reopened at 0px without
changing scrollY (3130). Physical iPhone Safari crash/reopening verification remains
outstanding; desktop browser checks cannot certify that issue resolved.

## Calculator step spacing and date surface

The numbered calculator steps now own their outer spacing. Final help-text
margins no longer add a second gap, and the top-level treatment/journey reveal
wrappers no longer add another 20px below already padded sections. Nested option
accordions retain their shared 20px opening gap and existing motion.

Each numbered heading supplies the same 1.5rem gap before its first content.
The previous category, treatment-group and target-card top margins no longer
compete with it. The target-date control card uses the existing black ink token,
matching the selectable option cards; numbered headings retain their charcoal.
Only the existing calculator source stylesheet and generated copy change.

Browser measurements at 320px, 390px and 1440px found identical heading-to-content
and previous-content-to-heading gaps across all five steps, with no horizontal
overflow. The option reveal still measured 20px. Full verification retained
923 tests: 920 passed, three existing skips, no failures. Generated parity,
formatting and the locked Swiper artifact check passed. Staging pins for the
shared entry, standalone calculator and existing template loaders move together.

## Calculator card alignment, hygiene time and estimate surface

The native Cosmetic/Restorative checkbox labels inherited Webflow's float
clearfix pseudo-elements. In the shared flex card these became extra items,
adding another gap before the selection square. The existing calculator
stylesheet now suppresses those unused clearfixes and gives native/generated
card squares the same 1.125rem dimensions. Card padding and section spacing
remain shared across categories, starting appointments and hygiene.

The hygiene allowance reuses the existing clock mask and appointment-duration
row, reading its CMS appointment minutes with a 45-minute fallback. Selection,
price and timing calculations are unchanged. The interactive estimate card and
its total area now use the existing black ink token, matching the target-date
and option cards; numbered headings retain charcoal. These changes extend the
existing calculator controller and stylesheet, adding no module, dependency,
asset request or page-level code.

## Rollback

Restore the four site install references together to
`19e50835d505534c3b962d74c67183aaf0289611` and publish staging only.
The previous exact site custom code is privately retained outside the repository.
Move `Cosmetic-Dentistry` back to the inner text node above and clear the wrapper's
domId if reverting the native anchor move. The native category tags and optional
CMS inclusion rows are separate reversible changes; retain their content unless
those changes are also being reverted. Restore the saved standalone calculator
page code if reverting its version alignment. Revert source normally; do not
rewrite shared history.
