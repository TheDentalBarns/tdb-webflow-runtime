# Native treatment guide

The Treatments template has one reusable `Treatment Guide — wheel` component (its legacy Designer name). The current staging presentation is a native six-rem horizontal chapter strip, with linear progress along its bottom edge and a centred Learn more button below the chapter summary. It retains the charcoal card, five chapters, animated small CTA artwork and shared drawer. Earlier circular trials are documented below for rollback.

## Ownership

Designer owns the section spacing, responsive card grid, chapter icon masks, five bound chapter panes, Learn more controls and shared carousel arrows. The card has one column at every breakpoint. The five panes overlap in native grid tracks and all contribute their intrinsic title and summary height. Hidden panes use visibility, not display removal. This reserves space before enhancement and across chapter changes. Native title frames clip horizontal text travel. Desktop uses the authored intrinsic height; tablet and phone have a native `100svh` minimum. The optional scroll controller pins the complete card only when it fits, without changing its height or spacing.

The treatment name, introduction, chapter titles and full bodies retain their CMS bindings. Short chapter summaries are shared component properties. Native Webflow tabs and closed details remain usable if the optional modules cannot load. The first chapter is visible in Designer. Each native Learn more control opens its own chapter. The drawer returns focus to the newly active native control.

`src/runtime/treatment-guide-loader.js` retains presence, consent, proximity and intent gates. It selects `tdb-treatment-guide-bar.js` when the native dial-art has `aspect-ratio:auto`; archived circular markup still selects `tdb-treatment-guide-wheel.js`. The strip therefore does not download radial pressure masks or wheel gesture code. First-drag replay and the public `wheel(root)` loader method remain compatible. Drawer dependencies wait for Learn more intent. No guide assets are requested on pages without the component.

`src/treatment-guide/bar.js` owns horizontal gestures and chapter selection. `card.js` updates the existing panes, accessible chapter position, centre artwork and small CTA artwork tickers. `scroll.js` uses the same shared motion policy as those animations, including the owner-approved full-motion override. It animates manual progress from the heading's timing. The retained `wheel.js`/`pressure.js` implementation serves only circular fallback markup. Work settles after release and pauses offscreen or when the document is hidden.

`src/styles/tdb-treatment-guide-states.css` supplies early selected-tab and fallback state rules through the shared UI build. The deferred `tdb-treatment-guide.css` contains pressure/ticker paint and established drawer-specific internals. Its former card-layout override has been removed. The shared drawer, motion policy, ticker, reading state and carousel dependencies remain shared external modules.

## Native spacing cleanup — 10 November 2026

The desktop card follows the Services “Clarity before you decide” rhythm: a minimum 14rem above the heading and below the centred Learn more CTA, with 7rem between heading, summary and CTA. Summary width is capped at the intro's standard 52rem. The large standalone artwork is hidden in Designer; each existing CTA now occupies that row, retaining its animated small artwork. Three-rem desktop arrows sit at the left and right 5vw insets, vertically centred in the charcoal area. Tablet and phone retain 8rem copy gaps and minimum outer spaces, with a separate 6rem arrow row before the lower space. Native flexible grid rows encode those spaces and fill the phone's native minimum height. The complete authored height participates in the pinning fit check, so shorter screens retain ordinary scrolling with reachable controls and animated manual progress.

A chapter selected before the strip pins is remembered independently of the current animation. On entry, scrolling joins that chapter's completed divider and retains any input overshoot. Selecting chapter five therefore continues beyond the card without resetting to one. The intent is consumed once, so reverse scrolling still traverses the earlier chapters normally. Drawer scroll locks defer this handover until scrolling is released.

The cream introduction uses the Services “Clarity before you decide” native layout: shared centred heading, copy, then a four-rem diamond. The shared inner class supplies 14rem top/bottom spacing and 7rem gaps on desktop/tablet, increasing to 16rem and 8rem on phone. Its original CMS-bound heading and paragraph remain in place, with existing spacing wrappers flattened using `display:contents`. The copy matches the reference's 0.875rem/1.5 type, with native paragraph margins reset. The card's negative bottom margins and outer section bottom padding remain removed, so the charcoal background meets the following patient-story image. Chapter numbers use 1rem on every breakpoint. Drawer copy retains its 2.5rem desktop / 1.25rem phone inset without an additional inner width cap. `config/treatment-guide-bar-designer.json` records native properties and element assignments.

