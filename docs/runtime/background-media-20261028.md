# Shared background media: Home and Location

Completed on staging only, 28 October 2026. Runtime release [`83b097622bca5661580d6c1aa55181f2d46c27cf`](https://github.com/TheDentalBarns/tdb-webflow-runtime/commit/83b097622bca5661580d6c1aa55181f2d46c27cf) follows the [architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd). All four global install pins match this release. Production was not published.

## Native component and ownership

Home's location background and Location's “Experience Calm at Our Rural Hideaway” section already share **Component 1 - Bg image** (`492cd62a-b903-e2d4-f435-238f82e688a2`). It has 27 native instances and nests the existing Benefit Strip and Button - Secondary. No component copy, wrapper or other DOM node was added.

- The shared Benefit #2 default (`ba1901e3-5ec5-2772-d345-454d1f8361dd`) is now **ACCESSIBLE**, replacing CONVENIENT. Explicit instance overrides remain intact. Fourteen published labels inherit this update.
- The existing **Home scroll image** variant is renamed **Scroll media**, retaining ID `39349468-08e4-a5fc-a1d3-bb55f3e3452b`. Home retains this variant; Location now selects it too. Base and other variants retain their existing behavior.
- Native `.header111_background-image` overscan remains `scale:1.06`. The same `scale:1.06` is added to `.vimeo-bg` only within Scroll media. Native Designer continues to own layout, crop, copy and buttons. This is a variant style, not custom CSS or a runtime layout patch.
- The runtime selects `.section_header111[data-wf--component-1---bg-image--variant="scroll-media"]`. **The component and variant names therefore form a published selector contract.** Coordinate renames with `src/runtime/page-break-loader.js`; the component description records this dependency. One native variant chooses both crop and shared-motion eligibility, avoiding a second toggle that could diverge.
- The existing `TDBMotion.pageBreaks` owner translates the photograph or outer ambient Vimeo surface by the existing bounded -2vh/+2vh policy. Registration moves out of the Home-only block and uses the same preparation, consent, restoration, cleanup and motion-policy lifecycle. There is no new controller, scheduler, event listener or asset request.
- Text, Benefit Strip, button and overlay remain outside the translating surface. The existing overlay opacity curve has its own shared motion owner. Ambient Vimeo retains its existing player and poster lifecycle. The native media and readable content remain available without enhancement.
- The Benefit Strip's canonical SVG image assets remain unchanged, as on Home. These are single image nodes, not inline SVG trees. No extra mask holder or duplicate artwork was introduced for this section.

There were already no active IX2 bindings in either background section. Their published subtrees have no `data-w-id`; the complete generated IX2 event configuration and bundle remain unchanged. This release does not remove unrelated page interactions or claim the entire Location page is IX2-free.

Location keeps ambient film `1155096725`, its existing poster, and the Join VIP link to `#VIP`. Home keeps its existing photograph and See location link to `/location`. Button behavior, blur and content are unchanged apart from the shared benefit label.

## Verification

- Full suite: **795 passed, three skipped, zero failures**. Build/readable parity, motion CSS parity and changed-source formatting pass. Two added regressions cover photo/video registration without moving copy/controls, and exclusion of Base/unrelated ambient players. Existing shared lifecycle regressions also pass.
- The sitemap audit scanned 198 published paths without failed requests. It found 27 pages containing 45 rendered instances of this background family. Every audited page and section keeps its element count, media inputs and IX attributes. All text matches the saved baseline except the 14 inherited Accessible labels. Home remains at 1,133 initial elements and Location at 1,530.
- All four global install pins were read back. Published runtime, startup, foundation, motion and UI assets match local bytes. Webflow publication targeted its staging subdomain with no custom domains.
- Location desktop at 1440×900: the native frame is 900px high and the scaled surface 954px. Ambient video starts and removes its poster normally. Surface translation changed from +8.8709px to +3.0549px on reverse scroll, while copy translation stayed `none`. Crop covers the frame and the overlay retains its independent fade. No browser warnings/errors appeared in the checked session.
- Home desktop at 1280×720: the native frame is 720px high and the photo 763.2px. Photo translation changed from -5.03px to +1.1833px; copy stays still and the link remains `/location`.
- Location's 393px native Designer layout shows all three benefits, Accessible, copy and the shared variant correctly. A final 1280×720 staging screenshot shows the complete section. A fresh mobile runtime viewport check is **not claimed**: the browser override did not apply reliably. Physical Android Chrome remains untested in this step.

Before/after native trees, publication inventories, complete audit scripts, screenshots, test logs and CDN checks are saved outside the repository under `background-media-evidence`. No synced `sources/` reference was modified.

## Delivery cost and engineering assessment

Controlled deltas compare saved staging output and runtime `86b1da68c04b6d3dbbfc0737f61cb9657a839029` with this release. Gzip uses one local implementation; these are delivery accounting, not measured browser transfer, TBT or speed improvements. HTML publication metadata and variant names can affect compression.

| Affected delivery | Raw change | Controlled gzip change |
| --- | ---: | ---: |
| Home HTML | +79 B | +36 B |
| Home native CSS | +65 B | +3 B |
| Location HTML | +162 B | +45 B |
| Location native CSS | +65 B | +1 B |
| Webflow IX2 bundle | 0 B | 0 B |
| Existing deferred runtime JS | +116 B | +48 B |

Combined affected delivery is **+260 raw / +87 gzip bytes for Home**, and **+343 raw / +94 gzip bytes for Location**. Startup, foundation, shared motion and shared UI are unchanged. There are no additional asset requests or DOM elements.

Maintenance gains a single native variant and shared owner for photo/video motion. Designer preserves editable native layout and accurate fallback content, with the selector-name contract disclosed. Performance keeps the existing deferred loading, scheduler and bounded crop at a small measured delivery cost. Accessibility preserves readable native content, stationary interactive controls, existing consent handling and central reduced-motion policy. The remaining limitation is physical/mobile runtime verification, not an undisclosed Designer workaround.

## Rollback

Restore all four install pins to `86b1da68c04b6d3dbbfc0737f61cb9657a839029`; set Location's background instance back to Base; rename Scroll media back to Home scroll image; and remove only the variant's added `.vimeo-bg` scale override. Retain Home's original photo overscan. If reverting the copy as well, restore the shared Benefit #2 default to CONVENIENT. No IX2 binding needs restoration. Publish staging only and recheck the native variant output, media crop and Home/Location motion. Preserve the separate completed Vimeo cleanup and Location hero correction.
