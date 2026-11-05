# Scoped quote spacing and Pricing treatment insets — 5 November 2026

The quote/reviewer block is centred between the visible decoration and pagination on Home, Location and Pricing only. Pricing's treatment options now have the same inner side inset as the Cosmetic and Restorative category cards, including the cards' 1px border. The checkbox, label, information button, disclosure control and expanded content share that inset; divider lines retain full width.

## Native quote ownership

The existing component definitions and shared carousel runtime are retained. Four instances opt into three new native Webflow variants; their original Base/On image variants and shared style rules are unchanged.

| Page / instance | Variant |
| --- | --- |
| Home Owner Quotes | Balanced spacing, `145fd169-3d6f-074f-534c-891ac8dc1195` |
| Location Owner Quotes | Balanced spacing, `145fd169-3d6f-074f-534c-891ac8dc1195` |
| Home Review Carousel | Balanced spacing, `0e153d65-6c6d-a729-88b7-e4b6657800e8` |
| Pricing Review Carousel | On image • balanced spacing, `97683fe5-f283-3cee-fe08-fcc693b7771c` |

The new On image variant duplicates the prior image variant, retaining the photo composition, gradient, white colour, sizing and crop. No new component definition, carousel script or spacer element was added.

The quote viewport keeps its `300px + 3rem` minimum. All slides continue to participate in the reserved height; shorter quotes therefore have larger but balanced surrounding gaps. Native opposite margins move the complete quote/reviewer block without moving the decoration or pagination, or altering the overall frame height. The calculation accounts for the decoration's existing 7rem bottom padding (3rem below 480px), the viewport's -3rem overlap, and the pagination's 44px box around a 1.5rem line.

At main breakpoint, quote-root margin-top is `calc(11px - 2.375rem)`; pagination margin-top is its inverse. Below 480px they become `calc(11px - .375rem)` and its inverse. These rules live in the native variants, not in custom runtime CSS or JS.

## Calculator ownership

`src/styles/tdb-calculator.css` owns the dynamically generated treatment rows. Its existing build emits `dist/tdb-calculator.css`. The four added lines opt in through `data-tdb-calc-option-inset="category"` on Pricing's existing main wrapper `f3a6c255-9ed7-32a9-be96-9b7f1e282565`.

Padding-inline is `calc(1.5rem + 1px)` at desktop/tablet and `calc(.75rem + 1px)` below 768px, matching the existing category-card breakpoint and padding. No JavaScript change, new script, background, border or additional wrapper is needed. Calculators outside the opt-in wrapper retain their existing row padding.

Exact native variants, instance properties and the Pricing attribute action are in the adjacent JSON audit.

## Verification and staging release

- Runtime source/build commit: `77c3eef9deb21936eb091f7d3ab20c1e9336d841`.
- Build and reproducibility passed. Full regression suite: 934 tests; 931 passed, 3 existing skips, zero failures.
- All 71 active immutable CDN assets matched local build bytes before the existing seven installation locations (ten references) advanced from `6d385310a21e18d680df878267fbd163ae447cf4`. The only runtime asset content change is calculator CSS; other release files remain byte-identical.
- Staging task `79d9409a-9bd2-486e-8a67-8ceb7b5e6b70` published at **2026-11-05T12:30:37.503Z**.
- All four production custom domains retain **2026-10-01T10:10:45.669Z**.
- Pricing desktop checkbox left edge: category and every checked treatment row both **64.265625px**. Local inset from the outer edge is **23.375px**. Open treatment controls and the information panel remain inside the same inset. No horizontal overflow.
- Pricing quote upper/lower gaps: **138.609375 / 138.59375px**, versus the previous **163.03125 / 114.171875px**. The stars and visible pagination retain their prior positions. Viewport stays **344.75px**; frame stays **466.328125px**.
- Home Owner Quotes upper/lower gaps: **138.890625 / 138.859375px**. Home patient reviews: **153.296875 / 153.265625px**. Location Owner Quotes: **124.203125 / 124.1875px**. The differing gap sizes reflect differing quote lengths, while each pair is balanced to subpixel rounding.
- Keyboard carousel advance works on Home and Location. Pricing treatment selection, expansion, information panel and deselection work.
- Published DOM has the intended four quote-instance variants. Pricing alone has the calculator inset attribute. Home/Location have zero. Raw element counts remain Home 1132, Location 1013, Pricing 4150.
- Published native CSS includes the new below-480px quote rules; calculator source/release includes the below-768px inset rule. **Mobile visual testing and physical Safari were not completed.**

Browser previews: `tdb-pricing-balanced-review-20261105.jpg` and `tdb-pricing-treatment-insets-20261105.jpg`. Measurement, responsive-rule and CDN evidence is recorded in the companion verification JSON.

## Rollback

Set Home/Location Owner Quotes and Home Review Carousel variants to `base`. Restore Pricing Review Carousel to the prior **On image** variant `adef231b-171f-72aa-ca94-1f52d7214ab4`. Remove the `data-tdb-calc-option-inset` attribute from Pricing's main wrapper. Publish staging only. The calculator CSS is inert without the attribute, so no runtime rollback is necessary; if desired, restore the previous unified runtime pin in the seven existing installation locations.

