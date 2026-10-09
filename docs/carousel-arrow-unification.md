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
Existing drawer/viewer minimum sizes are preserved; no touch target was enlarged.

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

The before-state snapshot is `docs/carousel-arrows-native-before.json`.
Review publication is staging only; production domains are not published.
