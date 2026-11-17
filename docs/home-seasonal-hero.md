# Home seasonal hero — staging pilot

Webflow site `677cf86cf9952f978d94d80c`; Home page `6af752b08255837b44bbd82c`.
Native component: **Home — Seasonal hero** (`122b3699-c696-6015-dfe2-a8a0c73136e5`).
Home instance: `0aea8c9d-e128-5eab-dda9-c6a949f9fe7a`.

## Editing

- **Show campaign** enables the second hero and right-hand section navigation.
  Turning it off omits both from the published HTML, restores the normal first
  hero behavior and adds no empty scroll space. Publish to staging to preview.
- **Campaign image — landscape**, **Campaign image — portrait**, **Image description**, **Eyebrow**, **Campaign heading**,
  **Supporting text**, **CTA label**, **CTA destination** and **Campaign section
  label** are native instance properties. Copy and CTA work without JavaScript.
- **Use campaign video** defaults off. Set **Campaign Vimeo ID — landscape** and
  **Campaign Vimeo ID — portrait** before enabling it. Landscape is used above
  991px and portrait on tablet/mobile, matching the existing opening hero.
  Each orientation's image is also its video poster; video uses the existing shared Vimeo
  consent, pause and lazy loading behavior. Its play button belongs to its own
  video shell. No new Vimeo player or custom playback implementation is added.
- **Variant** offers **White text** (base) and **Black text**. These are native
  Designer variants. The campaign foreground, CTA text/border and background
  veil follow the selected variant; there is no JavaScript color override.

The staging instance currently enables campaign video with portrait ID
`1247633429`, landscape ID `1247634748`, and **Black text** selected. Both formats
use the existing campaign play/pause control and retain its scroll fade.

The current holding images are the user's diamonds artwork, converted to WebP
at quality 95 without resizing: landscape `6afc6821c66914e1851711be`
(3840×2160, 393,574 bytes), portrait `6afc679ce01c23256bd2ed41`
(2160×3840, 383,482 bytes). Landscape appears above 991px, portrait at and below
991px. The image-only fallback and both video posters use these native props.
The campaign CTA points to `/treatments/dental-implants`.

## Ownership and motion

Designer owns the native sticky opening wrapper, ordinary-flow second panel,
image/poster, copy, buttons, styles and responsive layout. The existing shared
Hero — Vimeo instance and its assets stay intact inside the opening wrapper.
The new heading is an H2; this does not introduce another H1.

`TDBCampaignHero.mount` in `src/components/hero-campaign.js` owns transient panel/copy motion, the
two marker animations, focus exclusion for covered content, and bounded
gesture snapping between the two heroes. It uses the shared frame scheduler,
motion policy/timing and Lenis scroll owner. The first background does not
parallax. Campaign copy enters with a quarter-screen offset relative to its image,
settles at its authored position and then scrolls normally with the page. The
opening playback control travels upward with its departing chapter; the campaign
control stays inside its own moving video shell. Each control fades as its icon
rises, reaching zero opacity at 6rem from the viewport top. Its fade restores on
return. The opening logo travels upward over the stationary first background and fades
directly with slide progress, remaining fully visible at the untouched opening.
Approximately two wheel inputs (two-thirds of a viewport of accumulated input)
advance the opening chapter only after a fresh load. After the first completed
transition, one gesture switches back in either direction, including down again
after returning to the opening. Same-direction momentum is briefly suppressed;
opposite-direction input is accepted immediately after the slide settles.
Downward input leaves the second hero without an additional runway.
Below the opening threshold,
only the pills respond. Once triggered, the transition completes smoothly;
it does not rest halfway between heroes. Touch follows Omega's release rules:
vertical movement activates beyond 5px. A quick swipe lasting at most 300ms
advances; a longer held swipe must cover at least half the native slide span or
returns to its starting chapter. The span is captured at touchstart, so moving
browser chrome does not change the threshold mid-gesture. On native touch viewports, the panel
and foreground follow the finger locally while the document stays at its chapter
anchor. On release, Web Animations completes the panel/copy/pill transforms and
opacity on the compositor, then commits document scroll once at the destination.
A held drag below halfway settles back using the same timing as an advance.
Taps, sideways gestures, multi-touch zoom and screen-edge navigation stay native;
cancelled touches do not create flick momentum. Touches made during a slide stay
consumed until release; a fresh forward swipe from the second hero scrolls the
page immediately. Mobile release animations use Omega's final 500ms duration
through 639px, and 1000ms above that breakpoint, with CSS `ease` in both directions.
Neither the shared motion multiplier nor the distance remaining changes these
mobile durations. Desktop wheel timing remains at the site's standard motion
duration (half the duration of release 2.1.4). The existing foreground layer owns logo motion;
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
The campaign's Designer text variant also determines the menu foreground. The
menu stays white over the opening, transitions to dark as a black-text campaign
reaches the menu's lower edge, and restores on the reverse journey. Its normal
open, hover and floating surfaces keep their existing ownership. The campaign
module changes a transient navbar state; the navbar module owns its state CSS.
Normal Home page-break parallax excludes this stack while enabled and resumes
when its campaign panel is omitted. Runtime teardown restores authored styles,
ARIA state and inert state and removes gesture/timer/frame ownership.

