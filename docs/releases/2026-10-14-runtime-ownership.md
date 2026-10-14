# Runtime ownership split — 14 October 2026

## Scope

Preserve the deployed behaviour while retiring the active immediate/footer
runtime chain. Staging only: https://dentalbarns.webflow.io/.

Sources were extracted from the actual deployed immediate bundle
`46eb697f02701f308f6728a2e61258518719f257` and footer bundle
`d9aede36fbefe928fd108357fb560b2c16c70453`, rather than assuming the latest
repository source matched those releases. This release builds on
`864588fce893de34a5fb48e21e8656c113c8311d`.

## Ownership

- `tdb-foundation.js`: existing native navbar foundation and logo guard, shared
  script loading, arrival attribution, legacy scroll-lock fallback, form
  discovery, treatment gallery sorting, early VIP intent/scroll capture, and
  parallax presentation/controls/legacy conversion. Parallax CTA destinations,
  browser Back restoration and queued arrow clicks stay available early.
- `tdb-runtime.js`: existing consent-released DD/navbar/marquee work plus staged
  VIP, announcement, carousel, tooltip, slider-focus, smooth-scroll and footer
  date loaders. Each loader is installed in a separate scheduled turn after
  the existing bounded initial-render gate. Existing proximity/intent gates
  remain inside their respective loaders.
- `tdb-rendered-progress.js`: one shared rendered-progress sampler, loaded by
  the existing registry and pinned for both reviews and parallax consumers.
- `tdb-parallax-progress.js`: separately loaded parallax progress definition;
  actual mounting stays with the parallax refresh lifecycle.

The build manifest maps each maintained source file to its bundle. Old
immediate/footer dist files remain available for rollback but their active
build targets and page references are retired. Source entry stubs explain the
replacement ownership. Existing full parallax plugins, motion timing, artwork,
markup, UI CSS, consent decision policy and homepage asset overrides are
unchanged. The original CSS readiness helper and VIP request recovery remain
intact because they have specialized behaviour.

## Validation

Build:
`node tools/runtime-build/build-preservation.cjs dist/tdb-foundation.js dist/tdb-runtime.js dist/tdb-rendered-progress.js dist/tdb-parallax-progress.js`

Tests:
`node --test tests/navbar-runtime.test.cjs tests/navbar-handoff.test.cjs tests/runtime-dd.test.cjs tests/marquee-handoff.test.cjs tests/runtime-ownership.test.cjs`

52 checks pass, including new accept/reject handoff, banner settlement,
separate idle startup, browser Back destinations/pose, legacy conversion,
early arrow replay, VIP intent/scroll capture, definition-only progress and
attribution deduplication. DD and marquee unit fixtures isolate their sources;
the ownership suite exercises the new compiled foundation/runtime together.

Previous early navbar/immediate/footer chain: 59,745 raw bytes. New foundation:
29,343 raw bytes. Approximately 30.4 KB moves out of the early path, and the two
old immediate/footer requests disappear. This is a scheduling change, not a
claim of equivalent total-byte or measured Lighthouse/LCP savings.

## Deployment and rollback

Replace the early navbar tag with this release's `tdb-foundation.js`. Remove
the immediate-runtime tag and the homepage's now-unused runtime-base override.
Pin `tdb-runtime.js`, `tdb-rendered-progress.js` and `tdb-parallax-progress.js` to
this release. Preserve all other global and homepage overrides, especially
the differing parallax/marquee cohorts. Publish only to the Webflow subdomain.

Rollback: restore early `tdb-navbar-loader.js` at
`9e6ca9084bf787beb909ddb00c96627c0f63a5fd`; restore immediate bundle at
`46eb697f02701f308f6728a2e61258518719f257` with `data-tdb-runtime-base` pointing
to the `d9aede36fbefe928fd108357fb560b2c16c70453/dist/` directory; restore the
homepage override to that same directory; restore runtime pin
`9e6ca9084bf787beb909ddb00c96627c0f63a5fd`; remove the two added progress pins.

## Later holistic audit

Review the readable named sources for duplicated discovery, specialized CSS
and VIP loaders, remaining early parallax presentation work, legacy page
conversion, hard-coded asset cohorts, optional module top-level startup and
cleanup lifecycles. This release deliberately preserves those behaviours;
it does not claim that merely requesting a script during idle guarantees
idle-time parsing or execution when its response arrives.
