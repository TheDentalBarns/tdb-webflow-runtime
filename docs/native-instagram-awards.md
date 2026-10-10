# Native Instagram / Awards

## Visible CMS migration history (9 October 2026)

The v2 controller enhances Webflow-rendered cards in place. It no longer reads
a second hidden image collection, clones a starter card, replaces the track, or
writes image sources/alt text. Webflow owns the visible Collection List, its
single card template, all three CMS image bindings and authored lazy loading.
The shared Gallery engine can still create its normal transient loop copies.

### Original migration plan — subsequently approved and completed

Automatic approval review blocked unlinking the Home `Awards - Home` instance.
Its stated concern is losing the shared component linkage. The component and
the nested `TDB / Instagram Feed` each have exactly one instance. The proposed
change makes these homepage instances native editable elements while retaining
their definitions. Future edits to those definitions would no longer update
this homepage section. The user subsequently approved this consequence; the migration below is complete.

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

Completed after approval:

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
not photographic rendering. Designer and staging checks were subsequently completed as recorded below.

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
site policy. The live gap is read from Designer's ig-native_feed column-gap before Swiper's initial layout and resize. The authored slide margin retains the same values for the static/CMS fallback (2rem desktop, 2vw below 992px). Keep those two native settings aligned when changing the design.

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


## Responsive photo loading — 9 October 2026

`src/instagram/native.js` owns `IMAGE_WINDOW`: 3 unique photos below 992px,
5 at 992px and above. Mobile/tablet buffers the active post by one neighbour each side. Desktop
loads the active left card, the two visible cards to its right, and one
additional next/previous buffer. The existing 400px proximity
observer starts the carousel and image window. The initial entry animation
shares the post-1 window, so it does not fetch an extra batch for its starting
last slide. Subsequent movement/resize expands the fetched set; downloaded
photos are retained for reversing and loops. Reflections and Swiper clones
reuse their post's canonical CMS URL.

Home head includes `src/instagram/loading-head.html`, a small published-only
fetch guard. It temporarily uses display:none only on unselected lazy photo
images; native card/frame dimensions and Designer bindings remain unchanged.
Without an early guard the browser's native lazy threshold can request extra
photos before deferred carousel code runs. Before Swiper makes its loop copies, the controller also parks unselected src/srcset values in runtime data attributes, preventing clone creation from fetching them. Selected originals and copies restore the same sources. The guard adds no images or network
requests, and contains no responsive counts or carousel logic. JavaScript-off
pages retain native images; runtime/dependency failure releases the guard after
15 seconds. This is a progressive loading window, not a cap on total photos
retained after browsing. Other IG feed variants are unchanged.

Verification: `tools/test-instagram-loading.mjs` checks current staging markup
with local code (`--live` checks the published release), exact initial network
counts, next/previous, responsive resize, all 16 loop positions, photo/reflection
completion and script-failure/no-JavaScript fallbacks. Options `--failure` and
`--nojs` exercise the fallback cases. The test uses the existing environment's
Playwright/Chromium setup. No other component runtime or stylesheet changes.


## Final IG cleanup — 9 October 2026

- Collection List limit is 20: Webflow emits at most 20 real cards into the
  page HTML. This is independent of the 3/5 unique-photo loading window.
  The existing 16 records, ordering, CMS fields and visibility are unchanged.
- Removed the hidden `data-ig-field=alt` and `data-ig-field=id` paragraphs from
  the native CMS template. Real image alt-text bindings remain intact. Runtime
  reads only fields it displays; CMS records themselves were not modified.
- Repeated sync calls return when the active post is unchanged; loop-copy
  changes still synchronize slide classes. The image window only visits pending
  slides on navigation/breakpoint/copy changes. Existing ticker reveal timings
  and shared motion are preserved.
- `node tools/build-instagram.mjs` builds readable and minified distribution
  files using the repo's locked Terser 5.44.0 dependency in tools/runtime-build.
  It also runs from the shared builder. `--check` validates both artifacts.
  Optional TDB_TERSER_MODULE points to an existing installation.
- Home footer uses only the minified file. Source remains readable and the
  existing early loading gate remains unchanged. Staging publication only.


## Lifecycle and shared-gallery cleanup — 9 October 2026

Release 2.1.2 (gallery plugin 1.1.1) fixes remounts by clearing original slide
readiness and restoring authored image loading attributes on teardown. Each
new mount removes the fallback marker before rebuilding its image window.
Refresh also cancels proximity observers and dependency watchdogs for detached
roots. Loaded image URLs remain the original CMS sources.

The shared gallery now reads the IG root's Designer column-gap once at
initialization and in beforeResize. The separate IG ResizeObserver and
write/read margin measurement plus secondary swiper.update() are removed.
Only native IG and the already-excluded Smile sliders bypass the legacy
loop-copy mutation mirroring/event forwarding; Swiper loop copies remain.
Gallery count listeners are only attached when a count node exists.

Metrics without any known values do not mount a ticker. Share controls still
work and a future non-empty CMS share count automatically enables its ticker.
Unused share-url writes and duplicate video hidden-state writes are removed.
The obsolete Home-only data-tdb-home-desktop-cleanup style block is removed;
the early IG image-loading gate remains.

Regression checks cover partial/full image-window destroy/remount, repeated
destroy and mount, exact 3/5 first-entry network counts, navigation and all
16 loop positions, responsive spacing, no secondary full update on resize,
and absence of the legacy IG clone-mirroring observers/forwarding listeners.
The release is based on the current shared registry release 46eed029 so
other shared modules remain byte-for-byte unchanged.
# Initial DOM metadata consolidation — v2.1.5

Home's native CMS slide owns `data-ig-record-url`, `data-ig-record-date`, `data-ig-record-likes`,
`data-ig-record-comments`, `data-ig-record-shares` and `data-ig-record-media-type`, each bound to the
same Media Gallery field as the former hidden record. The reader prefers
these attributes and retains descendant-field fallback for older markup.
Image source parking retains the existing `data-ig-src`/`data-ig-srcset`
contract, covered by a restoration test.
An explicitly blank attribute stays blank; zero metrics remain valid.
The record namespace avoids collisions with stationary display hooks such as
`data-ig-date`; browser testing rejected the unnamespaced v2.1.3 trial.

This removes seven hidden elements per post after the unconsumed grouping
wrapper was removed separately: 112 additional initial elements across the
current 16 posts. No content, motion, image-window or carousel logic changes.
`node --test tests/instagram-metadata.test.cjs` compares all 16 published
records and checks blanks, zero, old markup and invalid/duplicate links.

Staging only. Rollback the native bound attributes/hidden fields together with
the Home script pin to `11353aaea879a8cbcb881bb3b62adad5050ff6d8` (v2.1.2).

