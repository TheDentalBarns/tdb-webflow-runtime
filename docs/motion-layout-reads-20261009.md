# Motion lifecycle layout reads — 9 October 2026

Motion v1.19.3 keeps the existing fade curves, parallax timings, full-motion
policy and input/momentum tracking. Lifecycle resets now invalidate scroll
intent without reading geometry. A restored page establishes its scroll baseline
in the next existing render, retaining the painted value. Mounting reuses the
owner's initial scroll sample, and intent checks/page-break signatures reuse
the render's sample. There is no new listener, timer or frame loop.

The previous DD path read scroll position twice during `pageshow` and again in
the next render. The two synchronous lifecycle reads are removed. This does not
promise that the next necessary geometry read will never flush another
component's pending layout, or that Lighthouse's entire 53 ms will disappear.

Registry v1.4.3 resolves motion from its own release. Its optional
`data-tdb-carousel-base` attribute retains the prior canonical directory for all
other carousel/shared assets. On the homepage, set that base to the previous
registry's directory when updating the registry URL. This preserves the exact
carousel release and its CDN cache URLs; consumers still share one motion
request. Without this attribute the previous registry behaviour is unchanged.

Validation:

- 18 shared-DD tests: visible/restored first paint, momentum, reversal, nested
  scroll roots, mobile browser chrome, resize, quote entrance, hidden nodes,
  shared ownership and idle cleanup; lifecycle events query no scroll geometry.
- Registry tests: request deduplication, adapter readiness, retry, legacy
  consumers and separate motion/retained carousel resolution.
- Page-break browser checks at 1440×900, 834×1112, 667×375 and 390×844:
  restoration, first pass/reversal, crop, resize, lazy images, BFCache and cleanup.

Source/distribution are identical copies. Baseline registry/motion tree:
`11353aaea879a8cbcb881bb3b62adad5050ff6d8`; reported motion at `46eed029...`
was byte-identical. Roll back by restoring that registry script URL and removing
the new base attribute. Publish staging only.