## Short desktop stage and stable refresh — 10 November 2026

The centred-CTA layout no longer receives a runtime viewport-height override. Its native grid therefore keeps the same height when the page refreshes below it, when enhancement loads, and when scrolling back into it. Below-section restoration continues to defer inserting scroll travel until the reader returns above the strip.

On desktop, one browser-native sticky wrapper contains both the card and the actual immediately following `.tdb-review-image-break`. The track includes the image height once, keeping document height and release travel consistent. Card and image therefore move as one surface, with no JavaScript scroll-frame repositioning at their seam. The image's native size, reviews and inner parallax remain intact; nothing is cloned. A comment marks its original sibling position, restored on mobile, fallback and teardown. This replaces the earlier remaining-travel translation, which could wobble when scrolling ran ahead of animation frames.

Learn more shares the secondary alternate button's light-fill/dark-text hover and pressed feedback; its existing icon ticker remains. Enhanced chapter tabs remove their native fragment `href` so in-place selection does not expose a misleading URL preview. Enter and Space retain explicit keyboard activation, alongside arrow/Home/End controls. Teardown restores the original links for the native fallback.

The drawer's introduction now shows only its black chapter icon, without the contrasting cream panel or horizontal rules. Its icon ticker, reserved height, copy inset and reading transitions remain unchanged.

## Historical circular pressure and colour

The dial uses existing orange-2 and orange-3 tokens, a light orange-1 centre and orange-3 centre artwork matching the focused segment. Pressure derives its warmer depth from orange-3; it adds no black shading or new palette. The softly feathered bands follow the finger and meet the inner/outer arcs and white dividers as five rounded wedge boundaries. Two colour-free alpha masks are bundled with the deferred wheel, with no new request or per-frame pixel generation. Regenerate them with `node tools/runtime-build/build-guide-pressure.cjs`; `--check` verifies reproduction.

The one-time hint starts only when at least 55% of the dial is visible and stops on interaction. It leaves chapter content and pagination unchanged. Reduced motion follows the shared policy; staging's design-review configuration may force full motion.

## Related CMS cleanup

The Treatments template uses the shared awards module with three native Featured Award references per treatment. The approved migration replaced three unused award-topic text fields and preserved draft records. There is one guide and one relevant trio per published treatment, with no runtime content substitution.

## Verification

Native-layout preview checks at 1440, 768, 390 and 320px preserve card height before and after enhancement and across all five chapters, with no horizontal overflow. Tests cover native artwork preservation, transient-pressure teardown, annulus-only gestures, spring frames, reduced motion, twelve-o'clock crossing, chapter synchronisation and focus return. Published staging checks must confirm the actual Webflow output as well as these isolated checks. Physical iPhone Safari remains a separate validation; asset sizes are not a measurement of TBT or whole-page CLS.

## Release and rollback

Source, readable/minified modules, CSS and generated metadata ship together. All four install references use one immutable commit. Publish only the Webflow staging subdomain. Private evidence retains the exact pre-change component and site custom-code snapshots; never commit those CMS exports or full HTML backups. A rollback of this migration needs both the matching native component and runtime, not only the old script pin. Production publication is outside this pass.

## Arched card design review — 8 November 2026

On tablet and phone the native charcoal card uses the exact outer crown curve from the navigation's `6838407c2087a6de2a8b1068_the-dental-barns-blackbrook-lichfield-barn-door-icon-dark.svg.svg` asset. The source wall bounds are x=8–150, with the peak at y=0.444 and shoulders at y=32. A native decorative SVG cap retains these cubic control points in viewBox `8 0.444 142 31.556`, scaled uniformly to a height of `100vw * 31.556 / 142`. A separate native charcoal body begins half a pixel above its bottom to avoid a seam. Both layers use the shared neutral-darker token, are hidden from assistive technology, ignore pointer events and sit behind content in an isolated stacking context. This flatter crown produces wider charcoal shoulders around the unchanged circular wheel.

The full-width card remains `100vw` with `calc(50% - 50vw)` side margins and no border. Padding `100vw / 22` reserves 5% of the wheel diameter on each side and vertically above its peak. The card's bottom padding matches the existing section spacing: 6rem on tablet, 4rem on landscape phone and 8rem on portrait phone. Matching negative bottom margins cover the outer section padding so the section finishes in charcoal. Designer owns the native paint layers and `treatment-guide_layout` breakpoint styles; no runtime layout override is required. Desktop retains the two-column layout, with both arch paint layers hidden. The five native choices show 01–05 while their hidden chapter headings preserve accessible labels.

