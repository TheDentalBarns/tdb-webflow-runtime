# Shared page-break component and motion

Completed native consolidation on 6 October 2026. Staging deployment is recorded
in the release commit and Webflow site code; production domains are excluded.

## Native component

All 32 authored placements now use **Page Break Image** in the Layout group,
component `30d55327-1ca1-3a76-9cf2-5722b1366486`. Its image has three bound
instance properties: Image, Image description, and Fetch priority.

The 13 Flower Stool placements were preserved in place and explicitly assigned
their existing image before binding the Image property. The other 19 placements
were replaced at the same sibling positions, preserving their existing asset,
description, and fetch priority. Each replacement was verified before its old
element was removed. Careers retains its high-priority reception image. The
six unused legacy definitions were removed only after all had zero instances.

The root has `data-tdb-page-break=""`. Wrapper dimensions remain native:
50vh on desktop, 15rem at the small breakpoint, 30vh on mobile portrait.
The shared native image retains 55vh / 35vh heights and adds
`min-height: calc(100% + 4vh)` and `flex-shrink: 0` to cover its travel on
short viewports. The former static variant now shares this standard image crop.

David removed the Flower Stool and headphones legacy native trigger attachments
in Designer. The other old image targets disappeared with their replaced
components. No active page-break instance should retain a legacy IX2 trigger.
Unused legacy action-list data was not separately edited.

Adjacent JSON records preserve original component trees, styles, all original
placements, and the complete replacement journal for recovery/audit.

## Behaviour

`TDBMotion.pageBreaks(wrappers)` owns image transforms. Each stationary wrapper
determines its own viewport progress. Travel is bounded to the smaller of 2vh
and available image crop in each direction.

Visible images retain their painted translation at mount. Initial offset shrinks
with the furthest scroll excursion towards either viewport exit. Reversing
cannot restore consumed offset. There is no startup tween or post-scroll timer.
At either complete exit the image is aligned; revisiting uses the normal path.
Off-screen images align immediately. Visible speed is bounded near an exit.

Scroll without user intent (including late browser restoration), pageshow,
resize, and layout changes preserve the visible transform and rebase correction.
Reads precede writes; updates are event-driven with no perpetual animation loop.
Duplicate clients share ownership; final teardown restores authored transforms.
The existing shared full-motion policy is preserved.

The small page-break loader uses the existing shared module registry and motion
module. It has no new animation-library, carousel, or consent dependency. If
loading fails, native static imagery remains available.

## Release integration

The original implementation was based on shared release
`336d76648a3395fad41dd5bec9749b3554f14c34`. Deployment uses the newer Services
spacing tree `241c6478ed08edf1b54a99a31753849442eb732c`, overlaying only this
task's motion, loader, build-map, test, and documentation files. Other component
release pins and concurrent site custom code remain intact.

Update only the site-head `tdb-modules.js` pin and append deferred
`tdb-page-break-loader.js` to the site footer at the same immutable release.
Publish the Webflow staging subdomain only.

## Verification

- Native usage reconciles exactly: one component, 32 placements, six obsolete
  definitions with zero uses before removal.
- Chromium fixture checks at 1440x900, 834x1112, 667x375, and 390x844: visible
  and offscreen initialization, simulated late restoration and BFCache,
  both exits, reversals, idle stability, independent images, layout/resize,
  delayed image loading, duplicate ownership, and teardown.
- Existing DD motion and shared-module identity/gating tests passed.
- Shared-runtime build output, syntax, and diff checks passed.
- Published markup and real browser verification follow the staging publish.
