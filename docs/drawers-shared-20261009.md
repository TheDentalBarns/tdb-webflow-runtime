# Reviews and USP: shared drawer behaviour

The native Webflow drawer shell, layout, artwork and styles remain authored in
Designer. Both content adapters now use the same reading, accessibility and input
helpers, delivered inside the existing drawer request.

- `TDBScrollLock` is the same independently releasable service used by the navbar.
  The drawer requests an allowed scroll root and releases only its own lock after
  closing. It no longer snapshots HTML overflow or calls Lenis stop/start. The
  guarded source is included for pages where the navbar is absent; it does not
  replace an already loaded site service.
- `TDBDrawerReading` owns the existing short touch-landscape condition, native
  class switching, reading/footer anchoring, width-only auto-height refresh and
  width-aware duration updates. Transition timing changes wait until settlement.
- `TDBCarouselVisibility` supports active-only drawers. Physical Swiper slides,
  including loop corrections, determine inert/ARIA state. USP's duplicated loop
  copies are no longer exposed together.
- `TDBCarouselControls` shares previous/next and keyboard input. Each adapter
  retains its looping, CMS pagination, filtering and quote choreography.
- `TDBSiteChrome` owns nav/banner/VIP hiding for both drawers, using the site's
  existing peek clock. The shared drawer releases it when the actual exit ends,
  including reversed or immediate closes. USP's 560ms Lenis workaround and delayed
  chrome restoration are removed. Reviews now use the same background-bar handoff.
- `TDBModules.withBusy` handles trigger loading, repeated activation, abort and
  cleanup for USP and the native review introduction/cards/early loader. The
  existing shared quote carousel retains its existing action feedback.

Review CMS selection, filters, consent policy, per-review quote motion and lazy
loading remain with reviews. USP retains its five native records, looping slides,
title ticker and saved scroll per highlight. No new request is added.

## Build and release

Run `npm ci --prefix tools/runtime-build`, then `node tools/build-drawers.mjs`.
Readable sources produce minified distribution files with the existing filenames.
`node tools/build-drawers.mjs --check` checks parity. The general shared-runtime
build delegates these artifacts to the same build.

The registry accepts separate `data-tdb-motion-base`, `data-tdb-carousel-base` and
`data-tdb-drawer-base` URLs. Only drawer, review content, introduction and cards use
the drawer release. Keep the existing motion and other carousel pins intact.
The review loader's optional `data-tdb-review-base` retains the previous release
for unrelated quote/CMS dependencies.

Initial rollout changes the existing site registry and USP tags, plus Home's
review loader. The shared drawer overrides apply to other native review callers
without changing their CMS or quote dependency releases.

Rollback: restore the previous registry script and remove its two new base
attributes; restore USP to `7ac3cc08d2c849d7291471016f637450fdd0dfbd`; restore Home's
review loader to `93173cc685259f3b84404967f1e6deb6a5d451fc` and remove its review-base
attribute. Preserve any independently changed motion/carousel pins when rolling back.

## Validation

`NODE_PATH=/tmp/tdb-motion-test-deps/node_modules node --test
tests/drawer-close-race.test.cjs tests/drawer-shared.test.cjs
tests/shared-modules.test.cjs tests/review-loader.test.cjs
tests/review-pagination.test.cjs` passes 14 checks covering interruption, overlapping
owners, interior scroll containment, loop copies, reading/footer preservation,
input handling, aborted loading, dependency identity, consent and CMS pagination.

The legacy `review-introduction.test.cjs` targets the earlier component rather than
the native adapter and lacks its existing motion dependency; it is not a gate for
this release. The Playwright filter suite requires a browser unavailable to the
shell runner; rendered review/filter interactions are checked on staging instead.
