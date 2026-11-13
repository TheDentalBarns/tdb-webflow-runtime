# Smile Gallery native layout

The standalone gallery uses native Webflow CMS elements and styles for its card
layout. Do not add runtime grid, crop, title-height or treatment-height overrides.

Webflow page: `6aa3efd54f3f705caf98c687`.

- `smile-grid_items`: three columns at desktop, two at the tablet breakpoint
  (991px), one at mobile landscape and portrait (767px and below).
- `smile-grid_photo`: a cream 2:1 frame. Two native CMS-bound images crop the
  upper and lower halves of the same original photograph. The first half is
  clipped at the comparison divider, providing a static before/after preview
  in Designer even without the runtime.
- `smile-grid_header` and `smile-grid_treatments`: native reserved height for
  titles and up to four treatments. Fact cells use three equal columns with
  fixed separators. Diamonds and price/clock/clinician icons are native images
  using the shared SVG assets.
- Both original and preview images bind to the existing Before and After
  Picture field (`aa4720b752c738bec3c93bb0a30c66c5`). No CMS content was changed.

The runtime reuses those two image elements. It adds interaction to the divider
and opens the shared case drawer. `head.html` reads display preferences before
paint; an explicit Before/after preference switches to the stacked square view.
Slider remains the default.

Loading, filtering and width changes fade only images and changing text. Cream
frames, before/after labels, fact icons and card dividers stay visible. Lazy
images fade after decoding without eagerly loading the full gallery. Mobile
browser toolbar height changes do not trigger this transition. A failed runtime
load releases the pending state so the native gallery remains available.

Validation: focused gallery/blog interaction tests and generated-build checks.
Native breakpoint/crop rendering is also verified on the staging site without
the gallery runtime, in addition to normal interactive browser checks.
