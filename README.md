# TDB Webflow Runtime

Production JavaScript and CSS runtime for The Dental Barns Webflow website.

## Release policy

- `main` contains the current maintained runtime.
- `release/v1.0.0` preserves the first consolidated production runtime.
- Webflow always loads immutable commit-pinned jsDelivr URLs.
- Every behavioural change receives a new semantic version and a new commit pin.
- Experimental branches are not production dependencies.

## Current Webflow production manifest

| Asset | Version | Immutable commit | Purpose |
|---|---:|---|---|
| `dist/tdb-ui.css` | `1.0.0` | `ec075e95bfb21fecd083fc1d4f48aecc771d9440` | Deferred global UI styles |
| `dist/tdb-navbar.min.js` | `1.0.0` | `0c4f2c8abd91eaf491ae41abebcc71c6e8cd0370` | Navbar state and mobile text motion |
| `dist/tdb-immediate-runtime-batch.min.js` | `1.0.0` | `00716e8f8ab2aec55e6a4688efafe475d75a3b01` | Consent-first and immediate runtime loading |
| `dist/tdb-footer-runtime.min.js` | `1.0.0` | `72aeb7f0ab9861f1aaf9ebb32e07522de47971fa` | Deferred forms, sliders, Lenis and supporting UI |

The immediate runtime loads CookieScript `3.0.0` from its own immutable repository commit.

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
