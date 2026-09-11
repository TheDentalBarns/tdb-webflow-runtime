# TDB Webflow Runtime

Production JavaScript and CSS runtime for The Dental Barns Webflow website.

## Release policy

- `main` contains the current maintained runtime.
- `release/v1.0.0` preserves the first consolidated production runtime.
- Webflow loads immutable commit-pinned jsDelivr URLs.
- Every behavioral change receives a new semantic version and a new commit pin.
- Experimental branches are not production dependencies.
- Staging changes are published to the Webflow subdomain first and promoted to custom domains only after sign-off.

## Current production manifest

Production custom domains remain on the last approved production publish. Core pinned assets include:

| Asset | Version | Immutable commit | Purpose |
|---|---:|---|---|
| `dist/tdb-ui.css` | `1.0.0` | `ec075e95bfb21fecd083fc1d4f48aecc771d9440` | Deferred global UI styles |
| `dist/tdb-navbar.min.js` | `1.0.0` | `0c4f2c8abd91eaf491ae41abebcc71c6e8cd0370` | Navbar state and mobile text motion |
| `dist/tdb-immediate-runtime-batch.min.js` | `0.6.4` | `d9ecd7a36438e6eeffb1a21337475520a9007b1b` | Consent-first and immediate runtime loading |
| `dist/tdb-footer-runtime.min.js` | `1.0.2` | `f5fda2c134733f1b0c745264fb6d0c69fd396ef7` | Deferred forms, sliders, Lenis, Elfsight timer and supporting UI |
| `dist/tdb-vip-drawer.js` | `0.4.1` | `28fa8d3043e0d0aea8a531e2a98954c35ccaea10` | Mobile VIP drawer |
| `dist/tdb-vip-drawer-desktop.js` | `0.1.6` | `ec642d0f97f3737c9f0efbad1c63428ebea29f10` | Desktop VIP drawer |

The immediate runtime loads CookieScript `3.0.0` from its own immutable repository commit.

## Current staging additions

The Webflow subdomain currently tests the consolidated Home/Location parallax slider cleanup:

| Asset | Version | Immutable commit | Purpose |
|---|---:|---|---|
| `dist/tdb-sliders.js` | `0.3.0` | `31386d986982aa60eb6c9199b6e6b4c03693897b` | Consolidated parallax slider entry and navigation behavior |
| `dist/tdb-slider-ui.css` | `1.0.0` | `3ccf519affaca89635efa68fb481464e7c56dd58` | Mobile/desktop parallax slider navigation presentation |
| `dist/tdb-footer-runtime.min.js` | `1.0.3` | `50cbe79a8f2113af75a6686b6911c6c87292aa3f` | Footer runtime pointing at the consolidated slider build |

See `docs/staging-runtime-cleanup-2026-09-11.md` for rollback instructions and preserved behavior.

## Webflow loading rule

The Webflow site header and footer must include a readable release comment immediately above each externally hosted asset. Example:

```html
<!-- TDB Navbar v1.0.0 | SHA 0c4f2c8 -->
<script defer src="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@0c4f2c8abd91eaf491ae41abebcc71c6e8cd0370/dist/tdb-navbar.min.js"></script>
```

Do not load assets from `main`, a development branch, or an unpinned tag.

## Maintained modules

- Consent integration
- CookieScript production loader
- Navbar runtime
- Forms runtime
- Slider and custom Swiper runtime
- Native logo marquee
- VIP drawer
- Deferred UI CSS
- Footer asset orchestration

## Rollback

Rollback is performed by restoring the previous immutable SHA in Webflow and republishing. No Git branch movement is required.
