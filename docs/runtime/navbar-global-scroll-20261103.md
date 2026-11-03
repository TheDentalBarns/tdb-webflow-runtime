# Shared navbar scroll policy — 3 November 2026

The native navbar now uses the same hero hold and directional reveal policy for every appearance and breakpoint. The original bar scrolls with the hero. After 75vh, 120px of upward travel reveals the fixed bar; 140px downward travel hides it. `transparent-nav` controls the surface and colour treatment only. The three scroll values live together in `src/navbar/navbar-enhancement.js` as `scrollPolicy`.

Pricing keeps its Always glass appearance, black controls and existing blur. The native shared `.navbar10_component` resting position is now absolute. The Always glass variant inherits that position instead of overriding it as fixed. Its existing `.navbar_line` has native `display:none` at the medium breakpoint, inherited by smaller breakpoints. No new component, embed or DOM element was added.

The enhancement exposes `data-tdb-nav-floating-visible` on the existing navbar and `TDBNavScroll.floatingVisible`. The announcement subscribes through the existing shared navbar observer instead of inspecting transparency classes, page-specific nav rules or serialized inline transforms. Its existing reveal distances, animation timing and layout remain unchanged. The CSS handoff uses the same visibility signal at every breakpoint. Pending reveal frames are cancelled on hiding or resetting so rapid scroll reversal cannot resurrect the bar.

Navbar version: 1.8.0. Scroll API: 1.3.0. Base runtime: `40a55a431e1fa1ed699911f377d0555f84a2a8de`.

## Verification

- Deterministic JavaScript build and build parity pass; announcement CSS rebuilt.
- Full suite: 885 tests, 882 passed, 3 existing skips, zero failures.
- Integrated state tests cover Home, Location, Pricing and a nontransparent service page at 448px, 834px and 1363px: hero hold, reveal, hide, top reset, menu hold, announcement handoff and appearance independence.
- A regression case covers rapid reversal before the queued reveal frame.
- The CSS preservation check maps the intentionally replaced selector and confirms the existing declarations remain identical.
- Native Webflow readback confirms the line is hidden and the glass colour/blur are retained.

Browser verification uses public staging markup with this worktree's release assets and a local-only representation of the unpublished native style changes. It is not a staging publish or an iPhone Safari test.

## Deployment and rollback

Update the four existing global immutable references together: foundation preload, UI stylesheet, noscript UI stylesheet and startup entry. The startup entry supplies the release root for deferred modules. No additional script tag is needed. Publish only the Webflow staging subdomain when authorized.

Rollback restores those references to the base runtime above, the shared base resting position to fixed, and the Always glass main position override to fixed. Remove the Always glass medium `.navbar_line` display override only if also reverting the requested line removal. The transparent variants already override their resting position as absolute and remain unchanged.
