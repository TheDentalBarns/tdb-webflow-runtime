# Home treatment values and motion

The Home treatment component uses native Webflow CMS items as its only data source.
No treatment JSON endpoint, Worker deployment, or new head code is required.

Each main slide's existing hidden CMS source link supplies:

| Attribute | Native CMS field |
| --- | --- |
| `data-tdb-treatment-price-source` | Low Price (`schema`) |
| `data-tdb-treatment-duration-source` | Slider duration (`slider-duration`) |

Bind those attributes in Designer to the current treatment item. Publish CMS changes
to the relevant site so the values are included in its HTML. The runtime reads the
selected rendered item, so CMS sorting and new items need no JavaScript price table.
Missing values remain blank rather than retaining another treatment's facts.

Designer owns the counter and facts slots on all breakpoints, fixed price image
icons, CTA alignment, five-vw image-to-stamp gap and control offsets above the 5px
progress bar. Existing native classes are scoped by the Home component variant.
Only pagination and fact value spans animate through the shared `TDBNativeTicker`
controller; the icon and CTA stay in place. Home shows only the starting price
at bottom left, with light text and the CTA at bottom right. The optional duration
slot has been removed from Home; its CMS field remains reusable. Numeric CMS prices receive GBP
formatting, including thousands separators. The treatment title retains the
existing horizontal slide motion and the blurb retains its fade.

Desktop stamps, divider, text viewport and footer share the native focused-image
width: `calc((min(94vw, 90rem) - 4rem) / 3 * 2 + 2rem)`. Below the desktop
breakpoint these rows use their container width. Only the image viewport overflows,
preserving the blurred neighboring image. The finite stamp track has no trailing
padding; the text viewport clips neighboring content. Price and CTA sit at opposite
ends of the footer. Desktop CTA vertical padding is .35rem; mobile keeps .75rem.
Pagination and controls sit 1rem above the 5px progress bar inside the focused
image. All of this is saved in existing native component variants, not runtime CSS.
The main Swiper viewport also uses that focus width with visible overflow. Its
finite end stop can therefore align the last treatment without counting the
blurred neighbor as part of the viewport. Desktop width motion identifies finite
slides by their item index when Swiper's loop-only index attribute is absent;
both the outgoing and incoming image animate continuously.

Home sets `data-tdb-treatment-loop="false"`. A future variant can opt into main
slide looping and mobile stamp recycling with `data-tdb-treatment-loop="true"`.
Without that explicit attribute the postage design is finite, and mobile dragging
clamps at the last stamp. Desktop and mobile manual browsing resume alignment smoothly
when a stamp or the main slider is selected. Stamp opacity transitions belong to
Designer rather than cancelled/replaced filled animations.

After manual browsing, selection eases the stamp row directly to its final
alignment while the main image catches up. It does not combine that return with
the image's moving progress target, so an already-aligned stamp stays still.
Drag-click suppression is limited to the completed pointer gesture and expires;
an omitted compatibility click cannot swallow the next tap or keyboard action.
Clean mobile touch taps select on pointer release, without relying on a browser
click after scrolling. Any follow-up click is consumed to prevent duplicate
selection; cancelled touches and horizontal or vertical drags never select.

Validation: CMS reorder/missing values, rapid selection, static icons, reduced
motion, finite drag boundaries and reversal, eased return, loop opt-in and disposal
are covered by the treatment tests.
