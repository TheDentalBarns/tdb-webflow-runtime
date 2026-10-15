# Home Smile Gallery feed

Home now requests the featured Smile Gallery cases at 400 px proximity, after
the existing consent decision. The initial document contains a native white
holding link with the existing diamond asset, matching the IG holding icon's
2.75 rem size and 0.35 opacity. Only its responsive geometry is critical CSS.

The external Smile module loads its stylesheet and the same-origin
`/tdb-content/v1/smiles.json` projection, decodes the entry images, then mounts
the existing TDB gallery/Swiper. It reuses `tdb-disclosure-fade`, the shared
300 ms reveal fallback and the existing first-view slide advance.

Cards contain the combined before/after photo, its landscape crop and the
travelling top/bottom bars. One shared presentation owns the title, Before/After
labels, description, treatment labels, summary tickers and controls. CMS values
are inserted as text or validated image URLs; there is no per-case HTML,
JSON-LD, hidden detail panel or hidden count collection in the Home response.
The Explore count comes from the same feed's published total.

The Cloud service keeps independent memory, KV snapshots, in-flight work and
failure backoff for Instagram and Smiles. Smiles uses published live records,
featured filtering and the native ascending priority/creation ordering. The
projection returns only display fields. Both routes remain restricted to the
staging host, with no CMS credentials exposed to visitors.

The original native Smile component remains intact for other pages. The Home
instance and count source were removed after private element/HTML backups;
the existing unpublished Home rollback page also retains the native gallery.

## Maintenance and rollback

- `src/smile-gallery/template.html` is a fixed empty template, embedded by the
  runtime builder. Keep CMS content out of it.
- `src/styles/tdb-smile-feed.css` and `dist/tdb-smile-feed.css` are the external
  native-design stylesheet. Keep them synchronized when editing CSS.
- `src/smile-gallery/placeholder.css` records the small native holding styles.
  Its landscape override belongs in the existing Home responsive embed.
- To restore Home, reinsert the original Slider - Smile Gallery component with
  the Home variant, featured filter and ascending pin-priority sort; restore
  the count source from the private backup; remove the new holding element.
  Restore all three global runtime pins together to the saved pre-change
  commit, then publish staging only.

Validation covers published order, independent cache/failure behavior, unsafe
or stale JSON rejection, permission/proximity gates, cancellation, single
presentation markup, image release, retry, and the existing native gallery
interaction tests. Visual checks cover desktop, portrait and phone landscape.
No Lighthouse/GTmetrix score improvement is inferred from the HTML reduction.
