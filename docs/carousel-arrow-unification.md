# Shared carousel arrows

The Services parallax is the visual reference. The native Webflow Designer
class `carousel-arrow` owns the circle: 3rem width/height, 1px border, 100%
radius, 8px backdrop blur, centred content, zero padding, and 300ms ease
transitions for background, foreground and border colours.

The class is first in the style stack on all 26 authored previous/next controls
found across pages and reusable components: Services/Treatments, Smile carousel,
Technology, Blackbrook, Location, home review cards, review drawer, practice
highlight drawer, partner viewer, native Instagram and Smile Gallery viewer.
Reusable definitions propagate the change to their page instances. Legacy
Instagram generators emit the same class. Existing classes and data attributes
remain as behaviour hooks and contextual colour/placement variants.

Common declarations were removed from nine former arrow styles. The review
filter and partner close buttons retain their original styling separately.
Drawer/viewer arrows use the same 3rem diameter, without a separate 44px minimum;
no touch target was enlarged. Filter controls retain their original minimum.

`src/styles/tdb-carousel-arrow-states.css` is the single shared state sheet,
installed in the site head as `style[data-tdb-carousel-arrow-states]`. It handles
pointer hover, press/selected/held feedback, keyboard focus, disabled/loading
feedback, and Swiper's locked state. It adds no JavaScript and no network request.
Local colours may differ. Do not reintroduce per-carousel blur, size or timings.

The old site-head Instagram geometry/50ms transitions and Location page-head
geometry/transition rules are removed. Smile Gallery's arrow-specific state
rules are removed from its pinned stylesheet, retaining filter and close states.
IG bundle changes are based on the actual deployed 6084b74 release so current
optimized images and feed data are preserved.

The First Visit audit also found two arrows inside the First Impressions embed
and two generated review-preview arrows, plus the on-demand legacy review drawer.
Those markup generators now use `carousel-arrow` and their duplicate geometry
and state CSS is removed. The legacy drawer is published as a separate
`tdb-legacy-review-drawer.js`, retaining its current behaviour and data;
the shared native `tdb-reviews.js` module is not replaced. Its immutable pin and
SHA-384 integrity value are updated together in the First Visit source embed.

The before-state snapshot is `docs/carousel-arrows-native-before.json`.
Review publication is staging only; production domains are not published.

## Staging validation

Published only to `dentalbarns.webflow.io` (publish task
`6524e2e5-ff7c-4b0c-844b-87cc25063baa`).

- Inspected Home, Location, Smile Gallery, a service page, About Us and First
  Visit at 1440px and 390px. This exposed the First Visit legacy controls,
  which were then migrated and rechecked.
- Final targeted pass covered 84 control instances across Home, Smile Gallery
  and First Visit at both widths. Every checked control had the shared class,
  a 3rem diameter, 1px border, 8px blur and 300ms colour transitions.
- Services, Smile carousel and native IG next buttons advanced their carousels;
  all three produced the same translucent hover fill.
- First Impressions and embedded review next buttons advanced their counters.
  The legacy full-review drawer opened and its next control worked.
- The Smile Gallery viewer opened, next navigation worked, and keyboard focus
  retained a 2px current-colour outline with 4px offset.
- No page JavaScript errors occurred during the final targeted browser pass.
- The deployed IG bundles were checked against their previous live release:
  only the added shared arrow class changed. Existing optimized feed data was
  retained. JavaScript syntax and whitespace checks passed.

