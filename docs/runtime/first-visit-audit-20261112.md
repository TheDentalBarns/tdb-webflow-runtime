# First Visit standards and accessibility audit — 12 November 2026

The reported First Impressions `aria-prohibited-attr` failure is fixed on [staging](https://dentalbarns.webflow.io/first-visit). A subsequent rendered-page check also exposed a shared carousel list-role mismatch; that is fixed in the shared Swiper owner. The page has no matching published IX2 event targets, but it is not an IX2-free download.

## Scope and release

Reviewed against the current branch's README, release/rollback procedure, loading policy, motion profile, shared native layout guidance, Home engineering rules and [Services audit](../services-audit-20261106.md), together with the project's Architecture reference. The branch contains the fetched `main`; there were no incoming `main` commits to merge.

All four install references now use immutable release `57b420c8ae1e4196e8d70e9f6b07a8823027aa00`: foundation preload, UI stylesheet, noscript stylesheet and startup entry. All 78 declared JavaScript, CSS and supporting assets were retrieved from jsDelivr and matched the committed build. Only the Webflow staging subdomain was published; custom domains were excluded. Final publication task: `03aa02a3-1469-4e29-b630-2175745ac3dc`.

## Corrections

- The native First Impressions holding row now has `role="group"`, which permits its existing accessible name, “Patient first impression cards”. The single Designer placeholder and its geometry are retained.
- The feature's generated keyboard viewport also uses `role="group"`; its named visual pagination counter uses `role="img"`. First Impressions is version 2.1.1. The three native immersive-card step counters use `role="img"` for their existing names.
- Swiper's default `group` slide role conflicted with the native `list` tracks in Smile Gallery and Treatments. `TDBSwiper.create` now configures `slideRole: 'listitem'` when the track is a list and accessibility is enabled. This retains the native list contract through mounting, loop copies and navigation. Instagram's presentation track and First Impressions' group slides keep their existing semantics. No post-mount DOM repair or page-specific override was added.
- First Visit's compatibility manifest entry now records its current owners and has no legacy features. The obsolete Instagram/process bootstrap description is removed. Both page-specific head and footer code blocks are empty.

## Ownership and loading

The page uses the single shared startup/registry. No duplicate runtime script URLs or mixed release commits were found in the rendered page. Static layout, component variants, reserved geometry and the holder's semantics remain native. Shared feature modules own deferred internals, behavior and motion.

First Impressions uses the published CMS JSON endpoint `/tdb-content/v1/first-impressions.json`. The page has one native holding card, three distinct rendered records and no hidden First Impressions CMS source list at its bottom. The feature retains the shared consent decision and 1200px embed preparation margin, validated feed handling, credential-free requests, cancellation, retry and teardown. Its internal styling remains in the deferred First Impressions stylesheet; it uses the shared gallery, motion and ticker owners.

First Visit and Nervous Patient Care use the same Five Senses component definition (`4893a05d-5e2e-8d3f-2721-eb585ca97082`), variant (`89caee22-acf2-ee99-ce32-2cbe053e848c`) and launcher/entry modules. The three USP accordions start closed, as explicitly requested.

The existing shared service-video metadata helper remains inline: it derives VideoObject data from native content and does not load media or rewrite layout. Shared early CSS, the viewport initializer and Webflow's class initializer remain. Empty page custom-code blocks do not mean the document contains no inline code.

## Validation

- `npm run build:all`: passed, including the locked custom Swiper build and patched artifact check.
- `npm run verify`: 1,103 tests; 1,100 passed, three skipped, zero failed. The added integration regression uses the actual Swiper build for gallery and parallax mounting, loop navigation, list roles and accessible labels; it also checks non-list galleries retain group semantics.
- Prettier passed using its CLI with `--end-of-line auto`. The npm script's quoted glob is not portable in this Windows shell; the equivalent source/tool scope was checked directly.
- Published HTML and captured rendered desktop/mobile DOMs have no reported violations in the axe-core 4.11 ARIA rule set. The original holder is a valid named group. Smile and Treatments retain list/listitem roles after real browser hydration. Some axe results remain incomplete in the DOM-only harness, so this is not a full browser accessibility certification or a rerun of Lighthouse's Agentic Browsing score.
- Separate in-app browser: desktop 1440×1100 and mobile 390×844, no horizontal overflow. First Impressions next-button navigation moved 1→2; mobile keyboard navigation moved 2→1. All three USPs remained closed. No browser error logs were observed. The temporary viewport override was reset.
- Published source has one H1 and no broken `aria-labelledby`, `aria-describedby` or `aria-controls` references. Two repeated Webflow-generated grid IDs remain; they are not the page's authored anchors or ARIA references and were not renamed during this pass.

Private before/after HTML, native readbacks, axe reports, screenshots, exact custom-code backups and CDN hashes are kept in the task's `standards-audit` evidence folder. Full settings, HTML and CMS snapshots are not committed here. Physical-device Safari, fresh network timings and a full Lighthouse rerun were not performed.

## IX2 result and remaining boundary

The published Webflow configuration contains 188 events and 33 action lists. Resolving event targets against both source and hydrated First Visit markup found zero matches; there are no page events targeting First Visit. The IX3 list is also empty, but that API is not evidence of IX2 removal.

Five inert `data-w-id="efa1f211-9b34-f83b-c813-e469f00dad3c"` markers remain on the shared Vimeo component. Webflow still downloads its site-wide IX2-bearing bundle. These facts prevent an “all IX removed” claim. The markers are generated legacy authoring metadata, not removable custom attributes through the available headless attribute API. The separate browser's Designer requires sign-in, and the user's active PC browser was not touched. Retiring the site-wide engine requires an inventory of its remaining consumers; removing the Webflow bundle or adding a runtime guard is not justified by this page audit.

## Change cost and rollback

Relative to release `194186f9f7f341c33267a0b432eb709db8eda791`, this accessibility pass changes the captured HTML by +46 raw bytes (+14 locally gzipped), the deferred First Impressions module by +66 raw (+11 gzip), and the shared Swiper bundle by +207 raw (+68 gzip). The affected total is +319 raw bytes / +93 local gzip bytes. No CSS or media asset changes were made. Shared cache state and existing dependencies determine actual transfer; these numbers are not a performance or Lighthouse improvement claim.

The previous runtime is `3f79c4fe29035c5e825bf654a439f0150e340f41`; the full pre-audit runtime is `194186f9f7f341c33267a0b432eb709db8eda791`. Exact head/footer blocks for both are saved privately. Restore all four references together and publish staging only if rollback is needed. Native role additions are independently reversible through their component definitions. Keep valid native role fixes when rolling back only the shared engine. Revert code through ordinary commits, without rewriting history.
