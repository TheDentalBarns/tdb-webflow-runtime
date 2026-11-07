# Treatment guide comparison

The Treatments collection has a native `Treatment Guide — wheel` component below the existing guide. The old guide remains available for comparison. The native component owns the section heading, CMS introduction, five labels, preview typography, grey/selected colours, desktop divider, mobile divider, spacing, orbit and Explore controls.

The treatment name, introduction, chapter titles and full chapter bodies use existing CMS bindings. Five short introductions are shared component properties: the Treatment collection is at its 60-field limit. No collection fields or treatment content were changed. The title remains an editable component property. No content is fetched or replaced by JavaScript.

## Ownership and loading

- `src/runtime/treatment-guide-loader.js` is a small presence/consent gate. It prepares the wheel near the section and replays an initial drag after preparation. Native Webflow tabs and native details provide navigation and full chapter content when an enhancement fails.
- `src/treatment-guide/wheel.js` owns pointer/keyboard motion and eased colour interpolation. Cartesian drag allows movement outside the orbit, adds velocity on release, then uses a damped spring to the chosen chapter. It reads Designer geometry and colours. The shared full-motion policy and motion profile control its timing. Work stops when settled, offscreen, hidden or destroyed.
- Page pagination uses `TDBNativeTicker` and native number/line slots. Explore reuses the review summary's compact pulse, loading state and shared arrow artwork. There is no new pulse animation or inline artwork.
- `src/treatment-guide/drawer.js` is prepared on Explore intent. It reuses the USP styles, shared drawer, ticker, Swiper, reading-state and carousel controls. It copies the existing bound content on first preparation. The treatment name replaces the USP logo. Changing chapters selects the native tab and moves the optional wheel behind the drawer.
- `tdb-treatment-guide.css` owns only deferred drawer differences. Page layout remains in Designer. No guide layout was added to shared initial CSS.
- The shared drawer accepts an optional `returnFocus` resolver. Its existing default is unchanged. The guide returns focus to the active chapter's Explore control when the original launch pane has become hidden.

## Validation and limits

Automated Chrome checks cover desktop, 390px and 320px layouts, all five tabs, stable preview height, native content when both guide modules are blocked, keyboard selection, spring intermediate frames, touch dragging beyond the orbit, colour interpolation, drawer selection, focus return, close, inner scrolling and phone landscape. Physical iPhone Safari remains untested. Desktop backgrounds are inert while the modal is open; the wheel continues to reflect drawer selection visually.

The existing 978-test suite includes five new behavioral tests for the spring, native/keyboard selection, colour easing, teardown and focus return. Build artifacts and release inventory must be checked together. Windows checkouts need line endings normalized for Prettier; the existing unrelated `src/smile-gallery/feed.js` formatting warning remains outside this change. Changed source files pass formatting checks.

The native five full bodies count toward initial page HTML, including closed details. The temporary old/new comparison intentionally duplicates that content. Drawer copies and Swiper loop copies are deferred until intent. The wheel adds shared motion/ticker requests only when not already loaded; drawer dependencies are likewise deduplicated by `TDBModules`. File/gzip estimates are asset budgets, not measured TBT or browser transfer totals.

The presence/intent code increases the consent-released runtime by 3,512 raw bytes (771 gzip). Wheel plus previously unloaded motion/ticker is 37,185 raw bytes (13,713 gzip). The complete cold path, including the runtime increment, both guide modules, motion/ticker, drawer, Swiper and all three drawer stylesheets, is 170,538 raw bytes (55,035 gzip); existing shared downloads reduce that total. Native page CSS and HTML are separate Webflow output and are not included in these script/style figures.

From the Designer perspective, bindings and resting layout remain editable. From the visitor perspective, content and controls remain useful through loading failure. From the runtime perspective, physics and drawer construction have separate lifecycles and gates. From the release perspective, all four install references move to one immutable commit, with a staging-only publish.

## Rollback

Restore the privately saved site head/footer blocks and publish staging only. Hide the comparison component in Designer to remove the new native guide; the original guide and collection schema remain intact. Do not commit private HTML, CMS exports or full custom-code backups. Production publication is outside this review.