The former visible centre count is now a 64%-size artwork ticker using the detailed diamond, thumbprint, lotus, question mark and barn-window assets from the drawer. Designer owns its slot, dimensions and initial diamond. The deferred guide CSS owns the five dynamic artwork mappings so Webflow cannot omit styles for the four icons absent from initial HTML. `data-tdb-guide-centre-icon` opts into the artwork renderer; the previous numeric markup remains supported for older published pages. The shared ticker owns directional movement and interruption handling; card teardown restores the native centre artwork. The position and chapter title remain available through the pagination aria-label and wheel slider semantics.

Publish this review to staging only. Rollback requires both the prior component styling/markup and prior immutable runtime reference, as with the original migration.


### Native fade conflict and complete artwork — 8 November 2026

The native TabsWrapper still exported 400ms incoming and 200ms outgoing fades. During advancement the custom renderer exposed the incoming pane immediately, then Webflow reset that pane to zero opacity at roughly 200ms; the outgoing title also regained panel opacity when the native fade completed. Webflow ignores the custom duration attributes when exporting its built-in TabsWrapper settings. The wheel adapter therefore sets both duration attributes to zero and sets only this wrapper’s cached `.w-tabs` configuration to immediate mode while enhanced; it restores the original values on teardown. The zero attributes also keep a later native redraw from restoring the conflicting fade. Native tabs retain selection/fallback semantics while the shared chapter animations own motion. Do not suppress chapter/title/ticker animation to mask this conflict.

The four dynamically selected centre classes were omitted from published Webflow CSS. Their shared asset mappings now ship in the proximity-loaded guide CSS, using `data-guide-artwork` selectors. The native centre slot uses orange-3 at full opacity to match the focused segment exactly. Verify actual computed masks, colours and loaded SVGs for every chapter, not only the data attributes or first diamond.

### Question mark and home-logo window — 8 November 2026

Chapter four now uses `tdb-question-large-1px.svg`, a fine-line question mark on the same 192-unit canvas with non-scaling strokes as the large lotus. Chapter five uses `tdb-barn-window-hero-logo.svg`: the exact second path from the home hero's `6acf67dcf7d349005ac6277f_the-dental-barns-logo-white.svg`, cropped to the window and retaining its original six-unit stroke. Its monochrome mask inherits the guide's colours. The source SVG files are retained in `assets/treatment-guide/`; shared published copies live in Webflow Assets > Icons > Review Icons.

The centre ticker, native Learn more icons and drawer all use these same two assets. The legacy `quotation` chapter key remains for compatibility; only its artwork changes. The card's navigation-logo crown geometry is independent of the home-logo window and remains unchanged.

### Flat background through the wheel centre — 8 November 2026

The subsequent design revision replaces the tablet/phone crown with a straight charcoal edge through the exact vertical centre of the wheel. Designer hides `treatment-guide_arch-cap` at the medium breakpoint and sets `treatment-guide_arch-body` to `top: 50vw`. The card is one viewport wide; its top padding is `100vw / 22` and the wheel diameter is `10 * 100vw / 11`, so the centre is exactly `50vw` from the card top. The upper half of the wheel sits on the surrounding cream background and the lower half overlaps the charcoal rectangle.

The 5% side padding, full-width charcoal body, existing bottom spacing, chapter artwork and interactions remain unchanged. Desktop retains its two-column card. These are native Designer styles only; the runtime remains pinned to `c712b3ecf540ee4e56b583111e00ba743b03ccde`. The previous crown remains hidden for reversible design review. Staging validation measures the background edge against the wheel centre across portrait, landscape and tablet widths, including no horizontal overflow and preserved section-bottom spacing.

### Inset rim, outlined question and scroll trial — 8 November 2026

Designer now owns a decorative `treatment-guide_rim` inside the dial artwork, with pointer events disabled and a 50% radius. The border is exactly `5vw` on phone/tablet, drawn inward without changing the wheel diameter or its side padding. Its warm taupe `#a79b86` already appears on the partner-logo focus outline (`tdb-partner-logo`); the mockup's new colour was not introduced. Desktop uses `1.65rem` to retain the same proportion on its 30rem wheel without covering chapter labels. The question mark now uses the shared `tdb-question-outlined.svg` asset, with a closed contour and outlined dot, throughout the centre, CTA and drawer.

