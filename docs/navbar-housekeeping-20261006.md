# Navbar ownership and housekeeping — 6 October 2026

Runtime 1.4.4 builds on active staging commit
`4973d944ea1c5da7100583c7d91ad5289e4a53fe`, not the older main branch.
This is a native-style ownership and keyboard-focus cleanup. Layout, opacity
endpoints, animation curves/durations, mobile keyframes, native interaction
handlers, consent gates, page entrance fades and cross-component behaviour
are retained.

## Native Designer changes

Three enhanced-only combo classes replace equivalent external rules:

| Selector | Native properties | Runtime application |
|---|---|---|
| `.navbar10_component.is-nav-desktop` | Transparent background; no backdrop filter on the wrapper | Desktop ≥992px only |
| `.navbar10_logo-link.is-nav-motion` | Filter transition using `--tdb-nav-detail-duration`, 420ms fallback; cubic-bezier(0.4,0,0.2,1); no delay | Desktop ≥992px only |
| `.navbar_line.is-nav-motion` | Opacity transition using the same duration/easing; no delay | All enhanced breakpoints |

The existing adapter toggles these classes idempotently; no new observer,
scroll handler, timing source or animation is added. Desktop classes are
removed when resizing below 992px. The logo's tablet timing and existing
mobile filter rule remain unchanged. Base styles still serve native navigation
before the enhancement loads. The old 5px wrapper blur and 300ms base
transitions are therefore intentional fallback/tablet settings, not unused
properties to delete globally.

`navbar10_dropdown-toggle`, `navbar10_dropdown-link` and `navbar10_blog-item`
have native focus-visible states: 2px solid Brand Orange 3 / cream, 4px offset.
The colour binds to variable `variable-80d05e42-bdcb-1136-20aa-0102915d9c6c`.
This matches existing main navbar links/First visit. The runtime's 1px/3px
dropdown focus override is removed. The email link retains the matching shared
site-wide focus treatment. This changes focus appearance, not focus routing.

## Current ownership

- Designer: component/variants, layout, controls, native focus states, glass
  geometry, palette, 20px blur/150% saturation and visual-state definitions.
- Native Webflow: Navbar/Dropdown toggles, ARIA, keyboard/link behaviour.
- Navbar runtime: scroll/state coordination, shared viewport-based clocks,
  reveal/content motion, interruption continuity, dynamic scroll bounds/locks
  and lifecycle. Dynamic inline styles are restored after closing/unmounting.
- Remaining navbar CSS: mobile keyframes and state relationships, reveal/lock
  guards, backdrop transition and browser fallback. These are deliberate.
- Shared UI: VIP/slider/drawer chrome coordination.
- Webflow custom code: one immutable navbar loader; the Home 100ms-delay/
  200ms entrance effect; the phone-landscape guard and CSS cascade anchor.

Desktop strip and panels use 84% frosted cream; the mobile menu remains 75%.
Normal main-control transitions, including transparent-variant Current links,
are 100ms ease. The homepage's entrance effects are retained in their present
early-loading location. Old background-layer rules are not pruned without
establishing their use across all component instances/fallback interactions.

## Build and release

Build only `dist/tdb-navbar.min.js`. Keep the loader source/version unchanged.
Change only its immutable global-footer URL and explanatory navbar comment;
preserve all other current custom code and asset pins. Publish the native
states and runtime together to the Webflow staging subdomain only.

Validation: eight existing native-state/shared-peek tests pass. Browser preview
compared the active 1.4.3 runtime with the candidate 1.4.4 runtime and matching
native styles at 390, 844, 1024, 1440 and 1920px. Closed/open layout, colours,
blur, opacity and transition values matched exactly. Both scrolled dropdowns,
cream keyboard focus, rapid switching/reversal and resize teardown passed.
Staging verification follows deployment of the native styles and pinned bundle.

## Rollback

Restore the navbar-loader pin to `4973d944ea1c5da7100583c7d91ad5289e4a53fe`.
The new combo classes become inert; do not delete base styles or restore whole
historical custom-code blocks. To also restore previous focus appearance,
Services/Discover focus-visible was `#4d65ff`, solid, 0.125rem width and offset;
the dropdown-link/blog-item native focus-visible states were empty. Remove
only the four added outline properties on those two classes if rolling back
the focus presentation. Unrelated runtime pins remain untouched.
