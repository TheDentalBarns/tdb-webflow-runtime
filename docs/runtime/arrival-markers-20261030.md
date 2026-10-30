# Arrival map markers

Coordinates belong to native Webflow custom attributes on the shared Contact us component. Behaviour lives in `src/journey/journey.js`; styles live in `src/styles/tdb-journey.css`, built into the external journey assets. Do not add map CSS rules to site or page head code.

All six markers are icon-only 2.25rem circles when collapsed. Activating a Google AdvancedMarker expands its label; repeat activation or Escape closes it. Only one label is open at a time. Google owns the keyboard-focusable button; its styled content is a span. Width animation uses shared motion timing/easing and skips reduced motion or hidden documents. Teardown cancels animations.

Pills expand right while the icon stays fixed at its coordinate. The northern brook-side walker alone expands left to avoid overlap. Right-expanding markers use a -1.125rem anchor; the left-expanding marker uses `calc(-100% + 1.125rem)`. Expanded markers sit above their neighbours.

The surface matches the Services carousel buttons: `rgba(0,0,0,.38)`, shared `--effects--blur` (20px fallback), white artwork and a translucent white border. Icons reuse shared Webflow SVG assets; wellness uses the review lotus.

| Marker | Latitude, longitude | Expanded label |
| --- | --- | --- |
| Parking | 52.6296211,-1.8019128 | Free parking |
| Walk 1 | 52.62996317817975,-1.8016156826400305 | Walk through the courtyard · <1 min |
| Walk 2 | 52.6300611,-1.8016387 | Walk along the brook side · <1 min |
| Coffee | 52.6298631,-1.8021164 | LB’s Coffee Shop |
| Flowers | 52.6301278,-1.8019245 | Florist |
| Wellness | 52.6300663,-1.8011802 | Yoga |

Parking coincides exactly with the first route coordinate. Walking positions use `data-tdb-journey-walk-1` and `data-tdb-journey-walk-2`, with a final-segment midpoint fallback for instances without these values. The obsolete walk-label attribute is removed. Amenities use `data-tdb-journey-coffee`, `data-tdb-journey-flowers` and `data-tdb-journey-wellness`. Optional points pass existing local coordinate validation and extend arrival camera bounds.

The existing lifecycle removes markers and routes on arrival toggle, a new route or consent withdrawal. Marker interaction adds no API requests or Designer elements. See `arrival-route-glass-20261030.md` for route rendering.

Validation: 38 journey tests cover placement, invalid/missing optional coordinates, label toggling, mutual exclusion, Escape, route restoration, projection redraw and consent cleanup. Desktop staging and keyboard interaction were checked. Real-device Safari blur/zoom performance remains a release check. Publish scope is staging only.
