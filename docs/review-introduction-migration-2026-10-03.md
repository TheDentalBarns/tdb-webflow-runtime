# CMS review drawer runtime

The drawer reads content from native Webflow CMS output. Do not add review snapshots, reviewer names, quotations, responses, ratings datasets, internal editorial notes or credentials to this repository.

## Modules

- `src/reviews/review-cms-source.js` fetches the native source on demand, parses its public field hooks, joins native response references and reads the CMS aggregate. It coalesces requests, caches briefly, cancels the network request when its final caller cancels, and permits retry.
- `src/reviews/review-drawer-cms.js` preserves the drawer presentation and interactions while using the CMS reader instead of an embedded compressed snapshot.
- `src/reviews/review-drawer-bridge.js` matches the already-rendered native quote to a loaded record. It does not select or replace the featured quote. It loads the drawer when opened and rejects an active legacy drawer.
- `src/components/review-introduction-entry.js` resolves dependencies relative to its immutable script URL.
- `dist/tdb-review-introduction-loader.js` concatenates bridge, introduction loader and entry.

Permission, component presence and proximity remain separate loader conditions. The default CookieScript decision deferral accepts accept/reject/close; it does not add a marketing-consent requirement. Custom permission and subscription callbacks remain supported. Cancellation during CMS loading prevents opening.

The source reader fails explicitly at its collection limit rather than silently truncating. Pagination must be configured before increasing the eligible catalogue beyond that limit. Published native output must be checked for date/option formats, conditional visibility markers, response references, artwork and aggregate values before deployment.

CMS owns content and featured-quote selection. GitHub owns behaviour. Native styling belongs to the introduction component; this change does not migrate the drawer's existing styles.

## Validation and deployment limits

Synthetic tests exercise CMS parsing, conditional topics, responses, invalid aggregates, request coalescing, caching, cancellation/retry, native quote identity and legacy drawer conflicts. Existing introduction lifecycle tests also pass.

These checks do not verify published HTML, browser appearance or deployed consent behaviour. The runtime remains preparation for a later integration. Do not activate it alongside the legacy snapshot drawer. Audit remaining legacy consumers before removing their dependencies, verify the complete drawer lifecycle on staging, and publish only when authorised.
