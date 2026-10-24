# Gallery runtime work — 24 October 2026

Scope: Home Smile, native Instagram and review cards. Preserve layout, image
loading windows, consent, motion timing, snap destinations, reveals and links.

## Changes

- Shared Swiper interruption capture discovers inner parallax targets before
  measuring a slide. Ordinary gallery cards have no such targets, so their
  rectangles are not read. Track freezing and loop-anchor correction remain.
  Services/Treatments retain capture for their actual parallax images.
- Shared carousel accessibility caches its own last painted hidden state.
  Visible-card selection and loop focus transfer still run during movement;
  unchanged cards need no repeated aria-hidden/inert attribute checks. Layout
  events and explicit update() invalidate/reconcile live state. Retired clones
  and destruction still restore their original attributes.
- Smile presentation skips an unchanged open/closed/index/slide-list state.
  Unrelated pointer gestures elsewhere on the page no longer repaint all cards.
  Refreshed physical slide lists invalidate the state, including loop clones.
- Review cards reuse Swiper's resize observer and disable its competing default
  resize update. The review adapter coalesces resize requests, waits for motion
  to settle before updating geometry, and cancels queued work on destruction.
  Font readiness uses the same update path.

## Controlled before/after results

The four new regression scenarios fail against the saved pre-change source and
pass after the changes. Counts describe the fixture workloads, not page-wide
percentages or hardware FPS:

| Workload | Before | After |
| --- | ---: | ---: |
| 120 interruptions, 34 ordinary cards: parallax-only card rectangle reads | 4,080 | 0 |
| 120 movement frames, 40 cards, same exposed set: aria-hidden/inert reads | 9,600 | 0 |
| 100 unrelated gestures with Smile details closed: attribute mutations | 1,200 | 0 |
| Review viewport ResizeObservers | 2 | 1 |

Review resize bursts produce one layout refresh. Resizing during a gesture does
not reposition the track until settlement. Existing tests retain append-only
body measurements, focus transfer, source restoration, consent/retry, image
loading, reveal delays, reduced motion and parallax interruption behavior.

The full Node 24 verification passes: 707 tests, 704 passed, 3 existing skips,
zero failures. Runtime build parity, formatting and patched Swiper checks pass.

## Findings retained without changes

Smile already skips rectangle reads for loaded photos and caches image nodes.
Instagram already bounds initial image preparation, skips unchanged post
selection, and restores native CMS state on disposal. Reviews already cache
progress metrics and skip unchanged bar writes. These behaviors remain intact.
No CSS or Designer sizing changes, added requests or timing-profile changes.

Physical iOS/Android frame rate and GPU compositing costs are not measured by
these controlled DOM tests. Shared-code savings do not imply identical savings
for components with different content, blur or media sizes.
