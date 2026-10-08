# USP and review control parity — 8 October 2026

USP adapter: `src/usp/drawer.js` / `dist/tdb-usp-drawer.js`, version 2.0.1.

The USP previous/next controls now use the existing native
`tdb-review-drawer_nav-button` and `tdb-review-drawer_arrow` classes and the
same arrow artwork. Their desktop positions already matched the review drawer.
Both drawers continue to use the same Drawer Shell close control.

Shared desktop arrow and close controls have a transparent resting background,
brand-colour borders and icons, and the existing hover/active highlight. The
prior tablet/mobile colours and layout are preserved with a medium-breakpoint
override; the USP's different title bar and mobile footer spacing remain intact.

Each native USP launch button now contains the existing `tdb-control-pulse`
and `tdb-control-loading` elements. A native `is-on-dark` pulse colour variant
keeps the shared pulse readable on the charcoal USP strip. The SVG spinner is
the same artwork as the review launch control. Designer owns the elements,
dimensions, positions, colour and initial hidden state; the existing shared
`tdb-control-effects.css` supplies pulse/spin animation and loading visibility.
No new stylesheet is loaded.

The adapter sets `data-tdb-loading` beside `aria-busy`, then clears both on
success or failure. Existing `aria-expanded`/`aria-busy` selectors suspend the
pulse while loading or open and restore it on close. The spinner describes real
drawer preparation/opening, not an artificial delay for already-loaded slides.

Runtime ownership remains behaviour: shared drawer motion, focus/scroll lock,
Swiper slides, native title/number tickers, and USP content binding. It does not
inject control markup, control CSS, or control positions.

Published to the Webflow staging subdomain only, using immutable runtime
commit `5086ce0936c22591fb16653fa6c70ceba0df2a9f`.

Validation passed against the published HTML/assets in Chromium at 1440×1000,
834×1194, 390×844 and 852×393, with touch emulation for the smaller viewports:

- Five native pulse elements and five initially hidden loading indicators.
- During real drawer opening: busy state set, pulse stopped, spinner rotating,
  and launch artwork hidden; states restored afterwards and on close.
- Next navigation changes the topic; shared X closes the drawer.
- Desktop USP/review close and navigation control positions, dimensions,
  resting colours, backgrounds and borders match exactly. Hover highlight works.
- No inline control layout overrides and no browser errors in these checks.
- Tablet/mobile visuals and layout retained. Phone footer spacing and the
  review drawer's scrolling landscape footer retain their prior behaviour.

Syntax and diff-whitespace checks passed. Published drawer screenshots were
visually inspected at desktop and phone sizes.
