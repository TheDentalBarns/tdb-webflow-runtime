# Native Instagram / Awards

## Visible CMS migration v2.0.0 — prepared, not deployed (9 October 2026)

The v2 controller enhances Webflow-rendered cards in place. It no longer reads
a second hidden image collection, clones a starter card, replaces the track, or
writes image sources/alt text. Webflow owns the visible Collection List, its
single card template, all three CMS image bindings and authored lazy loading.
The shared Gallery engine can still create its normal transient loop copies.

### Remaining Webflow change and approval

Automatic approval review blocked unlinking the Home `Awards - Home` instance.
Its stated concern is losing the shared component linkage. The component and
the nested `TDB / Instagram Feed` each have exactly one instance. The proposed
change makes these homepage instances native editable elements while retaining
their definitions. Future edits to those definitions would no longer update
this homepage section. User approval for that consequence is still required.

Why this step is proposed: a new Collection List inside the Instagram component
accepted a stored source, but filter writes failed with `No source connected`
and its image had no CMS binding context. Converting the existing, working CMS
list into a component was explicitly rejected by the connector because it
contains a live CMS binding. This describes the observed connector limitation,
not a claim about every Webflow component workflow.

The temporary Collection List was removed and the original Instagram tree was
verified to match its backup exactly. No staging or production publish was made.
The deployed Home loader still uses commit
`06e035283cd51dce25be50acb480b8c963aa59fb` (v1.0.0).

After approval:

1. Unlink the sole Home Awards and nested Instagram instances, preserving their
   current native elements, styles and content. Keep the component definitions.
2. Move the existing connected Media Gallery Collection List into the feed as
   its visible viewport. Keep the Awards/Visible filters, sorting and limit.
3. Give the wrapper `ig-native_viewport`, `data-ig-viewport` and `data-ig-cms`;
   the list `ig-native_track` / `data-ig-track`; and the single Collection Item
   `ig-native_slide` / `data-ig-slide`. Move one existing card design into it.
4. Bind the main image and both reflections to Image. Bind the main alt text to
   Alt Text; leave decorative alt text empty. Author `loading="lazy"` on all
   three images. Keep Date, Link, Media Type, Likes, Comments, Shares and Slug as
   small hidden metadata nodes inside that same item. Remove its redundant
   source image, the old starter slides and the separate hidden source wrapper.
5. Clear stale preview dates/counts/post URLs in the stationary frame. Normalize
   the native Collection Empty State to the existing empty-message presentation.
   The controller fills the frame from the first real item before lazy mounting
   and handles Webflow's empty rendering, where the item list is absent.
6. Publish the matching native markup and immutable v2 loader pin to the Webflow
   staging subdomain only, then verify the actual published bindings and visuals.

### Prepared controller validation

The offline Chromium fixture uses the previously published Home markup, native
Webflow styles and the deployed shared dependency release
`d59c1a7414e9d459704a1d843ed1adfcdcaa7af8`. It verifies:

- All 16 original card nodes survive; image src/srcset/alt/loading stay unchanged.
- No offscreen post image requests; one-entry advance reaches the first CMS item.
- Every card's image, reflection, post link and counter agree across a full loop.
- Next and keyboard Previous; full motion under an OS reduced-motion setting.
- Matching frame/viewport geometry at 1440, 991, 767, 390 and 320px.
- Destroy/remount restores CMS order; single, empty and invalid-metadata states.

The fixture exposed an existing duplicate keyboard activation path. v2 captures
Enter/Space once before Swiper's own button handler, preventing a two-card jump.
The v2 build is included in `tools/build-shared-runtime.mjs`.

Run `tools/test-instagram-native.mjs` with a saved pre-migration homepage HTML,
a directory containing the deployed shared JS files, and the downloaded native
Webflow CSS directory. Set `TDB_CHROMIUM_EXECUTABLE` if using a custom Chromium.
Images are aborted in the offline fixture; it checks DOM identity and layout,
not photographic rendering. Actual Designer/published visual checks remain
pending the approved Webflow migration. No performance saving is claimed yet.

## Currently deployed v1.0.0

Home uses the `TDB / Instagram Feed` Designer component inside `Awards - Home`.
The component owns card geometry, adjacent opacity (.5), icons, profile, controls,
reflection/glass treatment, state classes, responsive styles and the empty state.
Three preview cards remain visible in Designer. The runtime clones the first
native card template and fills it from the published CMS source; it contains no
card HTML, SVG artwork or presentation stylesheet.

The hidden `data-tdb-ig-source="awards"` Collection List on Home reads Media Gallery:
- Categories contains Awards; Visible is on; item is not draft/archived.
- Display Order ascending, then Date descending; up to 100 posts.
- Image, Alt Text, Date, Instagram Link, Source Media Type, Likes, Comments,
  Shares and Slug are native CMS bindings.

The existing 16 public Awards posts retain their order and engagement values.
Counts are CMS values, not a new live Instagram API integration. Blank shares
remain unavailable rather than displaying a fabricated zero.

`dist/tdb-instagram-native.js` is loaded on Home. Its shared dependencies resolve
through the existing TDBModules registry: TDBGallery, TDBSwiper, TDBMotion and
TDBNativeTicker. It preserves one-entry advance, loop, touch, keyboard, rapid
navigation, 400ms tickers, stationary details, video badge fades, current-post
links and the existing share/clipboard fallback. Full motion follows the shared
site policy. The gap is read from the Designer slide margin at each breakpoint.

The other three Instagram feed variants retain their current implementation.
A later migration can reuse this controller with a matching CMS source key and
a Designer component variant. Full-width layouts have not been migrated here.

Validation: old/new fixture layout comparison at 1440, 991, 767, 390 and 320px;
first-entry state, all 16 records, next/previous, interrupted navigation,
settled count/link/photo agreement and shared motion under OS reduced motion.
Published markup and styles are checked separately on Webflow staging.

Rollback: restore the prior Awards HtmlEmbed and remove the Home native loader.
Keep the staged CMS items and native component available for further editing.
Publish only dentalbarns.webflow.io until production publishing is requested.
