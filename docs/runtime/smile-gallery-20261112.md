# Smile Gallery native grid

The standalone Smile Gallery keeps all 34 CMS cases in the page. Native Webflow elements own the cards, intro, embedded filters and case drawer. The runtime adds filtering, sorting, comparisons and shared drawer/filter motion.

The grid places cream titles directly below pictures, with reserved title/treatment space, faint shared artwork, fixed equal price/time/clinician columns and a light one-pixel rule beneath each row. The services-style intro uses the existing diamond asset. The embedded darker-cream section includes treatment, clinician, sort and display disclosures. Its glass filter control parks in that section and floats at the foot of the viewport while scrolling through the cases.

Both display modes use the original composite photograph. Before/after preserves the square; Slider crops the exact top and bottom halves into the same 2:1 viewport, before on the left. A plain cream divider and small arrows replace the circular control. Native image dragging is prevented. Keyboard controls remain available without a box around the photograph. Display changes fade in place, preserving the selected case and filters.

The filter sheet leaves the same top gap as the review drawer, with a top-right Reset and bottom-right black View action. Main-page opening slides the filter sheet upward, using the shared backdrop and scroll lock without horizontal case-drawer travel. Closing translates the complete sheet below the viewport. Drawer text/photo fill its padded width; case navigation mixes title travel, description/treatment/image fades and shared native tickers for price, duration, clinician and count. There is no patient-reviews button in a case.

Price sorting is numeric. Duration sorting normalizes minutes, hours, days, weeks, months and years, using the starting estimate for ranges. Unknown values stay last. Both ascending and descending orders are available.

Patient gender is an optional CMS Option field, patient-gender (31846f55395fc8a2e13f5985cfff0973), in Smile Galleries (69a07fdcd392dc2c0d92967f). Male/Female filtering is deferred at the user’s request. Both disclosures are hidden and saved/query gender preferences are ignored and cleared. The optional CMS field and hidden binding 650e9028-8ab4-0411-a090-7e3b1d79ff74 are retained for a future rollout; no labels were inferred from photographs.

Page: 6aa3efd54f3f705caf98c687. Card: ef21cb20-7533-d828-8155-4b58c9acc87f. Grid: ca2ea2e5-6e53-7ac0-b7cd-70dd6706d676. Drawer: ffe6a3e4-7dcd-b467-f10e-56a43d9786fd. Filter sheet: 1c935484-2174-4934-b00b-1b5783a76008. Embedded controls: c7d97289-51e4-ac49-c1ed-6f34000bb99c.

The countryside location instance's old accessibility artwork was replaced with the shared current asset 6aedc99cb5456ab693fb229f. Shared Resource hero, availability, booking, partners, awards and footer follow the calculator framework. The belief strip remains removed. Publication is limited to dentalbarns.webflow.io.

The embedded introduction follows the four-part text pattern: small uppercase heading, large uppercase heading, blurb and View count CTA. Both View buttons use TDBNativeTicker with a reserved count width, matching review action sizing. Reset sits bottom-right on the page and top-right in the filter sheet. Embedded and modal disclosures now share TDBFilters.mountDisclosures: 20px travel, 20px expanded padding, 300ms opacity/spacing and 400ms movement/chevrons.

The glass control pins exactly as its natural position reaches the viewport footer, remains visible, and travels out with the end of the gallery. Reduced motion is respected.

Validation: build checks passed; 1,115 tests passed and three skipped, including shared accordion motion, backdrop-only modal opening, continuous dock geometry, retained count slots, sorting, slider dragging, filter reset and consent teardown/remount.

First paint: the page head applies the URL/saved display preference before parsing the gallery. Slider photographs reserve 2:1 immediately and show the after crop as a noninteractive fallback until enhancement; blocked/delayed runtime cannot expose a square first. This is under 1 KB of inline HTML/CSS/JS, with no additional request. Comparison layers preserve native srcset/sizes, use async decoding and lazy loading, and share the original composite URL; the drawer uses its own responsive sizes. Designer keeps the authored square fallback.

Baseline GTmetrix tests on staging: fresh consent-choice view (jmCuIWaC), 609,607 transferred bytes / 26 requests / CLS 0. Returning visitor with strict-only choice and slider deep link (uQowqLAE), 1,096,950 bytes / 59 requests / CLS 0. These are desktop Chrome lab results from Seattle, not field CLS or a guarantee for a restored mid-gallery scroll position.
