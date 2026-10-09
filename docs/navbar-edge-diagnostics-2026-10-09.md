# Android navbar edge investigation

David reports that v1.1.0's blur retirement changes the hairline to an edge-to-edge
line but does not remove it. This disproves retained blur as a sufficient fix.
The temporary view measures the affected browser instead of adding another
offset or changing the normal surface animation.

Load the opt-in staging URL `https://dentalbarns.webflow.io/?nav-diagnostics=1`,
scroll until the navbar reappears, open its main menu and wait for "settled".
The panel shows the exact bar, glass, native overlay and menu rectangles, their
differences in CSS pixels, device-pixel ratio and current backdrop filters.
Copy measurements includes the last 12 samples, relevant computed styles and
hit-tested elements around the join. No measurements are transmitted or stored
outside the page unless the user explicitly copies them.

The normal staging URL does not load the diagnostics asset. Both the loader and
asset require the exact staging hostname and `nav-diagnostics=1`. The diagnostic
panel is fixed outside document flow; it does not write to navbar nodes, styles,
attributes, native state or event handlers. Hiding it disconnects its observers,
resize listener and timers. It creates no interval or continuous measurement loop.

Interpret settled measurements only: positive bar-to-overlay identifies an
overlay placement gap; positive overlay-to-menu identifies a menu offset;
positive bar-beyond-glass identifies a shorter glass surface. Matching edges
point to paint/compositing rather than a CSS layout gap. Record both the top
and scrolled states before deciding on a correction.

Remove the `data-tdb-navbar-diagnostics-loader` script from a freshly read site
footer and republish staging when this investigation is complete. Keep the
diagnostic asset in git for reproducibility; it is not part of the navbar build.

## Controlled IX2 comparison

David subsequently reports that zooming and repeated opening/closing change
whether the seam is visible, and that it was not visible before the migration.
That is consistent with a raster/compositing seam, but is not proof of its cause.
The original IX2 lists `a` and `a-2` animated only hamburger lines; dropdown lists
`a-3`–`a-6` and `a-76`–`a-77` animated contents, chevrons and spacers. None moved
the main menu or native overlay. The main slide/overlay remains Webflow-owned.

Use the same current staging page with two query modes:

- Current: `https://dentalbarns.webflow.io/?nav-diagnostics=1`
- IX2: `https://dentalbarns.webflow.io/?nav-diagnostics=1&nav-mode=ix2`

The comparison bootstrap runs inline in Home's page head. It removes only the
navbar's opt-in attribute and its two shared-chevron opt-ins, and restores the
three exact archived IX2 handles during HTML parsing. The already-authored IX2
events then run normally. This also disables v1.1.0's scoped blur retirement,
matching the pre-migration surface behaviour. All current page content, layout,
Webflow native controls and existing enhancement/consent code remain the same.
Shared disclosure controls outside the navbar are untouched. No geometry,
pixel offset, filter, transform or animation setting is added by the comparison.

The normal URL and production hosts do not activate this mode. The diagnostic
panel labels which mode is active. The comparison is intentionally a full
pre-migration-navbar baseline; if only the current mode shows the seam, isolate
individual CSS/state changes next. Do not present this comparison as a fix.

Cleanup also requires removing the tagged `data-tdb-navbar-ix2-comparison` script
from a fresh Home page head. Do not replace the whole site-wide foundation: its
shared disclosure portion is also being updated for other components.

Validation used the freshly read live foundation, including shared disclosure
v1.1.0. Fixtures cover normal staging, the production-host guard, single-chunk
and streamed navbar parsing, original IX2 target availability before Webflow
initialization, native attributes/links, and unrelated FAQ functionality.
Both generated scripts pass syntax checks. Android paint behaviour still
requires comparison on the affected device.
