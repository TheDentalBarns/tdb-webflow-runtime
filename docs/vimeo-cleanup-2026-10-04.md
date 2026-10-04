# Vimeo cleanup — 4 October 2026

Staging only. Preserve the reusable Webflow components, instance video IDs/posters,
all existing properties/variables, responsive geometry and visual timings.

## Checkpoint

- Runtime before this change: `263b14c235daef35452a3a582437d6bac8903e45`.
- Checkpoint branch: `checkpoint/before-vimeo-cleanup-2026-10-04`.
- Exact prior site head/footer and affected native base styles:
  saved privately as `TDB-Vimeo-rollback-2026-10-04.zip` with this task. Full
  Webflow head/footer snapshots are deliberately not uploaded to the public repo.
- Old deployed Vimeo controller: `TheDentalBarns/tdb-vimeo-js@v1.0.1`, commit
  `d8d85a2e7d830b6c97d6a8020a5b5b020fcc7f63`. Source and deployed dist were compared
  after identical Terser normalization and were identical. The source is migrated
  into this runtime repository so ownership and naming now follow its modules.

To roll back, restore the saved site head/footer and native base properties, removing
properties introduced by the recorded updates; then publish only to the Webflow
subdomain. Do not change component trees, props, instance values or breakpoint
styles. GitHub code alone is not the full rollback: the saved Webflow state matters.
Retain the checkpoint and old immutable assets; do not delete the old Vimeo repo.

## Three variants

| Variant | Discovery | Preserved behaviour |
| --- | --- | --- |
| Hero | `data-vimeo-hero-shell`, explicit hero roots or legacy player roots | Shared controls; active responsive player; muted looping background; consent prompt; manual pause; offscreen pause/resume; buffering and poster reveal. |
| Ambient | `data-vimeo-ambient-init` | No control interface; consent plus existing autoplay attribute and viewport logic; muted looping background; poster reveal; offscreen suspension. |
| Content | `data-vimeo-player-init` plus `data-vimeo-content-init` | Explicit play, original muted setting, non-looping playback, pause/end handling, intent/proximity warmup and existing aspect/cover fitting. |

`Vimeo Video Player` remains its existing reusable component (18 instances at audit).
`Hero - Vimeo` remains its existing component (2 instances), including responsive
roots. Page-level ambient roots remain in place. No component properties, video
IDs, images, CMS bindings, variables or controls were created or removed.

## Ownership

Native Webflow classes now supply the former head's initial control-layer stacking,
play/pause/spinner visibility, poster stacking and iframe visibility. Existing
geometry, sizing, colours, responsive classes, button artwork and spacing are kept.
The content poster's initial dark overlay is natively zero, matching the prior
controller-initialised state without waiting for that controller.

`tdb-vimeo.css` consolidates the old Vimeo portion of `tdb-ui.css`, the former
`tdb-vimeo-content-ui.css` and the remaining structural/compositing relationships.
The 2.4s alternating opacity pulse stays CSS, including the site's existing
reduced-motion exception. It is not moved into DD motion or Swiper. Attribute state
selectors still belong to the feature stylesheet; this is not a claim that every
Vimeo CSS rule is native. Native classes own visual design and first-frame defaults.

Some compatibility selectors intentionally remain: nested control compositing,
hero-content pointer-through, legacy background-iframe positioning, conditional
content-cover sizing and the existing overlay/IX protection. Removing these without
auditing every older hero instance would change behaviour. They no longer occupy
the global head or UI bundle. A small first-party state sheet is requested when a
Vimeo component exists, before the consent-gated player is needed.

## Loading and consent

- `tdb-vimeo-loader.js` is a small deferred head script. It binds the first play
  click, opens the existing cookie preferences and remembers the target even when
  the controller is unavailable. It does not fetch Vimeo or create a player.
- Presence requests the state stylesheet once. `functionality` consent plus a
  300px preparation window or interaction intent requests `tdb-vimeo.js` once.
  This is actual existing video consent, unlike the decision-only scheduling gate
  used for the non-tracking marquee/review animations.
