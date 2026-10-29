# TDB content feed — Instagram, Smile Gallery and Reviews staging trials

## Location / Behind the Barns — 29 October 2026

`GET /tdb-content/v1/instagram-practice.json` uses the same Media Gallery
projection as Awards with the existing **The Practice** category
(`6ab7b41d76a5f592a5b6dd3f`). It has its own `instagram:practice:v1` cache;
Awards keeps its existing endpoint and cache. Both include only published,
visible, non-archived posts, ordered by display order then newest date, capped
at 20. The twenty most recent existing Practice posts were enabled with the
owner's approval. Future edits belong in CMS: keep the category and Visible
switch set, then publish the item. This is published CMS content, not a live
Instagram ingestion or engagement-sync service.

The native **Deferred Instagram Feed** component is shared by Home Awards and
Location's **Behind the Barns** section. Its three-node reserved holder has
instance properties for the approved JSON endpoint and feed key. Home gains no
wrapper or element. Location uses the existing Smile Gallery heading classes
and shared secondary button with the canonical Instagram mask. The deferred
renderer, consent/proximity loading, carousel, motion and CSS are shared.
Location's legacy Elfsight bootstrap and old section instance are removed;
Contact retains its legacy instance pending its own migration.

## Cloudflare delivery — 16 October 2026

Home's three JSON consumers now use the same paths on
`https://tdb-public-availability.david-070.workers.dev`. The existing availability
Worker retains its `/active.json` and `/preview.json` handler and CMS credential;
the new content routes reuse that credential without exposing or copying it.
Webflow CMS remains the source of published content. The Webflow Cloud app and
same-origin routes below are retained as a rollback during the staging trial.

`cloudflare-worker.mjs` adds public CORS, 30-second browser caching and 60-second
Cloudflare Workers Cache caching, with a 30-second stale-while-revalidate window.
Cache lifetimes are capped so they cannot extend a snapshot beyond one hour.
Errors are never cached. A valid snapshot older than five minutes is returned
immediately while `ctx.waitUntil()` refreshes it. A missing or expired snapshot
still requires a successful CMS read. No scheduled refresh has been configured.

The `CONTENT_FEEDS` KV binding stores separate feed snapshots and immutable
review revisions. Review index and ID batches retain their existing ordering,
20-ID limit and one-hour revision validity. Query strings remain part of the
Cloudflare cache key. CMS text, fields and image URLs are unchanged.

The Cloudflare upload enables Workers Cache and inherits `WEBFLOW_API_TOKEN`.
It preserves the existing availability module from the deployed Worker. Future
CLI deployments can use `wrangler.cloudflare.jsonc`; do not deploy the old
availability-only configuration over the combined Worker. The Webflow CLI
instructions below describe the rollback deployment, not the current feed path.

Validation: the content service, refresh/caching tests and availability tests;
the frontend suite; live JSON parity and cache-hit measurements; desktop/mobile
Smiles, IG and review drawer checks including an arbitrary review priority order.

The Instagram trial is active on the Webflow staging homepage as of 15 October
2026. The published endpoint and desktop/mobile carousel have been verified. This
first route replaces the homepage's repeated Instagram CMS markup with a small
published-data projection. The Home Smile Gallery now uses the same service with
an independent projection and cache. The Home review drawer and inline review
consumers can opt into the Reviews JSON projection through their existing lazy
host. Announcements are not migrated.

## Deployment

- Site: `677cf86cf9952f978d94d80c` (The Dental Barns).
- App directory: `services/content-feed` in `TheDentalBarns/tdb-webflow-runtime`.
- Source branch: `audit/runtime-collection-20261014`.
- App: `d01ac34b-689f-4d51-aeaf-df8093e41629` (TDB Content Feed).
- Environment: `37e6e393-ca1c-44a2-b7f9-367da6ceb270` (`staging`).
- Mount: `/tdb-content`.
- Route: `GET /tdb-content/v1/instagram.json` (also supports HEAD).
- Smile route: `GET /tdb-content/v1/smiles.json` (also supports HEAD).
- Reviews index/batches: `GET /tdb-content/v2/reviews.json` (also supports HEAD).
- Legacy full Reviews JSON: `GET /tdb-content/v1/reviews.json`.
- Runtime hostname allowlist: `dentalbarns.webflow.io` only.
- Framework: Vite 8.3.4, with a thin `src/worker.ts` API handler.
- Storage: `CONTENT_FEEDS` KV, provisioned per environment by Webflow Cloud.
- Secret: `WEBFLOW_API_TOKEN`, a site-scoped CMS-read token. Never prefix it with
  `VITE_`, expose it to a browser, or commit a secret file. Set it through the
  Cloud UI or the official CLI's secret input. The connector cannot write values.

Cloud builds the Worker adapter; the local Vite build checks the app package but
does not itself prove that the Cloud Worker or its bindings have deployed.
The current Worker deployment is `a5a9fe9f-4dce-4d21-9d8f-4e1d5f1b9a21` (IG, Smiles and Reviews).
Its `CONTENT_FEEDS` KV binding and secret `WEBFLOW_API_TOKEN` are configured.
The homepage's three runtime URLs share one release SHA. The app uses direct CLI
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

The API returns JSON with `X-Robots-Tag: noindex, nofollow, noarchive`; unknown
API paths return JSON 404. Webflow's asset layer serves the minimal noindex
"Not found" build stub at the mount root with HTTP 200. That stub contains no
posts or feed links. No feed page or sitemap entry is created. The JSON data is
public, like the displayed posts; noindex is not access control.

## Content and refresh

