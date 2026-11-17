# Home seasonal hero — staging pilot

Webflow site `677cf86cf9952f978d94d80c`; Home page `6af752b08255837b44bbd82c`.
Native component: **Home — Seasonal hero** (`122b3699-c696-6015-dfe2-a8a0c73136e5`).
Home instance: `0aea8c9d-e128-5eab-dda9-c6a949f9fe7a`.

## Editing

- **Show campaign** enables the second hero and right-hand section navigation.
  Turning it off omits both from the published HTML, restores the normal first
  hero behavior and adds no empty scroll space. Publish to staging to preview.
- **Campaign image**, **Image description**, **Eyebrow**, **Campaign heading**,
  **Supporting text**, **CTA label**, **CTA destination** and **Campaign section
  label** are native instance properties. Copy and CTA work without JavaScript.
- **Use campaign video** defaults off. Set **Campaign Vimeo ID** before enabling
  it. The same image is the video poster; video uses the existing shared Vimeo
  consent, pause and lazy loading behavior. Its play button belongs to its own
  video shell. No new Vimeo player or custom playback implementation is added.

The initial image is the existing digital smile-planning WebP asset
`697a0c20536733e7ff791d25` (116,092 bytes before responsive image selection).
The campaign CTA points to `/treatments/dental-implants`.

## Ownership and motion

Designer owns the native sticky opening wrapper, ordinary-flow second panel,
image/poster, copy, buttons, styles and responsive layout. The existing shared
Hero — Vimeo instance and its assets stay intact inside the opening wrapper.
The new heading is an H2; this does not introduce another H1.

`TDBMotion.campaignHero` owns transient panel/copy motion, the
two marker animations, focus exclusion for covered content, and bounded
gesture snapping between the two heroes. It uses the shared frame scheduler,
motion policy/timing and Lenis scroll owner. The first background does not
parallax. Campaign copy enters with a quarter-screen offset relative to its image,
settles at its authored position and then scrolls normally with the page. The
opening logo travels upward over the stationary first background and fades
directly with slide progress, remaining fully visible at the untouched opening.
Approximately two wheel inputs (two-thirds of a viewport of accumulated input)
advance the opening chapter only after a fresh load. After the first completed
transition, one gesture switches back in either direction, including down again
after returning to the opening. Same-direction momentum is briefly suppressed;
opposite-direction input is accepted immediately after the slide settles.
Downward input leaves the second hero without an additional runway.
Below the opening threshold,
only the pills respond. Once triggered, the transition completes smoothly;
it does not rest halfway between heroes. Touch uses its own gesture handling:
one vertical swipe covering 20% of the visible viewport changes chapter on finger
release. Faster flicks below that distance also return to the starting chapter.
The height is captured at touchstart, so moving browser chrome does not change
the threshold mid-gesture. On native touch viewports, the panel
and foreground follow the finger locally while the document stays at its chapter
anchor. On release, Web Animations completes the panel/copy/pill transforms and
opacity on the compositor, then commits document scroll once at the destination.
A short withdrawn drag settles back to its starting chapter over a softer 500ms
ease-out (400ms base under the shared motion profile). Taps, sideways gestures, multi-touch
zoom, screen-edge navigation and cancelled or withdrawn swipes do not trigger
slides. Touches made during a slide stay consumed until release; a fresh forward
swipe from the second hero scrolls the page immediately.
Touch devices and viewports below 992px use an 800ms base duration, scaled to
1000ms by the current shared motion profile, scaled by the distance remaining
after a touch preview (minimum 220ms). Desktop timing remains at the site's
standard motion duration (half the duration of release 2.1.4). A smooth
ease-in/out spreads movement across that duration instead of appearing to
finish early while input remains locked. The existing foreground layer owns logo motion;
the unpositioned padding wrapper stays untransformed so it cannot paint the
logo behind the video at idle. The campaign panel is natively 100lvh. Scrolling below the campaign,
keyboard navigation, restoration and scroll-locked menus/dialogs stay free.

