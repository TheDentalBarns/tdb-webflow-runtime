# Page-break CMS migration and refresh memory

The page-break controller now also owns the Blog Posts main-image panel (13
published posts) and the Treatments before/after rich-text panel (six populated
treatment pages). Existing 32 component placements continue using the same
controller. Blog and treatment CMS bindings are retained on their native nodes.

| Native template | Wrapper | Moving content | Native class |
| --- | --- | --- | --- |
| Blog Posts `67837ee84466866251245ed8` | `8c8c8f8c-b621-39ef-9bce-9783cc855a63` | `8c8c8f8c-b621-39ef-9bce-9783cc855a64` | Page Break CMS Image |
| Treatments `678507292f3f5412bfe2b4fa` | `2d48ca4b-a5a9-f613-c422-58efde081247` | `6f9d3b9f-7748-7c3c-ed34-c57829ebedf1` | Page Break Comparison |

Wrappers carry `data-tdb-page-break`; moving nodes carry
`data-tdb-page-break-image`. The comparison remains a CMS RichText element; the
controller moves that entire panel, preserving its figures and content.
Comparison desktop/mobile heights are unchanged (65vh/35vh within 60vh/30vh
crops). Blog imagery retains its intrinsic height with a native minimum crop
allowance and object-fit cover, preventing empty edges on small viewports.

The old IX2 action selectors `.page-break-image-static` (`a-64`) and
`.before-and-after-widget` (`a-59`) were removed from these native elements by
assigning separate new styles, rather than renaming the old styles (which could
retarget the interactions). IX2 definitions/events remain in Webflow's project
inventory, but these actions no longer have live targets on either template.
Removing those unused definitions is part of the wider IX2 inventory cleanup;
the available data MCP does not expose editing IX2 definitions.

## Refresh

`src/page-break/memory.js` is copied to `dist/tdb-page-break-memory.js` by the
shared build and installed verbatim as a small inline head bootstrap, inside
`<script data-tdb-page-break-memory>`. It must run before body parsing, without
waiting for a remote script. A parser MutationObserver restores saved image
translations before paint; it disconnects at DOMContentLoaded. No content is
hidden while JavaScript loads.

`TDBMotion` v1.9.0 saves the currently rendered offsets on pagehide and when the
tab becomes hidden. Storage is per tab and pathname/query, expires after one
day, and validates viewport size plus each image's source and position in the
page-break list. Changed content, a substantially changed viewport, fresh
navigation, unavailable storage and invalid records fall back to native static
positions. Reload and back/forward navigation can restore a matching snapshot.

The browser retains ownership of document scroll restoration. There is no
`scrollTo`, forced top position, unload handler, startup tween, or timed catch-up.
An off-screen first render preserves the restored image translation until the
browser restores scroll or the user scrolls. Visible first-pass correction is
still paid down only by scrolling and finishes by the first off-screen exit.

Shared `ddRegion`/gallery motion and the full-motion policy are preserved from
the active registry base `4fae51eda544e5b4cc149442119b0fa38a61e37c`.

## Validation

- `node --test tests/page-break-memory.test.cjs`: 11 checks covering parser-time
  restore, duplicate images, CMS rich text, late scroll restoration, first-pass
  correction, no idle movement, navigation/viewport/content invalidation,
  persistence, storage failures and teardown.
- `node tools/build-shared-runtime.mjs --check`.
- CMS bindings re-read and verified through native Webflow element settings.
- Publish staging only; keep production domains unchecked. Re-read site custom
  code before replacing the module pin and inserting the head bootstrap, to
  preserve other concurrent edits.

Rollback: remove the `data-tdb-page-break-memory` script and restore the previous
registry pin. To restore original CMS IX2 ownership, remove the new page-break
attributes and restore `page break image static` / `Before and After Widget`
respectively. Keep the canonical component migration separate from this rollback.
