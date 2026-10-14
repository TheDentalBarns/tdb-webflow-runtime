# The Dental Barns Webflow runtime

Readable JavaScript, reproducible production bundles and release records for The Dental Barns Webflow site.

**14 October 2026: this branch is an audit/release candidate, not a deployed release.** Its base is the current staging work branch, `work/post-fonts-startup-20261014` at `9739d86106bac901252d0e9876468ebb82ad9bd3`. `main` is behind that staging collection. No Webflow code, CDN pins, production pages or startup timing were changed by this audit. Do not point every site script at this branch as a shortcut.

Start with the [collection audit](docs/runtime/audit-2026-10-14.md), [module ownership map](docs/runtime/module-map.md), [every referenced artifact](docs/runtime/module-catalog.md), and [release/rollback procedure](docs/runtime/releasing.md). The [previous README](docs/archive/README-before-runtime-audit-20261014.md) preserves historical installation notes; its September pins are not the current staging configuration.

## Source and build ownership

| Location | Purpose |
| --- | --- |
| `src/` | Readable maintained code. Feature folders own behavior; `shared/` owns genuinely reused primitives. |
| `tools/runtime-build/targets.cjs` | One ordered source manifest for 57 classic-script/ES-module outputs. |
| `dist/` | Committed, minified browser artifacts. Some historical names end in `.js` rather than `.min.js`; the manifest defines their contents. |
| `build/readable/` | Optional readable assembled bundles generated locally; ignored by Git. |
| `config/build-artifacts.json` | Generated source mapping, output hashes and raw/gzip/Brotli estimates. |
| `config/runtime-inventory-2026-10-14.json` | Captured immutable site pins, Home overrides, direct consumers and conditional dependencies. This is evidence of deployment, not an instruction to deploy. |
| `config/source-provenance.json` | Original commit and path for recovered active sources/artifacts. |
| `tests/` | Behavioral regression tests using synthetic fixtures. |
| `tools/custom-swiper/` | Separate pinned Swiper/esbuild vendor build, security patch and bundled TDB adapter. |

The runtime repository is the home for site behavior. Attribution currently lives in [`tdb-webflow-attribution`](https://github.com/TheDentalBarns/tdb-webflow-attribution); both active attribution versions are cataloged here. Keep that boundary until its form-field and consent contracts have been checked together. Repository consolidation does not require putting every feature in one download.

## Build and verify

Use Node 24 and the committed npm lockfile:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run build:swiper
npm test
npm run build:check
npm run format:check
```

For readable assembled files, run `npm run build:readable`. For the captured reference catalog, run `npm run catalog`. Format sources with `npm run format` before rebuilding. To build just one target:

```sh
node tools/runtime-build/build-preservation.cjs dist/tdb-runtime.js
```

A complete build also refreshes the artifact report. Run `npm run build` before committing a partial build. `build:check` is read-only and fails on stale outputs or metadata. Vendor dependencies use their own committed lockfile; the Swiper build applies the existing protected-key patch explicitly after installation.

Terser 5.44.0 uses three compression passes and identifier mangling. **No unsafe compression or property mangling.** Window exports, DOM attributes, event names, CSS classes and cross-file object properties remain contracts. Five Senses is built as an ES module; other manifest outputs remain classic scripts. Swiper's entire adapter is now minified, with its license and patch banner retained. Compression estimates are local estimates, not measured network transfer or per-page payload.

Two legacy naming traps remain for compatibility:

- `tdb-consent.js` includes banner, scroll lock, registry and policy. `tdb-consent.min.js` is the older policy-only target. They are **not interchangeable**.
- Standalone files outside the manifest include retired footer/startup assets and diagnostics. They remain available for historical compatibility; they are not automatically part of the candidate release.

## Runtime boundaries

The current footer timing experiment remains unchanged. Consent and basic navigation establish the first owners. A valid consent decision releases the site runtime; rejecting optional categories still allows local functional UI. Each feature then applies its own presence, intent, proximity and consent conditions. Vimeo and tracking retain their respective permission gates.

`TDBModules` owns resolved asset pins and shared network flights. `TDBScrollLock` coordinates lock owners. `TDBMotionPolicy` / `TDBMotion` own the approved motion policy and timings. `TDBSwiper` owns carousel behavior. `TDBReviewCMS` and `TDBAvailability` share data requests and caches.

Webflow Designer owns page structure, CMS bindings and native visual classes. Do not move layout back into runtime code while simplifying JavaScript. Preserve the existing full-motion design-review policy, keyboard/focus behavior, native fallbacks, first-click replay, Webflow form IDs and submission values.

## Changes and release discipline

Edit source, rebuild, test, and review generated diffs. Do not hand-edit minified files. Do not update a working site pin to `main`, a feature branch or a guessed commit. Promote a tested immutable commit, with the exact previous configuration retained for rollback.

The audit fixes Back/restore page-position caching and isolates feature startup failures. It also recovers active historical sources and repairs the build/CI process. A candidate's passing unit tests do not certify Safari layout, mobile gestures or every legacy page. The release procedure lists the remaining browser checks and staged migration sequence.
