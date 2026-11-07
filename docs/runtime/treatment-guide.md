# Native treatment guide

The Treatments template has one reusable `Treatment Guide — wheel` component. The retired five-item guide has been removed. The component preserves the approved charcoal card, cream dial, five chapter icons and rounded finger-pressure effect.

## Ownership

Designer owns the section spacing, responsive card grid, native SVG dial, chapter icon masks, centre pagination, five bound chapter panes, Learn more controls and shared carousel arrows. The desktop card has two columns; tablet and phone have one. The five panes overlap in native grid tracks and all contribute their intrinsic title and summary height. Hidden panes use visibility, not display removal. This reserves space before enhancement and across chapter changes. Native title frames clip horizontal text travel. No runtime height measurement or replacement card is required.

The treatment name, introduction, chapter titles and full bodies retain their CMS bindings. Each treatment's five short summaries come from a linked Treatment Guide Summaries CMS entry through the component's summary properties. They render in native Webflow HTML before JavaScript runs. Native Webflow tabs and closed details remain usable if the optional modules cannot load. The first chapter is visible in Designer. Each native Learn more control opens its own chapter. The drawer returns focus to the newly active native control.

`src/runtime/treatment-guide-loader.js` retains presence, consent, proximity and intent gates. It prepares the small wheel near the section and resumes a first drag while preparation finishes. Drawer dependencies wait for Learn more intent. No guide assets are requested on pages without the component.

`src/treatment-guide/wheel.js` enhances the authored dial with pointer and keyboard selection, momentum, spring release and the one-time entrance hint. `card.js` updates the existing panes, pagination and small artwork tickers. `pressure.js` inserts only transient pressure paint and removes it on teardown; the native dial and controls remain intact. Work settles after release and pauses offscreen or when the document is hidden.

`src/styles/tdb-treatment-guide-states.css` supplies early selected-tab and fallback state rules through the shared UI build. The deferred `tdb-treatment-guide.css` contains pressure/ticker paint and established drawer-specific internals. Its former card-layout override has been removed. The shared drawer, motion policy, ticker, reading state and carousel dependencies remain shared external modules.

## Pressure and colour

The dial uses existing orange-2 and orange-3 tokens, a light orange-1 centre and charcoal artwork. Pressure derives its warmer depth from orange-3; it adds no black shading or new palette. The softly feathered bands follow the finger and meet the inner/outer arcs and white dividers as five rounded wedge boundaries. Two colour-free alpha masks are bundled with the deferred wheel, with no new request or per-frame pixel generation. Regenerate them with `node tools/runtime-build/build-guide-pressure.cjs`; `--check` verifies reproduction.

The one-time hint starts only when at least 55% of the dial is visible and stops on interaction. It leaves chapter content and pagination unchanged. Reduced motion follows the shared policy; staging's design-review configuration may force full motion.

## Related CMS cleanup

The Treatments template uses the shared awards module with three native Featured Award references per treatment. The approved migration replaced three unused award-topic text fields and preserved draft records. There is one guide and one relevant trio per published treatment, with no runtime content substitution.

## Treatment-specific summaries

The six published treatments have five distinct summaries each: Technology, Process, Aftercare, Questions and Practice. Each gives a useful detail from the existing full CMS chapter, followed where appropriate by an invitation to read further. Keep them concise, varied and factual; do not replace the full chapters or add unsubstantiated treatment claims.

Treatments was at 59 fields. The single `treatment-guide-summaries` Reference uses its final available field and links to the Treatment Guide Summaries collection (`6aef7da258cb9e56916c25ad`). Its five PlainText fields are `technology-summary`, `process-summary`, `aftercare-summary`, `questions-summary` and `practice-summary`. Edit the linked entry to change the short wheel copy. The two incomplete draft Treatments records remain drafts and have no new summary entry.

The wheel instance on the Treatments template binds each `Guide N — summary` property through the reference field. For MCP updates, `set_component_instance_prop_values.values[]` uses `type: "bindable"`, `binding_source_type: "cms"`, `binding_collection_id` and `binding_field_id`. The referenced field ID is `<reference-field-id>:::<summary-field-id>` as returned by `get_bindable_sources`. No loader fetch, route-based copy map or runtime text substitution is involved. The installed runtime remains unchanged.

CMS summaries published to the Webflow subdomain only on 7 November 2026, task `e59719a4-4301-4aa1-be4d-b29917933bde`. All 30 summaries match the returned staging HTML. All six treatment pages pass at 1440, 390 and 320px: no text/button overlap or horizontal overflow, 0px card-height change across deliberately delayed enhancement and all five panels, no measured wheel-related layout shifts and no page errors in the completed checks. One initial mobile check timed out waiting for the consent-gated loader; that case passed on a fresh run with an explicit wait for the consent control. Private before/after CMS snapshots, binding IDs and screenshots are in the workspace's `wheel-copy-20261107` folder; do not commit those exports.

## Verification

Native-layout preview and actual published staging checks at 1440, 768, 390 and 320px preserve card height before and after deliberately delayed enhancement and across all five chapters: maximum measured height change 0px, no wheel-related Layout Shift entries and no horizontal overflow. The shared drawer opens the selected chapter, closes hidden and inert, releases scrolling and restores focus to the native control. Disabled JavaScript and a deliberately failed drawer request both retain the native chapter disclosure. First-drag recovery and pressure rendering were exercised at desktop and mobile viewport widths. These are component checks, not a claim of zero whole-page CLS or a physical iPhone Safari result.

All six published Treatment CMS pages contain one native guide, five native chapters and their three verified Featured Award references. The two draft records remain drafts. A fresh Signature Assessment load at 1440 and 390px requested no treatment-guide, calculator or retired service-content scripts, with no page errors or horizontal overflow.

The eight Services pages and two sampled Treatment pages have no matching active IX2 event targets, no retired service-content tag, no direct calculator-loader tag and no placeholder copy. They use the shared JSON review feed. Webflow still emits its historical IX2-bearing bundle and Services retains six unused Vimeo markers; this pass does not claim all IX2 bytes or old configuration are removed. Treatments also retains its previously installed secondary-layout migration stylesheet, outside this wheel migration.

The required build and custom Swiper artifact check pass. Full suite: 991 tests, 988 passing, three skipped, zero failures. The equivalent Windows-safe formatting command reports only the existing unrelated `src/smile-gallery/feed.js` warning. All 74 declared active release assets were verified byte-for-byte on jsDelivr. Private screenshots, network recordings, native snapshots and checks are under the workspace's `wheel-designer-20261107` evidence folder.

Staging runtime: `609b7c312a861ce3f590f3b6c47cea18cf0cb411`. Webflow subdomain-only publish task: `4b6e5f5a-8325-498b-b3df-4d7c622a8907`. No production custom domain was published.

## Release and rollback

Source, readable/minified modules, CSS and generated metadata ship together. All four install references use one immutable commit. Publish only the Webflow staging subdomain. Private evidence retains the exact pre-change component and site custom-code snapshots; never commit those CMS exports or full HTML backups. A rollback of this migration needs both the matching native component and runtime, not only the old script pin. Production publication is outside this pass.
