# Public availability feed

Deployed as `tdb-public-availability`; CMS access is being verified before
enabling the feed in the Webflow staging runtime.

This independent Worker reads the **published** Banner Settings items directly
from Webflow's CMS API and returns only ten allowed fields as JSON. It no longer
fetches or parses a webpage. The browser never receives the Webflow API token.
It does not change `tdb-appointment-sync`, its five-minute schedule, or CMS editing.

The collection and active/preview item IDs are fixed in code. Reads use the
`/live` endpoint, reject drafts/archived or mismatched records, and never expose
other CMS fields. Empty optional values become empty strings. Date fields supply
the UTC calendar-date portion of Webflow's stored value; the separate UK clock
field remains authoritative, with London daylight saving resolved by the existing
browser reader. This preserves the CMS field instructions and current fixtures.

## Deploy and enable

1. Configure `WEBFLOW_API_TOKEN` under the Worker's **Runtime variables and
   secrets > Production** (not Build variables and secrets), scoped
   to this Webflow site with **CMS:read** only. Never put its value in Wrangler
   config, Git, custom page code, or chat. Have the account owner enter it through
   the authenticated secret-entry UI (or `wrangler secret put WEBFLOW_API_TOKEN
   --config services/availability-feed/wrangler.jsonc`). Do not extract the
   existing appointment-sync Worker's secret.
2. From this repository, deploy with Cloudflare account access:
   `npx wrangler deploy --config services/availability-feed/wrangler.jsonc`.
3. Verify the returned Worker URL at `/active.json` and `/preview.json`, including
   CORS, data equality with the CMS pages, and `?refresh=1` cache bypass.
4. Set `data-tdb-availability-feed="https://<verified-worker-host>/"` on the
   staging site's existing `tdb-modules.js` script. Keep the trailing slash.
5. Publish only the Webflow staging subdomain and verify request sizes and data.

Until that attribute is set, the shared browser reader uses the existing CMS
page. If JSON fails or fails validation, it falls back to the CMS page for that
document. Remove the attribute to roll back without changing the content.

The Worker caches validated JSON for at most 60 seconds. Responses carry the
original `checkedAt`; neither edge-cache hits nor same-tab navigation extend
the browser's five-minute freshness window. Manual refresh bypasses the edge
cache. Errors are not cached, and response bodies contain only generic errors.

## Troubleshooting

Cloudflare Worker logs record an `availability_feed_failure` event for each
failed feed request. It contains only a fixed failure code, the active/preview
channel, the upstream HTTP status when available, and an allowlisted field name
for invalid field data. No token, request headers, raw exception, CMS content or
upstream response body is logged. The public error response stays generic.

After a successful build/deployment, open `/active.json?refresh=1`, then inspect
that request under the Worker's **Observability > Logs**:

- `missing_token`: check the runtime production secret and deployed version.
- `cms_http_error`: inspect `status`; 401/403 indicates rejected credentials or
  insufficient access, 404 indicates an unavailable published item, and 429 is
  rate limiting. Check the site-scoped Webflow token has CMS read permission.
- `cms_fetch_failed`, `cms_body_read_failed` or `cms_timeout`: the upstream
  request or response transfer failed.
- `cms_invalid_json`, `cms_item_*`, `cms_field_*` or `cms_date_*`: the received
  CMS data failed the existing validation; inspect the fixed code/field.

The dashboard build API token authorizes Cloudflare deployment. It is separate
from the Webflow CMS token used by the running Worker.

Run checks with `node --test services/availability-feed/worker.test.mjs`.

Webflow published-item reference:
- https://developers.webflow.com/data/v2.0.0/reference/cms/collection-items/live-items/get-item-live

Cloudflare reference:
- https://developers.cloudflare.com/workers/runtime-apis/cache/
- https://developers.cloudflare.com/workers/runtime-apis/fetch/