## Follow-up: treatment group panels and final-row spacing

The same Pricing opt-in now gives Cosmetic treatments and Restorative treatments darker cream heading panels, constrained to the existing calculator content width. `src/calculator/ui.js` supplies the small heading structure only when the opt-in ancestor is present. The existing heading markup is retained elsewhere. An existing `tdbc-shared-icon` mask uses the practice's `tdb-exceptional-diamond.svg` artwork before each title. The shared DD text fade remains on the inner label; the panel and icon retain full opacity. The existing calculator CSS owns colour, padding and responsive sizing. No new component, script, animation owner or external artwork is introduced.

The larger space after Extractions was the step-2 bottom padding added after the final row's existing option/disclosure padding. At the checked desktop width, the quantity control to the following divider measured 98.28125px for Extractions versus 54.53125px for the preceding onlay row (including that row's 1px divider). The Pricing opt-in removes only step-2's extra 3rem bottom padding (2.5rem on mobile), leaving each option's own spacing and the next section's top padding in place.

## Follow-up: saved-estimate refresh jump

Reproduced on staging with saved onlay and extraction selections: after returning to the Pricing page and clicking the native Restorative card, scrollY changed from 1614 to 6497. The card moved from 444.421875px to -4438.578125px even though focus remained on the same retained checkbox. Restoring the full form added nearly 5000px below the entry, allowing browser scroll anchoring to follow later page content.

The calculator controller now takes a visible native-entry position immediately before its first hydration render. A short-lived CSS class suppresses document scroll anchoring during that transaction, and a bounded position correction covers the initial paint and existing two-frame disclosure setup. Corrections use immediate scrolling and rebase Lenis when present. The hold never focuses a control, runs only for the initial native inline entry, skips an entry that is already offscreen, and cancels on wheel, touch, pointer, keyboard or page exit. It does not install a permanent scroll handler or introduce another scrolling library.

Four regression cases simulate a 4800px anchoring jump, native scrolling without checkbox focus, Lenis, a new user scroll gesture, and an offscreen response. The focused calculator suite passed 31 tests. Earlier broad reruns exposed timing-sensitive failures in unchanged Five Senses/Vimeo tests; Five Senses passed its isolated rerun. Final build and full serial regression verification are recorded with the final release below.

The intermediate release `8f476ee4ce842a1ed33f33521ba45faf2035c5cd` passed build reproducibility and the full serial suite (938 tests, 935 passed, 3 existing skips, zero failures). All 71 active CDN assets matched the build. It published to staging at 2026-11-05T12:56:19.660Z, task `f8aa3bb0-d5a5-4257-8e26-e66e86074469`; production remained unchanged. Browser verification confirmed the several-screen jump was removed, but a separate 15px displacement during feature loading remained.

The final refinement captures the entry position in the existing calculator loader before its loading-status text or stylesheet can change layout. The loader temporarily suppresses browser anchoring, passes that position and a cancellation signal to the existing calculator controller, then restores the exact previous inline property and priority on success, failure or a new gesture. The controller still owns the bounded position correction. The loader does not add a second scrolling controller. New regression cases cover successful loading, failure/retry cleanup, cancellation during loading, and an earlier 15px layout shift with saved selections retained.

## Final staging verification

- Source/build release: `777dc1235c1945822bca2886431d463eb761d13e`. Build reproducibility passed. Full serial regression suite: **942 tests, 939 passed, 3 existing skips, zero failures**. All 71 immutable CDN assets matched local bytes.
- Staging published at **2026-11-05T13:15:17.831Z**, task `33a352e4-8dc2-472a-8509-4cc72f82f75b`. The existing seven installation locations remain unified. No new script tags or dependency were installed. All four production domains remain at **2026-10-01T10:10:45.669Z**.
- On Pricing, refresh then Restorative restored onlays and extractions while scrollY stayed **1614**, native entry top stayed **239.734375px**, and category top stayed **444.421875px**. Form height grew from **691.90625px to 5627.875px** without moving the entry.
- After selecting Whitening and Composite bonding, refreshing and clicking Cosmetic retained those selections with the same **1614 / 239.734375 / 444.421875px** measurements before and after. Form height grew to **5618.0625px**. Both completed checks had no remaining inline anchoring override or temporary guard class; focus remained on the clicked category.
- Both darker-cream treatment headings measure **1281.21875px** wide, matching the black section header exactly, with edges **40.890625 / 1322.109375px**. Both include the existing diamond icon, and the page has no horizontal overflow.
- The expanded onlay and extraction quantity inputs have equal **54.53125px** space to their row bottom after excluding the onlay's 1px divider. Step-2 bottom padding is **0px** in the Pricing opt-in, so Extractions no longer adds the duplicate gap.
- Desktop browser interaction and published responsive rules were verified. Physical iOS Safari verification remains outstanding.
