# USP loader — 2026-10-14

Staging: https://dentalbarns.webflow.io/
Runtime and adapter release: 2e007c5243f3f3d15e1dec724b38b52a04fa91ca
Published to the Webflow subdomain only at 2026-10-14T13:54:50.201Z.
Production custom-domain publish dates remain 2026-10-01T10:10:45.669Z.

## Changes
- src/usp/loader.js is a named, definition-only runtime feature. The early footer request is removed.
- Startup follows the existing runtime release after either consent choice. This UI component does not require targeting permission.
- Lazy Home sections fetch the adapter on pointer/focus intent or activation; their HTML/CSS and dependencies remain first-open only.
- Native non-lazy sections retain the existing 500px proximity preparation.
- First pointer/keyboard activation is retained during download, including the runtime's initial idle startup window. The existing adapter owns opening, selection, busy feedback and motion.
- Shared module registry owns deduplication and failed-tag removal; later activation retries errors. Failed speculative loading does not loop.
- No whole-document MutationObserver. Delegated interaction supports new sections; explicit refresh supports new non-interacted sections.
- Adapter upgraded from the actual Home v2.3.0 source, with idempotent discovery, refresh/has APIs and held-key guard. Native content and lazy snapshot modes remain supported.
- Home template and CSS retain their existing eb916ad release pins. Unrelated assets are unchanged.
- The obsolete standalone loader build target is retired. Historical immutable builds remain available for rollback.

## Verification
45 tests passed; 0 failures; 0 skipped.
Includes actual adapter interaction, failed dependency recovery, first-click/keyboard replay, repeated discovery, absent/dynamic sections, lazy vs native preparation, runtime startup handoff, plus existing Brevo, navbar and runtime regression checks.
https://github.com/TheDentalBarns/tdb-webflow-runtime/actions/runs/38575629670

## Browser verification
- New runtime loaded successfully; no standalone USP loader or eager adapter request.
- Home drawer content absent before activation.
- First activation retained through adapter download and opened Tranquil Location.
- Existing template and scoped styles loaded from their preserved pins.
- Next control reached Gold Standards.
- Close restored focus to Discover Tranquil Location, collapsed its ARIA state and released scroll lock.
- No browser warning/error during this sequence.

## Size
The combined runtime is 45,167 characters, up from 42,120. This adds reliable deferred handoff and recovery while removing one early standalone request; it is not a net byte-reduction claim.

## Delivery limitation
Both artifacts loaded successfully in the staging browser, and the full first-open sequence passed.
The independent GitHub-runner delivery probe returned HTTP 503 for the runtime URL, including its one repeated job attempt. Runtime tests still passed 45/45 in both attempts. This is recorded as an outstanding CDN availability limitation, not a JavaScript test failure; no hosting change was made.
Delivery probe: https://github.com/TheDentalBarns/tdb-webflow-runtime/actions/runs/38576036027

## Rollback
Restore site-code-before.json and page-code-before.json (Home) and publish only to the Webflow subdomain. This restores the previous runtime/adapter pins and standalone loader.
