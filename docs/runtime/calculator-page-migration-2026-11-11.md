# Dental cost calculator native migration — 11 November 2026

The staging `/dental-cost-calculator` page now uses the current shared components and the single runtime installer. Its page head and footer custom-code blocks are empty. After either consent choice, the calculator loads the current module and prices before a category click. It displays the same inset treatment controls as Pricing. Returning above the form hides the estimate bar and releases the navigation without clearing selections.

## Native ownership

| Area | Designer owner |
| --- | --- |
| Navigation | `Navbar New`, Transparent variant; obsolete transparent-nav style component removed |
| Hero | New `Resource page hero` component, `f9e1a59a-a134-eba5-e39c-da0cabd135da` |
| Availability | New `Resource availability` component, `e508917e-9b8a-04b9-5abe-16d96711be45` |
| Calculator | Existing `Treatment Calculator`, `753062ad-9d80-105d-d2a0-2dbd8260ceae` |
| Belief banner | New `Smile belief — 6rem`, `9e4d27f4-1ca2-92d5-4f25-840ba8c00159` |
| FAQ | Existing calculator FAQ, `9736c0e5-b49b-deae-0b12-316cf735ab34`, with a nested remaining-questions list, `df7eb476-b97b-7e6a-db7b-096563032a81` |
| Background sections | Existing `Component 1 - Bg image`, Service scroll media variant and current button variant, matching Home |
| Brands | Current logo marquee, `7970b7c2-f041-964c-3da5-86b5c377f3db`, Dark variant with partner details enabled |
| Awards | `Awards — care and recognition`, `4c110b36-e067-748c-2cf9-153bf498a1c4`, including the current archive/Instagram component |
| Footer, VIP and availability banner | `Footer — shared`, `4c8e5b24-0116-2a8d-4190-53cdd4860ef5` |

The hero exposes the heading text and heading ID as props; its `aria-labelledby` follows that ID. It is ready for subsequent Five Senses and Smile Gallery migrations. Those pages were not migrated in this pass.

The availability strip retains the existing text and refresh artwork. Its control is a native DOM `button`, with an accessible label, rather than a Webflow link styled as a button. Layout and responsive rules live in Designer styles.

The calculator page wrapper now has `data-tdb-calc-option-inset="category"`. Pricing already had this setting; its absence caused the former checkbox alignment mismatch. The existing module and stylesheet consume the setting. No new calculator CSS or positioning override was introduced.

The shared calculator exposes two native text props: `Load strategy`, defaulting to `interaction`, and `Focus starts at`, defaulting to `visible`. Only this page overrides them to `immediate` and `top`, respectively. They bind to `data-tdb-calc-load` and `data-tdb-calc-focus-start`. The existing consent-gated runtime handles immediate loading, so neither calculator assets nor the price request start before a decision. Pricing retains the default strategy.

“Loading current prices…” is centered at the divider position below the category choices. The native `tdbc-entry-status.is-calculator-divider` combo sets a 3rem top margin on desktop and 2.5rem on small screens, with no bottom margin. It prevents deferred module paragraph spacing from overriding this native placement. The existing empty-state rule removes the status when ready; no page CSS or additional loading controller was added.

The booking and countryside sections use the current Service scroll media layout and nested button variant. The brand marquee uses the same heading visibility, Dark variant and partner-details configuration as Home; partner details open through the shared deferred controller.

The belief banner is exactly 6rem high, uses the drawer's belief copy and brand colour, and remains readable without a scroll fade. It follows the calculator and precedes the FAQ.

## FAQ defaults and schema

“Understanding your estimate” was removed. “Dental cost calculator FAQs” remains as the main section heading. The first curated CMS question is natively expanded, with the remaining nine natively closed. Separate curated lists preserve the existing order and CMS bindings without a runtime first-item patch. The original `FAQPage`, `Question` and `Answer` schema attributes remain.

The rows use the current shared disclosure hooks and chevrons. Answer text is the direct reveal child of its panel. Empty legacy CTA/margin wrappers were removed, and the final divider follows the complete list. Shared disclosure behavior owns interaction and the existing motion policy.

## Runtime and release

The source change adds the existing `src/shared/availability-header.js` to `dist/tdb-runtime.js` in `tools/runtime-build/targets.cjs`, alongside the other lightweight launchers. It exits on pages without its root and guards against duplicate initialization. It retains the shared availability cache, live refresh, expiry and motion behavior. Source, readable output, minified output and build metadata were committed together in `0a0b433`.

