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

`TDBMotion.campaignHero` owns only scroll-driven copy translation/opacity, the
two marker fades, focus exclusion for covered content, and bounded
gesture snapping between the two heroes. It uses the shared frame scheduler,
motion policy/timing and Lenis scroll owner. The first background does not
parallax. Campaign copy is ordinary document content and scrolls with its image.
Approximately two wheel inputs (two-thirds of a viewport of accumulated input)
advance the opening chapter only after a fresh load. After the first completed
transition, one gesture switches back in either direction, including down again
after returning to the opening. Same-direction momentum is briefly suppressed;
opposite-direction input is accepted immediately after the slide settles.
Downward input leaves the second hero without an additional runway.
Below the opening threshold,
only the pills respond. Once triggered, the transition completes smoothly;
it does not rest halfway between heroes. Touch uses its own gesture handling:
one 48px vertical swipe changes chapter on finger release, or a deliberate short
flick of at least 20px commits on release. While held, the opening pills show
intent without starting the page transition. Taps, sideways gestures, multi-touch
zoom, screen-edge navigation and cancelled or withdrawn swipes do not trigger
slides. Touches made during a slide stay consumed until release; a fresh forward
swipe from the second hero scrolls the page immediately.
Touch devices and viewports below 992px use an 800ms base duration, scaled to
1000ms by the current shared motion profile. Desktop timing remains at the site's
standard motion duration (half the duration of release 2.1.4). A smooth
ease-in/out spreads movement across that duration instead of appearing to
finish early while input remains locked. The existing foreground layer owns logo motion;
the unpositioned padding wrapper stays untransformed so it cannot paint the
logo behind the video at idle. The campaign panel is natively 100lvh. Scrolling below the campaign,
keyboard navigation, restoration and scroll-locked menus/dialogs stay free.

The pill rail stays fixed at the right-hand viewport centre and fades out as
the campaign leaves. Native campaign combo styles retain the About Us line
appearance with two equal 72px hit targets and 56px lines. Neither position,
length nor clipping is animated. Opacity alone identifies the active chapter;
the opening hint eases its brightness and blends into the slide continuously.
Ordinary clicks and window blur
do not reset an owned scroll. Hidden tabs retain an in-flight destination so
the animation catches up when browser frames resume. Actual page navigation
still releases the old page's scroll ownership.
Document anchors are cached until resize, observed hero/panel size changes,
load, restoration or explicit refresh. Native scroll and foreground updates
share the existing motion frame, eliminating the separate scroll rAF loop and
per-frame geometry reads. Mobile browser height changes and rotation invalidate
the anchors without cancelling an owned slide or leaving it halfway.
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

Runtime release 2.1.8 is based on the actual deployed immutable release
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

## Stationary pills and mobile frame work — 17 November 2026

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
