# Shared motion frame scheduling — 9 October 2026

## Change

The deployed motion engine at `7d5b0dc27efc35e7c59538f14b6162a5770a482a`
scheduled DD roots and page-break controllers independently. A trace showed DD
opacity writes immediately before a page-break scroll/geometry read, forcing a
second style/layout pass even though each controller batched its own reads.

Motion 1.19.4 queues the active controllers in a shared animation frame. All
measurement callbacks run before their mutation callbacks. The existing opacity,
crop, smoothing, user-input, restoration and timing calculations are unchanged.
Page-break initialization remains synchronous to retain its first-paint behavior.
Page hiding and controller destruction cancel their queued work; an exception in
one client cannot prevent the other clients from running.

Initial computed-style sampling and reads of layout dirtied by other scripts can
still appear in the performance report. This change removes the demonstrated
DD-to-parallax write/read ordering; it does not promise zero forced layout.

## Verification

- `tests/shared-motion-frame.browser.cjs`: desktop and mobile with OS reduced
  motion requested; one frame across page DD, nested-root DD and two parallax
  clients, all geometry reads before writes, user scrolling, preserved startup
  states, BFCache resume, shared ownership and cancellation. The old engine fails
  the shared-frame assertion (four callbacks instead of one).
- Existing `page-break.browser.cjs`: desktop, tablet, landscape phone and portrait
  phone; restoration, both scroll directions, crop, resize, image loading,
  lifecycle events and cleanup passed.
- Existing page-break memory, DD memory, full-motion policy and shared module
  identity tests passed (19 assertions/subtests plus the registry script).
- Isolated copies of the current home page passed on 390×844 and 1440×1000.
  Reload after smooth scrolling settled preserved the exact scroll position and
  image translation. No JavaScript errors. The startup traces contained no
  page-break forced layout following DD opacity writes.
- Consent 3.0.1 and footer 1.6.4 were tested together with this release. Consent
  opening, keyboard selection, essential-only, accept-all and reopening during
  a close passed. Analytics and unrelated external requests were blocked in the
  isolated tests.

## Deployment

Change only the `tdb-modules.js` SHA in the global head. Its existing
`data-tdb-carousel-base` must stay on the current carousel release. The registry
then resolves all shared motion consumers to this release while retaining their
existing carousel assets and cache entries.

The consent update is an independent CookieScript 3.0.1 release at
`ea97057833ca7cce42f5a2e7d042720847ff773a`. The immediate runtime update is based
on `8ed14af7619c765dff25a69323298b54c0174312` and changes only that cookie pin
and its own version. Footer 1.6.4 is independently based on
`39648a92ae514e7a05bba9e90a469f58b6b20986` and moves the existing scroll snapshot
ahead of VIP initialization. Preserve the current navbar and other release pins.

Publish to the Webflow staging subdomain only. Rollback uses the three previous
runtime references above; the previous immediate runtime restores cookie consent
3.0.0 at `798b41dc10895752a232d631cf7e5232c3598673` automatically.
