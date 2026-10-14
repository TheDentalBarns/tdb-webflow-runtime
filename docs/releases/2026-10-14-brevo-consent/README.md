# Brevo consent runtime — 2026-10-14

Staging only: https://dentalbarns.webflow.io/

## Changes
- Remove the early footer request for tdb-brevo-consent.min.js v1.0.1.
- Add src/brevo/consent.js (TDBBrevoConsent v2.0.0), built into the deferred runtime and registered through features-startup.js.
- Use TDBConsent.subscribe and allows('targeting'); no duplicated CookieScript parser or category event listeners.
- Load the bootstrap only with targeting permission; recheck before enqueueing init after transport. Verified against Brevo's actual public bootstrap, which supports this ordering.
- Use TDBModules for single-flight transport and failed-tag cleanup. At most two requests, retrying only explicit transport failure. No automatic timeout retry or duplicate init queue.
- Preserve existing SDK ownership without asserting it is ready. Report nested SDK transport errors.
- Clear the established sib_cuid cookie at host and known production parent-domain scopes. Do not blindly clear generic cookie names.
- On withdrawal cancel retry work, clear the cookie, and request one reload if the SDK may have executed. State is reload-required, not a claim that a cancelled navigation has stopped the SDK.
- Keep pageshow and visible-tab checks using the shared consent adapter, which rereads the saved cookie.
- No Designer, navbar, Vimeo, form submission, Brevo account, or campaign changes.

## Build and size
Runtime SHA: 35b0c925c0dbd305982d6391ac785aefe2163dc7.
Runtime 40309 -> 42120 characters; previous early wrapper 1564 characters removed.
The gain is one less early request and deferred work, not a claim of overall byte reduction.
Other asset pins unchanged.

## Tests
31 passed; 0 failures; 0 skipped. Includes 14 Brevo checks plus navbar handoff and existing runtime ownership regression checks.
An existing Swiper mock was missing prune(); completed that mock so the combined test output has no uncaught error.
Test run: https://github.com/TheDentalBarns/tdb-webflow-runtime/actions/runs/38574167642

## Staging verification
Published only to the Webflow staging subdomain at 2026-10-14T13:44:14.596Z.
Production custom-domain publish dates remain 2026-10-01T10:10:45.669Z.

The new runtime is loaded and the old early Brevo wrapper is absent.
With essential-only consent there are no Brevo script tags.
Accepting all after the deferred runtime has already loaded adds exactly one bootstrap and one sendinblue-js SDK tag.
Withdrawing consent reloads the page and removes both scripts.

The CDN initially returned a transient delivery failure. It subsequently served HTTP 200, and its bytes match the built runtime.
Delivery and repeated 31-test verification: https://github.com/TheDentalBarns/tdb-webflow-runtime/actions/runs/38574476456

## Rollback
Restore head/footer from site-code-before.json. This restores the previous runtime pin and the early standalone Brevo wrapper. Publish only to the Webflow subdomain.
