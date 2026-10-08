# Shared VIP form cleanup

The base `vip form` and `VIP Drawer Form` keep their existing Webflow form IDs,
field names, required flags, UK phone pattern and submission integration. The
`vip form light` component uses the same base form.

`src/forms/vip-form.js` consolidates the four former inline site scripts for
appointment option compatibility, interest defaults and contextual copy, drawer
labels and Meta success tracking. Native success-screen share controls use one
delegated handler. Generic validation and phone normalization remain in the
existing `TDBForms` engine. Drawer state machines and motion are unchanged.

Native Designer styles own select colours and placeholder states. The already
native `.button.submit-button` / `.submit-enabled` states retain their existing
0.3 / 1 opacity and default / pointer cursor. Global submit CSS now excludes
these controls. The old generic select rules retain compatibility only for
other selects, not `.form_select`.

Treatment choice updates remain in the shared module: the current MCP surface
does not expose FormSelect choices. Automatic approval review blocked native
replacement because a temporary duplicate would risk validation/submissions.
The original select nodes are preserved. The temporary draft prototype was
removed before the final publish.

Both duplicate inline share scripts and empty style-comment embeds were removed
after the new module was deployed and confirmed reachable. Sharing keeps
the existing native Web Share / Facebook fallback, adds keyboard Space handling,
and uses noopener on its fallback window.

## Staging verification — 8 October 2026

Runtime/CSS release: `d3014987b2371e6945369c63940663b763a8d33e`.
Final Webflow staging publish task: `a4f193c7-9b5b-4e6b-8e5a-66afbcb347e7`.

- Homepage: original inline and drawer form identities, field names and required
  flags remain; each form has one select and one native share control.
- Old share elements and the four former inline script markers are absent.
- Inline form and drawer enable the submit button on completed fields and
  consent, and disable it again when a required item is cleared.
- Enabled buttons settle at opacity 1/cursor pointer; initial state retains
  opacity 0.3/default. Select placeholder and selected colours match their
  Designer classes, including the drawer's existing #111 colour.
- Smile Design and Signature Assessment choices update contextual copy.
- Drawer opens and closes with Escape and releases body scroll locking.
- `/vip/become-a-patient` inherits the base component cleanup and keeps
  "Reserve my place". Its existing demand-loaded validation binds on form focus.
- Published module fetched successfully and matched the minified build; source
  and distribution syntax checks passed. No VIP console errors were observed.

No enquiry or social share was submitted. Success tracking and the actual
submission endpoint were preserved, not exercised. No mobile viewport run was
performed; responsive layout and drawer/IX2 motion were not modified.

Build the VIP module using Terser (compress + mangle), output
`dist/tdb-vip-form.js`. Rebuild UI via `tools/build-ui.py` when changing its source.
Publish review work only to the Webflow staging subdomain.