The native component's `data-tdb-guide-scroll` attribute opts into the staging scroll trial. `src/treatment-guide/scroll.js`, bundled with the proximity-loaded wheel, temporarily wraps the authored layout in a scroll track and pins the wheel's top at 5 CSS pixels. Five equal travel intervals advance chapters 01–05; scrolling beyond the fifth releases the card. Scrolling back reverses the sequence. The page keeps native wheel/touch scrolling, so there is no document overflow lock or cancelled vertical gesture. On touch screens, whole-sector taps still work while vertical swipes over the wheel scroll the page. Mouse dragging and existing controls remain available. Manual chapter choices synchronise the current scroll interval without moving the pinned card.

The shared site-chrome owner hides menus while pinned and releases on exit, pagehide or teardown. The existing floating-announcement hiding rule also follows the pinned state, including a banner that finishes loading after entry. Learn more drawers retain their independent scroll/chrome owners. Escape skips to the end of the track. Pinning is disabled when the wheel and chapter controls do not fit the visible viewport, when the viewport is zoomed, or when reduced motion is requested. A short landscape phone therefore retains the ordinary guide. Resizing or disabling enhancement removes consumed scroll travel while preserving the reading position; restoring a page below the card does not insert travel above the reader.

Validation covers all five chapters and reverse/release behaviour, native and Lenis scroll owners, manual choices, modal coexistence, lifecycle cleanup, rotation and reduced-motion fallback. Browser checks must verify the 5px wheel position, actual menu/banner visibility, touch gestures and all native rim/artwork styles on the published staging page. Physical iPhone Safari remains a separate device check.

### Drawer icon panel — 8 November 2026

The drawer's cream panel now contains only the chapter icon, centred in a 5rem slot. The short blurb and flanking rules are removed from the drawer template, along with the unused summary lookup, text-fade timer and copy styles. The panel retains its existing height and reading-transition behaviour. Chapter headings, full CMS body content, icon ticker, navigation and the summaries on the page card retain their existing roles.

### Continuous scroll-progress rim — 8 November 2026

The outer rim now follows the service parallax's 5px progress treatment: a translucent track and a stronger moving fill. The service slider uses a white track at about 19% opacity and its cream menu-glass fill at 75%; the wheel adapts those opacities to its existing taupe `#a79b86` so progress stays legible against the cream dial. This replaces the previous 5vw band on every breakpoint. Designer owns the unchanged wheel dimensions and a 5px inset rim; the optional scroll controller adds only a small decorative SVG fill.

The arc starts at twelve o'clock and fills clockwise according to actual scroll distance divided by the complete five-chapter travel. It reaches 100% exactly at release, stays full below the guide, and unwinds when scrolling back. It does not reset at chapter boundaries. Manual chapter choices use the same scroll position, so their progress remains consistent. The existing scroll-frame callback paints a normalised SVG stroke without an extra animation loop or a lagging CSS transition. Resize updates the radius, keeping the stroke 5 CSS pixels and entirely inside the wheel. Short-screen/reduced-motion fallbacks show the ordinary thin rim; teardown removes only the optional progress paint.

### Viewport gap and direct scroll paint — 8 November 2026

The pinned wheel now sits `5vw` below the viewport top, replacing the initial 5px trial offset. This same gap determines entry, release geometry and the visible-height fit check. A resize preserves the fraction travelled even when the per-chapter distance has reached its cap and only the top gap changes.

The ring samples rendered scroll distance directly in native scroll events and the existing Lenis owner's scroll event, so Lenis-driven updates do not wait for a later browser event or another animation frame. It adds no easing, timer, input multiplier or independent inertia. Each pixel of travel contributes the same fraction of the full five-chapter runway; velocity, pauses and reversals therefore follow the page's scrolling. Chapter selection and release use those same bounds in the existing scheduled update. Teardown removes the Lenis subscription. Validation includes slow increments, large jumps, reversal, exact release and changes to the viewport width.

### Finger override and exit image — 8 November 2026

The annulus again accepts touch rotation while the guide is pinned. Each 72 degrees of rotation advances one chapter's scroll distance; reversing unwinds that same distance. The scroll controller retains fractional travel between pointer samples to avoid accumulating browser pixel rounding. Selection, fill and section release share the actual scroll position. Rotation stops at the first/final bounds, so passing the fifth chapter completes the ring and releases the section rather than wrapping to chapter one. Lifting or cancelling the pointer adds no page momentum or chapter snap. Outside the pinned range, the original wheel interaction remains. The centre and the rest of the card keep native vertical scrolling.

