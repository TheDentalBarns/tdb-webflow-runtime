# Instagram queue and carousel entrance recovery

The shared Instagram loader now drains holders that entered proximity while an
earlier preparation batch was running. Previously the observer unregistered the
new holder, but completion of the first batch did not schedule it. Each flight
now owns a fixed batch and only newly queued, connected holders trigger another
flight. Consent, disposal, ordinary error retries and holding images are retained.

The shared parallax carousel's existing entrance deadline now reconciles a
stranded rendered track with its selected slide. Previously it cleared pending
classes while Swiper could still be animating at an intermediate transform;
later interaction repaired that position. Desktop entry also uses the existing
first-view visibility gate, so scrolling away before entry restarts its original
delay on return. Portrait keeps its immediate entry. A visitor-owned drag or a
newly selected slide takes precedence over recovery. No layout, copy, CSS,
animation duration, easing, blur or manual controls were changed.

## Ownership and lifecycle

- Runtime discovery/proximity owns the Instagram queue. The deferred feature
  continues to own feed preparation, CSS readiness, rendering and consent.
- `TDBParallaxPlugin` owns entrance recovery, using its existing bounded timer
  and `TDBSwiper.firstView`. It adds no scroll listener or continuous polling.
- Designer continues to own native slides, image frames, captions and spacing.
- This release includes `ddabbb532b9812fa18dfc3d2663e8364a9bdc70c`, preserving
  the existing implants enquiry/waiting-list changes and the newer pricing VIP
  drawer handover fix found during the final installation check. Current main
  is an ancestor.

## Evidence and acceptance

- Nine Instagram queue regression tests cover arrivals during preparation and
  module loading, third-batch arrivals, duplicate callbacks, detachment, consent,
  disposal and bounded failures. The original baseline previously stalled 3/3
  controlled browser runs; the rebased candidate loaded both feeds 3/3 at 4.11x
  CPU throttling, without manual refresh.
- Seven entrance tests cover desktop/portrait gating, interrupted tracks with
  either animation flag, ordinary settlement, visitor takeover and teardown.
- On Home treatments, About technology and Location partners, a controlled
  interruption of the first CSS transition stranded the published original at
  412–423px from its selected position. The candidate recovered all three to
  under 0.01px without interaction. This establishes recovery from that failure
  mode; normal scrolling did not reproduce the visitor's intermittent trigger.
- Normal entry, rapid vertical scrolling, scrolling during movement, height and
  width changes, and vertical pointer movement are checked separately from the
  controlled interruption. No performance or physical-device improvement is
  inferred from these functional checks.
- Runtime build parity and the full suite pass: 1,175 passed, three existing
  skips. After including the newer pricing fix, 1,176 pass with the same three
  skips. The locked Swiper build and security/size checks pass; its output is
  unchanged. Source formatting passes for changed files. The full formatting
  check flags the unchanged `tools/runtime-build/minify-ui.cjs` baseline file.

## Delivery and rollback

Only `tdb-runtime.js` and deferred `tdb-parallax.js` change at runtime. Against the
release base they add 87 and 317 raw bytes (17 and 114 estimated gzip bytes),
respectively. This is a reliability correction, not a measured speed saving.

Publish only the Webflow staging subdomain. Save exact global head/footer blocks
privately, update all four immutable release references together, verify CDN
bytes and repeat the queue/interruption checks without overriding runtime
responses. Production domains are excluded.

Rollback restores the saved head/footer blocks and republishes staging only.
The final saved installation uses `ddabbb532b9812fa18dfc3d2663e8364a9bdc70c`;
the earlier `b67d3cb11b0596ca2298763141d54756498581cc` snapshot is retained only
as historical evidence. No native page edits need to be undone.
