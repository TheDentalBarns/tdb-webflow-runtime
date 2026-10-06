# DD text fade migration — 6 October 2026

David approved shared DD motion with a readable pre-JS fade, no instant load
change, and a scroll-driven convergence to the original curve after first pass.
This release is for Webflow staging only.

## Behaviour

Shared motion v1.10.0 retains the currently painted opacity. Scroll gradually
consumes the initial difference; its correction envelope only shrinks, including
when direction reverses. Visible correction speed is bounded near an exit.
The first offscreen exit aligns the normal curve. Browser restoration, resize
and layout changes retain the current value. No scroll position, transform,
element dimensions or page layout is written by DD.

The standard curve is 0 / .5 / .5 / .1; orange is .3 / 1 / 1 / .5 at
0 / 50 / 75 / 100% progress. Existing heading viewport progress is preserved;
native IX2 and Gallery progress includes element height. Gallery local roots
and the calculator dialog retain their own scroll viewport. The calculator
drawer footer remains opaque. Full-motion policy and component gates remain.

## Ownership migration

- All 56 DD event targets matching the 143-page audit receive permanent native
  `data-tdb-dd-page` hooks, plus the explicit Tamworth footer copy (57 nodes in
  Designer across shared definitions and page templates).
- Shared calculator entry receives a viewport hook. Its view-timeline CSS and
  the calculator runtime DD timeline are removed; dynamic calculator headings
  use the existing `.tdbc-dd-fade` hook.
- The Hero–Headline Power Snippets embed used on 19 published pages retains its
  parser-time execution and data. Its standalone DD loop, opacity-zero startup,
  and DD scroll/resize/pageshow listeners are removed. Generated captions and
  reviewer names receive shared viewport hooks. The tracked source is
  `src/reviews/legacy/power-snippets.js`.
- Existing partner headings, owner/review bylines and Gallery consumers inherit
  the shared controller update without changing their gates or markup.

## Temporary IX2 bridge

The Webflow connection exposes IX3 editing, but no IX2 deletion. Each audited
DD-only native element is marked `data-tdb-dd-legacy`. The small early inline
`dd-bootstrap.js` removes only that element's published `data-w-id` before
Webflow initializes. It keeps the previous value in a diagnostic attribute.
Native element identities, CMS fields, props, text, layout and other interaction
targets are preserved. Cross-checking the complete IX2 data found no other event
or action target using these 56 IDs.

The four legacy definitions a-52, a-83, a-89 and a-92 remain in Designer. The two
last definitions had no published targets. Delete the four definitions manually
in Designer when convenient, then remove the early bridge and migration-only
attributes. The shared page hooks and controller remain. This does not remove
the IX2 engine; other interaction families still use it.

## Verification

Node tests cover delayed loading, restored mid-page scroll, resize, direction
reversal, first-exit convergence, orange/native timing, nested Gallery roots,
hidden nodes, duplicate clients and cleanup. Bridge/loader tests verify scoped
disconnection, dynamic targets, calculator roots and exclusion of gated elements.
Existing page-break memory, Gallery dismissal and Swiper behaviour tests pass.
Build artifacts are generated and checked with `tools/build-shared-runtime.mjs`.

Published-page verification is recorded after staging deployment.
