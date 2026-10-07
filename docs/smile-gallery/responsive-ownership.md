# Smile Gallery ownership — 7 October 2026

Webflow owns layout and initial states. Shared Swiper, Motion and NativeTicker own animation; Gallery controllers supply case data and interactions. The approved design and detail reveal are preserved through native CSS states and the Gallery state controller.

## CSS ownership

| Responsibility | GitHub source | Webflow location |
| --- | --- | --- |
| Compact card and phone-landscape image presentation | `src/styles/tdb-smile-carousel-responsive.css` | `Slider - Smile Gallery` component, HTML embed `a1f39b66-48de-b63e-a819-12e77ed2eb5a` |
| Home landscape wrapper and narrow portrait tablet spacing | `src/styles/tdb-home-smile-responsive.css` | Home page, hidden embed `f4b74eb4-a3fb-cf3f-493f-0648b8626b97`, named “Smile Gallery — Home responsive CSS” |
| Normal layout, dimensions, icons, counts and states | Native Webflow classes and component variants | Designer style panel |
| Full Gallery page interaction states | `src/styles/tdb-smile-gallery-ui.css` | Existing external stylesheet; separate from carousel CSS |

The two responsive CSS files are maintained copies of the Webflow embeds. They are NOT additionally linked as external stylesheets. Wrap each file in its existing style element when synchronising to Webflow. Read the current embed first, preserve concurrent work, then update the GitHub file and embed together. The Home embed has native `hide` styling so it does not add a grid item or gap; its CSS still applies in Designer and on the published page.

## Approved responsive behaviour

- Card container at or below 340px: hide treatment list and dividers; stack price, duration and clinician with icon. Preserve the 9rem footer and controls.
- Phone landscape: viewport 480–991px wide, at most 500px high, landscape orientation. Full-width host with peeking neighbours; two CMS-bound image halves side by side, each 2:1, combined image row 25cqw. Header and footer remain 8rem and 9rem.
- Home narrow portrait tablet: 768–800px wide. Retain 50vh card width, align left and expose neighbours; 8rem section padding and row gap.
- Explore stays left aligned through native classes. Its count has a native 3ch slot and the shared vertical ticker. Summary text remains hidden initially and is revealed by existing JS.

The landscape three-column fact rule is deliberately retained: it overrides the compact card rule when conditions overlap. Do not delete it merely because the normal native grid also has three columns.

## Explore count build

`src/sliders/gallery-count.js` builds to `dist/tdb-gallery-count.js` through `node tools/build-shared-runtime.mjs`; `--check` verifies generated artifacts. Home's footer loads this file using `data-tdb-gallery-count-runtime`. The script uses the existing dependency registry for Motion and NativeTicker, and waits for both count readiness and button visibility. Do not duplicate this loader or restore the old count handler in `gallery-presentation.js`.

Count v1.1.0 reads native CMS markers already rendered into Home. The hidden Collection List `0f8c8d05-fbb9-03ab-6b55-b2ca1ae8e4be` (label “Smile Gallery — CMS total (no images)”) uses collection `69a07fdcd392dc2c0d92967f`, filter `before-and-after-picture isSet`, offset 0, limit 100 and no pagination: the same selection as the full Gallery. Each empty item carries `data-tdb-gallery-count-item`; the wrapper carries `data-tdb-gallery-count-source`, native `hide`, `hidden` and `aria-hidden`. No images, clinical text or extra page request are needed.

The native button starts at 34 in its existing 3ch slot. If the CMS count is still 34, leave it alone and request no count-specific ticker dependencies. Otherwise the shared ticker transitions directly to the current count once visible and ready (including decreases, singular and zero); a failed motion dependency reveals the accurate number without animation. Missing source markup preserves the holding value. Counts follow the published page snapshot; publishing CMS/page changes updates them. Both Gallery lists currently cap at 100 cases: increase/rework their data strategy together before exceeding this, never change only one query.

## Cleanup and verification

The preceding cleanup removed hidden sizer cloning, the three Designer sizer placeholders and their class, unused treatment-line variables, and the old Explore handler/label hook. Card and footer heights are now literal native expressions.

This pass separates Home-only CSS, removes redundant landscape flex-direction/alignment, crop-height and button-justification declarations, and incorporates the count source/artifact into the shared build. It does not change thresholds or consolidate unrelated site release branches.

Gallery tests: `tests/gallery-presentation.test.cjs`, `tests/gallery-page.test.cjs`, `tests/gallery-shared-behaviour.test.cjs`, `tests/shared-modules.test.cjs` (requires jsdom). Check embed readback against these CSS files and staging markup after publishing. Source/build checks do not substitute for a visual device review.

Use the current deployed shared release as a base for future runtime changes. Other chats are changing shared motion and Swiper; never repin them to an older Gallery branch. `verification.md` is the historical 6 October migration record, not the current release manifest.

## Card reveal migration

Native Designer owns `.smile-card.tdb-smile-details` closed state (height 0, opacity 0, translateY 20px) and its `is-open` combo (auto height, opacity 1, translateY 0). The overlay has native transparent and `is-open` black 70% states. Opening keeps the existing 300ms fade / 400ms outQuart movement; closing keeps the 200ms timing and immediate height collapse. `src/shared/reveal-motion.css` is copied inline into site head as `data-tdb-reveal-motion`; no additional stylesheet request. Native values include identical fallbacks so Designer previews remain accurate without site head code. Accordions and navigation retain their current engines.

`src/sliders/gallery-presentation.js` only toggles classes and accessibility state for active-card hover, desktop footer suppression, touch taps, keyboard activation/Escape, outside presses and slide changes. Drag gestures do not open details. Logical slide identity synchronises loop copies. Smile no longer uses the generic IX2 duplicate style observer/event forwarder; other highlight carousels retain it. The initial summary reveal, shared tickers, CMS bindings, sorting and responsive layout are unchanged.

The user removed IX2 definitions **a-87 / DD Slider Hover In 2**, **a-88 / DD Slider Hover Out 2** and e-619/e-620. Their absence was verified in the published IX2 configuration on 7 October. The redundant `data-tdb-dd-legacy` attributes have now been removed from card `...4656b3` and details `...4656bb`. The shared DD migration bridge remains for other sections. Superseded native `is-suppressed` combos were removed.

Nine regression checks cover the full Gallery, shared registry/ticker, hover, footer suppression, tap versus swipe, keyboard, loop copies, navigation and teardown/remount. Browser verification must additionally check that the published reveal elements have no IX2 inline styles and retain the native animation timings.