A delayed-loading reproduction exposed an empty quote background immediately after the guide: the next image was still incomplete when it entered the viewport. The consent-released guide loader now starts only the adjacent page-break image before preparing guide dependencies. It uses the existing responsive image element and leaves unrelated images lazy. The same delayed-response browser check now completes the image before entry; frame-coverage checks also confirm that its parallax keeps moving after the guide releases. Teardown restores the native loading attribute. This addresses the reproduced loading gap; it does not establish physical Safari compositor behaviour.

Designer reduces the shared centre icon slot from 64% to 54% of the centre disc (about 16% smaller), consistently across all five icons. The disc, artwork colours and CTA/drawer sizes remain unchanged.

### Menu clearance follows wheel visibility — 8 November 2026

The guide's menu ownership now starts as soon as the wheel enters the viewport, before pinning. It continues after scroll release until the whole wheel has left the screen, including reverse travel and the unpinned short-screen fallback. Pinning and menu ownership have separate lifetimes: releasing the scroll section no longer brings the booking banner back over a still-visible wheel.

While the wheel is visible, a scoped visibility/pointer guard clears navigation, its children/background, announcements and the VIP bar immediately. This prevents their normal transition delay, a fast jump into the guide, or a late-mounted booking banner from creating an overlap. The shared chrome controller retains transform and return-animation ownership; no global menu timing is changed. Pagehide, visibility changes and teardown release only the guide's owner, preserving any open drawer's ownership. Browser checks cover approach, direct arrival, release with the wheel still visible, complete exit, reverse entry and late banner insertion.

### Segment endpoints, touch surface and scroll-tail paint — 8 November 2026

The progress arc starts at the leading divider of chapter 01 (36 degrees before twelve), so each fifth of travel finishes at an actual segment boundary. Manual selection animates the existing page-scroll owner to the selected chapter's endpoint over the shared motion profile's equivalent of 480ms. The selected destination remains stable during this animation. Native scroll/rotation continues to paint the ring directly without easing; wheel, touch, pointer and scroll-key input interrupt a manual animation. A completed endpoint belongs to the chapter just finished, with one CSS pixel allowed for WebKit's integer scroll rounding at release. Arrows and rotation can reverse from that completed endpoint.

An enhancement-only, transparent HTML surface receives annulus gestures instead of relying on SVG hit testing in Safari. Scoped non-passive touch listeners reserve only an active one-finger wheel drag; the centre and surrounding card retain native page scrolling. Pointer down preserves the current progress, circular movement scrubs from that position, and an unmoved tap selects a chapter's endpoint. The loader also retains the first touch while dependencies download, including pointer type and latest coordinates. Teardown removes the hit surface and listeners.

On full-width tablet/phone layouts, a transient neutral-darker tail fills the remaining scroll runway below the currently rendered sticky card. Its top follows cached card height plus consumed travel; it never paints behind the wheel's cream upper half. This prevents the shrinking cream strip before the adjacent review image. The tail disappears with enhancement and does not alter native card or section spacing.

Validation includes endpoint animation and cancellation, completion/reverse, first-touch replay, scoped touch prevention, tail geometry, Chromium circular touch input and centre scrolling, plus WebKit rendered layout and touch taps. These engine checks do not replace a physical iPhone drag check.

### Stationary chapter hold — 8 November 2026

The guide no longer adds a scroll track or translates chapter progress into page movement. Its document height and the position of the following parallax section remain native and constant. On reaching the wheel's 5vw alignment point, the existing shared scroll-lock owner holds the viewport at that single position. Only entry can align the page once. Chapter advancement and release make no scroll calls, change no section heights, and add no body positioning.

The thin rim is now independent progress paint and remains available before the hold starts, after release, and on short-screen/reduced-motion fallbacks. Arrows and chapter taps animate to the selected segment's endpoint. While held, vertical wheel/touch/scroll-key input updates a local fraction using the same distance per chapter; annulus rotation uses the same fraction at 72 degrees per chapter. These inputs interrupt arrow animation. Completing the ring releases the shared lock at the unchanged page position. Reverse input can unwind it, while Escape, external focus/navigation, resize, lifecycle changes and teardown release this owner without compensation scrolls. Drawer locks remain independently owned.

