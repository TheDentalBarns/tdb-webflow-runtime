# Native review cards — 7 October 2026

The Home review cards now use a native CMS Collection List. The first 20 reviews
are authored/rendered by Webflow; the runtime hydrates those cards and clones the
same native item for later batches. No review records are stored in the runtime.

## Designer ownership

- Site: `677cf86cf9952f978d94d80c`; Home: `677cf86df9952f978d94d8a9`.
- Native section: `98656d8e-d7ff-a61e-bef3-d893c0400cf6`.
- Collection/viewport: `49d15494-031d-9427-c8f8-6ea90a8b424e`.
- Track: `49d15494-031d-9427-c8f8-6ea90a8b424f`; item: `49d15494-031d-9427-c8f8-6ea90a8b4250`.
- Source: Review Topics `6ab6638e2159a2087d5413c9`; approved on, excluded off;
  full-review editorial rank ascending, 20 per page.
- Native bindings: review identity, name, featured excerpt, full review, date,
  platform, rating, historic subject and conditional approximate-date label.
- Existing native card classes, colours, typography and viewport sizes retained.
  The stationary quotation mark now uses the same 45vw tablet width as the card
  and navigation, retaining 90vw on mobile.
- CSS for CMS attribute states, alternating surfaces and narrow-card wrapping is
  authored in the section's `Native CMS states and compact-card CSS` embed
  (`17bdc95b-c17e-fdcb-d19e-537a72251777`). Its editable source is
  `src/styles/tdb-review-cards-native-states.css`. This contains no JavaScript.
- Source artwork is native inline SVG in the CMS template, reusing the existing
  review source artwork. The shared CMS module continues to provide runtime SVGs.

Webflow explicitly rejects converting a live CMS Collection List to a component.
The former single Home instance was therefore unlinked to a native page section.
The original definition (`1e0f7a0f-13f3-65bf-833b-50f3fa3fba0b`) is restored under
`Reviews / Previous` as `Review Cards – previous`. Do not move the live list into
that definition: its source appears stored but descendant bindings cannot resolve.

## Behaviour

- Shared Swiper, Motion, Ticker and slider-focus controller; no second engine.
- Finite sequence, previous stops at 01, next stops at the last published review.
  Backward movement remains available within the visited sequence.
- Prefetch at six cards from the rendered end, append at most 20, and defer DOM
  changes until a current drag/transition settles. Shared cached drawer records
  still append to this embed in batches of 20.
- Full collection total, not the current loaded batch, appears in the counter.
- Read more opens the existing drawer with the selected review ID. Drawer filters,
  sorting, response display and paging are unchanged.
- Shared focus recognises native review arrows and horizontal gestures so page
  chrome moves away using the existing controller.
- Consent, proximity, idle drawer warming and full-motion review policy retained.
- Failed batches keep the current cards and allow Next/online retry.
- Destroy restores the authored 20 cards rather than emptying the native track.
- Page-specific snippet ranking remains deferred.

## Release scope and checks

The existing canonical shared release was `dd17735d8524989f0f2b2265252fc24e27ee97a4`.
Its other canonical carousel assets are preserved byte-for-byte. The changes to
the canonical assets are review cards and the small native-selector extension in
slider focus. Home's review loader pin also advances to remove eager `loadAll`.

Passed before staging: review-loader consent/proximity tests, shared CMS pagination
and request-deduplication tests, artifact/source parity, and a real-Swiper browser
test covering finite edges, 20/40/60/80/85 batches, in-flight append, failure/retry,
selected-review handoff, cached batches and destroy/remount. Browser geometry was
checked at 1440, 1024, 768, 744, 844, 667, 390 and 320px widths.

Published to Webflow staging only on 7 October 2026, runtime release
`28db8e7b795af20c6b08aa403127e2666be7acf0`. Custom production domains were not published.

The published HTML contains 20 real CMS cards in exactly the shared feed's order.
Staging browser checks passed at all eight sizes above: aligned card/mark/controls,
no horizontal page overflow, accessible Read more, focused opacity 1 and faded
neighbour opacity .5. The actual CMS progressed 20 → 40 → 60 → 80 → 85; the one-star
review is the last item and Next is disabled there. Touch swipe, shared chrome
focus, and opening the selected card in the existing drawer all passed without
page errors. The existing drawer touch regression also passed cancelled drags,
portrait reading scroll, arrow handoff, phone-landscape reading and the shared
motion policy. Source/CDN review-card bytes matched.

`tests/review-cards-staging.browser.cjs` records the integration checks. Screenshots
and raw published HTML are temporary QA artifacts, not review data committed here.
