# Home rapid-scroll Safari staging trial

Baseline: `7d8a01221e03bb155edbbf18580ba949e5a70255`.

An iPhone 16 Pro Max still reloads Home after repeated rapid vertical scrolling.
The same test no longer reproduces on Location. The earlier IG guard bounds
the horizontal card window but does not retire the entire feed when vertically
distant. Home's Services and Treatments also retain their large backdrop filters
after their sections leave the viewport. The browser audit found full-screen
Services backdrops still enabled thousands of pixels above the viewport.

This is a targeted mitigation for rendering pressure, not a confirmed diagnosis
of an iOS process crash. No physical-device crash log or GPU-memory measurement
is available. Desktop Chromium cannot establish that the iPhone crash is fixed.

The user also reports an immediate jump to the top without a blank or visible
reload. This is tracked as a separate, unresolved symptom. The normal phone
scroll path does not call `scrollTo(0,0)`: Lenis and section magnets are desktop
only, VIP restoration is limited to an explicitly opened drawer, and the one
explicit page reload is limited to revoking tracking consent after startup.

## Change

- Scope the trial to the existing Home markup marker
  `[data-tdb-smile-placeholder="home"]`, at widths up to 991px.
- One IntersectionObserver watches Services, Treatments and the IG placeholder.
  A fixed 1500px vertical buffer restores their authored blur before entry.
- After 180ms continuously beyond that buffer, hide only their large blur layers
  and set both backdrop-filter spellings to `none`. Cancel pending retirement
  immediately when scrolling reverses.
- Restore without a new blur tween. Two bounded animation frames release the
  temporary transition override; there is no scrolling animation loop.
- Keep existing image sources, DOM, carousel position, parallax, entrance motion,
  consent lifecycle, blur radius and the accepted motion families unchanged.
- Reset on breakpoint changes, bfcache restoration and runtime teardown.
  Location and desktop retain their existing behavior.
- Add an optional `?tdb-scroll-test=1` readout, permitted only on staging and
  localhost with Home's native marker. It records page-load count and top
  arrivals, recent script scroll/focus calls with stacks, document height,
  focus and lock state. It never adjusts scroll. Results stay in the browser's
  sessionStorage until the user chooses to copy them. Normal and production
  visits install no diagnostic wrappers, listeners, storage or UI.

## Validation

Five lifecycle tests cover repeated reversals, deferred retirement, restoration,
stale observer callbacks, breakpoint/bfcache reset and teardown. The full suite
passes, including the opt-in diagnostic checks: 865 passed, 0 failed, 3 skipped
(868 total). An initial run hit a pre-existing marquee test's exact floating
point comparison (a difference of 1e-14); its isolated rerun and the full rerun
passed without changing the marquee code or test.

The local browser preview at 440×956 confirms visible Services keeps 20px blur,
rapid next/previous use continues, distant Services (including loop copies)
switch to `none`, and the shared pace stays 1.25 with fade pace 1.
Six full-page up/down cycles leave one IG feed and one Smile gallery mounted.
IG's twelve visible glass surfaces return at 20px blur with the selected post
unchanged. The same build on Location at 440px applies no guard attributes.
The explicit diagnostic preview records a native 19120px-to-0 return as having
no recent script call, and a reload separately increments the page-load count.

The remaining acceptance check is the user's rapid-scroll test on the iPhone.
Publish only the Webflow staging subdomain. Keep the baseline SHA for rollback.
