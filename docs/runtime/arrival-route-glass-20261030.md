# Glass arrival routes

The owner's existing route coordinates are projected through Google's OverlayView into two narrow ribbons. Each ribbon uses a CSS-clipped dark translucent layer with the shared 20px backdrop blur. A dynamic SVG path outlines that same geometry with a solid 2px cream stroke. It has no filled cream underlay, so the actual satellite image remains visible through the blurred centre.

The overall route width is 10px (8px ribbon plus 2px centred outline). Square caps and mitered turns preserve the architectural route. Duplicate points are skipped and extreme miter lengths are bounded. Draw work is bounded by the existing maximum of 20 coordinates per route; no timer, observer, canvas, extra map or image request is introduced. Dynamic SVG geometry is required because these outlines follow projected map coordinates, rather than reusable static icon artwork.

Google owns pan/zoom projection and overlay placement. The existing arrival lifecycle removes both overlays on toggle, new route or consent withdrawal. Decorative layers ignore pointer input and sit below markers. The prior contrasting provider strokes remain a fallback when custom overlays or CSS path clipping are unavailable.

The journey suite includes projection redraw, finite path geometry, two overlay count, no added route request, and consent teardown checks.
