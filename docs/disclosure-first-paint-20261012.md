# Disclosure first paint — 12 October 2026

The first homepage award was authored aria-expanded=true, but its native panel
was display:none with zero wrapper padding. Deferred foundation CSS revealed
the panel, added a 20px padding transition and started text reveal animation.

The shared disclosure controller now maintains native is-open classes. The
first award wrapper, panel and chevron have that class authored in Webflow,
with native padding-bottom:20px, display:block and transform:rotate(180deg).
The initial layout therefore does not depend on the navbar loader arriving.

Disclosure gap transitions and content reveals require a user-interacted
attribute set only by the click/keyboard handler. Mount and refresh do not
set it. Disclosure chevrons also suppress transitions before interaction.
Interactive gap, reveal and chevron timings remain unchanged.

Only dist/tdb-navbar-loader.js is rebuilt and its staging script URL changes.
All other runtime pins, consent, navigation controls and motion policy stay
as deployed. Motion memory remains commented out.

## Rollback

Restore the navbar loader URL to:
https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@edd01dfc7eb3c660ad262e0f642a2bed4bdb0ed1/dist/tdb-navbar-loader.js

On Home page 677cf86df9952f978d94d8a9 remove only the final is-open combo class
from these three elements (retain their earlier classes):

- Wrapper: 96bdccfd-d78a-1bad-0cca-e4ad6401cfa0 — faq3_accordion is-disclosure
- Panel: 96bdccfd-d78a-1bad-0cca-e4ad6401cfa6 — tdb-disclosure-panel
- Chevron: 4e0d4e2a-493f-2588-6b26-33018a8127d6 — tdb-disclosure-chevron is-dark

The three new combo definitions can remain unused. Publish only the Webflow
staging subdomain. The parent release contains the exact previous runtime.
