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