- The controller has an explicit idempotent `init()`, called only after permission
  is checked again when downloads complete. It takes over controls and consent
  events; the early loader removes its delegated handlers/observer at handoff.
- A queued manual play transfers once. Responsive hero resolution happens at
  handoff. A rejected/closed consent prompt restores idle controls; another press
  can try again. CSS/controller failures retain native posters and allow retry.
- The existing Vimeo SDK promise remains shared across all three variants. SDK
  failures now clear the failed script so a later press can retry. Permission is
  rechecked after SDK loading and before play, covering consent changes in flight.
- Existing content warmup is kept at 300px/intent. The old blanket warm-all call
  now checks proximity, so a distant content video alone does not fetch the SDK.
- Existing post-initialisation withdrawal behaviour is retained: players pause and
  pending requests clear. Already created iframes are retained, not destroyed.
  This pass does not claim a complete third-party iframe teardown on withdrawal.
- The content `awaitingConsent` state now consistently writes the hyphenated
  `data-vimeo-awaiting-consent` attribute already expected by the CSS.

## Removed active paths

1. The 3,668-character Vimeo critical style block in global Webflow head.
2. Vimeo rules from `tdb-ui.css`.
3. Vimeo controller/content-CSS startup from the immediate runtime batch.
4. The unused content-video CSS helper/export in the footer runtime.

The head now contains a single Vimeo loader tag; no video animation script or style
block is embedded in a component. The global immediate/footer script pins move to
this release, but their unrelated behaviour is preserved. The footer's VIP stylesheet
reference is explicitly pinned to its previously deployed `48124a9` version so
moving the global UI pin cannot silently select the older VIP CSS in repository HEAD.
The module registry, reviews, marquee, Swiper and shared-motion pins remain unchanged.

The old global CSS source/build had fallen behind the deployed stylesheet. Its
source partitions now reproduce the actual deployed non-Vimeo rules. The global-only
build option prevents unrelated VIP/slider legacy outputs being regenerated.
Historical immutable files remain available for older consumers and rollback.

## Evidence and limits

Before consent, the former 18,051-byte controller is replaced by a 3,859-byte loader
(raw bytes: 14,192 fewer early JavaScript bytes on video pages). The new 19,109-byte
controller is deferred. The global UI file falls from 9,449 to 4,996 raw bytes;
Vimeo's consolidated state CSS is requested separately only on pages with video.
The new loader is one small early request; consolidation is not a guarantee of a
particular LCP improvement. No production LCP or field-performance claim is made.

The initial home/location controls were captured at 390px and 1440px widths and
compared with the refactor: no changes in control visibility, geometry, stacking,
colour or interactive state (pulse phase is intentionally excluded).

Deterministic Playwright tests use a stub Vimeo SDK, not real streaming:

- `tests/vimeo-lifecycle.cjs`: consent first press, one pending play, responsive hero,
  manual-pause persistence, content play/pause, ambient viewport lifecycle, one SDK,
  consent rejection and duplicate initialisation guard at mobile/desktop widths.
- `tests/vimeo-loader-recovery.cjs`: no components, distant content, rejection and
  regrant, withdrawal while the controller downloads, failed-controller retry.
- `node tools/build-vimeo.cjs --check`: source/build parity. Terser 5.39.0 required.

Tests require Playwright; set `CHROMIUM_EXECUTABLE` when using a custom Chromium.
`tests/fixtures/vimeo-native-defaults.css` is a test-only snapshot, never deployed.
Real staged pages are checked separately for published asset pins, native control
appearance, absence of Vimeo requests before consent and the actual consent UI.

## Return to the earlier module discussion

Vimeo now has a clear feature boundary. `tdb-ui.css` is still a legacy early
nonblocking global stylesheet, not an all-purpose deferred JavaScript module.
Filter interaction stays in `tdb-filters.js`; DD/general motion stays in
`tdb-motion.js`; sliders share the existing custom Swiper engine. None is duplicated
or imported just to display a Vimeo play button. Future cleanup of remaining global
UI families should follow this same component-by-component process.
