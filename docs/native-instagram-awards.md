# Native Instagram / Awards

Home now renders its Awards Instagram feed as a visible native Webflow CMS
Collection List with one card template. Released to the Webflow staging
subdomain on 9 October 2026; production custom domains were not published.

## Release

- Controller: `src/instagram/native.js`, built to `dist/tdb-instagram-native.js`.
- Version: **2.0.1**.
- Immutable runtime commit: `aa5c0ea47ac02415a00fe9b13b5f6dc2774d79b6`.
- Review branch: `cleanup/instagram-cms-20261009`.
- Home footer contains one `data-tdb-instagram-native` script and release comment.
- Shared Gallery, Swiper, Motion and NativeTicker remain in their existing owners
  and resolve through the deployed TDBModules registry. No shared module changed.

## Designer and CMS ownership

The homepage Awards and nested Instagram instances were unlinked with David's
explicit approval. They are now native page elements. Their original component
definitions remain available; future edits to those definitions do not update
this homepage section. The connector could not establish a working CMS context
inside the component, so the migration reused the existing connected page list.

Edit the card design once in Home's Collection Item. Webflow owns the card,
images, reflection/glass treatment, icons, fixed information frame, responsive
layout and empty state. The main image and both reflections bind directly to
Image; the main image alt text binds to Alt Text. Decorative images have empty
alt text. All three images have authored lazy loading and async decoding.

The visible list uses the existing **Media Gallery** collection:

- Categories contains **Awards** and Visible is on.
- Display Order ascending, then Date descending.
- Dynamic query, up to 100 items, offset zero, pagination off.
- All 16 previously published Awards records retain their order and values.

Small text/link fields remain hidden *inside each visible item* to supply the
stationary date, metrics, counter and outbound link. They contain no images.
There is no separate hidden source Collection List, no three static starter
cards and no runtime card-template cloning or image-source rewriting.

The shared Swiper engine still makes its normal transient loop copies. The
controller moves the existing last item ahead of the first solely for the
established one-entry advance; it restores CMS order on teardown.

| Native element | Page element ID |
| --- | --- |
| Homepage Awards section | `e1f578f4-dfdb-04e8-a989-11674cda4e5a` |
| Feed | `0c985299-ea2a-3ccb-b4d0-68784fad08ba` |
| Visible Collection List wrapper | `d1bcb98e-c203-1c99-4a4f-4924c74cdc26` |
| Collection List | `d1bcb98e-c203-1c99-4a4f-4924c74cdc27` |
| Single Collection Item template | `d1bcb98e-c203-1c99-4a4f-4924c74cdc28` |
| Main image | `0c985299-ea2a-3ccb-b4d0-68784fad08c3` |

## Behaviour and fixes

Shared entrance, loop, swipe, keyboard navigation, value tickers, current-post
links, video badge and share/clipboard behaviour remain. Gap values still come
from Designer slide margins. Full motion follows the shared site policy.

The controller reads the first item's details before lazy carousel mounting,
so there are no hardcoded preview dates, engagement counts or totals. The native
CMS Empty State uses `ig-native_cms-empty` with the existing empty-message style.
Blank engagement values remain blank, not fabricated zeroes. These are CMS
values; this work does not add a live Instagram API integration.

Two issues found during verification were corrected:

- Enter/Space activation is captured once before Swiper's own button handler,
  preventing a two-card jump from duplicate keyboard handling.
- Webflow's printed calendar dates are parsed as calendar dates. Formatting no
  longer moves a date to the previous day in a browser ahead of UTC/BST.

## Verification

The published staging page was checked in Chromium with the site's actual
styles, images and shared runtime, using a fresh browsing context:

- One visible CMS list, 16 native card nodes; no hidden source or source images.
- The 16 image URLs, post URLs, dates and order match the previous CMS source.
- Zero Instagram post-image requests while initially at the top of Home.
- Original CMS card nodes survive initialization; image/reflection/link/counter
  states agree through a complete loop.
- One-entry advance lands on post 1. Next and keyboard Previous work.
- Frame and viewport widths/positions agree at 1440, 991, 767, 390 and 320px.
- Shared full motion remains enabled with the OS reduced-motion preference set.
- Desktop and mobile screenshots reviewed; no page JavaScript errors observed.

The offline integration fixture additionally covers empty and single-item lists,
invalid metadata, teardown/remount, authored image attributes and calendar dates
under Europe/London time. Build/source parity and JavaScript syntax were checked.
The fixture uses the prior published HTML and dependency release
`d59c1a7414e9d459704a1d843ed1adfcdcaa7af8`.

Run `node tools/test-instagram-native.mjs <before.html> <dependency-dir> <css-dir>`
with Playwright and Chromium available. Set `TDB_CHROMIUM_EXECUTABLE` for a custom
Chromium executable. The fixture aborts image requests; published screenshots
and network checks were performed separately.

This is a structural and image-loading cleanup. No new Lighthouse/GTmetrix score
or overall HTML byte reduction is claimed. Native CMS cards are now rendered in
the delivered HTML, and the separate eager hidden-image feed has been removed.

## Rollback

Versions 2.0.0 and 2.0.1 share the native markup contract; the former pin is
`6bc4ea56966b719678ba2ce9dcce7826685bc3de` (without the calendar-date correction).

Returning to v1 requires a coordinated markup rollback, not only a script pin:
restore the original Awards/Instagram component instances, move the CMS list
back to its hidden `data-tdb-ig-source="awards"` container, restore the source
record image binding, then restore v1 commit
`06e035283cd51dce25be50acb480b8c963aa59fb`. Preserve current CMS items and all
unrelated runtime pins. Publish staging only until production is requested.

Other Instagram feed variants were not part of this migration.
