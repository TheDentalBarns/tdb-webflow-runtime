# Treatment guide comparison

The Treatments collection has a native `Treatment Guide — wheel` component below the existing guide. The old guide remains available for comparison. The native component owns the heading, CMS introduction, five labels, typography, grey/selected colours, dividers and source content. The current click-wheel iteration is an explicitly requested temporary patch: its ring geometry and persistent preview are applied only after the optional enhancement mounts. Designer and the initial unenhanced page retain the original thin-orbit layout until this trial is approved for native migration.

The treatment name, introduction, chapter titles and full chapter bodies use existing CMS bindings. Five short introductions are shared component properties: the Treatment collection is at its 60-field limit. No collection fields or treatment content were changed. The title remains an editable component property. No content is fetched or replaced by JavaScript.

## Ownership and loading

- `src/runtime/treatment-guide-loader.js` is a small presence/consent gate. It prepares the wheel near the section and replays an initial drag after preparation. Native Webflow tabs and native details provide navigation and full chapter content when an enhancement fails.
- `src/treatment-guide/wheel.js` owns pointer/keyboard motion and eased colour interpolation. The full annular finger pad accepts dragging; unwrapped angles cross twelve o'clock without jumping. Release momentum feeds an angular spring, with a little radial elasticity returning to the pad's middle. Colours still come from Designer. The shared full-motion policy and motion profile control timing. Work stops when settled, offscreen, hidden or destroyed. The SVG viewport owns touch-action for pad gestures; its empty centre and corners remain outside the hit area.
- `src/treatment-guide/card.js` creates one temporary preview from the existing bound panes. Pagination and Explore retain the same DOM nodes and position across all five chapters. Only the current pagination value uses `TDBNativeTicker`; titles slide horizontally with the shared travel timing, and blurbs use the existing fade timing. All five text rows reserve their maximum height. The persistent Explore target changes with selection and still reuses the review summary's compact pulse, busy state and arrow artwork. No new pulse animation is introduced.
- `src/treatment-guide/drawer.js` is prepared on Explore intent. It reuses the USP styles, shared drawer, ticker, Swiper, reading-state and carousel controls. It copies the existing bound content on first preparation. The treatment name replaces the USP logo. Changing chapters selects the native tab and moves the optional wheel behind the drawer.
- `tdb-treatment-guide.css` contains the temporary scoped ring/card patch and established drawer differences. It loads near the guide, before wheel mounting; no guide layout is added to shared initial CSS. If the enhancement fails, native tabs/details remain visible. If the drawer fails after the preview mounts, the selected native full body is revealed and focused.
- The shared drawer accepts an optional `returnFocus` resolver. Its default is unchanged. The guide returns focus to the persistent Explore control (or the active native chapter's control in fallback mode).

## Validation and limits

Automated Chrome checks cover desktop, 390px and 320px layouts, all five tabs, stable preview height, native content when both guide modules are blocked, keyboard selection, spring intermediate frames, touch dragging beyond the orbit, colour interpolation, drawer selection, focus return, close, inner scrolling and phone landscape. Physical iPhone Safari remains untested. Desktop backgrounds are inert while the modal is open; the wheel continues to reflect drawer selection visually.

The 980-test suite includes seven guide tests for angular/radial springs, pad presses, wraparound, native/keyboard selection, colour easing, teardown and focus return. Browser checks cover persistent control identity and geometry, title travel, blurb fades, mouse and touch pad gestures, correct drawer targets, focus return and both blocked-enhancement fallback paths. Build artifacts and release inventory must be checked together. The existing unrelated `src/smile-gallery/feed.js` formatting warning remains outside this change. Changed source files pass formatting checks.

The native five full bodies count toward initial page HTML, including closed details. The temporary old/new comparison intentionally duplicates that content. Drawer copies and Swiper loop copies are deferred until intent. The wheel adds shared motion/ticker requests only when not already loaded; drawer dependencies are likewise deduplicated by `TDBModules`. File/gzip estimates are asset budgets, not measured TBT or browser transfer totals.

The click-wheel patch adds one small card controller to the existing wheel bundle and loads the scoped stylesheet near the section. Exact raw/gzip sizes and source lists are recorded in `config/build-artifacts.json`; existing shared downloads reduce the cold path. Native page CSS and HTML are separate Webflow output. No new global startup request or homepage guide request is introduced.

From the Designer perspective, bindings and resting layout remain editable. From the visitor perspective, content and controls remain useful through loading failure. From the runtime perspective, physics and drawer construction have separate lifecycles and gates. From the release perspective, all four install references move to one immutable commit, with a staging-only publish.

## Rollback

Restore the privately saved site head/footer blocks and publish staging only. Hide the comparison component in Designer to remove the new native guide; the original guide and collection schema remain intact. Do not commit private HTML, CMS exports or full custom-code backups. Production publication is outside this review.