No new inline head CSS or page-level custom code is required. No analytics,
form, content feed or production-domain settings are changed. The campaign
loads `tdb-hero-campaign.js` and the shared motion dependency together only when the native campaign exists;
there is no continuous animation loop when the visitor stops scrolling.

## Release and rollback

Runtime release 2.1.14 is based on the actual deployed immutable release
`50796602c6dfcee8e5d7afa1d3db733530aaa804`, with current main already reconciled.
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


## Gesture recovery, ownership and two Vimeo formats — 17 November 2026 (2.1.12)

The missed mobile snap was not confined to first load. Reproductions identified
three uncovered paths: native movement arriving after the mount-time probe;
height-only browser chrome resize clearing a pending native settle; and a child
control stopping release-event bubbling. The old source and bundle fail all six
regression checks; the replacement passes them in both source and bundle form.
Recovery now retains the last settled chapter, applies the same captured 20%
threshold in either direction, and observes touch release in capture phase.
Late touches can adopt a partial position after any landing. Keyboard navigation,
page restoration, sideways/edge gestures and zoom stay outside recovery. Recovery
uses a bounded quiet-period timer; there is no perpetual frame loop or idle poll.
The opening control translates with the departing chapter, including compositor
flights; incoming playback controls inherit the panel movement without copy parallax.

### Authoritative locations

| Concern | Owner |
| --- | --- |
| Content, campaign toggle, full-height panels, poster/crops, CTA, responsive layout | Webflow **Home — Seasonal hero** component |
| Landscape and portrait video IDs; optional video visibility | Native component properties and conditional video wrapper |
| Swipe state, chapter snapping, parallax and pill animation | src/components/hero-campaign.js → dist/tdb-hero-campaign.js |
| Timing, motion policy, pointer detection and read/write frame batching | src/shared/motion.js, config/motion.json |
| Presence gate, shared module registry, mounting/retry/disposal | src/runtime/hero-campaign-loader.js → dist/tdb-runtime.js |
| Playback, visibility, consent and responsive player selection | Existing src/components/vimeo.js and src/loaders/vimeo-loader.js |
| Header attachment | Existing navbar owner |

This follows the [Home architecture standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd):
complex feature state stays with its feature, while genuine timing/frame primitives
stay shared. The experiment previously lived inside TDBMotion.campaignHero; it is
now a separate feature asset. Its DOM hook is [data-tdb-campaign-hero] with a native
[data-tdb-campaign-panel]. The consent-released runtime prepares both dependencies
in parallel, then mounts once. Missing/disabled campaign requests no hero module.
Native panels, image, text and anchor links are the failure/no-JS fallback. Teardown
aborts listeners, timers, frame work and finite animations, restores authored
styles/ARIA/inert state and disconnects its ResizeObserver. No extra CSS bundle,
new scheduler, Omega/Swiper library or page custom-code patch is introduced.