The follow-up change in `src/calculator/ui.js` adds the optional top boundary to the existing viewport/focus lifecycle. An engaged calculator acquires focus only while its root crosses the viewport top. Scrolling above or below it releases focus through the existing shared navigation API. Re-entry restores focus and keeps treatment selections. The source and built-output regression tests cover boundary entry, release and re-entry. Default inline calculators and drawers keep their existing behavior.

The final checked shared release is `7174e2267317974569f2316584140d48e5c60afe`. It includes both calculator changes and concurrent About, Services and navbar work. All four global install references use that SHA: foundation preload, UI stylesheet, noscript stylesheet and startup entry. Child assets resolve through the same release. No page-specific script, version pin, inline behavior or custom layout stylesheet remains on the calculator page. Existing approved global critical styles and deferred module styles remain under their established owners.

## Validation

- Node 24.22.1: generated build parity passed. The locked, patched Swiper build and artifact check passed without a tracked output change.
- Full shared suite for the final release: 1,083 tests, 1,080 passed, three existing optional skips, zero failures. The focused calculator, planning and navbar checks passed all 74 tests. Generated parity passed after the final source change.
- Formatting passed for all 183 configured source/build files after normalizing Windows line endings for the check.
- All 75 declared active release assets matched the final release on jsDelivr, allowing line-ending normalization and jsDelivr's added minification-notice comment. The one comment-prefixed asset also matched the immutable GitHub source.
- Chrome at 1440×1000 and mobile emulation at 390×844: no page errors or horizontal document overflow. Current hero, backgrounds, brands, awards, Instagram and footer were visually checked. Banner height measured 90px at a 15.0001px root size and 81.765625px at a 13.6276px root size, consistent with 6rem.
- Live availability loads and manual refresh completes. The calculator preserves the first category click, supports both categories, updates the estimate, and resets. A whitening selection displayed the current £795 treatment plus £450 Signature Assessment as £1,245; no prices were edited.
- Fresh essential-only and accept-all consent were each checked at both viewports. Calculator JS/CSS and prices made zero requests before the decision, loaded automatically afterwards with one calculator script request, and were ready before category selection. Saved-consent reload also loaded automatically in all four cases. No browser errors or failed resources were observed in the final runs.
- With the price response temporarily held, the loading status measured 45px below the category choices at desktop and 34.0625px on mobile, matching the native 3rem/2.5rem divider spacing. Screenshots confirm centered placement.
- On the published release, the estimate bar appears inside the form and hides when the form returns below the viewport top. The navbar is visible at the hero, both menus open and close, and the selected whitening treatment remains checked. Desktop navigation also returns above the form; the mobile navbar retains its normal top-of-page positioning.
- The corrected booking and countryside layout variants were visually checked on both viewports. Partner details opened and closed on both through the shared marquee module.
- FAQ mouse and keyboard toggles work. With JavaScript disabled and styles fully loaded, only the first answer is visible and the other nine have zero height.
- VIP opens and closes on both viewports, preserves a locally entered test value across reopening, and restores the previous scroll position. No form was submitted. Navigation opens and closes, including Escape.
- Home smoke test: fresh essential-only consent and saved-consent reload, shared menu open/close, no page errors or horizontal overflow.

The final audit at both viewports found zero `data-w-id` attributes in raw HTML or the rendered DOM. The Webflow IX2 store contains 188 sitewide events, with zero matching element, selector or page targets, zero active instances and empty event state on this page. **Webflow still downloads its sitewide IX2 bundle. The page is not 100% free of IX2 code downloads.** This migration removes page IX2 behavior; it does not claim the sitewide engine was eliminated. Physical iPhone Safari/Chrome testing remains separate from browser emulation.

## Publication and rollback

Only the Webflow staging subdomain was published. Custom domains were not selected. Exact pre-change page/site code and native snapshots are stored privately outside this repository; full settings, HTML and CMS exports are not committed here.

Rollback of this page must restore its native structure together with the corresponding saved page code. Runtime rollback must preserve subsequent shared work: revert the calculator source change in an ordinary commit, rebuild and verify, then update all four global references together. Do not reset the shared site to an older release merely to undo this page migration.
