# Smile Gallery native grid

The standalone Smile Gallery keeps all 34 CMS cases in the page. Native Webflow elements own the cards, intro, embedded filters and case drawer. The runtime adds filtering, sorting, comparisons and shared drawer/filter motion.

The grid uses cream title areas, reserved title/treatment space, faint shared artwork and aligned price/time/clinician rows. The services-style intro uses the existing diamond asset. The embedded darker-cream section includes treatment, clinician, patient gender, sort and display disclosures. Its glass filter control parks in that section and floats at the foot of the viewport while scrolling through the cases.

Both display modes use the original composite photograph. Before/after preserves the square; Slider crops the exact top and bottom halves into the same 2:1 viewport, before on the left. A plain cream divider and small arrows replace the circular control. Native image dragging is prevented. Keyboard controls remain available without a box around the photograph. Display changes fade in place, preserving the selected case and filters.

The filter sheet fills the shared drawer, with a top-right Reset and bottom-right black View action. Main-page opening uses the same backdrop and scroll lock as a case. Closing translates the complete sheet below the viewport. Drawer text/photo fill its padded width; case navigation mixes title travel, description/treatment/image fades and shared native tickers for price, duration, clinician and count. There is no patient-reviews button in a case.

Price sorting is numeric. Duration sorting normalizes minutes, hours, days, weeks, months and years, using the starting estimate for ranges. Unknown values stay last. Both ascending and descending orders are available.

Patient gender is an optional CMS Option field, patient-gender (31846f55395fc8a2e13f5985cfff0973), in Smile Galleries (69a07fdcd392dc2c0d92967f). Male/Female filters use only recorded field values. Untagged cases remain in All patients; unavailable options are disabled. No labels were inferred from photographs. The native hidden field binding is 650e9028-8ab4-0411-a090-7e3b1d79ff74. Add labels and publish CMS records to make the options available.

Page: 6aa3efd54f3f705caf98c687. Card: ef21cb20-7533-d828-8155-4b58c9acc87f. Grid: ca2ea2e5-6e53-7ac0-b7cd-70dd6706d676. Drawer: ffe6a3e4-7dcd-b467-f10e-56a43d9786fd. Filter sheet: 1c935484-2174-4934-b00b-1b5783a76008. Embedded controls: c7d97289-51e4-ac49-c1ed-6f34000bb99c.

The countryside location instance's old accessibility artwork was replaced with the shared current asset 6aedc99cb5456ab693fb229f. Shared Resource hero, availability, booking, partners, awards and footer follow the calculator framework. The belief strip remains removed. Publication is limited to dentalbarns.webflow.io.
