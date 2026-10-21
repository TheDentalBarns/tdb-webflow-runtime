# Motion refresh cleanup — 21 October 2026

Baseline: `d197a57bf0baf76cb6b45cdcc08c9d9b0d338e03`, the existing staging release. The baseline already contains `main`; this change preserves subsequent staging work.

## Scope

- Deduplicate shared page-break refresh callbacks. The Home fixture has 16 states and nine translated photo groups: explicit refresh performs nine target queries instead of 144. This measures refresh work, not total scrolling cost or frame rate.
- Retain the DD-text membership Set instead of materializing an array and scanning it for each entry.
- Reuse the progress value already assigned by DD-text measurement.
- Create each page-break release callback alongside its owner instead of making a second setup pass.
- Read the body computed style once in section-magnet eligibility checks, after the existing cheap blocking checks.

No visibility filtering, offscreen suspension, choreography, crop, slider, memory format, public API or lifecycle changes. The release includes formatted sources, the readable/minified motion bundle and regenerated build metadata. Component API versions remain unchanged.

## Validation

The Home regression runs against source and the shipped bundle, covering refresh across separate batches, shared clients surviving creator release, newly added loop clones, detached image restoration, final teardown and refresh after release. Existing motion, page-break, section-magnet and lifecycle tests continue to apply.

The pre-release differential study compares 400 DD lifecycle steps across coarse/fine pointer and initial reduced-motion configurations against the baseline, including nested roots, refresh, resize, page restoration, visibility, duplicate ownership and memory save values.

`npm run build:all` and the generated-output check pass. The serial full suite passes 507 tests with three optional external-fixture tests skipped (510 total). Both changed runtime sources pass Prettier. The repository-wide formatting check reports seven unchanged files that already differ from Prettier; they are outside this release. The existing feature-loading test uses wall-clock delays and failed in parallel runs; it passes in isolation and in the serial full suite without changing its assertions.

The motion bundle changes from 24,310 to 24,235 bytes minified. Gzip changes from 8,405 to 8,403 bytes; Brotli from 7,638 to 7,640 bytes using the same local settings. Download size is essentially unchanged; the useful improvement is avoiding redundant work.

Physical Android Chrome and iPhone Safari smoothness/clipping still need device verification. Automated checks do not establish an FPS improvement or resolve the separately reported slider/clipping issues.

## Publish and rollback

Publish only `dentalbarns.webflow.io`. Update every current global runtime URL to the same immutable release commit, including the foundation preload, both UI stylesheet URLs and footer entry. Preserve the rest of the current site/page code exactly. Verify the CDN bytes and served staging HTML after publication.

Rollback by restoring those URLs to the baseline SHA above and publishing staging only. Exact site/page custom-code backups are kept privately outside this repository.
