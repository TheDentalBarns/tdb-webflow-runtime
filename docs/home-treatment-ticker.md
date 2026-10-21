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

Designer owns the mobile counter and facts slots, fixed price/clock image
icons, CTA alignment, five-vw image-to-stamp gap and control offsets above the 5px
progress bar. Existing native classes are scoped by the Home component variant.
Only pagination and fact value spans animate through the shared `TDBNativeTicker`
controller; the icons and CTA stay in place. Price and duration sit side by side
in the native mobile facts row with light text. Numeric CMS prices receive GBP
formatting, including thousands separators. The treatment title retains the
existing horizontal slide motion and the blurb retains its fade. Desktop retains
its native title row and CTA.

Home sets `data-tdb-treatment-loop="false"`. A future variant can opt into main
slide looping and mobile stamp recycling with `data-tdb-treatment-loop="true"`.
Without that explicit attribute the postage design is finite, and mobile dragging
clamps at the last stamp. Independent manual browsing resumes alignment smoothly
when a stamp or the main slider is selected. Stamp opacity transitions belong to
Designer rather than cancelled/replaced filled animations.

After manual browsing, selection eases the stamp row directly to its final
alignment while the main image catches up. It does not combine that return with
the image's moving progress target, so an already-aligned stamp stays still.
Drag-click suppression is limited to the completed pointer gesture and expires;
an omitted compatibility click cannot swallow the next tap or keyboard action.

Validation: CMS reorder/missing values, rapid selection, static icons, reduced
motion, finite drag boundaries and reversal, eased return, loop opt-in and disposal
are covered by the treatment tests.
