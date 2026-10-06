# VIP drawer and nav panel motion

The full VIP drawer now uses the nav menu's vertical-panel timing:

- Duration: `round(clamp(400 * sqrt(viewportHeight / 375), 400, 950))` ms.
- Easing: `cubic-bezier(0.165,0.84,0.44,1)` (Webflow `ease-out-quart`).
- Examples: 844px viewport = 600ms; 900px = 620ms; 1200px = 716ms.

`src/shared/panel-motion.js` owns the curve and easing. It is bundled into the
existing navbar and both VIP scripts, with an idempotent singleton; no extra
request or dependency on consent-gated nav or lazy `tdb-motion.js` is added.
Nav's existing clock, text choreography, native Webflow duration cache, resize
rules and loading gate remain unchanged.

`src/vip-drawer/vip-motion.js` captures the viewport duration when VIP opens.
That value remains fixed during opening, open state, closing and a quick
reversal. A keyboard or browser-chrome resize cannot change the current cycle.
The next opening measures again. The closing timeout is duration + 50ms;
`transitionend` remains the primary completion signal.

## Native Designer changes

Apply `vip-panel-motion-designer-20261006.json` to the three named combo classes
on the main breakpoint. The manifest removes the old transition shorthand and
sets longhands. Drawer geometry, transforms, colours, breakpoints and all other
style properties are retained.

- `.tdb-vip-drawer.is-open` and `.is-closing` consume the measured duration and
  shared easing from inline custom properties; background colour stays 500ms.
- `.tdb-vip-arrow-content.is-vip-open` keeps its 300ms rotation and waits for
  the measured opening duration. Designer retains its 500ms fallback delay.
  Webflow's published CSS drops variable `transition-delay` values, so the
  existing `vip-focus.js` state synchronizer sets the measured delay inline
  while open and zero while closing/idle. Closing rotation is unchanged.
- Bar peek remains 420ms with `cubic-bezier(.4,0,.2,1)`. Pulse, focus, form,
  consent, scroll, keyboard and treatment preselection behaviour are unchanged.

Native VIP markup still skips the external VIP stylesheet. Legacy fallback CSS
already consumes the same custom properties. Full-motion review policy remains
in force even when the OS requests reduced motion.

## Release scope and verification

Built on navbar release `c8b78445344a29e4a8cd72721892720370f355eb`.
Repoint only the global footer's navbar-loader and immediate-runtime URLs to
this release. The immediate runtime resolves the footer and VIP assets relative
to its release path. Keep the independent module registry/review pin
`4312fe15e656cce5be8d8e7b945886a710f417d0`; do not replace the global head.
Publish to the Webflow staging subdomain only.

Focused automated checks: `tests/vip-panel-motion.test.cjs`,
`tests/nav-surfaces.test.cjs`, `tests/full-motion-policy.test.cjs` (11 passing).
They exercise both built VIP bundles, the nav clock/cache, lower/upper bounds,
full motion under reduced-motion preference, closing fallback and transitionend,
keyboard resize, quick reversal and either bundle loading first.

Physical mobile keyboard/orientation behaviour still needs device review;
automated mobile checks simulate viewport changes rather than a real keyboard.