The pill rail stays fixed at the right-hand viewport centre and fades out as
the campaign leaves. Native campaign combo styles retain the About Us line
appearance with two equal 72px hit targets and 84px base lines. Local translation
and scaling animate between the original 84px active and 28px inactive pills;
opacity identifies the active chapter. No height or clipping changes happen
per frame. The opening hint eases into the slide continuously. The rail itself
never moves with the departing second panel; only its opacity fades out.
Ordinary clicks and window blur
do not reset an owned scroll. Hidden tabs retain an in-flight destination so
the animation catches up when browser frames resume. Actual page navigation
still releases the old page's scroll ownership.
Document anchors are cached until resize, observed hero/panel size changes,
load, restoration or explicit refresh. Native scroll and foreground updates
share the existing motion frame where native scrolling is used, eliminating the
separate scroll rAF loop and per-frame geometry reads. Mobile compositor flights
need no JavaScript frame loop after release. Native scroll remains the fallback
without Web Animations and when returning from the body. Mobile browser height
changes and rotation remeasure and settle a compositor flight at its chosen
chapter instead of leaving it halfway.
Height-only changes also preserve a finger gesture that has already started.

The existing navbar owner keeps the menu fixed during the cover transition,
then attaches it to the second hero at the top and lets it scroll off with it.
Other pages, including About, retain their existing navigation behavior.
Normal Home page-break parallax excludes this stack while enabled and resumes
when its campaign panel is omitted. Runtime teardown restores authored styles,
ARIA state and inert state and removes gesture/timer/frame ownership.

No new inline head CSS or page-level custom code is required. No analytics,
form, content feed or production-domain settings are changed. The campaign
loads the existing shared motion module only when the native campaign exists;
there is no continuous animation loop when the visitor stops scrolling.

## Release and rollback

Runtime release 2.1.11 is based on the actual deployed immutable release
`55f76b394bf4aedfaba35ced87bf12631c07a70c`, not unshipped main-branch changes.
All first-party site script/style/preload references move together to the
same new commit. This pilot is published only to `dentalbarns.webflow.io`.

The immediate content rollback is **Show campaign = off** and staging publish.
The original single hero and normal runtime behavior then return. For a full
runtime rollback, also restore the preceding SHA in the global head/footer
release URLs and publish staging. Local before-code backups were captured.

Validation: `npm run verify` (build preservation checks and complete test suite),
including source and bundle coverage for logo movement/fading, unmodified
media/panel styles, reverse scroll, markers, gesture snapping, locks, lifecycle,
teardown and the off state. Browser checks cover desktop, tablet, phone and
landscape, native anchors, normal lower-page scrolling and staging publication.
The campaign-off native output was published and verified to omit panel and
rail while retaining the original hero before restoring the enabled pilot.

## Stationary pills and mobile frame work — 17 November 2026 (2.1.8)

Reference: [Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd).
The user reported Android frame-rate drops after approving the revised swipe
response and one-second timing. Confirmed source costs were continuously changing
pill heights/clipping, repeated geometry measurements, redundant style/ARIA writes
and separate scroll/foreground animation callbacks. These are removed locally;
this is not a measured physical-device FPS claim.

Designer remains authoritative for the rail position and fixed pill geometry.
The campaign-only combo overrides leave About Us unchanged. Runtime still owns
the fades, logo travel and snapping, through the existing native-panel presence
gate and shared motion module; there is no new element, request, startup gate or
global stylesheet. Timing, consent, video controls and normal body scroll remain
as previously reviewed. No permanent compositor layers or broad containment are
introduced. Native fallback retains the two working chapter anchors.
Controlled build comparison with 2.1.7: the changed startup and deferred motion
bundles have no net raw-byte increase; deferred motion adds 143 gzip bytes.
Native positioning rules are a separate small blocking-CSS change. No HTML node,
image payload or network-request count changes are attributed to this refinement.

