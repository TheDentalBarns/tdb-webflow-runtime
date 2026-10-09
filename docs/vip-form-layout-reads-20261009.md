# VIP form success checks — 9 October 2026

VIP form v1.1.1 moves the existing Meta-availability and already-tracked guards
ahead of success-message visibility reads. It also skips explicitly hidden
messages (`hidden` or inline `display:none`). A potentially visible success
message still receives the computed-display and client-rectangle checks, so a
hidden ancestor cannot create a false lead. The once-per-wrapper WeakSet, pixel
ID and event remain unchanged.

No changes to form submission, validation, field names/values, copy, consent
handling or Designer styling. No polling, observer or runtime dependency added.

Browser checks use real layout and a stubbed Meta API: no-pixel startup and
explicitly hidden messages perform no geometry reads; CSS/ancestor hiding cannot
create a lead; visible success records one lead; later mutations perform no more
reads; the embed and drawer remain independently tracked. The six existing form
ownership tests verify route copy, selection retention and filled-field states.

Only `dist/tdb-vip-form.js` needs a new Webflow footer pin. Baseline and rollback:
`11ce67b689af3197bfd1843cf85d48b13081fb93`. Publish staging only. The previous
8 ms report is not a guaranteed timing saving; this change removes avoidable
checks. The separate unattributed reflow requires a performance trace.
