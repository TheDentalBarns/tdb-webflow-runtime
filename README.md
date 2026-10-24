# The Dental Barns runtime — 2.0

One repository, one immutable release and one Webflow JavaScript entry. Formatted sources, assembled readable files and minified browser builds are committed together.

Motion pace and character are configured together in `config/motion.json`. See the [shared motion profile](docs/runtime/motion-profile.md) for responsive scaling, scope and seasonal tuning. The consolidated baseline keeps `pace: 1` and `character: "current"`.

## Install

Use the same **40-character Git commit** for the head stylesheet and footer entry. Never use `main`, `latest`, per-file pins or page release overrides.

```html
<!-- Head: retain existing critical CSS and nonblocking stylesheet handling. -->
<link rel="stylesheet" data-tdb-ui-css
  href="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@COMMIT/dist/tdb-ui.css"
  media="print" onload="this.media='all';this.dataset.tdbLoaded='true'"
  onerror="this.dataset.tdbLoadFailed='true'">
<noscript><link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@COMMIT/dist/tdb-ui.css"></noscript>

<!-- Before </body>: the only first-party JS entry. -->
<script defer data-tdb-start
  data-tdb-availability-feed="https://tdb-public-availability.david-070.workers.dev/"
  src="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@COMMIT/dist/tdb-start.min.js"></script>
```

Replace `COMMIT` in all three example URLs and the existing foundation preload (four live references). Do not install the old consent, navbar, runtime, attribution or post-fonts tags alongside this entry. Remove `data-tdb-asset-pins`, cohort bases, review asset configuration and page override scripts. Retain native Webflow markup, CMS data, forms, fonts and required critical styles.

The agreed validation target is staging Home. Other pages with legacy custom code are not certified and may need migration. The new bootstrap has no Home ID or pathname switch.

## Startup and ownership

| Stage | Owner | Gate |
| --- | --- | --- |
| Release root, motion policy, dependency registry | `tdb-start.min.js` | One deferred footer entry |
| Scroll lock, consent, essential navbar | `tdb-foundation.js` | Immediately when the DOM is ready; no font, animation-frame or settling timer gate |
| Shared runtime and lightweight launchers | `tdb-runtime.js` | Existing cookie decision and closed banner; idle turns retained |
| Carousels, reviews, IG, tooltips, forms, VIP | Feature modules | Existing proximity, visibility, consent and intent gates |
| USP/review drawers and Five Senses | Controllers, templates, CSS | Demand; required CSS/exports ready before use |
| Attribution | `tdb-attribution.min.js` | Runtime handoff; its own consent/storage policy |

Every first-party dependency resolves to the entry's release directory. The foundation combines the two former startup downloads. The registry shares one flight per resolved URL/type. An explicit network failure may retry once; a timed-out or already-executed script is never blindly injected again.

Attribution 1.5.2 is maintained here, retaining its 61 submitted fields, deferred field insertion and performance-consent policy. The old attribution repository is historical. Lenis 1.3.19 is vendored with its license. Custom Swiper 8.4.7 retains its existing patch and adapter. Webflow/jQuery, Vimeo and consent-permitted analytics/Brevo remain service SDKs; CMS content, artwork and fonts stay in Webflow.

## Files

| Location | Purpose |
| --- | --- |
| `src/` | Maintained, formatted feature sources and shared primitives |
| `dist/` | Minified browser builds; historical `.js` names are also minified |
| `readable/` | Complete assembled readable counterpart for each canonical JS build |
| `config/release.json` | Active assets and separately identified compatibility outputs |
| `config/build-artifacts.json` | Source mapping, hashes and raw/gzip/Brotli estimates |
| `tools/runtime-build/targets.cjs` | Ordered build composition |
| `tools/custom-swiper/`, `vendor/lenis/` | Pinned vendor sources and licenses |
| `tests/` | Behavioral and release-contract checks |
| `docs/runtime/` | Audit history, ownership and release instructions |
| `archive/`, `docs/archive/` | Retired installers and workflows; never install these |

Compatibility files remain for reference and rollback; the new startup does not load them. Old `tdb-consent.min.js` is **policy-only**, while `tdb-consent.js` is the old combined foundation. Legacy IG/review renderers stay outside the active sequence. Some recovered historical sources retain short identifiers; their provenance is recorded.

## Build and verify

Use Node 24 and committed lockfiles:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run format
npm run build:all
npm run verify
npm run format:check
```

`npm run build` generates minified **and** readable outputs for all manifest targets. `npm run build:swiper` builds both vendor variants. Commit source, outputs and metadata together; never edit generated JS. Terser uses three safe compression passes and identifier mangling, protecting public properties and DOM hooks. Unsafe transforms/property mangling are disabled to preserve behavior.

Tests cover consent, one-release resolution, duplicate prevention, retry/timeout behavior, first-click capture, form values/validation, attribution parity, scroll restoration, motion and feature lifecycles. External Brevo, Webflow Tram and Webflow form-serializer fixtures are opt-in. Simulated DOM checks do not replace physical iPhone Safari/Chrome testing.

See [release and rollback](docs/runtime/releasing.md). This is a baseline for assessing JavaScript; no FCP/TBT improvement is claimed without comparable measurements.

## Motion refresh cleanup — 21 October 2026

Page-break refresh now invokes each shared batch once, preserving independent batches, reference-counted clients and carousel clone cleanup. DD text keeps its membership Set and reuses the already-computed progress value; section magnet reads the body's computed style once per eligibility check. Animation timing, scroll/restoration state, memory hooks, visibility behaviour and public APIs are unchanged. See the [validation and rollback notes](docs/runtime/motion-refresh-cleanup-2026-10-21.md).