Acceptance checks include opacity-only markers through both directions and exit,
no additional geometry reads across a simulated 60-frame native slide, foreground
position matching that frame's scroll, resize invalidation, lifecycle cleanup,
one-swipe reversals and unchanged wheel runway. Browser checks separately verify
native sizes/position, full-height landings and onward scrolling. Physical Android
performance remains a device check; these source and browser checks do not certify
an FPS target.

Rollback pairs runtime `8d720f0baba140d229a0dd3f0b4c87b1f5c8c845` with the preceding
native campaign rules: rail absolute, bottom 0, height auto; progress sticky at
50svh/right auto; step 44px with first-child 100px; marker 84px. Remove the added
combo position/top/right and marker transform/clip overrides, and the muted
marker transform override. Publish only staging. Published native CSS before
the change is captured beside the working checkout as `pill-perf-before-*.css`.

## Fixed rail, animated pills and touch carousel — 17 November 2026 (2.1.9)

The user's clarification restores animated pills while retaining the fixed rail.
The supplied Omega HTML and its official `Reflet_PageBuilder/js/content-type/module_51.min.js`
confirm a vertical Swiper carousel with transform-driven touch, a completed
transition before edge release, and local animated bullets. This implementation
uses the existing native TDB panels and browser Web Animations rather than adding
Swiper, copied vendor code, a wrapper, or another loading gate.

Designer keeps the rail fixed and owns the 72px hit targets, 84px base markers,
initial +14px step translation and inactive one-third marker scale. Runtime owns
only transient transforms/opacity and the final native scroll handoff. First
media, navbar ownership, video controls, campaign toggle and normal onward
scrolling retain their existing contracts. Desktop keeps its reviewed timing and
opening runway. No permanent layer promotion or broad containment is added.

Regression checks cover finger-follow preview without document scrolling, no
JavaScript animation loop during the released flight, a single native scroll at
landing, immediate reversals, long drags using untransformed anchors, short-drag
return, touch cancellation, pinch, resize, hidden-tab completion and teardown.
Source and built bundle tests also retain desktop/fallback and fixed-rail exit
coverage. Browser verification checks local panel movement, fixed rail position,
full-height landing and onward scrolling. Physical Android FPS still requires a
device check; these checks do not certify a frame-rate target.

`npm run verify`: 1,218 tests, 1,215 passed, three existing skips, no failures.
Compared with 2.1.8, the deferred motion bundle adds 2,068 raw bytes / 704 gzip
bytes; startup size is unchanged. There are no additional requests or elements.

Rollback pairs runtime `dcc082296b4538771271cfc5451da3aaaec82df0` with the 2.1.8
native campaign combo rules: step transform none, marker height 56px and transform
none, muted marker transform none. Keep the fixed rail and 72px targets. Publish
only staging. The 2.1.8 head/footer and native styles are retained in the local
release evidence.

## Proportional touch release and soft return — 17 November 2026 (2.1.10)

