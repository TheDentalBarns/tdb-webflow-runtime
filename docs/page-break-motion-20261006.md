# Page-break motion migration

Prepared on 6 October 2026 from the deployed shared-module release
`336d76648a3395fad41dd5bec9749b3554f14c34`. The branch deliberately changes
only shared motion, its new small page-break loader, the build map and tests.
The site uses independent immutable pins for navbar, reviews and other work;
those pins must not be replaced by this branch's older versions.

## Behaviour

`TDBMotion.pageBreaks(wrappers)` owns the image transforms. Each stationary
wrapper determines its own viewport progress. The authored crop/dimensions
remain native. Travel is bounded to the smaller of 2vh and the available
crop in each direction.

Visible images retain their painted translation at mount. An initial offset
shrinks with the furthest scroll excursion towards either viewport exit;
direction reversals cannot restore consumed offset. There is no startup tween
or post-scroll timer. At either complete exit the image is aligned, including
any remainder capped to prevent excessive visible speed near the boundary.
Revisiting then uses the normal path. Off-screen images align immediately.

Scroll without user intent (including late browser restoration), pageshow,
resize and layout changes preserve the visible transform and rebase the
remaining correction. The controller schedules work on events, batches rect
reads before writes, and has no perpetual animation loop. Duplicate clients
share ownership; destroying the last client restores the authored transform.
The existing shared motion policy is preserved.

## Native component changes to apply

Site: `677cf86cf9952f978d94d80c`; home: `677cf86df9952f978d94d8a9`.

| Component | Root | Image | Native trigger | Action list |
| --- | --- | --- | --- | --- |
| Flower Stool (13 instances) | `30d55327-1ca1-3a76-9cf2-5722b1366486` | `30d55327-1ca1-3a76-9cf2-5722b1366487` | `e-533` | `a-58`, DD Page Break Scroll |
| Pricing Parallax / headphones (10 instances) | `117b0a09-1136-66a8-69c4-d4c3eb34b32b` | `117b0a09-1136-66a8-69c4-d4c3eb34b32c` | `e-534` | `a-60`, Page Break Scroll 3 |

1. Remove these two legacy IX2 trigger attachments in Designer. Inspect usage
   before deleting action lists. Leave other page-break interactions intact.
2. Add `data-tdb-page-break=""` to the two component roots.
3. Replace their image class with native `tdb-page-break-image`, matching the
   existing `Page Break Image` values: width 100%, height 55vh; mobile portrait
   height 35vh. Copy any other current native overrides before replacing it.
   Add min-height `calc(100% + 4vh)` so the 15rem landscape wrapper is covered
   on short viewports. Keep the current wrapper class and lazy loading.
   The separate class prevents other legacy `.page-break-image` interactions
   elsewhere on the site from writing transforms to these migrated images.
4. Update only the `tdb-modules.js` site-head pin to this release. Add deferred
   `tdb-page-break-loader.js` in the site footer, pinned to the same release.
   The loader requests the shared motion definition through TDBModules and
   mounts only marked components. It has no consent or carousel dependency.
5. Re-read custom code before applying narrow edits, preserving concurrent
   changes. Publish Webflow staging only after the native overlap is removed.

## Verification performed before deployment

- `node tests/page-break.browser.cjs`: Chromium fixtures at 1440x900,
  834x1112, 667x375 and 390x844; visible/offscreen initial state, simulated
  late scroll restoration, forward/reverse exits, reversal continuity, stop,
  independent images, layout change, resize, delayed image load, simulated
  BFCache pageshow, shared ownership and teardown. Every check passed.
- `node tests/shared-dd-motion.test.cjs`: existing DD behaviour passed.
- `node tests/shared-modules.test.cjs`: dependency identity/gates passed.
- Shared-runtime build output and JavaScript syntax checks passed.

Native deletion and deployed staging verification remain pending. The Webflow
connector exposes IX3 interaction operations only; legacy IX2 removal needs
the Designer UI. No Webflow changes or publication have been made yet.
