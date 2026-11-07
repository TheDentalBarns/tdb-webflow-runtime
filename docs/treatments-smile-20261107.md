# Treatment smile galleries

The Treatments template reuses `Discover Smiles — deferred gallery`, the same
Webflow component and JavaScript module as Home and Services. The Contained dark
variant has a black native holder and black deferred card, with light text and
icons. Treatments retain their previous gallery width and section proportions.
The shared benefit dividers use 30% currentColor so they remain visible on both
light Services and dark Treatments backgrounds. Shared component edits reach all
instances; instance content and variant overrides remain local.

The optional `Treatment slug` component prop binds `data-tdb-smile-treatment`
to the current Treatments CMS slug. Blank keeps the existing featured Home /
Services selection. Allowlisted treatment slugs select published cases through
the CMS treatment references, including cases not featured on Home. Unknown
slugs fail closed and retain the native placeholder.

`services/content-feed/feed.mjs` adds six fixed treatment endpoints beneath
`/tdb-content/v1/smiles-<slug>.json`, each with its own KV key. Treatment priority
ascending, blank last, then creation date descending preserve the previous
native treatment-gallery order. The existing `/smiles.json` behavior and all
other feeds are unchanged. No raw CMS records or credentials are returned.

The Treatments benefit disclosures use shared styles and custom disclosure /
chevron modules; the surrounding CMS sections are page-level markup, not linked
component definitions. Their native CMS text, image, icon and section visibility bindings are
preserved. The legacy FAQ trigger classes are removed only from this section.

Validation before staging publication: 970 tests passed, 3 skipped, none failed;
generated build parity passed. Live feed selection and order match the previous
native lists: veneers 7, composite bonding 27, Invisalign 15, teeth whitening 27,
clear aligners 16. Airflow has no cases and its gallery remains CMS-hidden.
The deployed feed extension was checked against the unchanged Home, reviews,
partners and three Instagram feeds. Cloudflare version: `6db7fdc3`.