The portrait video adds four native elements inside the existing optional wrapper
(player root, iframe wrapper, empty iframe and poster), omitted while video is off.
Both empty IDs are deliberately retained until the actual campaign films arrive.
No provider iframe URL is authored eagerly. The existing single control chooses
the visible player; both formats retain the shared consent/visibility gates.
Two scoped native media combo classes preserve the previous 100% cover geometry.
The image remains the default campaign on staging.

Controlled comparison with 2.1.11: shared motion falls from 45,689 to 35,930 raw
bytes (15,404 to 12,326 gzip). The feature asset is 10,955 raw / 4,273 gzip bytes
and adds one request only when the campaign exists. Combined changed startup,
runtime, motion and feature assets grow by 1,337 raw / 1,213 gzip bytes. This is
ownership and reliability work, not a measured device FPS or loading-speed claim.

Validation: 1,232 tests, 1,229 passed, three existing skips, zero failures;
source/build parity passes. Targeted coverage includes repeated up/down native
recovery, short returns, release capture, hidden-tab completion, compositor
landing, control attachment, loader deduplication/failure/disposal and campaign-off
gating. Physical Android swipe feel remains a user-device check. Roll back all
four install pins to 972a95661abd35ac9b174bf1a8c972b1e5759665 for the previous
runtime, or switch Show campaign off for the original single hero. The added
portrait property is inert while Use campaign video remains off.

## Omega mobile timing and control clearance — 17 November 2026 (2.1.13)