The guide bundle includes the existing idempotent shared scroll lock so the hold does not depend on opening a drawer first. The old sticky wrapper, synthetic runway, scroll-linked ring, and temporary charcoal tail are removed. The following review image retains its existing preload and parallax owner.

Validation covers unchanged native document geometry; progress before pinning; a constant scroll position through arrows, wheel input and rotation; endpoint release; drawer coexistence; and short-screen/lifecycle escape paths. Browser checks measure the following image's crop while held and its coverage/motion on actual scroll after release. Physical iPhone verification remains separate from Chromium/WebKit testing.

### Compact drawer icon panel — 8 November 2026

The drawer's cream icon card is now 8rem tall, reduced from 14rem. The matching native-flow spacer and stationary intro both shrink from 17rem to 11rem, retaining 1.5rem above and below the card. This brings the treatment body closer without leaving the previous empty reading space. The centred 5rem artwork keeps its size, and the original two 1px horizontal rules return on either side in the existing orange-3 colour. The rules are decorative and share the mark's `aria-hidden` container. Icon ticker and drawer reading/transition ownership are unchanged.

### Native page scrolling restored with stable geometry — 8 November 2026

This revision supersedes the stationary chapter hold. The guide again uses native page scrolling through five equal intervals and a CSS sticky card with the wheel's top at 5vw. It acquires no scroll lock and intercepts no document-level vertical gestures. The existing HTML annulus still supports circular touch rotation; the centre and card keep native scrolling. The compact drawer and its horizontal rules remain unchanged.

Native and Lenis scroll events now only schedule one animation-frame update. That update reads the track position, derives the sticky wheel position from cached dimensions, and paints the ring without extra easing. Circular pointer samples accumulate their fractional distance and produce at most one page-scroll write per frame. Arrows still animate to the selected segment's endpoint and are interruptible by real input. Before the sticky range, or in short-screen/reduced-motion fallback, arrows animate the ring without moving the page.

The charcoal runway is now a static background extending from the wheel's original centre to the track's end. The sticky card has its own cream backing above the native charcoal body. No background top or height follows the scroll position. Track styles are written only when measured values actually change. On coarse-pointer devices, height-only browser-toolbar changes preserve an already enabled range; width/orientation changes, zoom and reduced-motion changes still reconsider eligibility. This avoids removing the runway and moving the following parallax section during a swipe. Restoring a reading position below the guide still does not insert travel above the reader. The adjacent-image preload and shared parallax controller remain unchanged.

Validation: the full verification suite passed with 1,014 passes, three skips and no failures. Focused tests cover batched progress/rotation, unchanged track geometry, height-only resize stability, endpoint animation, manual fallback, lifecycle cleanup and native/Lenis ownership. Chromium circular touch and centre-scroll checks passed, alongside Chromium/WebKit layout, endpoint animation, reverse travel, touch taps, menu clearance and following-image coverage checks. A repeatable mobile-height comparison against the earlier page-scroll version reproduced its range collapse; the revised range stayed enabled with the wheel at 19.5px on a 390px viewport. The same five-gesture comparison reduced scroll-time track-style mutations from 55 to zero. These are automated engine observations, not a physical-device performance benchmark.

### Horizontal chapter strip — 8 November 2026

Designer now owns a six-rem-high strip with five equal rectangular native tab targets, numbered 01–05. Its `aspect-ratio: auto` identifies the horizontal presentation to the deferred adapter; circular markup remains hidden for a reversible design trial. The card uses one column at every breakpoint. The thin taupe progress track sits one rem below the strip, followed by the existing icon ticker in a 4.5rem slot. Native pagination spans provide equal-width one-pixel lines on either side, with the obsolete total visually suppressed and hidden from accessibility while enhanced. The mobile charcoal body begins at the card's top. Existing side/footer spacing, chapter CMS bindings and the compact drawer are preserved. The authored property changes are recorded in `config/treatment-guide-bar-designer.json`.

`bar.js` reuses the card renderer, tab semantics, motion policy and sticky scroll controller. The five intervals, 5vw pin position, endpoint animations and reverse/release behaviour are unchanged. A transform-scaled fill replaces circular SVG progress; it paints directly from the same scroll fraction. The full background remains static, including through toolbar-height changes. Manual controls also animate progress outside the sticky range, and wrapping from chapter five back to one shrinks the line from full to the first fifth.

