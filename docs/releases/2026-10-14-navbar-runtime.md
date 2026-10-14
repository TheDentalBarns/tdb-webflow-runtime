# Navbar/runtime handoff — 14 October 2026

## Behavior
- Consent remains the single decision boundary. Either accept or reject releases runtime after the banner closes; saved decisions release at DOM preparation.
- Early navbar v2 retains disclosure accessibility, Webflow state mirroring, image sizes, native menu states and mobile scroll locking. It reuses TDBScrollLock from unified consent rather than bundling another copy. There is no navbar-owned cookie watcher or download path.
- Runtime v1.1 loads shared control-motion CSS and navbar enhancement in separate background turns after the existing bounded initial-render heuristic. This is not a guarantee of final LCP or idle script parsing.
- Navbar registers its installer without running it. Runtime activation waits for a closed native menu, yields, and checks again in case it reopened.
- Essential states and phone-landscape visibility move to early UI CSS. Shared optional chevron/disclosure/hamburger transitions and keyframes load in tdb-control-motion.css. Existing open disclosures do not replay their entrance on activation.
- Existing panel-motion helper, menu durations, easing, keyboard/focus behavior and cookie animations are retained. DD batching is unchanged. Existing UI pulses and other component motion were outside this navbar scope.
- Failed optional requests leave native controls working; later online or interaction events can retry. The registry deduplicates requests.

## Build and validation
Run tools/build-ui.py --global-only, then node tools/runtime-build/build-preservation.cjs dist/tdb-navbar-loader.js dist/tdb-navbar.min.js dist/tdb-runtime.js.
Run node --test tests/navbar-runtime.test.cjs tests/navbar-handoff.test.cjs tests/runtime-dd.test.cjs.
34 tests cover both decisions, returning visitors, 470ms closure, idle activation, open/reopened menus, failed styles/scripts, locks, keyboard state, breakpoints, and unchanged DD lifecycle.
Raw bytes: early navbar 17561 -> 6645; UI CSS 3953 -> 6385. Optional control CSS 4739; navbar enhancement 22614; runtime 4624. These are not wire-transfer sizes.

## Deployment and rollback
Staging only. Update the navbar-loader and UI CSS URLs together, and add immutable asset pins for tdb-runtime.js, tdb-navbar.min.js and tdb-control-motion.css. Unified consent itself remains unchanged.
Rollback: remove those three newly added pins; restore navbar-loader at a7d4fe2f1ccfc46404b107a5b65cf78c28853464 and tdb-ui.css at e8f02cdb56ad0e0116fed768b8c98c8e13720045 (retain ?announcement-native=1); republish staging. All other asset pins must remain untouched.
