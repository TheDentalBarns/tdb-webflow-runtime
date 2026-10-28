# Location setting and access

The Location benefits and aerial video are now a native `Location — Setting and access` component, converted from the existing section without a wrapper. It contains the existing shared `Vimeo Video Player`. Contact currently uses a different contact/map section; this component has not been inserted there.

## Ownership and maintenance

- Designer owns the section/grid, copy, decorative masks, square video frame, native buttons and poster crop. The three existing icon holders use the canonical tranquil, parking and discreet SVGs; their PNG children and two forced line breaks were removed. Each holder's native `::before` renders the symbol at 60% of the holder size; `::after` draws the fine arched surround. This retains the smaller framed appearance after David flagged its loss in the initial mask conversion. Neither pseudo-element adds a DOM node or needs JavaScript. The icons render before JavaScript and in Designer.
- Shared Vimeo uses native play/pause buttons with labels and shared mask artwork, retaining the existing circular holders, 20px blur and pulse. Its inline play/pause/spinner SVG trees are removed. The controller transfers focus only between its own focused controls when playback swaps them; it does not steal focus from other page content.
- `tdb-video-feedback.css`, bundled in the existing shared UI, owns loading feedback before consent and while the Vimeo dependency is arriving. It uses the existing central motion clock and spin animation. `tdb-vimeo-ui.css` retains playback states and focus presentation; `vimeo.js` retains consent, first-input replay, cancellation and suspension.
- The section's `data-tdb-video-poster-parallax` hook registers only `.vimeo-player__placeholder` with the existing `TDBMotion.pageBreaks` owner. Its iframe, controls and horizontal geometry do not move. The shared player's native **Poster parallax** variant reserves 4vh extra image height, centred at -2vh, for the existing bounded -2vh/+2vh motion. Other instances retain Base and their current crops. No extra scroll listener or scheduler was added.
- The Location film title is now “Location and free parking at The Dental Barns”. Its saved poster and the original uploaded film's poster are both 720 × 720; no sharper existing source was found. A higher-resolution original is still needed for a real quality improvement; no upscale was substituted.
- Content poster, iframe and button fade durations consume `--tdb-motion-pace` once. Native layout and artwork are not recreated by runtime code. Home receives no new element.

The shared play and pause artwork are Webflow assets `6ae0c5c81332cf18d9261ca0` and `6ae0c5c877076aee400c6838`; spinner remains `6ad9b3739924db6726de4586`. The shared Vimeo definition has 18 native instances. Its continuous IX2 scroll-opacity binding has now moved to shared motion, as recorded below. Other page interactions remain outside this migration.

## Location mobile hero correction

The shared Hero — Vimeo has different film inputs on Home and Location. Home's mobile film is portrait; Location supplies the landscape film `1047445489` at both breakpoints. Location had inherited the mobile portrait iframe minimums (58vh width / 178vw height). Once playback removed the full-frame poster, the landscape film fitted inside that portrait iframe and exposed the overlay above and below the film. This was reproduced in a 390 × 844 browser viewport; the user reported Android Chrome.

Only Location's `location-centred-heading` native variant now overrides `.vimeo-bg__iframe.mobile` at Tablet and below with landscape cover minimums: 178vh width / 58vw height. Home retains its portrait sizing. No JS compensation, new element or page custom-code rule is involved.

## Acceptance and rollback

The change follows the [architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd): native geometry, shared component-owned behaviour, accurate fallback artwork, and disclosure of Designer/runtime boundaries. Verify native masks, loading and consent, keyboard play/pause/focus, poster-only vertical motion, desktop/mobile geometry, hero playback after poster removal and scroll/resume, and Home/shared consumers before completion.

Private before/after native trees, global install code, browser evidence and logs are saved outside the repository under `location-features-evidence`. Runtime rollback restores all four previous install pins to `6623aa6f837afabee6a609dcbf0ba20c44f815c9` and publishes staging only. Restore shared Vimeo from the uninstantiated `Archive — Vimeo before shared masks 2026-10-27` definition (`bcdb34a1-0ac4-15a6-916d-1a6eeb23c67d`) if reverting its structure; restore the original native style values alongside it. Revert the Location hero variant minimums independently if required. The new section can be unlinked in place without adding a wrapper.

Startup cost adds no controller or head script. Native mask CSS/assets and early loading-state selectors have a delivery cost; removed image/SVG nodes are not by themselves a performance claim. Browser measurements and final combined HTML/CSS/JS costs are recorded below after staging publication. No new TBT or physical Android benchmark is claimed.

