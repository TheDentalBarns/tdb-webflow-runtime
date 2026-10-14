# Deferred page-break loader — 14 October 2026

The page-break loader is now a definition-only runtime feature in `src/runtime/page-break-loader.js`, started by the existing consent-decision/idle sequence. Both accept and reject decisions release this non-tracking enhancement.

## Changes
- Remove the separate early `tdb-page-break-loader.min.js` footer request.
- Start the shared motion group when any eligible wrapper is within 600px of the viewport. Preserve a single initial group for the Home hero and six lower wrappers.
- Keep the shared motion registry pin at `a69e675d7f997252ed36cc1b64e93afcc505f516`; no parallax math or animation timing changes.
- Explicit `TDBPageBreaks.refresh()` returns the loading promise and discovers new wrappers without destroying existing owners.
- No permanent mutation observer or wheel/touch DOM searches. Failed loads retain visible reveal images and retry on online/pointer input, with a five-second interval for pointer retries.
- Disconnect proximity/retry listeners on success and release owners on runtime destruction.
- Native Webflow combo style `.header5_background-image.sketch_wireframe` opacity changed from 0 to 1; its existing transform and other properties remain. This prevents a permanently hidden sketch while runtime is deferred or unavailable. The shared engine applies the existing reveal once enhanced.

## Build and verification
Source commit: 4fd2ac15d5a823e6369d3b3ee0826b131e8a62bb
Built runtime: cc702055c96a621861bbf56b93ee16c780862801
Actions: https://github.com/TheDentalBarns/tdb-webflow-runtime/actions/runs/38577322453

53 tests passed: eight loader lifecycle/discovery/failure tests plus 45 existing USP, Brevo, runtime ownership and navbar handoff checks.
Runtime build size: 47,327 bytes. This is a scheduling/ownership cleanup and removal of one early request, not a total JavaScript byte reduction.

## Deployment and rollback
Only the global runtime pin, old page-break footer tag, and the native sketch opacity were changed. Home custom code, all other pins, and the motion engine remain as deployed previously.
Use the accompanying before/after code snapshots for rollback of these specific changes. Restore the runtime pin and old footer tag together. The native sketch opacity can stay at 1 as a safe fallback, or be restored to 0 for an exact rollback.
Publish only to `dentalbarns.webflow.io`; do not select custom domains.

## Staging verification
Published to the Webflow subdomain at 2026-10-14T14:05:59.444Z. Custom domains retain their 2026-10-01 publication timestamp.
The browser confirms:
- `tdb-runtime.js` at the new immutable commit is marked loaded.
- No standalone page-break loader tag remains.
- The motion asset is still loaded from its prior pinned commit.
- Native compiled sketch CSS has opacity 1; its enhanced off-screen reveal state still becomes opacity 0 with translate3d(0px,108px,0px).
- The regular break transform changes from -14.4px to +14.4px after passing it; a visible headphones break loads at natural width 1280 with opacity 1.
- Hero, background overlay, sketch, VIP and footer motion targets are initialized.
- No browser warnings or errors were captured during this check.

The mock-DOM tests cover dynamic refresh and load-failure behavior; these failure modes were not forced on the live site.
Home has a hero page-break wrapper, so proximity initialization fires near runtime startup there. On pages whose first wrapper is lower down, initialization waits for proximity. Other runtime consumers may independently request the shared motion asset earlier.
