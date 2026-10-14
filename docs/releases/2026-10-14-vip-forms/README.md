# Deferred VIP forms — 14 October 2026

Runtime build: 2701a5340c1c872d37351645ce84d9b658deb83d. Staging only.

- Removed the global early VIP form script. The existing consent-released runtime starts its form loader after either Accept or Essential only. Proximity (600px), form focus/interaction, drawer opening or calculator intent starts one shared request.
- tdb-vip-form.js now bundles TDBForms 0.2.0 and TDBVIPForm 1.2.0. Source files stay separate. The old standalone forms output remains available for compatibility but is not requested by this loader.
- Initialisation preserves populated/restored inputs and empty selections changed during loading. Refresh only renders current values. Reset follows native defaults; cancelled resets do nothing. Calculator intent is retained through loading and deliberately sets the requested assessment.
- Normalisation supports Fast Track and starred Signature Assessment values without losing selection. Smile Design insertion and unsure ordering work without the assessment option.
- A first submit during loading is stopped and replayed once with requestSubmit and its original submitter after preparation. Native validation and Webflow transport remain owners. Failure preserves data, shows a retry message and releases busy state.
- Lead reporting checks the current performance permission (the existing Meta category), and never retrospectively reports a success first observed without permission.
- Share keyboard fallback handles custom triggers without duplicating native Enter or held-key repeats.
- Main form inputs do not use the drawer's tdb-vip-input styling; drawer-only filled state stays scoped.

Validation: 29 tests passed (new lifecycle/submission tests plus existing form/drawer and consent-focus tests). No real enquiry was submitted. Form network/submission tests use local DOM fixtures. Browser staging checks are performed after publishing.

Rollback: restore site-code-before.json. Previous runtime pin d3f537204e1db498f68365537eb339fd015f1d55, previous early VIP script c4d3bb07ba210009faef394011c0431d017f7fff.
