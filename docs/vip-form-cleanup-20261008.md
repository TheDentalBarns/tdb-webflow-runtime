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

Both duplicate inline share scripts and empty style-comment embeds can be
removed after the new module is deployed and confirmed reachable. Sharing keeps
the existing native Web Share / Facebook fallback, adds keyboard Space handling,
and uses noopener on its fallback window. No enquiry needs to be submitted for
verification.

Build the VIP module using Terser (compress + mangle), output
`dist/tdb-vip-form.js`. Rebuild UI via `tools/build-ui.py` when changing its source.
Publish review work only to the Webflow staging subdomain.