The supplied Omega hero configuration loads Swiper 12.2.0 with `followFinger`
behaviour and touch release at its edges. Its library decides at touchend whether
to advance or return: held drags use `longSwipesRatio` (default 0.5) after
`longSwipesMs` (300ms), while shorter gestures use the separate short-swipe path.
Its default `resistanceRatio` of 0.85 concerns travel beyond an outer slide edge;
the hero's `touchReleaseOnEdges: true` suppresses that edge resistance to let the
document continue. The snap-back within the two heroes is a release decision
and slide transition, rather than a 20vh CSS threshold or an overshooting spring.
Sources: [hero module](https://www.omegawatches.com/static/version1794588356/frontend/Omega/default/default/Reflet_PageBuilder/js/content-type/module_51.min.js),
[Swiper bundle](https://www.omegawatches.com/static/version1794588356/frontend/Omega/default/default/js/vendor/swiper-bundle.min.js).

The TDB tuning follows the user's requested approximate 20vh commitment point,
not Omega's default 50% held-drag setting. It replaces the previous fixed 48px
and 20px flick thresholds. Sub-threshold touch previews now return with a 500ms
ease-out, independent of their short distance, rather than the 220ms minimum
used before. Finger-follow transforms, forward slide pacing, desktop wheel
runway, fixed animated pills, native onward scroll and lifecycle ownership stay
with their existing owners. No native Webflow style or markup changes are needed.

A staging reload followed immediately by a 10%-height scroll reproduced the
reported first-load pause: the page remained at 84.67px on an 844px viewport
after the deferred motion owner mounted. The owner now recovers a partial native
opening scroll after input settles, using the same 20% decision. If the touch
is still moving when the module arrives, it adopts that gesture and continues
the local preview before deciding on release. Settling from between anchors
uses compositor transforms too, with one native scroll at landing. A short
initial recovery does not count as a completed chapter or consume the initial
desktop wheel runway. No extra startup dependency or input owner is introduced.

Regression coverage checks 10%, just below 20% and exactly 20% on 600px, 800px
and 1000px viewports, fast and held releases, both directions, immediate next
gestures, a height-only resize without a moving threshold, input preceding the
deferred owner, and a touch already moving when that owner arrives. This supplements
the existing compositor, fallback, desktop and teardown checks. Physical Android
gesture feel remains a handset check.

`npm run verify`: 1,224 tests, 1,221 passed, three existing skips, no failures.
Compared with 2.1.9, deferred motion adds 251 raw / 108 gzip bytes and the startup
version adds one byte. There are no additional requests, nodes or native styles.

Rollback: restore runtime `41a9edad4c43c87f1e65829afc8e6937fc1c089d` in all global
release references and publish staging only. Native pill styles remain as 2.1.9.

## Foreground parallax — 17 November 2026 (2.1.11)

The user requested Omega's foreground depth for the text and logo. Its native
hero CSS offsets incoming content by 25% of a full slide and fades outgoing
text/logo according to outgoing progress. The existing TDB opening logo already
travels upward with its foreground over the static video; its opacity now follows
that progress directly rather than waiting until the first quarter of the slide.
The campaign's heading, supporting copy and CTA enter from a 25%-height offset
within the moving panel, catch up at landing and retrace that path on reversal.
Reference: [Omega hero styles](https://www.omegawatches.com/static/version1794588356/frontend/Omega/default/default/css/styles-m.min.css).

The shared campaign owner animates the existing native `.tdb-campaign-copy`
element. Designer remains authoritative for its settled layout. No wrapper,
native style change, page CSS or loading gate is added. The opening logo's native
foreground remains the transform target; its padding parent stays untouched to
preserve the video stacking order. Authored styles are restored on teardown.

Touch preview and native scrolling update both foregrounds through the shared
frame. Mobile completion adds one synchronized compositor animation for campaign
copy to the existing panel/logo/pill flight, with no per-frame document scroll
or new geometry reads. The foreground offset becomes zero at the second chapter
and remains zero through onward page scrolling. Media, video controls, fixed pill
rail, menu attachment, 20% touch threshold and soft short-drag return retain their
existing owners and timing.

Expanded source and bundle checks cover initial visibility, quarter-height
entry, outgoing logo fade, both directions, short-drag return, synchronized
foreground frames, native onward scrolling, viewport changes and style restoration.
Physical Android rendering remains a handset check.

`npm run verify`: 1,224 tests, 1,221 passed, three existing skips, no failures.
Compared with 2.1.10, motion adds 54 raw bytes and saves 12 gzip bytes; startup
size is unchanged. No new requests, nodes or native styles are introduced.

Rollback: restore runtime `b620d6e4dd95dad6418cc04a225c167258cfa848` in all global
release references and publish staging only. No native style rollback is needed.