## Initial masks and geometry verification, 28 October 2026

The initial cleanup used runtime [`fc3501fadb6751bf4f37a74ae78e822602a936f1`](https://github.com/TheDentalBarns/tdb-webflow-runtime/commit/fc3501fadb6751bf4f37a74ae78e822602a936f1). All four install pins agreed; the startup entrypoint, foundation and four changed built assets matched their local bytes on jsDelivr. Publication targeted the Webflow subdomain with no custom domains. The subsequent shared-motion release below supersedes these pins.

- Build parity and custom Swiper build pass. Full suite: 786 passed, three skipped, zero failures. An initial strict floating-point marquee assertion failed by about 1e-14; the focused marquee rerun and full rerun passed. Direct Prettier checking leaves the existing unrelated warning in `src/reviews/native/loader.js`; changed source files pass. The npm format command's single-quote glob handling also fails under this Windows shell, so it is not reported as clean.
- Location's initial HTML has 1,530 elements, down from 1,543. The changed section goes from 51 to 38, and its player from 20 to 12. Home remains at 1,133. No new Home element or head patch was introduced.
- Desktop and 390px checks confirm the smaller shared masks and arched surrounds, native square frame, title, loading spinner, keyboard play/pause and focus transfer. With essential-only consent the first press opens consent and leaves the iframe source empty; acceptance replays the request. The player reached loaded/started and subsequently returned to its paused/ended state.
- Poster translation changed from -0.33px to +8.29px across the checked desktop scroll positions; iframe and control translation remained `none`. The 4vh oversized poster stays clipped by the native frame. First Visit's five players retain Base crops and shared masked buttons; a representative player passed keyboard play/pause and focus transfer without poster parallax. Static checks on Contact, About, main VIP, VIP Posh, Smiles, Sanctuary, Awards, West End and Five Senses found no content-player consumers.
- The Location hero was checked at 390×844 after poster removal and scroll-away/return, and at 844×390. Its visible film fills the frame. Home retains its portrait mobile film and native portrait minimums. Browser viewport checks do not certify physical Android Chrome address-bar or orientation behaviour; no new phone performance benchmark is claimed.

Controlled byte measurements compare the saved previous staging HTML/CSS and runtime `6623aa6f` with this release. Gzip uses the same local Node implementation for both sides; it is not a CDN transfer measurement.

| Affected delivery | Raw change | Controlled gzip change |
| --- | ---: | ---: |
| Location HTML | -1,942 B | -853 B |
| Location native CSS | +3,740 B | +429 B |
| Home HTML | +140 B | +2 B |
| Home native CSS | +1,317 B | +191 B |
| Shared deferred runtime JS | +134 B | +37 B |
| Shared UI CSS | +681 B | +62 B |
| Vimeo CSS | +282 B | +57 B |
| Vimeo JS | +246 B | +96 B |

The affected Location HTML/CSS/JS total is +3,141 raw bytes / -172 controlled gzip bytes before artwork transfer. SVG masks replace three PNG requests and inline control SVGs; shared cache state determines their transfer cost. The new play/pause assets total 1,160 raw bytes. Foundation/startup are unchanged. At that release the continuous IX2 scroll-opacity binding and 720px poster remained follow-up limitations. The former is resolved below; the poster still needs a sharper original.

## Shared scroll-opacity migration, 28 October 2026

Current staging runtime is [`86b1da68c04b6d3dbbfc0737f61cb9657a839029`](https://github.com/TheDentalBarns/tdb-webflow-runtime/commit/86b1da68c04b6d3dbbfc0737f61cb9657a839029). All four global install pins match, and the published startup, foundation, runtime, motion and UI assets match local bytes. The Webflow staging subdomain alone was published; production remains untouched.

### Ownership and native boundary

The native shared `Vimeo Video Player` root (`efa1f211-9b34-f83b-c813-e469f00dad3c`) now has `data-tdb-dd-page="native"` and `data-tdb-dd-preset="vimeo"`. Its legacy event `e-600` is removed in Designer. This opts into the existing `TDBMotion.ddText` scheduler and runtime registration; no extra controller, listener, DOM node, native style, custom CSS or head logic was added. Native opacity remains one, preserving Designer/no-JS fallback.

The new shared preset preserves the old continuous curve: opacity 0 at 0% progress, 1 at 30% and 75%, 0.8 at 95%, then hold. Native progress is `(viewport height - element top) / min(viewport height + element height, document height)`, clamped to zero–one. Existing progress smoothing matches the old smoothing-50 setting. Scroll geometry is not scaled by the timed motion pace. Poster translation remains independently owned by `TDBMotion.pageBreaks`, with the existing native overscan; iframe and controls stay still. No-JS, reduced-motion, deferred-loading and already-visible restoration paths keep readable native content.

The browser keyboard check caught an offscreen player retaining opacity zero after focus scrolled it into view. The shared Vimeo preset now reveals an offscreen-to-visible arrival caused by focus, an anchor, restoration or layout change, while retaining painted opacity for an already-visible player. This is an explicit shared-motion correction, not a Designer compensation patch. Other fade presets are unchanged.

Designer saved the removal, but the connector's first publication retained the previous IX2 bundle. Publishing through the native Designer with staging selected and production unselected regenerated the correct bundle. Direct published-bundle verification proves `e-600` is absent. The inert native `data-w-id` attribute remains in HTML; its presence alone is not an active interaction. The five separate Services events `e-601`–`e-605` and their existing `a-79` action list are unchanged. Do not delete that shared action list or describe the entire Location page as IX2-free.

### Consumers and acceptance

- The 18 native instances comprise five players in `5StepProcess` across First Visit, Services and Area templates (15), one in `VisitingUs–Services`, one in Location's setting/access section and one direct Area-template player. Static checks cover Home, Contact, Location, First Visit, all eight Services pages and all six Area pages: 18 pages and 90 rendered shared players. Every player has the new hooks and retains its video ID, node count, crop and poster-parallax eligibility.
- All audited page DOM counts are unchanged by this migration: Home 1,133, Location 1,530 and First Visit 2,019. Location's section remains 38 nodes and its player 12. Home and Contact have no content-player instance.
- Build parity passes. Full suite: 793 passed, three skipped, zero failures. Source/bundle regressions cover the curve in both directions, keyboard/anchor arrival, visible restoration, mobile geometry, reduced motion, lifecycle cleanup and single runtime registration. Changed source/tests pass formatting; the previously recorded unrelated formatter warning is not claimed resolved.
- On staging at 1280×720, scroll entry/reverse motion and poster-only translation work; poster translation changed from -4.0831px to -0.3773px while iframe/control translation stayed `none`. The square player is 564.52px with the existing overscan. Keyboard play/pause transfers focus between controls. Reload at scroll 4,142 keeps the visible player at opacity one before and after deferred settling. First Visit's second player went from offscreen opacity zero to visible opacity one on keyboard focus after the correction.
- This step changes no mobile native geometry. Automated mobile-geometry checks pass, and the prior 390×844/844×390 visual checks above remain evidence for the unchanged geometry. This session's browser viewport override did not apply, so a new mobile visual check is not claimed. Physical Android Chrome verification and a sharper 720px poster source remain outstanding.

### Combined delivery cost and engineering assessment

The following controlled deltas compare the saved staging output and runtime `fc3501f` before this migration with the final release. Gzip uses one local implementation; publication metadata can affect HTML compression. These are delivery accounting, not measured TBT or speed improvements.

| Affected delivery | Raw change | Controlled gzip change |
| --- | ---: | ---: |
| Home HTML | -308 B | -71 B |
| Location HTML | -54 B | -12 B |
| Native CSS on Home and Location | 0 B | 0 B |
| Webflow IX2 bundle | -616 B | -46 B |
| Existing deferred shared motion bundle | +160 B | +57 B |

Affected Location delivery totals -510 raw bytes / -1 controlled gzip byte; Home totals -764 raw bytes / -60 controlled gzip bytes. There are no new asset requests or early-code bytes. The maintainability gain is one motion owner with explicit native hooks; the Designer experience retains editable structure and visible fallbacks; performance preserves deferred loading and the shared scheduler without claiming a benchmark gain; accessibility preserves consent, first-input feedback, reduced-motion behavior and keyboard visibility/focus.

### Migration rollback

To revert only this migration, restore all four install pins to `fc3501fadb6751bf4f37a74ae78e822602a936f1`, remove the two DD attributes from the shared root, and restore its native While scrolling in view binding to the existing `Vimeo Video Scroll` (`a-79`) with smoothing 50 and the original breakpoint/progress settings. Publish through Designer to staging only and verify the regenerated event mapping. Preserve the newer masks, buttons, frame, poster variant and hero correction; the older structural archive predates those changes and is not the rollback for this migration. Before/after native trees, interaction data, HTML/CSS/JS inventories, screenshots, test logs and cost verification are saved outside the repository under `vimeo-entrance-evidence`.
