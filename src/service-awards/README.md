# Service award trio

Reusable Webflow component: `TDB / Service awards — contextual trio`.

Services use three ordered Reference fields, `Featured award 1`, `Featured award 2`, and `Featured award 3`, pointing to the existing Partner logos collection. Change these slots to curate a service. The Services collection is now at its 60-custom-field limit.

Partner logos supplies the original SVG, Short heading, Award result and year, and Short explainer. Related services is available for tagging and future placements. Slot references control this component; tags describe relevance rather than override an explicit selection.

The page-level native CMS feed resolves the reference fields on publish. The component reads it without API requests, credentials or a generated content snapshot. For reuse on other templates, add the same three-slot feed in that page's CMS context. Existing logo banners are unchanged.

Presentation: three columns on desktop, three rows on mobile, with logos on the left and left-aligned text on the right. Original SVG logos are static black with reserved dimensions. Titles and award results sit alongside the logos, followed by the short explanation with the same DD opacity curve and smoothing as review names. No carousel or automatic movement.

Only staging publication is authorised. Runtime script is pinned to an immutable GitHub commit; CSS is also inlined in the component embed to reserve space and hide the CMS feed before JavaScript runs.

The awards section uses the existing `margin-top margin-xxhuge` utilities for separation from the intro buttons. Larger logos have a 1px orange-3 vertical divider beside them; mobile rows have horizontal separators. The Our Recognition heading uses the existing tagline style, without an adjacent line.
