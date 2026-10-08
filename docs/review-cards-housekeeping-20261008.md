# Review cards housekeeping — 8 October 2026

The shared rendered-progress scheduler serves review cards and the existing
parallax progress bars. Track mutations wake it; compositor transitions keep it
sampling until settlement. It stops while idle, offscreen or hidden. Resize,
visibility changes, drag writes and zero-speed navigation wake it again.
It is included in the immediate runtime, with a guarded review-loader fallback.

Designer owns ordinary card layout, typography, spacing, default visibility,
date-value flex layout and the platform-icon embed wrapper. The section embed
retains CMS attribute/nth-child states, container queries, whole-line clamping
and the height-aware landscape condition that ordinary width breakpoints cannot
express. JS no longer also toggles background and empty-star styling classes.
Runtime still controls movement/opacity, progress marker geometry and the
measured body line-count variable. This is not a zero-inline-style slider.

The hidden SVG inside the card mark spacer was removed. The spacer remains to
preserve geometry. The drawer template already has an empty spacer; its separate
visible static mark participates in drawer motion and must remain.

The published IX2 audit found no review-section target selectors/IDs and no
data-w-id descendants. No IX2 deletion was needed for this section.

Responsive widths: tablet/iPad mini 72vw including the 2vw gutter; portrait phone
92vw; desktop/iPad Pro three cards. Short landscape uses 92vw slides with 90vw
navigation/mark and 5vw left inset, including 852 × 393.

Validation: real-Swiper review tests across eight sizes; shared progress tests for
compositor interpolation, idle sleep, zero-speed writes and disposal; parallax
loop/reverse seams, resize/DPR, structure mutations and visibility; loader
consent/proximity/remount checks. Preserves concurrent native parallax changes
from ec2811c0be15ba874b59388a05b5deecca7ab345. Publish staging only.

## Final retirement

Removed the unused `Review Cards – previous` Webflow component (zero instances)
and its `tdb-review-cards_arrow` style, including the superseded press states.
Live card arrows use the native shared `tdb-service-arrow` and persistent
`is-selected` state. Removed the redundant JS historic-label hidden write;
CMS attributes and the section CSS now own historic-label visibility.

Removed the site-wide `data-tdb-legacy-reviews` script include, so the legacy
summary-card JS and mobile review-drawer CSS are no longer loaded by it.
David explicitly accepted older review sections breaking during page-by-page
staging migration. Historical pinned assets remain in Git history.