The user requested Omega's mobile speeds and release thresholds. Its
[hero module](https://www.omegawatches.com/static/version1794588356/frontend/Omega/default/default/Reflet_PageBuilder/js/content-type/module_51.min.js)
sets 500ms through 639px and 1000ms above that breakpoint. Its
[Swiper bundle](https://www.omegawatches.com/static/version1794588356/frontend/Omega/default/default/js/vendor/swiper-bundle.min.js)
uses a 5px activation threshold, quick swipes through 300ms, and a 0.5 slide ratio
for longer held swipes. The [wrapper styles](https://www.omegawatches.com/static/version1794588356/frontend/Omega/default/default/css/styles-m.min.css)
use the initial CSS transition timing function, `ease`.

The feature now uses these mobile durations and release rules, superseding the
20% and distance-scaled tuning documented in earlier releases. Advance and return
both use the complete configured duration after release. Native-scroll recovery
preserves the measured finger-release time across its settling delay; unknown
gestures use position alone. The native slide span is captured at touchstart,
so browser chrome cannot move the halfway threshold during a gesture. Desktop
wheel timing and opening runway keep their previous behavior.

TDB retains its native full-height panel anchors and the requested 100lvh second
hero. Omega uses 100svh minus its message strip, so viewport geometry is not
identical. No Omega/Swiper library is imported. The existing feature owner,
shared scheduler, native fallback, loading gate and consent owners remain.

Playback controls now fade with their own video's departure. The icon's native
position determines its fade: it starts fully visible and reaches zero opacity
at 6rem from the viewport top. The opening control's compositor keyframes include
that clearance point; the optional campaign control uses the same rule during
normal onward scrolling. Reverse movement restores opacity. Geometry is cached
until a real layout change, and teardown restores both controls' authored styles.
No Designer edit, added element, new request or extra animation loop is needed.

Validation: `npm run verify` passes 1,233 of 1,236 tests, with three existing skips
and zero failures; formatting and source/build parity pass. Source and bundle
coverage includes 639/640px timing, CSS easing, quick and held swipes in both
directions, half-slide boundaries, 5px jitter, repeated native recovery, browser
chrome changes, preserved flick timing after native settling, and 6rem control
clearance at different root font sizes. These checks do not certify physical
Android gesture feel or frame rate.

Compared with 2.1.12, the deferred hero asset grows by 1,031 raw / 404 gzip bytes;
startup size is unchanged. Roll back all four global install pins to
`c4398b2a056f5115d5e8b3f4d2c2513643b34856` and publish staging only. No native
component rollback is required. The campaign image remains active until the
landscape and portrait Vimeo IDs are supplied and video is enabled.

### Native video activation and text variants (same runtime)

The user's supplied 22-second films are now assigned to the Home instance:
[portrait](https://vimeo.com/1247633429) at tablet/mobile widths and
[landscape](https://vimeo.com/1247634748) above 991px. **Use campaign video** is on.
Each responsive player is inside the existing campaign shell; its shared native
button selects the visible player and switches between play and pause through
the established Vimeo owner. Consent, visibility and offscreen playback gates
continue to apply. No runtime code or loading gate was added for these films.

Native **Variant** prop `7c6e6d35-1ac8-cee0-20b7-0ec2d5c21b07` selects **White text**
(`base`) or **Black text** (`cac1661b-a79c-d281-fd1c-97ebb3e64497`). The black variant
sets the campaign panel's inherited foreground to black and replaces its dark
shade with a light veil. The campaign CTA combo class inherits its foreground,
and its existing currentColor border follows. The opening hero retains its
authored colors. This choice is stored and editable in Designer, not in a
page script, runtime attribute toggle or injected stylesheet.

The immutable runtime remains 2.1.13 at
`50796602c6dfcee8e5d7afa1d3db733530aaa804`. Revert this native follow-up by choosing
**White text** and disabling **Use campaign video**, then publish staging only.
The configured IDs may remain for later reuse. Native state and publication
evidence are saved alongside the working checkout.

Staging browser validation at 390×844 and 1280×720 confirms the correct visible
Vimeo ID, successful playback, pause and resume, and a black heading, CTA and
control. The campaign control reaches zero opacity during onward scrolling and
the existing player pauses offscreen. Initial playback correctly requests
functionality consent. No browser console errors were observed. This native
configuration change does not alter the previously verified runtime build.

## Holding artwork, menu contrast and video preparation — 17 November 2026 (2.1.14)

The two full-resolution quality-95 WebPs replace the temporary planning photo.
The native portrait image property is c6b3d3ff-8d0b-c023-966c-a3f2c884aeca;
landscape retains 31d937e0-5535-dce1-dd11-ad624295fdfb. Separate responsive
native stills and video posters are bound to these fields. The treatment item
6af86147179b3f8bf4983384 uses the landscape artwork in **Section 1 - bg Image**
(section-1---bg-image-3); replace it normally in CMS. Other treatment fields
are unchanged. All changes are staged, with no direct CMS live publication.

The CTA uses the site glass treatment: saturate(150%) blur(20px). The native
video shell has z-index 0 to contain its full-frame control beneath copy at
z-index 2, and the decorative shade ignores pointer input. This corrects the
desktop CTA click interception without redirecting events in JavaScript.

Hero 1.2.0 reads the native campaign foreground when layout is measured, keeps
the opening menu light, and changes the navbar state only when the incoming
panel crosses its lower edge. One bounded timer follows mobile compositor
flights, including reversal and cancellation; there is no extra animation loop.
Navbar state CSS owns the foreground effect and preserves native menu surfaces.

Vimeo loader 2.1.0 and controller 1.4.0 expose a reusable warm method. Campaign
wheel/swipe/pill intent requests preparation only after document load and
functionality consent. The controller selects one visible breakpoint, skips
Save-Data and 2G/3G connections, hidden pages and distant shells, and rechecks
permission after SDK loading. It creates the paused player with Vimeo
preload=auto; it never plays or removes the holding image until the normal
visibility/playback owner permits it. The opening video retains its existing
consent/proximity gates. Untouched pages trigger no new speculative player.
See [Vimeo player parameters](https://help.vimeo.com/hc/en-us/articles/12426260232977-About-Player-Parameters).

The four changed deferred JS assets add 700 gzip bytes in local build estimates;
startup and shared blocking UI CSS are unchanged. This is not a Lighthouse
score or physical-device performance measurement. Formatting, build parity and
the complete suite passed: 1,256 tests, 1,253 passes, three existing skips.
New cases cover first-load/scroll/reversal menu colour, mobile timer cleanup,
intent-only preparation, native orientation selection, consent withdrawal,
network saving gates, poster retention and reuse on visible playback.