Horizontal finger movement scrubs one chapter per fifth of the strip's width. A six-pixel directional threshold leaves vertical touch scrolling with the browser. Implicit touch capture transfers from the native tab to the guide only after a horizontal gesture is claimed; the tab's resulting lost-capture event must not end that drag. A soft gradient follows the finger or travels to the active segment, using transform and opacity without an animated blur filter or geometry writes. Motion settles after release. Pointer cancellation, deferred first gestures, keyboard navigation, tab-fade ownership and teardown are covered by focused tests. The old circular adapter remains available for matching native markup during rollback.

Browser checks cover six-rem geometry, equal segment targets, centred ticker/rules, scrolling and endpoint animations, 5→1 wrap, touch taps, horizontal drag/reversal, native vertical panning, short landscape fallback and desktop layout. Physical-device behaviour remains a separate check from Chromium/WebKit automation. Rollback requires restoring both the native property snapshot and the matching prior runtime pin.

The shared selected-tab state keeps the focused segment in orange-3, overriding Webflow's transparent current-tab background. Menu clearance includes the icon row below the strip, also in the short-screen fallback. Preview and published checks passed in Chromium at 320, 390 and 1440px, and WebKit at 390px portrait and 844px landscape; Chromium also verified image coverage and parallax movement after release.

### Edge-to-edge strip and attached progress — 8 November 2026

The strip and its five-pixel progress track now span the viewport at every breakpoint. The card has zero top padding and no border; its 5vw side padding applies to the icon row, text and controls. The progress track begins at `top: 100%` of the six-rem strip, removing the charcoal gap. Cream fills the card's upper area and its sticky top gap. The native charcoal body and the static scroll-runway background both begin below the progress line. The icon row moves up by the removed gap and retains equal horizontal rules.

Native chapter links are now static flex items in DOM order, with equal widths. The five combo classes no longer contain circular `left`/`top` coordinates. Static layout also ignores those offsets if an older rule is present, so numbers cannot fall back into an orbit or leave the strip. Scroll intervals, the 5vw sticky position, linear fill, arrows, horizontal scrubbing and the compact drawer retain their existing behaviour. Verification checks viewport-edge alignment, zero bar-to-progress gap, all five number bounds through scrolling/gestures, cream above the progress line, stale circular-rule resistance and following-parallax coverage.

### Inset strip progress and zero-offset pin — 8 November 2026

The horizontal strip now pins at `0px`, with no top padding or cream cap. Its 5px progress track sits inside the bottom edge of the numbered segments, matching the inset parallax treatment. Designer moves the existing progress container to `bottom:0`, raises its decorative art layer above the tabs, and removes the former external 5px allowance from the icon spacing and charcoal start. The layer remains transparent to pointer input, so chapter taps and scrubbing work across the strip.

The scroll controller uses the same zero gap for fit checks, arming and sticky geometry. Charcoal starts exactly at the strip bottom, including the static runway. Native scrolling, segment endpoints, arrow animation and short-screen fallback retain their existing mechanics. Circular presentation retains its previous 5vw offset for rollback.

### Centred pinned card and restored selection — 9 November 2026

The chapter selection returns to its previous orange-3/taupe tile with a charcoal numeral. The full-width numbered strip and its inset progress stay pinned at `0px`. Beneath it, the icon/rules, shared title and summary tracks, Learn more button and arrows move together to the vertical centre of the remaining viewport. The native content grid uses a 2rem row gap and 21rem minimum height, with 1.5rem above its controls, providing more separation without changing chapter text or interaction.

The optional scroll enhancement reserves at least one viewport for the card and measures the whole group, including all five intrinsic chapter rows. One shared translation centres the icon, content and arrows; child ticker/text animations retain their own transforms. Measurements subtract the previous translation to avoid resize feedback. A touch viewport's height is held constant until its width changes, keeping mobile browser-bar movement from shifting the card or following parallax. Short screens retain normal unpinned flow; teardown removes only the enhancement dimensions and translation.

The card title and blurb also use native `text-align:center` at every breakpoint. The control row retains its existing alignment.

### Service introduction layout — 9 November 2026

The card now follows the Signature Assessment introduction shown in the reference: centred title, then blurb, then icon. It keeps the same 5vw side margins, with 7rem between these items on desktop and 8rem on tablet/phone. The icon slot is 4rem, matching that reference; the existing rules and icon ticker remain. The controls follow 2rem below the icon.

