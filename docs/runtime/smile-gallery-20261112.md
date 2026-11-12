# Smile Gallery native grid

The standalone Smile Gallery keeps all 34 CMS cases in the page. The native CMS collection owns the card markup and bindings; standalone.js adds filtering, the shared right-hand drawer, and optional comparison controls. No gallery carousel is mounted on this page.

The comparison crops the original composite photograph into exact top and bottom halves. Both use the same 2:1 viewport with the top half revealed on the left. A cream divider and two small arrows replace the circular control. Pointer capture prevents native image dragging; keyboard range controls remain available. The display choice and filters survive a reload and apply to grid and drawer.

Webflow page: 6aa3efd54f3f705caf98c687. CMS template: ef21cb20-7533-d828-8155-4b58c9acc87f. Grid collection: ca2ea2e5-6e53-7ac0-b7cd-70dd6706d676. Case drawer: ffe6a3e4-7dcd-b467-f10e-56a43d9786fd. Shared Resource hero, availability, booking, partners, awards and footer follow the calculator framework. The belief strip was removed at the user's request.

Validation: build checks; 1,105 tests passed, three skipped; staged browser checks for the full grid, actual pointer dragging in both grid and drawer, click-to-open, filter display reload and patient-review handoff. Publication is limited to dentalbarns.webflow.io.
