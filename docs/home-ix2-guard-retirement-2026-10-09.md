# Home page IX2 guard retirement — 9 October 2026

The published home page was checked against every event in Webflow's current
IX2 configuration: 199 events and 41 action lists. No element, class or
page-start event target matches the authored or rendered home page. There
are no authored data-w-id elements and no matching legacy trigger classes.

Following David's instruction to prioritise the home page and handle other
pages later, two obsolete inline guards were removed from the shared site
head:

- DD migration bridge v1.0.0 (`data-tdb-dd-bootstrap`), including its persistent
  MutationObserver and old-ID detachment logic.
- Temporary Hero IX2 handoff v1.4.1, including its parser-time observer. The
  referenced action lists a-25/a-33/a-71/a-72/a-84 are absent from the published
  site-wide configuration.

The exact two script blocks and their following newlines were removed from a
fresh head read. The head decreased from 49,663 to 47,406 characters (2,257
bytes of ASCII code). Navbar foundation 1.1.1, shared disclosure 1.2.0, DD
reload memory, page-break memory, all CSS and all other scripts were retained.
The footer was not written. The current DD loader has no hard dependency on
TDBDDBootstrap; its existing legacy-ID safety check remains for other pages.

Staging-only publish task: `7505aa0d-0784-4cfb-b24f-2ca075eed52b`.
The published DOM confirms both guards are absent and no IX2 targets match the
home page. The hero remains rendered at the expected viewport height and the
native navbar is present. Production domains were not published.

The remaining site-wide IX2 engine/configuration is still loaded. Removing its
remaining authoring definitions, migrating other pages, and any regression
work on those pages are separate follow-up work. This change does not remove
Webflow's native runtime or claim the entire site is IX2-free.
