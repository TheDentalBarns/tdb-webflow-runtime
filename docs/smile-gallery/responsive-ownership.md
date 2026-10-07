# Smile Gallery ownership — 7 October 2026

Webflow owns layout and initial states. Shared Swiper, Motion and NativeTicker own animation; Gallery controllers supply case data and interactions. This housekeeping preserves the approved design and remaining IX2 detail behaviour.

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

The controller is unchanged in this housekeeping release. It currently fetches `/smile-gallery` HTML to count published cases; failed requests leave a usable link and an empty reserved number slot. Data-fetch optimisation and lifecycle improvements remain separate work.

## Cleanup and verification

The preceding cleanup removed hidden sizer cloning, the three Designer sizer placeholders and their class, unused treatment-line variables, and the old Explore handler/label hook. Card and footer heights are now literal native expressions.

This pass separates Home-only CSS, removes redundant landscape flex-direction/alignment, crop-height and button-justification declarations, and incorporates the count source/artifact into the shared build. It does not migrate IX2, change thresholds or consolidate unrelated site release branches.

Gallery tests: `tests/gallery-presentation.test.cjs`, `tests/gallery-page.test.cjs`, `tests/gallery-shared-behaviour.test.cjs`, `tests/shared-modules.test.cjs` (requires jsdom). Check embed readback against these CSS files and staging markup after publishing. Source/build checks do not substitute for a visual device review.

Use the current deployed shared release as a base for future runtime changes. Other chats are changing shared motion and Swiper; never repin them to an older Gallery branch. `verification.md` is the historical 6 October migration record, not the current release manifest.
