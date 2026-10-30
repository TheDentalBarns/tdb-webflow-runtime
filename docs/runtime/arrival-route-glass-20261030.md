# Glass arrival routes

The owner's two coordinate lists are projected through one Google OverlayView into 8px-wide ribbons. Both ribbons share a single nonzero-fill CSS clipping path and one dark translucent backdrop layer, so intersections are filled once without double darkening. The glass surface shares the arrival-marker tint and 20px blur in the external journey stylesheet.

A dynamic SVG alpha erosion/composite filter with a radius of 1 CSS px produces a solid cream perimeter inside the combined silhouette. There are no internal borders at intersections or cream underlay beneath the blurred centre. Square caps and mitered turns preserve route geometry. Duplicate points are skipped and extreme miter lengths are bounded.

Google owns projection and redraw during pan/zoom. Draw work is bounded by the existing maximum of 20 coordinates per route. No timer, observer, canvas, extra map or image request is introduced. The dynamic SVG is projection-dependent route geometry rather than static icon artwork.

The arrival lifecycle removes the single overlay on toggle, a new route or consent withdrawal. Decorative layers ignore pointer input and sit below markers. Existing contrasting provider strokes remain the fallback when custom overlays or CSS path clipping are unavailable.

Implementation: `src/journey/journey.js` and `src/styles/tdb-journey.css`. Build outputs: `dist/tdb-journey.js` and `dist/tdb-journey.css`. No map CSS belongs in site or page head code. The journey suite checks projection redraw, finite geometry, one overlay containing both route subpaths, no added route request and consent teardown.
