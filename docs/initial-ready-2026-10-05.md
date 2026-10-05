# Initial readiness — 5 October 2026

Scope: staging homepage hero through review introduction. Preserve native design,
all existing nav/playback/review interactions, and the latest independent drawer
fixes. This release builds on review release `252367f153bf6c0fa2552b1f7a3992919a836888`
and reconciles navbar sources with the already-published `3cc3aa7` runtime from
`work/navbar-cleanup-2026-10-05` (`1476f2c`).

## Loading contract

| Feature | Before a decision | After a decision / on demand |
| --- | --- | --- |
| Initial appearance | Existing Webflow classes provide layout, poster and control defaults. | No change to Designer values or reserved geometry. |
| Shared UI | Nonblocking `tdb-ui.css` supplies reusable pulse/loading effects and Vimeo state selectors. | Same CSS remains active; no second normal Vimeo CSS request. |
| Navbar | Small deferred loader retains native Webflow toggles, keyboard/links and readable, fully revealed mobile content. | Accept, reject, close or a saved decision requests the existing navbar enhancement. An open native menu completes its cycle before installation. |
| Vimeo | Early loader handles Play, loading/awaiting-consent state and cookie preferences. | Functionality permission plus existing 300px proximity or intent loads playback. The controller itself is unchanged. |
| Review introduction | Native content and design remain visible. | Decision plus existing 700px proximity loads CMS/ticker/introduction. No hidden drawer mount or Swiper dependency in this path. |
| Review drawer | No setup. | Actual section visibility permits idle code warmup. Trigger hover/focus/pointerdown prepares the drawer; activation opens it. Existing filters, arrows, touch interaction and CMS identity stay in their modules. |

The navbar's original height-aware timing curve, text cadence, scroll thresholds,
desktop dropdown, backdrop and slider-focus integration are unchanged. No new IX2
interaction is introduced. The native Webflow navbar/dropdown runtime remains an
essential dependency. A failed enhancement request leaves native navigation usable
and can retry on intent or network recovery.

Shared source `src/styles/tdb-control-effects.css` exposes `[data-tdb-pulse]` and
`[data-tdb-loading='true'] [data-tdb-loading-indicator]` for other controls. Designer
supplies their initial hidden state and artwork. The current Vimeo spinner remains
its native SVG animation; the 2.4s opacity pulse and buffering timings are preserved.
Vimeo-specific state selectors remain in their own source file, included in shared
delivery. `tdb-vimeo.css` remains available for recovery/older pages.

The early navbar payload is about 3.1 KB raw instead of the 21.3 KB enhancement.
Shared UI is about 14.6 KB raw, combining the existing small UI and Vimeo state
stylesheets into one nonblocking request. This is a loading/CPU scheduling change,
not a measured field LCP/FCP improvement or a guarantee of zero jank.

## Deployment and rollback

Change only these Webflow references to the immutable release commit:

- Site head: `tdb-ui.css` (normal and noscript links), `tdb-vimeo-loader.js`.
  Mark the normal shared stylesheet `data-tdb-ui-css` for loader handoff.
- Site footer: replace the old direct `tdb-navbar.min.js` tag with
  `tdb-navbar-loader.js` (defer).
- Home footer: update the existing `data-tdb-reviews-loader` pin. The shared module
  registry rebases review dependencies to this pin, so preserve the latest complete
  review release before moving it.

Do not alter immediate/footer runtime pins, cookie code, hero entrance timing,
Designer/component markup, the legacy global ticker or Webflow GSAP inclusion.
Other site sections remain for subsequent audits. Publish only to the Webflow
subdomain. Read the latest blocks before patching to preserve concurrent edits.

Rollback is the inverse of these four narrow reference changes; no Designer
restoration is needed. Previous pins: UI/Vimeo loader `8de4d77`, direct navbar
`3cc3aa7`, home review loader `252367f`. If the independent drawer release has moved
again, use that newer previous review pin instead.

## Verification

- `tests/initial-ready.browser.cjs`: real homepage with local overrides, 390px and
  1440px; before-decision request gates, visible fallback menu, accept/reject handoff
  while open, Escape, keyboard, rapid taps, backdrop, review intro/drawer/next and
  responsive scroll-lock cleanup. `TDB_INITIAL_MODE=live` bypasses response caches.
- `tests/review-loader-preparation.test.cjs`: lightweight intro, idle code-only
  warmup, intent mount, concurrent open, cancellation/regrant and download retry.
- Existing review-loader tests and Vimeo lifecycle/recovery tests pass. Vimeo SDK
  tests use a deterministic stub; these do not prove real streaming quality.
- Mobile/desktop page screenshots checked against the baseline. No production
  publish or field-performance claim is part of this pass.

Build navbar using `node tools/runtime-build/build.cjs dist/tdb-navbar.min.js
dist/tdb-navbar-loader.js` after installing that directory's locked dependencies.
Build shared UI with `python tools/build-ui.py --global-only`. Rebuild only Vimeo
loader/CSS using `tools/build-vimeo.cjs dist/tdb-vimeo-loader.js dist/tdb-vimeo.css`;
the existing playback artifact stays byte-for-byte unchanged. Copy native review
loader to its dist counterpart. Tests require Playwright, jsdom and a Chromium
executable; `TDB_CHROMIUM` / `CHROMIUM_EXECUTABLE` select it.
