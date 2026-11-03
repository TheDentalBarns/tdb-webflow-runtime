# Partner marquee and map touch staging trial

Baseline: `f9f8c90ddc5c219c0e2200a1a2d731f274441af0`.

The user reports iPhone Safari magnifying the page on postcode focus, further
zoom during repeated partner-popup taps, and the floating Google review badge
flashing during rapid partner interactions on both iPhone and Android.

At 440px, the published postcode control computed to 13.8368px. The floating
review badge remained visible above the partner overlay (z-index 2147482999
versus 20000), even with the navigation hidden. These are confirmed observations;
the physical-phone flashing and process crash were not reproduced here.

## Changes

- Give journey inputs a 16px floor and 48px minimum height on narrow/coarse
  devices, in early global CSS so the first focus is covered.
- Apply manipulation touch-action to partner controls, and retain vertical
  native panning and pinch zoom on the marquee and popup swiper.
- Consume the touchend default only for stationary, single-finger partner
  logo/control activations. The logo's existing pointer handler still selects;
  popup controls advance directly once. Suppress compatibility clicks. Leave
  dragging, vertical scrolling, pinching, cancellation and keyboard activation
  intact. This covers older Safari versions with the manipulation defect:
  https://github.com/WebKit/WebKit/commit/504edb5c563f9ad8d0436f60b5a608f0ec384f42
- Put partner chrome lifetime through the existing shared focus controller and
  add target-checked release. A stale popup/map close cannot release another
  interaction. Marquee proximity preparation includes shared focus/UI readiness.
- Hide the floating review badge during shared focus, retaining its independent
  review-section boundary state for restoration.
- Journey pointer or keyboard focus acquires the same focus behavior. Outside
  interaction, Escape, pagehide and teardown release it. Normal scroll thresholds
  may restore chrome after the map leaves the visible viewport. Late module
  loading cannot hide chrome after the user has already left the map.
  Native input focus established before runtime startup is adopted on startup,
  so the first tap is covered even during deferred initialization.

The accepted motion configuration, blur radius, carousel speed, animations,
accordion/navigation/fade families and previous Home paint guard remain intact.
No viewport zoom restriction or document-wide touch prevention was added.

## Validation

- Full build and verification: 877 tests, 874 pass, 3 existing skips, 0 failures.
  Stabilized one pre-existing drag assertion against 1e-14px floating-point
  rounding, using a 1e-9px tolerance; no production motion changed for this.
- Targeted gesture/lifecycle coverage: repeated logo/control taps, exactly-once
  advancement, compatibility clicks, keyboard, scroll/pinch/cancel, late focus
  loading, teardown, and stale-owner release.
- Browser preview: journey controls compute to 16px/48px at 320, 440 and 768px;
  no horizontal overflow at 320px. Map input focus hides nav/announcement/badge;
  Escape and outside interaction restore shared focus.
- Twelve successive partner next actions keep the popup open and badge hidden.
  Authored glass remains saturate(1.5) blur(20px); track and popup retain pinch.
- Published Home: sixteen alternating arrow clicks also retain the open popup,
  hidden badge and 20px glass. Published Location loads the actual Google map;
  input interaction hides the announcement and review badge.
- Google Maps requires its authorized staging origin; localhost does not validate
  map tiles/routing. No route request or personal postcode was submitted.

Staging-only publication is authorized. Physical Safari/Android confirmation of
the zoom/flash symptom is still required; this does not establish a fix for the
separately reported Home rapid-scroll process crash or jump-to-top.