Designer moves the existing icon container into the layout grid. The five native panels share four subgrid rows for title, summary, icon space and controls, so the longest chapter still reserves space for every selection. The numbered strip and inset progress remain at 0px. The scroll measurement centres the full content group regardless of the icon's order, and retains menu clearance until the icon has left the viewport.

### Bottom control area and charcoal CTA — 9 November 2026

The icon's flanking rules are hidden. Learn more and the navigation arrows share a 6rem control area at the bottom of the visible viewport during pinning, with safe-area padding inside that height. The title, blurb and icon remain centred between the top strip and that control area. Each existing native chapter still owns its CTA and drawer trigger; no duplicated fixed controls are added.

The CTA takes the treatment carousel's Discover button colours: a 30% black translucent fill with white text and a thin white outline, replacing the white fill. Its minimum tap target and icon ticker remain.

The controller translates the copy/icon group and footer separately. Changes in mobile browser-bar height update these visual positions while preserving the established scroll-track height, progress range and following parallax geometry. Short screens retain normal document flow.

### Shared card text motion — 9 November 2026

The card blurb uses `TDBMotion.fadeController()` with the shared `fadeOut`, `entryDelay` and `fadeIn` values. An interrupted outgoing fade continues from its painted opacity; changing chapters cancels any pending reveal. Heading travel takes its duration and easing directly from `TDBMotion`, and the icons retain the shared native ticker. The card defines no independent text timing values. Reduced motion settles immediately, and teardown cancels pending reveals and restores native opacity.

### Stable viewport and restored bottom padding — 9 November 2026

The 6rem controls row now sits above the layout's existing responsive bottom padding. The controller reads that Designer padding rather than consuming it when positioning the controls. Short screens keep the same padding in normal flow.

On touch devices, a `100svh` measurement establishes the card height for the current width/orientation. Both the copy/icon group and controls retain that height when browser bars expand or collapse; `visualViewport.height` no longer moves them. Width changes remeasure the layout, and devices without small-viewport units retain the initial measured visible height. The scroll runway and following parallax retain their established geometry during toolbar changes.

### Native centred stage, carousel copy timing and chrome — 9 November 2026

Designer now owns a seven-row grid: 6rem numbered strip, flexible space, title, blurb, 4rem icon, equal flexible space, and 6rem controls. The title/blurb/icon group is therefore centred in the stable viewport, and controls occupy its bottom 6rem. The existing section padding follows the footer outside that viewport. All five CMS panels share those rows, so changing chapters cannot change the stage height. The controller supplies only the stable stage height and scroll runway; it no longer calculates or applies separate body/footer translations.

The guide blurb matches Services/Treatments copy choreography: fade out over 150ms on movement, wait for heading travel to settle plus the shared next/previous delay, then fade in over 400ms with `ease-in`. These values are exposed by `TDBMotion.carousel`, scaled by the existing content/fade families. The shared fade controller accepts a phase-specific easing while retaining its existing default for other consumers.

The guide-specific forced `visibility:hidden` rule is removed. `TDBSiteChrome` now visibly animates the nav and banners away and back with the same shared navigation clock used by other components. While owned, it also parks late-mounted banners and remeasures initially empty announcement shells when they gain height; otherwise an invisible shell can intercept taps on the numbered strip. Its DOM/size observers stop after the final owner releases, and late bars share the normal animated return. The CTA barn uses the existing small 1px barn icon; the centre and drawer retain the detailed hero window.

### Uniform marquee strip and synchronised progress — 9 November 2026

The six-rem strip now uses the awards marquee's orange-2 background throughout. Native chapter links have the same background and no dividers; only their charcoal numbers fade between 28% and 100% opacity. The horizontal pressure gradient is removed. Designer positions the five-pixel progress track at the top of the strip, without changing the pinned stage, content or footer geometry.

For arrows and chapter selection, the card returns its incoming heading animation to the scroll controller. Progress samples that animation's eased phase directly, so duration, easing and completion match the slide on both mobile and desktop. Native scroll and finger scrubbing still paint from scroll position without smoothing. When no heading transition exists, manual progress uses the shared horizontal duration. Interruption, reverse travel, five-to-one wrap, offscreen progress and reduced-motion settlement retain their existing paths.

Validation includes the full runtime suite, Chromium and WebKit layout/touch checks, and frame-by-frame comparisons of forward, backward and wrap progress against the heading animation. The native strip colour is checked against the published marquee colour.
