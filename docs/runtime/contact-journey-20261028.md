# Shared contact and journey planner

The shared Contact us definition owns the contact links, native journey form, reserved result space and map frame. Home has no instance and gains no DOM. Six decorative icon embeds and wrappers have been removed; pseudo-element masks reuse canonical Webflow SVG Assets (including the existing footer Instagram/Facebook artwork). The mobile link now has a working `tel:+447488893573` destination.

The former Elfsight embed contained only its widget ID. It is replaced by an in-page Google Maps and Routes enhancement. Native GET form submission and the separate directions link remain useful without JavaScript. Google code is conditional on proximity and functional consent. A deliberate submit requests one traffic-unaware driving route with only path, duration and distance. Origin text is kept only in the form/current memory; this module writes no storage or analytics. Failed requests retain the external directions link. Consent withdrawal removes map/route DOM and invalidates pending results; it cannot recall already transmitted requests.

## Ownership

- Designer: shared structure, responsive layout, headings, form, reserved map/result geometry and colours linked to existing site variables. No inline JS/CSS patch.
- `src/runtime/journey-loader.js`: shared registry, proximity, deferred CSS and first-submit capture/replay.
- `src/journey/journey.js`: consent, one SDK flight, map and route lifecycle, validation/error messages, stale-result suppression and repeated-search deduplication.
- `src/styles/tdb-journey.css`: enhancement/focus states only. No independent motion.
- Google Cloud project `tdb-reviews-509711`: website-restricted staging browser key, scoped to Maps JavaScript API and Routes API. Key value is stored on the shared native journey root, not in this repository.
- Map ID `a89b9d7c9a869537d58a7d2a`; style ID `abdd84917bc4e7b4c1e9ff6b`. The single cloud style is shared by all instances. `config/journey-map-style.json` records the existing cream/sand/neutral palette used by that style. Google cloud styling cannot reference CSS variables: if the brand palette changes, update this central style as well. Marker and route colours read the native CSS variables directly.

Map centre verified against the existing business Google Maps link: 52.6300414, -1.8014216. Routing uses the full business address so Google resolves the access point rather than routing to an arbitrary point on the building.

## Validation

Initial automated suite: 800 pass, 3 skip. Journey tests cover consent/replay, embedded result, API field/cost selection, request deduplication, editing during a pending request, withdrawal and empty/error responses. Build parity passes. The repository-wide formatter reports the pre-existing unrelated `src/reviews/native/loader.js` formatting warning; changed sources pass formatting.

Staging and visual verification to be recorded after release. This is not a production-domain activation. Runtime rollback is the previous four global pins at `83b097622bca5661580d6c1aa55181f2d46c27cf`; private native/global backups are retained in the workspace contact-map evidence directory.