The Reviews route reads three live collections (reviews, approved responses and
the existing aggregate record) into one validated snapshot. It retains the
published UI fields, topic/excerpt metadata and editorial selection policy.
Home receives a compact index and fetches only its requested IDs, up to 20 per
request. Context priorities determine the initial order before bodies download.
Pinned index revisions keep batches consistent across CMS refreshes, with a
one-hour maximum age. No HTML pagination/detail pages are fetched. See
`docs/releases/2026-10-15-reviews-json/README.md` for scope and rollback.

Read the Media Gallery collection's **live** endpoint, across all pages before
filtering. Match the existing visible switch and awards category, sort by display
order ascending and date descending, and cap at 20 posts. Only post URL, image URL,
alt text, calendar date, media type, and public engagement counts are returned.
Import notes, source captions, source file links, account metadata, and raw CMS
records are excluded. Empty counts remain unknown; a verified zero remains zero.

The Smile route reads the Smile Galleries live collection, returns featured
cases in the native priority/creation order, and includes the total published
case count. Only titles, descriptions, combined images, alt text, prices,
durations, clinician labels and treatment labels are public. Option/reference
IDs map to the same labels used by the native component; new clinician choices
need a corresponding projection mapping. See
`docs/releases/2026-10-15-smile-feed/README.md` for the Home integration.

Snapshots refresh on the first request after five minutes. This works without a
scheduled task or webhook. Publish/unpublish/delete changes appear on a subsequent
refresh; this trial does not promise immediate push updates. Successful empty
results replace prior content. Pagination errors, partial reads, or invalid
eligible posts retain the last valid snapshot for at most one hour. Failed
refreshes have a 30-second per-isolate backoff. KV propagation can add delay.
There is no globally coordinated refresh lock, so separate isolates can rebuild
concurrently. The handler requests 30-second browser caching, but the deployed
Webflow proxy currently rewrites that header to `no-cache, private`. Memory/KV
snapshot caching still works: repeated live requests returned the same checkedAt.
Query parameters cannot bypass that snapshot cache or select another collection.
Only Reviews v2 accepts a validated ID list and revision to select cached records.

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

The original homepage/CMS design is retained on the **unpublished** page
`6ad0c54657f7dc084e96eccd`, "IG feed rollback - 15 Oct 2026". Its URL
`/ig-feed-rollback-20261015` returns 404. The native Collection List's source,
filters, sorting and limit were verified after duplication. Webflow cannot
convert a live CMS-bound Collection List into a reusable component, so this
draft page is the native rollback source. A separate element-tree backup is saved
with the release evidence.

The old `template[data-tdb-ig-source]` has been removed from Home after successful
desktop/mobile checks; it is absent from the raw published HTML. Rollback: copy
that template from the draft page back beside the Home IG holder in Designer,
then remove the holder's `data-tdb-ig-feed` attribute and publish staging. The
loader retains support for this legacy path. The previous complete release is
`6a7fa4880cd9127f668d3999ec7fd2815c406945` if an asset rollback is also required.

## Validation

From the repository root:

```text
node --test tests/instagram-deferred.test.cjs services/content-feed/feed.test.mjs
node tools/runtime-build/build-preservation.cjs --all --check
node --test tests/*.test.cjs services/content-feed/feed.test.mjs
```

From this directory: `npm ci --ignore-scripts`, then `npm run build`.

Verified:

- All 16 published posts match the previous order and image URLs. API output is
  5,896 bytes before compression; only projected public fields are present.
- Desktop 1280x720 and mobile 390x844 render the existing layout and full-motion
  carousel. Next/previous navigation works, with five/three unique photo sources
  respectively and one shared Swiper script. Mobile was checked after choosing
  essential-only consent. The final mobile reload works without any old template.
- Before proximity, browser DOM inspection found no IG JS or CSS. Both fresh
  GTmetrix waterfalls contained no IG JSON, IG JS/CSS or Swiper requests, and no
  failed resource requests. The API-failure fallback is covered by unit tests;
  no artificial live outage was introduced.
- Raw Home HTML fell from 347,093 to 318,255 bytes. Removing the template saved
  28,888 bytes (222 inert descendant elements); the feed attribute adds 50 bytes.
  Local gzip comparison saves 2,538 bytes; GTmetrix HTML transfer saves about 3 KB.
  Lighthouse active DOM count changes only from 2,047 to 2,046 because the old
  template's content was already inert.
- Runtime tests: 360 passed, three existing skips, zero failures. Deterministic
  build check and actual Cloud Worker deployment passed. Production publication
  timestamps remain 1 October 2026 at 10:10:45.669 UTC.

Performance is **not improved in these runs**. Same London/Chrome/4G settings:

| Run | TTFB | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: |
| [Before](https://gtmetrix.com/reports/dentalbarns.webflow.io/v611U43z/) | 446 ms | 1,158 ms | 280 ms | 0 |
| [First after](https://gtmetrix.com/reports/dentalbarns.webflow.io/TNHntTQO/) | 2,090 ms | 2,789 ms | 446 ms | 0 |
| [Repeat after](https://gtmetrix.com/reports/dentalbarns.webflow.io/R2hGpMwO/) | 505 ms | 1,273 ms | 426 ms | 0.00046 |

The first after run was a document cache MISS; the repeat was HIT. The repeat's
largest task is attributed to the page URL (436 ms), with 863 ms of aggregate
Style & Layout work. IG code did not load during either initial test. These
measurements verify the loading architecture and smaller HTML, not a TBT gain
or a proven cause of the remaining page-level long task. Physical phones and a
controlled before/after CPU trace remain outside this staging acceptance.
