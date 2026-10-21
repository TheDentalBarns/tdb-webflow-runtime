# Floating review widget

The consent-released runtime starts `prepareReviewWidgetLoader`. It requests the
full `tdb-review-widget.js` and `tdb-review-widget.css` only after the review hero
has passed above the viewport. Both assets must finish before the button mounts.

The boundary is the first explicit `data-tdb-review-widget-boundary`, otherwise
the native `data-tdb-review-introduction`, otherwise the existing Hero Headline
component containing `.button.is-review`. Pages with no matching review hero
make no widget requests. An explicit boundary can override page-specific markup.

The button is 4rem high, 1rem above the viewport bottom, with a flat left edge,
semicircular right edge, 20px backdrop blur, light border, five brand-colour stars
and the shared colour Google asset. Its stacking level is one below the VIP
drawer. The 6rem VIP handle covers its full vertical area. Navbar, gallery,
slider-focus and VIP state classes do not change widget visibility.

Returning to the boundary slides the button out with the shared peek duration
and easing, immediately removing it from keyboard/pointer interaction. Scroll,
resize, layout changes and history restoration remeasure the boundary. A failed
download can retry after three seconds on scrolling, or immediately on reconnect.

Activation uses the existing review-trigger delegation, busy state, focus return
and deferred review drawer. Older pages receive an empty drawer mount point if
needed; no drawer markup, content or assets are duplicated at widget mount.

Validation: `node tests/review-widget.browser.cjs` checks desktop/mobile geometry,
cookie and section gates, persistence, VIP overlap, returning, teardown, absent
heroes and legacy restored-scroll behaviour. `node tests/review-widget-staging.cjs`
checks Home, Location, Signature Assessment and Invisalign with local assets substituted;
set `TDB_WIDGET_DEPLOYED=1` to check the published assets instead. Browser checks
require Playwright and use installed Edge (`TDB_BROWSER_CHANNEL` overrides the
fixture browser). The focused startup, shared-module and review-lifecycle suite
also passes.

