# Public availability feed

Prepared for staging; not deployed or enabled in the Webflow runtime yet.

This is an independent Worker that reads the already-public Banner Settings
page and returns its ten allowed fields as JSON. It needs no secrets, API token,
CMS write permissions, or access to Dentally. It does not change the existing
`tdb-appointment-sync` Worker, its five-minute schedule, or CMS editing.

The upstream is fixed to `https://dentalbarns.webflow.io`. Review any production
source separately before enabling a production site; staging CMS copy must not
silently become the production source.

## Deploy and enable

1. From this repository, deploy with Cloudflare account access:
   `npx wrangler deploy --config services/availability-feed/wrangler.jsonc`.
2. Verify the returned Worker URL at `/active.json` and `/preview.json`, including
   CORS, data equality with the CMS pages, and `?refresh=1` cache bypass.
3. Set `data-tdb-availability-feed="https://<verified-worker-host>/"` on the
   staging site's existing `tdb-modules.js` script. Keep the trailing slash.
4. Publish only the Webflow staging subdomain and verify request sizes and data.

Until that attribute is set, the shared browser reader uses the existing CMS
page. If JSON fails or fails validation, it falls back to the CMS page for that
document. Remove the attribute to roll back without changing the content.

The Worker caches validated JSON for at most 60 seconds. Responses carry the
original `checkedAt`; neither edge-cache hits nor same-tab navigation extend
the browser's five-minute freshness window. Manual refresh bypasses the edge
cache. Errors are not cached, and response bodies contain only generic errors.

Run checks with `node --test services/availability-feed/worker.test.mjs`.

Cloudflare reference:
- https://developers.cloudflare.com/workers/runtime-apis/cache/
- https://developers.cloudflare.com/workers/runtime-apis/fetch/
