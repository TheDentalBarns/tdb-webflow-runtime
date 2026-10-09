# Footer layout reads — 9 October 2026

Footer runtime 1.6.2 / VIP loader 1.3.2.
Baseline: `70586ad78a23937997654cdd336f83b0ae99f723`.

Snapshot initial scroll position before site-asset-loader changes the DOM. The
VIP loader reuses it for its initial gesture seed and restored-page demand
check. A homepage at scroll zero still waits for actual demand. Other feature
pins and the matching VIP runtime are unchanged.

Announcement initialization measures viewport/scroll before moving the native
floating shell or changing visibility. The pageshow handler reuses that reading.
Zero scroll no longer falls through to an unnecessary root-element read.

Preserve the VIP prepared-state layout flush: display:none is removed only on
demand, and the hidden starting geometry must be established before transitions
and immediate open replay. Removing that flush without changing the motion
handoff would risk the approved entrance behaviour.

`node --test tests/footer-layout.test.cjs` passes: announcement read/write order,
visibility thresholds, frame timestamps, demand loading, scroll-direction
handoff and restored scroll. Syntax/build checks pass. Stage only; restore the
baseline `data-tdb-runtime-base` in Webflow footer code to roll back.
