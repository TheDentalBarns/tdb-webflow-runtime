# Navigation cleanup — 5 October 2026

Updated 6 October: the original consolidation history is retained below.
Current state ownership and rollback are in `navbar-housekeeping-20261006.md`.

The behaviour reference is the actual staging navigation, not the older navbar artifact previously present on the review work branch. This release preserves its links, component variants, layout, glass, dimming, burger/X, scrolling, reveal/close motion and timing curves. Images, `srcset`, sizing, lazy loading and the existing image warmup implementation are unchanged.

## Ownership and loading

| Owner | Responsibility |
|---|---|
| Webflow `Navbar New` | Reusable component, its 17 recorded instances, existing Base/Transparent/Transparent Dark variants and props, links, images, native Navbar/Dropdown controls, dimensions, responsive layout and initial surface |
| Native `tdb-nav-bar-glass` | Existing glass element now uses a real Designer class for its positioning, inset, layer order, non-interactive state and transparent default |
| Native `tdb-desktop-nav-backdrop` | One decorative element in the reusable component; Designer owns its fixed positioning, charcoal tint, opacity/visibility defaults and layer order |
| `src/navbar/nav-motion.js` | Existing height-based square-root clock and Webflow's cached native duration. No width-curve substitution or new shared-module dependency |
| `src/navbar/navbar.js` | Existing scroll thresholds, transparent/fixed handoff, transition lock, slider-focus integration and mobile text close animation |
| `src/navbar/nav-clear-cycle.js` | Top-of-page transparent opening/closing cycle; now inside the essential nav bundle, removed from the footer runtime |
| `src/navbar/desktop-dropdowns.js` | Desktop reveal/close, interruption continuity, native measured appearance retention, scroll locking and lifecycle. Portals the native backdrop into `body` while mounted, avoiding the header's transformed containing block |
| `src/navbar/nav-state.css` | Custom animation and state rules, including mobile background transitions, text entry and browser blur fallback; bundled into the nav script; shared full-motion policy remains enabled |
| `src/navbar/desktop-state.css` | Runtime locking, reveal clipping, scrolling boundaries and backdrop transition; installed only at the desktop breakpoint; link focus appearance is now native |

The current entry is one early `defer` loader (`tdb-navbar-loader.js`, loader **1.0.0**), which downloads `tdb-navbar.min.js` (**1.4.4**) from the same immutable directory. Native Webflow navigation works before a cookie decision. The enhancement loads after an accept/reject/close decision and waits for any open basic menu to close before mounting. Acceptance is not required. Both loader and enhancement guard against duplicate installation. The optional image warmup also waits for a decision plus page load, with its original desktop-only two-image batches.

No extra stylesheet request is added. The previous 6,202-byte nav block is removed from global head code. Its state/animation rules travel in the cached nav bundle; static geometry is native. The existing typography style has a `data-tdb-navbar-motion-anchor` attribute so these rules are inserted in the **same cascade position**, ahead of later page entrance fades. That anchor is not a loader or another script.

The current Home custom code uses a 100ms delay and a 200ms ease-out entrance fade for `.navbar10_logo`, `.menu-icon5` and `.vimeo-controls-layer`. These page entrance effects are separate from the logo-link filter transition and from any hero logo. They remain unchanged, as do page-specific navbar/announcement and phone-landscape integrations.

## Idle work removed

- Desktop dropdown observation and its state stylesheet mount only at `min-width:992px`, disconnect on leaving that breakpoint and reattach on returning. The original `max-width:767px` transparent-mobile behaviour is preserved separately.
- The nav's non-passive document wheel listener exists only while a desktop panel is open or closing. Wheel scrolling inside the open panel and Ctrl+wheel keep their existing behaviour.
- The transparency watcher observes only the actual dropdown toggle classes and the nav's desktop-open attribute, instead of all descendant class mutations.
- Unchanged timing refreshes no longer rewrite CSS variables or `data-duration`. Webflow's native cached config is still checked and synchronised after its own initialisation.
- Repeated module evaluation cannot add another set of listeners, observers, state styles or backdrops.

The script is not presented as a smaller standalone file: it now also carries previously inline CSS. The benefits are consolidated ownership, caching across pages, fewer unnecessary style writes and less mobile/closed-menu work. No production LCP/FPS improvement is asserted without field measurement.

## Source reconciliation and build

The deployed navbar baseline was `7a285052fbf58ddc34160a9b035b8c497621a036`. The immediate and footer baseline was `8de4d77a62a7f83e063f2e2a54e8c311e56bc49d`. Readable source on the review branch lagged those deployed artifacts. The deployed nav source and supporting footer source have been restored before making this change. The existing Vimeo/slider adjustments in the deployed footer have been retained.

```
npm ci --prefix tools/runtime-build --ignore-scripts --no-audit --no-fund
node tools/runtime-build/build.cjs
```

Terser is locked to 5.44.0. The current build supports `tdb-navbar.min.js`, `tdb-navbar-loader.js` and `tdb-footer-runtime.min.js`; pass a target to rebuild only the affected output. The original footer **1.5.1** release removed its nav helper. Later navbar-only releases leave immediate/footer and other module pins unchanged.

The footer's shared slider and motion URLs remain explicitly pinned to their existing `8de4d77…` release, so repinning this orchestration bundle does not accidentally change shared slider behaviour or create a second dependency identity.

Retired files: the standalone navbar bootstrap source/artifact, standalone clear-cycle artifact and old mobile-navbar CSS extraction. Their former notes are marked historical; old immutable releases remain available. The clear-cycle source is maintained once and included in the navbar build.

## Verification

Prepublish browser comparisons used the real staging HTML, Webflow runtime and styles, with only the proposed nav assets/native style fixture substituted. Home mobile portrait, desktop and portrait-to-landscape menu states were compared. Mobile and landscape layout, colours, transforms and clocks matched; desktop states matched, with a transient alpha difference resolved by waiting for the existing chained panel/background transitions to settle.

The dark variant was also compared on Contact. Its mobile/open desktop states matched. Contact's existing scrolled desktop announcement can cover the nav click target in both the old and candidate versions; this unrelated behaviour was not changed.

Additional checks covered rapid taps, Escape, desktop keyboard/outside dismissal, resize teardown, duplicate evaluation, zero unchanged clock writes, scroll-lock release and navigation with both CookieScript and the footer runtime blocked. No page JavaScript errors were reported in the completed Home comparisons or isolated-loader checks.

`tests/navbar.browser.cjs` exercises real browser behaviour; its native-style fixture is for preview only. It is never loaded by the website. Staging publication and final native-CSS verification are recorded with deployment.

## Deployment pairing and rollback

This section describes the original 5 October consolidation. For the current
navbar-only release, use the narrower rollback in `navbar-housekeeping-20261006.md`;
do not repin the other bundles to these historical versions.

Publish the native component changes, head-block removal/cascade anchor, new nav pin and new immediate/footer pin together, to the Webflow subdomain only. No custom domains are part of this release.

For rollback, restore the old nav and immediate pins above, restore the nav-only head CSS from `tests/fixtures/navbar-legacy-head.css` at its former position, and hide the newly native backdrop element in the component before republishing. This avoids the old controller creating an extra active backdrop. The glass class and mobile transparent first-frame defaults can remain because they match the old head CSS. Never restore a whole historical global head/footer over unrelated current edits.
