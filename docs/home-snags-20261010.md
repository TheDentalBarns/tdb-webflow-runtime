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

1. Intermittent missing dimming: fresh staging tests of Reviews → USP had a
   visible full-viewport backdrop. The follow-up inspection found USP nested
   inside Footer's z-index 100 stacking context, unlike the page-level Reviews
   drawer. The controller now temporarily places an open drawer under body,
   restoring its exact native location after closing. This removes ancestor
   stacking/clipping as a cause; the user's intermittent failure still needs
   confirmation in their affected browser.
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
   A follow-up adds a pressed state across native pointer-focus changes before
   click; a cancelled gesture does not commit selection.
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

Initial staging release `996e193` published 10 October at 12:08 BST. Browser
checks confirmed a click on the third visible Treatments card selects it,
Services next-card focus, first-click Explore treatments, prepared partner
tooltip geometry (635.34px high before and after opening), review shared masks,
and persistent barn dimming after close. Review filters, review paging and USP
paging settled with visible first numbers. Physical mobile QA remains open;
VIP wheel/touch event tests under a separate menu lock passed.

## Follow-up: shared arrow placement

Treatments now reuses the existing Services controls classes instead of copying
their geometry. Designer component `1cc1fff8-4b9a-3eb7-19af-da2473371baf`:

- Controls `1cc1fff8-4b9a-3eb7-19af-da2473371c18`: previous `tdb-treatment-controls`,
  now `swiper_functions-btm` + `tdb-service-controls`.
- Buttons `1cc1fff8-4b9a-3eb7-19af-da2473371c1c`: previous `swiper-buttons-wrapper`
  + `tdb-treatment-buttons`, now `swiper-buttons-wrapper` + `tdb-service-buttons`.
- Desktop/tablet: centered vertically, 3vw viewport inset. Mobile: right 2rem,
  bottom 2.5rem. Physical phone landscape: right/bottom 2rem. Existing Home-head
  native-variant boot now includes Treatments and continues its orientation
  handling until both carousels have their own controller. Its exact source is
  `src/runtime/home-parallax-layout-boot.js`.

These are existing shared-component edits. Runtime fixes remain Home-pinned.
The reported oversized USP arrows in Designer remain unverified: saved native
styles are 3rem controls and 1rem arrow masks; live Designer bridge/snapshot was
unavailable. Published controls measured correctly. No guessed sizing patch.

The follow-up regression tests pass Reviews-closing → nested-USP-opening,
page-layer ownership, native placement/focus restoration, and the barn
pointer-focus gap plus gesture cancellation (12 tests in the focused batch).

Follow-up `7e1cea4` published to staging at 12:25 BST. CDN files matched the
local builds byte-for-byte. Home overrides only `tdb-drawer.js` and
`tdb-usp-drawer.js` to this commit; the prior cohort remains `996e193`.
After reload, both control wrappers measured 1363px wide, 40.89px side padding,
and the same vertical midpoint. Reviews closed and USP opened with its root
under body, a 1363×936 backdrop at opacity 1 and 50% black, and visible `01`.
Close restored the native component position; reopening Gold Standards showed
`02` and selected only its barn at opacity 0.5. The original intermittent
missing dimming did not reproduce before the layer correction either, so this
is a verified structural correction, not proof of that exact reported cause.
Custom-domain publication timestamps remained 1 October; production was not
published. Designer-only oversized arrows still need the user's live bridge.

Rollback: remove Home's `data-tdb-home-snag-pins` inline configuration. Existing
site pins remain intact, and the shared USP loader defaults to `3217122`.
Native arrow and barn changes can be reverted independently from the saved
element/style baseline. Production publishing is not part of this task.

## Follow-up: SVG/candle cream exposure on scroll lock

The desktop Services/Discover path preserved sketch colour, opacity and geometry.
The shared lock used by the hamburger menu and VIP/drawers reproduced a concrete
failure: at scrollY 21736 the sticky sketch backdrop moved from viewport top 0
to -1540.109375px when body overflow became hidden. The section stayed in place,
but its transparent surface exposed the body's cream background. The following
charcoal section itself retained #222 throughout.

TDBScrollLock 1.0.2 locks only the document root on Home
(`677cf86df9952f978d94d8a9`), preserving body's native overflow and the backdrop's
viewport reference. Existing wheel/touch containment, scrollbar compensation,
nested-panel allowance and independent release tokens stay in place. Other
pages retain their existing lock policy. No native colour or fade timing changes.

The earliest installer is the consent startup script in site head, before the
navbar/drawer copies. Update that startup pin only; its consent source was
verified identical to the deployed `bd1bde6`. All three embedded lock builds were
updated for consistency. The 26 focused tests pass, including Home/root locking,
unchanged non-Home locking, nested touch/wheel scrolling and close/reopen races.
Staging verification follows deployment. Rollback this follow-up by restoring
the consent startup pin to `bd1bde66f6624d7c653eb6e29afb3f3c6acfaeb7`.
