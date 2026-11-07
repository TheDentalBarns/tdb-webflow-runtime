# Native treatment guide

The Treatments template has one reusable `Treatment Guide — wheel` component. The retired five-item guide has been removed. The component preserves the approved charcoal card, cream dial, five chapter icons and rounded finger-pressure effect.

## Ownership

Designer owns the section spacing, responsive card grid, native SVG dial, chapter icon masks, centre pagination, five bound chapter panes, Learn more controls and shared carousel arrows. The desktop card has two columns; tablet and phone have one. The five panes overlap in native grid tracks and all contribute their intrinsic title and summary height. Hidden panes use visibility, not display removal. This reserves space before enhancement and across chapter changes. Native title frames clip horizontal text travel. No runtime height measurement or replacement card is required.

The treatment name, introduction, chapter titles and full bodies retain their CMS bindings. Short chapter summaries are shared component properties. Native Webflow tabs and closed details remain usable if the optional modules cannot load. The first chapter is visible in Designer. Each native Learn more control opens its own chapter. The drawer returns focus to the newly active native control.

`src/runtime/treatment-guide-loader.js` retains presence, consent, proximity and intent gates. It prepares the small wheel near the section and resumes a first drag while preparation finishes. Drawer dependencies wait for Learn more intent. No guide assets are requested on pages without the component.

`src/treatment-guide/wheel.js` enhances the authored dial with pointer and keyboard selection, momentum, spring release and the one-time entrance hint. `card.js` updates the existing panes, pagination and small artwork tickers. `pressure.js` inserts only transient pressure paint and removes it on teardown; the native dial and controls remain intact. Work settles after release and pauses offscreen or when the document is hidden.

`src/styles/tdb-treatment-guide-states.css` supplies early selected-tab and fallback state rules through the shared UI build. The deferred `tdb-treatment-guide.css` contains pressure/ticker paint and established drawer-specific internals. Its former card-layout override has been removed. The shared drawer, motion policy, ticker, reading state and carousel dependencies remain shared external modules.

## Pressure and colour

The dial uses existing orange-2 and orange-3 tokens, a light orange-1 centre and charcoal artwork. Pressure derives its warmer depth from orange-3; it adds no black shading or new palette. The softly feathered bands follow the finger and meet the inner/outer arcs and white dividers as five rounded wedge boundaries. Two colour-free alpha masks are bundled with the deferred wheel, with no new request or per-frame pixel generation. Regenerate them with `node tools/runtime-build/build-guide-pressure.cjs`; `--check` verifies reproduction.

The one-time hint starts only when at least 55% of the dial is visible and stops on interaction. It leaves chapter content and pagination unchanged. Reduced motion follows the shared policy; staging's design-review configuration may force full motion.

## Related CMS cleanup

The Treatments template uses the shared awards module with three native Featured Award references per treatment. The approved migration replaced three unused award-topic text fields and preserved draft records. There is one guide and one relevant trio per published treatment, with no runtime content substitution.

## Verification

Native-layout preview checks at 1440, 768, 390 and 320px preserve card height before and after enhancement and across all five chapters, with no horizontal overflow. Tests cover native artwork preservation, transient-pressure teardown, annulus-only gestures, spring frames, reduced motion, twelve-o'clock crossing, chapter synchronisation and focus return. Published staging checks must confirm the actual Webflow output as well as these isolated checks. Physical iPhone Safari remains a separate validation; asset sizes are not a measurement of TBT or whole-page CLS.

## Release and rollback

Source, readable/minified modules, CSS and generated metadata ship together. All four install references use one immutable commit. Publish only the Webflow staging subdomain. Private evidence retains the exact pre-change component and site custom-code snapshots; never commit those CMS exports or full HTML backups. A rollback of this migration needs both the matching native component and runtime, not only the old script pin. Production publication is outside this pass.