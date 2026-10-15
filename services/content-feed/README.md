# TDB content feed — Instagram staging trial

Worker deployment succeeded on 15 October 2026; the CMS credential, staging route
publication, and homepage acceptance are still pending. This
first route replaces the homepage's repeated Instagram CMS markup with a small
published-data projection. Announcements, Smiles, and Reviews are not migrated.

## Deployment

- Site: `677cf86cf9952f978d94d80c` (The Dental Barns).
- App directory: `services/content-feed` in `TheDentalBarns/tdb-webflow-runtime`.
- Source branch: `audit/runtime-collection-20261014`.
- App: `d01ac34b-689f-4d51-aeaf-df8093e41629` (TDB Content Feed).
- Environment: `37e6e393-ca1c-44a2-b7f9-367da6ceb270` (`staging`).
- Mount: `/tdb-content`.
- Route: `GET /tdb-content/v1/instagram.json` (also supports HEAD).
- Runtime hostname allowlist: `dentalbarns.webflow.io` only.
- Framework: Vite 8.3.4, with a thin `src/worker.ts` API handler.
- Storage: `CONTENT_FEEDS` KV, provisioned per environment by Webflow Cloud.
- Secret: `WEBFLOW_API_TOKEN`, a site-scoped CMS-read token. Never prefix it with
  `VITE_`, expose it to a browser, or commit a secret file. Set it through the
  Cloud UI or the official CLI's secret input. The connector cannot write values.

Cloud builds the Worker adapter; the local Vite build checks the app package but
does not itself prove that the Cloud Worker or its bindings have deployed.
The first actual Worker deployment, `e53e2ab3-001d-4450-9630-c5e9b35c5d0a`,
succeeded and the environment reports its `CONTENT_FEEDS` KV binding. Its
`WEBFLOW_API_TOKEN` variable is not yet configured. The app uses direct CLI
uploads; GitHub pushes alone do not deploy it. From this directory, redeploy with:

```text
webflow apps deploy --site-id 677cf86cf9952f978d94d80c --app-id d01ac34b-689f-4d51-aeaf-df8093e41629 --environment staging --mount /tdb-content --framework vite --json --no-input --skip-update-check
```

Set the runtime token as a secret in the Cloud environment, then redeploy to
activate it. Keep the CLI's user authorization separate from this CMS-only token.
The CLI creates temporary adapter files during deployment and restores the
authoring configuration afterward. Its build output and backups are ignored.

Publish only to the Webflow subdomain to activate staging routing. Custom domains
must retain their existing publication. Verify both deployment and actual JSON
before enabling the homepage feed attribute.

The service returns JSON only. Unknown routes return 404, and all responses carry
`X-Robots-Tag: noindex, nofollow, noarchive`. There is no feed page or sitemap entry.
The data is public, like the displayed posts; noindex is not access control.

## Content and refresh

Read the Media Gallery collection's **live** endpoint, across all pages before
filtering. Match the existing visible switch and awards category, sort by display
order ascending and date descending, and cap at 20 posts. Only post URL, image URL,
alt text, calendar date, media type, and public engagement counts are returned.
Import notes, source captions, source file links, account metadata, and raw CMS
records are excluded. Empty counts remain unknown; a verified zero remains zero.

Snapshots refresh on the first request after five minutes. This works without a
scheduled task or webhook. Publish/unpublish/delete changes appear on a subsequent
refresh; this trial does not promise immediate push updates. Successful empty
results replace prior content. Pagination errors, partial reads, or invalid
eligible posts retain the last valid snapshot for at most one hour. Failed
refreshes have a 30-second per-isolate backoff. KV propagation can add delay.
There is no globally coordinated refresh lock, so separate isolates can rebuild
concurrently. Browser caching is 30 seconds and query parameters cannot bypass
the cache or select a different collection.

## Homepage integration and rollback

The deferred loader supports an opt-in `data-tdb-ig-feed` attribute on the existing
`data-tdb-ig-placeholder="awards"` element. Its value is the relative JSON route
above. Existing pages without this attribute keep using the inert CMS template.

`src/instagram/template.html` is the versioned layout exported from the native
Webflow design, with one empty card and no post data. It is embedded in the
external deferred JS during the deterministic build. Later layout edits must be
reflected in this file; they do not synchronize automatically from Designer.
The native controller, CSS, arrows, motion, Swiper, shared gallery, consent policy,
and desktop/mobile image windows remain unchanged. All post values are validated
and assigned as DOM attributes; CMS text is never inserted as HTML.

Before removing the old homepage template, retain its native Designer definition
and the saved element-tree backup. Remove it only after JSON data and desktop/mobile
visual checks pass. Removing markup after load does not reduce initial HTML bytes.
Rollback: restore the old native template and remove `data-tdb-ig-feed`; the previous
release remains usable. Do not leave the attribute enabled if the API is unavailable.

## Validation

From the repository root:

```text
node --test tests/instagram-deferred.test.cjs services/content-feed/feed.test.mjs
node tools/runtime-build/build-preservation.cjs --all --check
node --test tests/*.test.cjs services/content-feed/feed.test.mjs
```

From this directory: `npm ci --ignore-scripts`, then `npm run build`.

Live acceptance: 16 current published posts match the prior order/content;
no IG JSON/module/CSS requests before consent and proximity; one shared Swiper;
unchanged desktop/mobile motion and controls; no repeated post template in raw
homepage HTML; API failure retains the real Instagram holding link; production
domain publication timestamps unchanged. These checks are still required after
deployment and must not be inferred from the unit tests.
