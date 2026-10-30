# Arrival map markers

The shared Contact us component retains the owner's two route lines. Walking markers now use `data-tdb-journey-walk-1` and `data-tdb-journey-walk-2` (latitude,longitude), with the historical final-segment midpoint as a fallback for instances without these optional values. They are centred circles without duration text. The obsolete walk-label attribute is removed.

The optional `data-tdb-journey-coffee`, `data-tdb-journey-flowers` and `data-tdb-journey-wellness` attributes place three circular icons. All optional points pass the existing local coordinate validation. Amenity points extend the arrival camera bounds; markers use the existing overlay lifecycle and disappear on toggle, new route or consent withdrawal. No extra API request or Designer element is added. Accessible marker titles retain their meaning.

Configured points:
- Walk 1: 52.62996317817975,-1.8016156826400305
- Walk 2: 52.6300611,-1.8016387
- Coffee: 52.6298631,-1.8021164
- Flowers: 52.6301278,-1.8019245
- Wellness: 52.6300663,-1.8011802

Coffee and flowers reuse new shared Webflow SVG Assets; wellness reuses the canonical review lotus. Their masks inherit the same white as the existing walking artwork. All five markers use the same 2.25rem dark circular surface, centred on the authored position. Parking keeps its existing labelled marker.

Validation: 36 journey tests pass, including authored coordinate placement, absent/invalid optional points, route restoration and consent cleanup. Journey JS and CSS builds pass freshness checks. Release is based on staging runtime abb0778bb430934704e84db20e6f3a8bae7a50a5 and changes only the journey assets. Publish to staging only.

Follow-up: all six markers, including parking, are native circle buttons that toggle their accessible text labels into the existing pill surface. One label remains open at a time; repeat activation or Escape collapses it. Width animation uses shared motion timing/easing and skips reduced motion or hidden documents. Teardown cancels marker animations. Amenity labels are LB’s Coffee Shop, Florist and Yoga. All markers reuse the existing rgba(0,0,0,.8) surface and shared 20px blur. All 37 journey tests pass, including parking/amenity label toggling, mutual exclusion and Escape.
