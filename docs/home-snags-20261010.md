# Home reliability fixes — 10 October 2026

Work branch: `fix/home-snags-20261010`, based on preservation handover `f24dfda`.
The restored native style catalogue contains 2,709 records. The earlier 996-style
deletion is no longer the live staging baseline.

## Scope and release routing

Only Home receives the new runtime pins. An inline Home-footer configuration
updates the existing deferred registry's per-file pins and the immediate
runtime's footer base before deferred scripts execute. The small shared USP
loader now uses that registry; other pages retain adapter `3217122`.
The announcement remains pinned to `bd1bde6`, and every other existing module,
including Five Senses, retains its current release.

Native changes are in the existing shared components: review arrows use the
existing `carousel-arrow-icon` asset; barn emphasis uses a Designer opacity
transition and one state combo. That combo is referenced in the hidden native
USP templates, so style cleanup can see it.

## Findings and changes

1. Intermittent missing dimming: full-viewport, 50% black backdrops worked for
   both review and USP openings in the restored build. No speculative patch.
2. Chrome return: the shared controller cancelled its held hide animation,
   revealing the underlying pose immediately. It now animates back to the current
   native pose, with independent owners and interruption-safe cleanup.
3. Explore treatments: Lenis ignores native scroll events during wheel inertia.
   Home's link now resets stale inertia before Webflow handles the anchor. Link
   destination, focus, history, modified clicks and Webflow scroll behavior remain
   native. The `vip` class does not itself route this link to the VIP drawer.
4. Review artwork: X already uses the shared close SVG asset; filter lines must
   remain inline for their morph. Previous/next now use the shared native arrow
   mask, replacing two older SVG wrappers.
5. Disappearing first number: the review and USP tickers settled visibly in the
   restored build. No incorrect stable transform or opacity was found. No patch.
6–7. Treatments/services exposed cards: the visibility controller marked cards
   outside the Swiper box inert even when visibly overflowing into the browser
   viewport. Both now use the existing cached overflow visibility policy.
8. Partner tooltip: first activation decoded all images and constructed/measured
   its carousel. Preparation now starts as its banner approaches the viewport,
   with pointer/focus warming as well, behind the existing consent decision gate.
9. USP barns: native images lacked hover/selected transitions. Mouse hover,
   keyboard focus and the last activated highlight now select the native dimmed
   state. Selection survives drawer closure and moves to the next activation.
10. VIP scrolling: a still-open mobile menu lock allowed only its own subtree.
    VIP now owns an additional lease allowing its scroller until close settles.
    It releases its own lease without releasing menu or consent locks.

## Source provenance

- Drawer/site chrome: deployed `04fdf78`; parallax: deployed `2afb6b9`.
- Footer/VIP: deployed `bd1bde6`.
- Marquee: deployed `02231a7`, recovered into this preservation branch before
  making the small warming change (the branch contained an older source).
- USP adapter: deployed `3217122`, recovered before adding barn states.

## Validation

Targeted automated coverage checks drawer close races, interrupted chrome return,
independent scroll owners, touch/wheel VIP scrolling under the menu lock,
consent focus, carousel visibility/settlement, native anchor ownership and barn
selection. Staging browser verification is recorded after deployment.

Rollback: remove Home's `data-tdb-home-snag-pins` inline configuration. Existing
site pins remain intact, and the shared USP loader defaults to `3217122`.
Native arrow and barn changes can be reverted independently from the saved
element/style baseline. Production publishing is not part of this task.
