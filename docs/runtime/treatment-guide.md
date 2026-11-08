# Native treatment guide

The Treatments template has one reusable `Treatment Guide — wheel` component. The retired five-item guide has been removed. The component preserves the approved charcoal card, cream dial, five chapter icons and rounded finger-pressure effect.

## Ownership

Designer owns the section spacing, responsive card grid, native SVG dial, chapter icon masks, centre chapter artwork, five bound chapter panes, Learn more controls and shared carousel arrows. The desktop card has two columns; tablet and phone have one. The five panes overlap in native grid tracks and all contribute their intrinsic title and summary height. Hidden panes use visibility, not display removal. This reserves space before enhancement and across chapter changes. Native title frames clip horizontal text travel. No runtime height measurement or replacement card is required.

The treatment name, introduction, chapter titles and full bodies retain their CMS bindings. Short chapter summaries are shared component properties. Native Webflow tabs and closed details remain usable if the optional modules cannot load. The first chapter is visible in Designer. Each native Learn more control opens its own chapter. The drawer returns focus to the newly active native control.

`src/runtime/treatment-guide-loader.js` retains presence, consent, proximity and intent gates. It prepares the small wheel near the section and resumes a first drag while preparation finishes. Drawer dependencies wait for Learn more intent. No guide assets are requested on pages without the component.

`src/treatment-guide/wheel.js` enhances the authored dial with pointer and keyboard selection, momentum, spring release and the one-time entrance hint. `card.js` updates the existing panes, accessible chapter position, centre artwork and small CTA artwork tickers. `pressure.js` inserts only transient pressure paint and removes it on teardown; the native dial and controls remain intact. Work settles after release and pauses offscreen or when the document is hidden.

`src/styles/tdb-treatment-guide-states.css` supplies early selected-tab and fallback state rules through the shared UI build. The deferred `tdb-treatment-guide.css` contains pressure/ticker paint and established drawer-specific internals. Its former card-layout override has been removed. The shared drawer, motion policy, ticker, reading state and carousel dependencies remain shared external modules.

## Pressure and colour

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
