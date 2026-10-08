# Native Instagram / Awards

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
