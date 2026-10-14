# Marquee runtime handoff — 14 October 2026

## Scope

Builds on navbar release `cbfc45755454e9c40161862f6a3823b3782d56d6`.
Staging only: https://dentalbarns.webflow.io/.

- Replace the standalone early logo-marquee loader with a tiny navigation guard
  in the existing early navbar bundle. Explicit links in partner-source content
  remain normal links; logo controls cannot navigate before initialization.
- Bundle the marquee loader into the existing deferred `tdb-runtime.js`.
  Consent remains the sole owner of decision eligibility. Both accept and reject
  release runtime after the banner's existing settlement; saved choices release
  it through the existing startup path. No new cookie parsing or listeners.
- After the shared initial-render heuristic, discover static Webflow tracks,
  retain the 600px proximity gate, and load motion plus the Swiper adapter via
  the existing registry and immutable asset pins. Validate required exports.
- Preserve the dependency order because the full module reads motion defaults
  at registration. Schedule downloading, full-module startup and individual
  track initialization separately. No preloads or additional animation engine.
- Full module v0.15.0 registers its public API without automatic startup.
  Runtime explicitly calls `start({schedule})`; tracks still initialize and
  animate only near their existing viewport thresholds.
- Remove both marquee whole-document mutation observers. Static page tracks are
  discovered on start. For later DOM insertion/removal, call
  `TDBLogoMarqueeLoader.refresh()` explicitly. Pageshow also refreshes existing
  components. Refresh cleans up detached tracks and mounted instances.
- Failed requests retain static logos and can retry on proximity, online,
  visibility or explicit refresh. Missing registry is caught. Destroy cancels
  queued startup and prevents late downloads from mounting.
- Existing marquee speed, card/tooltip behavior, dragging, keyboard controls,
  motion policy, component CSS and CMS markup remain unchanged.

## Validation

`node tools/runtime-build/build-preservation.cjs dist/tdb-navbar-loader.js dist/tdb-runtime.js dist/tdb-logo-marquee.min.js`

`node --test tests/navbar-runtime.test.cjs tests/navbar-handoff.test.cjs tests/runtime-dd.test.cjs tests/marquee-handoff.test.cjs`

44 tests cover existing navbar/DD behavior plus new/saved accept/reject decisions,
banner settlement, proximity, deferred startup and per-track mounts, absent and
new tracks, detached cleanup, missing registry, retry, destroyed runtime,
IntersectionObserver fallback, and early click guard exceptions.
The additional home-variant test verifies that partner-card HTML, JS and CSS
remain absent after marquee startup.

Browser verification covers staging's Awards and Partners tracks, selection,
tooltip dismissal and the absence of the old early loader request.
File sizes are raw bytes; no Lighthouse/LCP improvement is asserted.

## Deployment and rollback

Set the runtime and full marquee asset pins to this release commit. Update the
existing early navbar loader URL to this release. Remove the standalone
`data-tdb-logo-marquee-loader` script from the global footer. Keep all other pins,
consent, UI CSS and custom code unchanged.

To roll back, restore:

- `tdb-runtime.js` pin: `cbfc45755454e9c40161862f6a3823b3782d56d6`.
- `tdb-logo-marquee.min.js` pin: `edd01dfc7eb3c660ad262e0f642a2bed4bdb0ed1`.
- Early navbar loader URL commit: `cbfc45755454e9c40161862f6a3823b3782d56d6`.
- The global footer script:

```html
<script defer data-tdb-logo-marquee-loader src="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@02231a7e1129602063a09e000546dd424add9fc1/dist/tdb-logo-marquee-loader.js"></script>
```

Publish only to the Webflow staging subdomain.

## Homepage override discovered during staging verification

The homepage's `data-tdb-home-snag-pins` block overrides the global marquee pin
with `5c59038b7132e8a65cd337a751cbb5b41405dd56`. This version preserves lazy partner
card HTML/CSS and horizontal/vertical gesture fixes, whereas the site-wide
baseline uses the earlier native-card version. Preserve both cohorts:

- Site-wide runtime, early navbar and native-card marquee use
  `9e6ca9084bf787beb909ddb00c96627c0f63a5fd`.
- This follow-up commit applies the same registration/scheduling/discovery
  changes to the existing homepage variant (v0.15.1). Only the homepage's
  marquee override points at this follow-up commit.
- Explicitly pin homepage `tdb-partner-card.js` and `tdb-partner-card.css` to
  `5c59038b7132e8a65cd337a751cbb5b41405dd56` so their current renderer and mobile
  dimming stylesheet remain unchanged as the marquee URL moves.
- For rollback, restore the homepage marquee override to that same old commit
  and remove the two explicit partner-card pins in addition to the global
  rollback above.
