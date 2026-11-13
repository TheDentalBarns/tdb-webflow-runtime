# Smile Gallery native layout

The standalone gallery uses native Webflow CMS elements and styles for its card
layout. Do not add runtime grid, crop, title-height or treatment-height overrides.

Webflow page: `6aa3efd54f3f705caf98c687`.

- `smile-grid_items`: three columns at desktop, two at the tablet breakpoint
  (991px), one at mobile landscape and portrait (767px and below).
- `smile-grid_photo`: a cream 2:1 frame. Two native CMS-bound images crop the
  upper and lower halves of the same original photograph. The first half is
  clipped at the comparison divider. The images and divider have native opacity
  zero, so Designer shows the cream holding frame and fixed Before/After labels.
- `smile-grid_header` and `smile-grid_treatments`: native reserved height for
  titles and up to four treatments. Fact cells use three equal columns with
  fixed separators. Diamonds and price/clock/clinician icons are native mask
  slots using the shared SVG assets. The same mask URLs serve cards and filters,
  avoiding mixed image/mask fetch modes for identical artwork.
- Images, titles, treatment lists and fact values start with native opacity zero.
  Fact icons, labels, separators and frames remain visible. The photos start
  unfocusable and disabled until the gallery is ready.
- Both original and preview images bind to the existing Before and After
  Picture field (`aa4720b752c738bec3c93bb0a30c66c5`). No CMS content was changed.

The runtime reuses those two image elements. It adds interaction to the divider
and opens the shared case drawer. It reads saved filters, arranges the cards and
then reveals their content; it does not hide the initial view. `head.html` contains
only a no-JavaScript visibility fallback, with no first-paint script or stylesheet
overriding the authored initial state. Slider remains the native 2:1 default.
An explicit Before/after preference switches to the stacked square view while
content is held, as a display filter rather than an initial-layout correction.

Loading, filtering and width changes fade only images and changing text. Cream
frames, before/after labels, fact icons and card dividers stay visible. Lazy
images fade after decoding without eagerly loading the full gallery. Mobile
browser toolbar height changes do not trigger this transition. A failed runtime
load reveals the native CMS content as a readable fallback, with inactive controls.

Validation: focused gallery/blog interaction tests and generated-build checks.
Native breakpoint and holding-state rendering is also verified using published
Webflow styles without the runtime or the no-JavaScript fallback, matching the
Designer canvas. Published no-JavaScript fallback and normal interactions are
checked separately.

The embedded filter's layout, typography, icon appearance, count slots and lower
landing bar are authored in Webflow, including tablet/mobile breakpoints.
`tdb-smile-page.css` is an interaction module loaded by `standalone.js` through
the shared dependency registry, not an eager page-head stylesheet. It contains
the prepared-content states, comparison controls, generated options and drawer
interaction styles. Do not put native initial-layout corrections back into it.

`data-tdb-deferred-mask` uses the existing shared 400px artwork proximity policy.
The tiny critical guard replaces only the network-bearing mask URL with a
transparent mask until release; geometry and appearance remain native. Designer
and no-JavaScript pages retain the authored artwork. Runtime changes only the
artwork variable, never the icon's size, position or markup.
