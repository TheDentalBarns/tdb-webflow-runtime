# Smile Gallery Explore count — staging

The Explore total is now owned by tdb-gallery.js, with readable source in src/smile-gallery/explore-count.js. The existing consent-released slider loader supplies its 800px proximity gate. The Home footer no longer requests tdb-gallery-count.js separately. No runtime payload or extra startup loader was added.

The native Home source contains 34 count items, separate from the 11 gallery slides. It remains the source of truth. The correct total and accessible label are retained as the fallback. At 25% visibility, the shared ticker performs one n-1 to n transition (33 to 34 currently), with no negative value for an empty source. Reduced motion follows the existing motion policy. Missing noun elements and failed optional ticker loading keep the correct static total. Removed links are pruned; refresh does not replay a completed entrance.

The deployed ticker v1.2.0 could select the same authored element for both outgoing and incoming when their classes matched. v1.2.1 requires a distinct incoming node, preserving the deployed ticker's other behaviour. Gallery classes, layout and motion timings remain unchanged.

The historical payload experiment keeps its standalone loader; its existing countPrepared marker prevents duplicate ownership. Other page loads with no Explore count source are a no-op.

## Rollback

Restore the gallery and ticker pins from site-before.json and the Home footer from home-before.json. Publish only to the Webflow subdomain. Preserve unrelated concurrent changes when applying the rollback.

## Verification

Built release: dfece9ea586c93e3084476266cf2c72c76dfb741. GitHub Actions run 38582183540: 13 tests passed, zero failed. Tests cover the gallery-owned n-1 transition, 25% visibility threshold, singular/empty sources, reduced motion, failed dependency, detached pending links, duplicate slides, repeat refresh, distinct ticker nodes, and the existing gallery interactions.

Published staging at 2026-10-14T14:38:36.796Z, task 38cbe763-629b-48f3-b0d9-d22f869d49a9. Custom domains remain at 2026-10-01T10:10:45.669Z.

Browser verification: the old count script is absent; the native link showed 34 with no prepared marker and no gallery script before runtime release. After bringing the link into view, the pinned gallery and ticker loaded, the gallery slider initialised, and the Explore count settled to one visible 34 with the correct accessible label. Screenshot inspection confirmed unchanged button layout. No gallery warnings/errors were captured. The 33-to-34 animation sequence itself was verified by the automated test using the built shared ticker.
