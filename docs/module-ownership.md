# Runtime module ownership

Maintained native/shared modules after the 3 October 2026 cleanup. Webflow owns
component structure, CMS content, initial layout, reserved dimensions, typography,
colour, spacing, responsive styles and control appearance. GitHub owns behaviour.

## Responsibilities

| Published artifact | Responsibility | Does not own |
| --- | --- | --- |
| `tdb-modules.js` | Resolve shared release URLs, cache one request/promise per URL, retry failed downloads. The review-loader pin, or otherwise the marquee-loader pin, is the common release for motion, filters, drawers, tickers and custom Swiper. | Consent decisions, component mounting, viewport playback |
| `tdb-motion.js` | Shared duration policy; DD text opacity; general fades; timing defaults consumed by drawers, tickers and review components. | Swiper engine or interruption implementation, fetching, CMS content, layout |
| `tdb-swiper-8.4.7.min.js` | Existing custom Swiper engine plus `TDBSwiper.bindSwiper`: interruption continuity, loop handoffs, parallax continuity and a decelerating touch-release curve. The adapter ships in the SAME download. | Page discovery, consent, review content, component styles |
| `tdb-sliders.js` | Existing highlight/parallax carousel setup, controls, entry behaviour and slider focus. This is still a legacy combined component bundle pending component-by-component migration. | DD text implementation or a second Swiper engine |
| `tdb-drawer.js` | Shared native drawer shell: opening/closing, focus, scroll locking, lifecycle and cleanup. | Review cards, CMS selection, drawer styling |
| `tdb-filters.js` | Reusable filter panel, backdrop fade, accordion reveal, badge display, focus/control states, protected outside gestures, asynchronous apply-on-close and cleanup. | CMS, filter matching/sorting, result fetching, Swiper, visual CSS |
| `tdb-ticker.js` | Animate values using native Webflow ticker templates; settle interruptions and reduced motion. Reads the shared ticker duration. | Source values, aggregate calculations, text/slot dimensions |
| `tdb-reviews-loader.js` | Review permission policy, component discovery, proximity/intent preparation, shared dependencies, CMS fetch coordination and teardown. | DD, slider or drawer animation implementation |
| `tdb-review-cms.js` | Read published CMS markup, existing context matching, aggregates, record identity and source cache. | CMS authoring/schema or review text stored in JavaScript |
| `tdb-review-introduction.js` | Summary tickers, DD binding, arrow rotation and accessible review triggers for the native introduction. | Loading policy or full drawer content |
| `tdb-review-quotes.js` | Native quote-carousel setup, quote fades, byline DD binding and interaction state. | Duplicated Swiper/ DD implementation |
| `tdb-review-cards.js` | Native review-card carousel, pagination and quote choreography. | Duplicated engine, native card artwork or sizing |
| `tdb-reviews.js` | Review adapter: CMS matching/sorting, draft/committed selection, cached result batches, counts (including the filter action's shared ticker), full-review slider, pagination and quote choreography. | Shared drawer/filter interaction mechanics or styling |
| `tdb-review-legacy-loader.js` | Keep earlier review patches available to components awaiting migration. | New native components |

`tdb-logo-marquee.js` and its loader remain separate: the partner marquee does not
use Swiper. General timing settings are consumed where appropriate; a change to
one timing does not automatically alter every unrelated animation on the site.

## Dependencies and lifecycle

The filter's `View X review(s)` action uses the existing `TDBNativeTicker` from
`tdb-ticker.js`; it adds no dependency or loading gate. Webflow provides static
words, a clipped number slot, a hidden full-total sizer with a three-digit minimum,
and a reserved plural `s`. The review adapter supplies the CMS total and matching
count, hides the plural letter for one result without collapsing its space, and
updates the button's accessible label and disabled/busy states. First preparation
settles offscreen; visible filter changes animate in the same direction and at the
same shared duration as pagination. Closing settles motion; teardown destroys the
ticker instance. The shared ticker handles rapid updates and reduced motion.

Ratings and platforms are native checkbox options. Each category forms a union
(for example, 4 stars OR 1 star, and Google OR Doctify); categories are combined
with the existing treatment and experience filters. Each rating or platform's
availability is checked independently against the other categories, so existing
selections do not enable empty alternatives. All ratings and All platforms clear
their own selections; Reset clears every category. Each selected rating and
platform contributes to the floating filter badge and persists on panel close.
Webflow orders the groups as Treatments, Experience, Platform, Order and Stars.

Reset restores every category and Recommended order, and collapses open headings
through the shared filter controller's existing accordion animation. The shared
controller exposes `collapseAll`, `hasExpandedDisclosures` and an optional
`onDisclosureChange` callback; the review adapter owns whether Reset has work to
do. Reset is disabled, removed from the tab order and given the native Webflow
`.button.is-review-filter-action.is-disabled` appearance when the defaults are
already selected and every heading is closed. It is also disabled while applying
results. An unsuccessful metadata load retains the existing Reset-to-retry action.
No extra script, observer, animation loop or injected style is added.

The native cream filter heading and Reset row use 20px backdrop blur and sticky
positioning inside the scrolling filter panel, except in phone landscape below.
The body scrolls beneath them; Webflow owns the insets, responsive spacing and
indented options. The charcoal review-drawer bar artwork remains unchanged.
None of these styles is injected by JavaScript.
The filter's cream/20px-blur background is a separate native
`tdb-review-filter_surface` sibling of `tdb-review-filter_scroll`. The panel itself
has no backdrop filter: nesting a whole-panel blur around the sticky bars prevented
their blur from softening the scrolling option text in Chromium. The separate
surface preserves the existing cream opacity and panel blur while allowing both
bars to blur the filter body. This is native structure/CSS only; the shared filter
controller still animates, focuses and gates the same outer panel.
The cream panel's top edge has no border. Native option artwork reuses the site's
stars and clock for sorting, filled/outlined stars for ratings, and greyscale
Google, Yell, Facebook and Doctify logos for platforms. Treatment and experience
options retain their labels and ticks only. These decorative icons have no script
dependency and do not alter the option labels announced to assistive technology.

The native review footer uses three grid columns: pagination, a reserved centre
column for the filter toggle, then the existing navigation arrows explicitly in
column three. Floating the same toggle never repositions the arrows. Review content, header, quote-mark
layer and footer share a native `data-tdb-review-reading-pane` wrapper. Their
existing positioning and per-slide scroll remain the default.

For touch phones in landscape (`orientation: landscape`, width <=991px,
height <=500px, primary pointer coarse), the review adapter enables native
`is-phone-landscape` combo styles. The reading pane becomes the scroll container;
the header and footer join normal flow and Swiper's existing auto-height measures
the active review. The filter occupies the reading pane and its title/Reset rows
also scroll normally. Only the existing close controls remain over the content,
with a native dark tint and 20px blur for contrast. While filtering, the same
filter toggle moves outside the reading flow as the isolated central X; the
blocked main X is hidden. Closing or rotating restores the original control node.
No controls, sliders or handlers are duplicated. Rotation preserves reading
position where the destination scroll range permits. Landscape navigation captures
the existing footer offset before Swiper measures the incoming review and restores
it synchronously after that measurement. When the footer is outside view, the
reading offset is retained and clamped to the new scroll range. This uses the
existing Swiper events and ResizeObserver, without another animation loop. Fresh
drawer opens and changed filter result sets still start at the first quote.
Landscape slides align at the bottom; transient space above a shorter incoming
review takes the viewport's native charcoal background. Swiper's existing height
measurement, horizontal timing and easing remain in use. There is no height
transition on its wrapper that could prematurely end the horizontal transition.
The filter has no extra bottom spacer: its isolated X shares the Reset button's
bottom inset, including the device safe area. The orientation listener is removed
on teardown. This adds no module,
request, consent condition, CMS rule or injected stylesheet.

Shared Swiper behaviour 1.1.0 changes touch release to
`cubic-bezier(.22,.61,.36,1)`, avoiding a second gentle acceleration after dragging.
The wrapper and parallax elements use that curve for the release transition and
restore their component easing afterwards. Swiper retains its snap target and the
component's width-aware duration; free scrolling or multi-card momentum is not
enabled. Programmatic navigation, cancelled/tap gestures, loop corrections,
interruption continuity and teardown retain their existing behaviour. This helper
still ships inside the existing custom Swiper request; no dependency is added.

The loader checks permission and component presence before preparing a feature.
Proximity (currently 700px for reviews) or intent requests preparation. Visibility
controls playback. Reduced motion determines how motion settles. These are four
separate decisions.

A saved cookie-banner decision is the existing default review gate, including
accept, reject or close. This is not a new marketing-consent dependency. Callers
with an actual consent dependency may supply `TDBReviewOptions.permission()` and
`subscribe(callback)`. Withdrawal tears down component instances; already fetched
shared definitions can remain cached for other permitted components.

Review and existing carousel loaders resolve motion and Swiper to one canonical
URL using the native review loader or the global marquee loader. Loading one feature first therefore cannot select an
older motion version or download another engine later. General motion/DD can load
without Swiper. The registry itself neither downloads these assets eagerly nor
mounts anything. Each component owns its `mount`/`destroy` lifecycle.

## DD text: one default in every migrated component

Call `TDBMotion.ddText(nodes)` after the component is permitted and prepared.
Every newly registered node transitions from its rendered starting opacity
(normally Webflow's 100%) into its current page-relative opacity over **250ms**.
The single value is `TDBMotion.defaults.ddStartup`, defined in
`src/shared/motion.js`. There is no per-component opt-out or Webflow control.

- The timer uses `performance.now()` at the actual first update. A stale animation
  frame timestamp during busy page startup must not consume the transition.
- The target is measured every frame from Webflow's layout. Afterwards the existing
  viewport curve and smoothing apply normally; scroll updates do not replay entry.
- Offscreen nodes may settle before entering view. No visibility trigger is needed
  to replay their initial transition.
- Reduced motion restores the authored opacity. Hidden documents suspend scheduled
  work. All registered nodes share one listener set and animation-frame scheduler.
- Repeated clients share a node without restarting its fade. Destroying the last
  client restores the original inline opacity and removes shared work when empty.
- Use `[data-tdb-dd-text]` for native component hooks; native review quote bylines
  also call the same helper. Destroy the returned handle on component teardown.

**Migration boundary:** existing Webflow IX2 `DD - Text Effect` interactions elsewhere
still belong to Webflow. They are not silently overridden by this GitHub cleanup.
For each later component, remove its native opacity interaction before binding the
same node to this helper. Keep the initial Webflow styling. Do not run IX2 and the
GitHub helper on the same opacity, or copy DD code into individual components.
The shared default guarantees the transition for each migrated iteration.

## Sources and builds

Edit these sources, then run `node tools/build-shared-runtime.mjs`:

| Maintained source | Artifact |
| --- | --- |
| `src/partners/loader.js` | `dist/tdb-logo-marquee-loader.js` |
| `src/partners/marquee.js` | `dist/tdb-logo-marquee.js` |
| `src/shared/modules.js` | `dist/tdb-modules.js` |
| `src/shared/motion.js` | `dist/tdb-motion.js` |
| `src/shared/filters.js` | `dist/tdb-filters.js` |
| `src/shared/drawer.js` | `dist/tdb-drawer.js` |
| `src/shared/ticker.js` | `dist/tdb-ticker.js` |
| `src/reviews/native/loader.js` | `dist/tdb-reviews-loader.js` |
| `src/reviews/native/cms.js` | `dist/tdb-review-cms.js` |
| `src/reviews/native/introduction.js` | `dist/tdb-review-introduction.js` |
| `src/reviews/native/quotes.js` | `dist/tdb-review-quotes.js` |
| `src/reviews/native/cards.js` | `dist/tdb-review-cards.js` |
| `src/reviews/native/drawer-content.js` | `dist/tdb-reviews.js` |

`node tools/build-shared-runtime.mjs --check` checks source/artifact parity.
`src/sliders/swiper-behaviour.js` is appended by the existing
`tools/custom-swiper/build.mjs` build. It remains part of the custom engine artifact,
not a separate script tag. Preserve the engine's existing security backport and
custom feature selection. The adapter was extracted without changing its movement
algorithm. `node check.mjs` is run from `tools/custom-swiper`.

Older `src/components/review-introduction*.js`, `src/reviews/review-drawer-*.js`
and the older `dist/tdb-review-introduction-loader.js` describe earlier migration
steps. They are not the sources of the native modules above and must not overwrite
them. Keep them until all remaining consumers are audited. Existing `src/sliders`
and footer builds also contain earlier migration history; do not rebuild unrelated
bundles as a side effect of changing this native/shared runtime.

## Compatibility and deployment

Older immutable `tdb-sliders.js` still calls `TDBMotion.bindSwiper`. That function
is now a thin compatibility delegate to `TDBSwiper.bindSwiper`; no Swiper patches
remain in motion. New component modules call `TDBSwiper.bindSwiper` directly.
Remove the delegate only after every live caller has migrated.

Deploy the existing registry, marquee-loader and native review-loader scripts at the same
immutable commit. The review loader resolves its own component assets relative to
that commit. The registry aligns older carousel dependency requests to that release
on native-review pages, falling back to the marquee-loader release elsewhere.
Pages with neither loader retain their existing pins. The shared Swiper dependency must include both `window.Swiper` and
`window.TDBSwiper`; a conflicting manually inserted Swiper script is an error to
resolve, not a reason to silently load a second engine.

Publish to the Webflow subdomain for review. Production promotion requires the
existing sign-off. Roll back both existing script pins together to
`7e5d62929ff27a4589e83e0f8642b11834cd4cb1` if needed. This cleanup does not connect the
prepared Review Excerpts, Review Tags or Review Page Contexts CMS collections.

## Review loading cleanup — 3 October, second pass

The Home review loader is now 3.3.0, the CMS reader 1.2.0 and the native drawer
3.3.0. This pass changes loading only; native classes, quote choreography, DD,
button states, reserved dimensions and CMS text bindings are preserved.

- A near introduction requests its introduction module and the shared dependencies
  required by the native drawer. Quote and card adapters wait for their own roots
  to approach. A page without a drawer or slider does not request Swiper for an
  introduction alone. Pages without review roots request no feature code.
- The existing CookieScript decision gate is unchanged: accept, reject or close
  releases non-tracking review functionality. Category-specific permission remains
  available through `TDBReviewOptions`; withdrawal destroys mounted instances and
  aborts their outstanding CMS requests. Cached shared definitions are reusable.
- Review Content's native collection list uses pagination at 20 items per page.
  The CMS reader follows Webflow's generated next link on the same-origin
  `/review-content` route, deduplicates master IDs and concurrent requests, and
  supports abort and retry. No API key or private CMS token reaches the browser.
- The drawer is built from the first batch during the 700px preparation window.
  At seven remaining loaded items (current plus six ahead), it requests the next
  batch. New slides append after an active movement finishes; the current index,
  text and scroll position are retained. The final arrow disables only at the
  actual end. A late/failed request can retry at the edge without resetting the
  drawer. The aggregate count remains visible; no “showing X” label was added.
- A CMS-rendered introduction or quote carousel may need a record beyond the first
  batch. Its identity is resolved from CMS-rendered content, and only enough pages
  to reach that record are fetched. No names or quotes are hard-coded in runtime.
- The existing **looping Review Cards** component still needs its complete sequence.
  It fetches remaining pages only when that component approaches the viewport.
  That deliberate compatibility boundary avoids making its partial tail wrap as
  if it were the final review. Converting its looping sequence to incremental
  append is a separate component task; it does not burden the first section.
- Home's obsolete `data-tdb-home-review-count` inline style was removed. Its
  element-specific selector matched no published Home element. Location and
  other legacy pages retain their dependencies until individually migrated.

### CMS connection still pending

The prepared Review Excerpts, Review Tags and Review Page Contexts collections
remain unconnected. No new fields, variables or controls were introduced. The
available element tools expose the collection query but not the CMS text/reference
bindings required to replace the current master-review quote source. Changing the
source alone would break the existing bound quote/name/platform, so it was left
intact. Finish this in Designer as one verified change, not through a GitHub copy
of CMS content.

Home currently keeps the existing `Snippet rank` selection for its quote and trio,
and `Full review rank` for the paginated drawer. The prepared excerpt context must
be connected before claiming that hero, trio and drawer share one editorial order.
Keep other contexts inactive until their own pages are migrated. New topic
placements with `Available` off remain off pending editorial review.

### Validation and rollback for this pass

`tests/review-loader.test.cjs` covers permission/presence/proximity ownership,
component-specific imports, optional Swiper, repeated sync and regrant.
`tests/review-pagination.test.cjs` covers 108 records, batch deduplication,
concurrency, shared-client abort, retry and rejection of cross-origin next links.
Both require `jsdom` available to Node. The browser validation covers desktop and
mobile, preparation before click, 20/40/60/80/85 records, append stability and
permission teardown/remount. Existing layout and animations are unchanged.

Roll back the Home loader and registry pins together to
`b814fda03a9c8a45c08073474d8bac60daa132f7`, and turn Review Content pagination off
with its old 100-item limit. Do not roll back only the loader: version 3.2.0 does
not consume paginated content. This is a staging-only deployment.

## Partner marquee cleanup — 3 October

`src/partners/loader.js` builds `dist/tdb-logo-marquee-loader.js` (1.1.0).
`src/partners/marquee.js` builds `dist/tdb-logo-marquee.js` (0.9.1).
Both now use the shared build command above.

Webflow's Banner Partners component owns all visual presentation, including the
`partner_logos` grab cursor, focus-visible outline and the mirrored
`is-keyboard-focused` combo class. The `logo_image.is-partner-hovered` combo owns
hover opacity. JavaScript only sets/removes those state classes; the runtime no
longer creates a stylesheet. Drag-specific `touch-action: pan-y`, transforms and
`will-change` remain runtime behaviour and are restored on destroy.

The old IX2-targeted heading element was replaced inside the SAME component with
a plain element bound to the SAME `Banner heading` property
(`18d8945c-7ffc-85da-4a54-a4d4dfcda416`). Instance values and other props remain
unchanged. Its classes are retained, native initial opacity is 1, and
`data-tdb-dd-text` binds it to `TDBMotion.ddText`. The obsolete Home head opacity
rule was removed. No global IX2 action lists were deleted; other components keep
their interactions. The new heading has no IX2 target identity.

The loader still requires a CookieScript accept/reject/close decision, component
presence and 600px proximity. This is an initial-load scheduling gate, not consent
for tracking; it deliberately latches and does not require withdrawal teardown.
It requests shared motion through `TDBModules` before the marquee, preserving the
250ms DD startup used by reviews with one shared dependency request. No Swiper
engine is needed by the marquee. Its existing 200px activity margin, offscreen/tab
suspension, drag/coasting, measured loop widths and Home/desktop reduced-motion
exceptions are unchanged. DD itself follows the shared reduced-motion policy.

Destroying/restarting the marquee also releases/remounts DD and clears temporary
hover/focus classes, avoiding duplicate DD clients, listeners or logo copies.
This migration affects the reusable component on staging; production is not
published by this pass.

Registry 1.2.0 also aligns motion and the compatible Swiper adapter to the marquee
loader pin on pages without native reviews. This prevents an older carousel
request from selecting a different shared helper. It does not preload Swiper.

## Review filter icon trial — 4 October

The native Review Drawer navigation now starts with a filter toggle using the same
`tdb-review-drawer_nav-button` circle and existing 1rem group gap. Its three SVG
lines and transform origin live in Webflow. Shared `TDBMotion.filterToggle`
animates them into an X over 300ms, reverses from the current rendered state on
rapid taps, supports keyboard activation and settles immediately for reduced
motion. Native reviews reset the toggle on close and destroy it with the drawer.
This is an icon-only staging trial; it does not filter records or open a panel.
The existing top-right X remains the drawer close control. No extra script is loaded.

Filter refinement: the native SVG uses an opaque-stroke mask and one currentColor
paint layer so translucent strokes do not brighten at the X intersection. The
middle line scales horizontally from both ends to zero and expands on reversal;
its opacity stays unchanged. Runtime mask IDs are unique per mounted control.


## Review filter panel pilot — 4 October

Supersedes the icon-only trial above. Native reviews 3.5.1 adds a bottom-up filter
panel inside the existing Review Drawer. CMS reader 1.3.0 supplies its data, and
motion 1.4.2 adds a change callback/programmatic state to the existing icon helper.
No additional runtime download or embedded script was added.

### Ownership and native data

- Webflow owns the panel, headings, options, cream (85% opacity), 20px backdrop
  blur, spacing, scrolling, responsive grid, selected/unavailable appearance and
  initial closed state. It sits immediately above the existing grey footer.
- GitHub owns panel movement, keyboard behavior, state, filtering, sorting,
  batching and cache coordination. The loader's existing permission/presence/
  proximity policy remains unchanged. The main review drawer still enters from
  the right; only its filter panel rises from the footer.
- Review Content now includes a native metadata-only Collection List marked
  `data-tdb-review-index="v1"`, alongside the first 20 full reviews. It selects
  approved, non-excluded reviews in the same Full review rank order, at 100 index
  entries per page. Index pagination is followed independently beyond 100.
- Each index entry contains slug, rating, platform, date, rank and native topic
  visibility flags. It contains no review body/excerpts and no author-name copy.
- The existing Review Topics CMS template now exposes native bound review fields
  at `/review-topics/{slug}`. These data-only pages have noindex/nofollow. The
  reader validates approved visibility, exclusion, origin, path and record ID.
  All 85 current master records were already published and approved; no record
  approval, text, ranking or field schema was changed by this pilot.
- The existing Review Responses list remains the response source. Its slug-keyed
  response map is reused for individual fetches, retaining the one-star response.

### Results and loading

Recommended retains native CMS order. Other choices sort highest/lowest rating
or newest/oldest date; ties retain native order and unknown ratings/dates go last.
Filters choose one value per group (rating, platform, treatment, experience),
combined with AND across groups. Availability counts replace the candidate's own
facet while preserving the other selections, so changing one facet is possible.
Selected options and each All option remain removable/selectable when applicable.
No AI or text inference runs in the browser: topics are existing CMS flags.

The first existing CMS request includes the index. Drawer-open/filter intent
finishes index pagination if required, never a full-review loadAll. A selection
uses cached bodies and fetches ONLY missing IDs for its first 20 matching results,
with up to four concurrent requests. Approaching seven remaining records fetches
the next 20; append waits until movement settles. Shared request promises prevent
duplicate requests; completed records remain cached across filter changes. A new
selection cancels its obsolete requests and stale results cannot overwrite it.
Failures retain the existing view and allow retry; unavailable options are not
inferred from an incomplete index. Permission teardown cancels work and cleans up.

The full-list header aggregate is unchanged. The footer pagination follows the
selected result set. Escape closes the filter panel first; the main X still closes
the whole review drawer. Reduced motion settles the panel and morph immediately.

Validation: `tests/review-filter-index.test.cjs` covers 108 index entries, cached
first-20 gap filling, duplicate-request sharing, response preservation, retry,
abort and rejecting IDs outside the published index. Browser checks cover mobile
and desktop, one-star/Yell exclusion, date order, first/next 20 batches, Escape,
existing drawer close and absence of duplicate requests. Roll back the Home loader
pin to `c6e50fc3d7b898fd05582002a266e3c1abcc93bb` to restore the icon-only runtime;
the new native panel stays closed under that runtime.


Reopening from a named CMS quote clears an old drawer filter so the clicked review
opens in its original editorial sequence. Keyboard, rapid-selection and reduced-
motion checks cover the panel in addition to normal pointer activation.


## Review filter glass and combinations — 4 October

Native reviews 3.6.0 and CMS reader 1.3.1 retain the indexed, cached 20-result
batches. Webflow owns the Smile Gallery cream finish (rgba(235,226,210,.84),
150% saturation, 20px backdrop blur), accordion structure, tick artwork and all
control styles. GitHub owns disclosure movement and state. There is no new script.

Treatments and experiences use multi-selection: every selected distinct topic
must match. Rating and platform remain single-selection; facets combine with AND.
Selected choices always remain removable; unavailable additions are disabled from
the complete metadata index. Each All choice clears only its own group. Reset
clears all groups and restores Recommended. Keyboard activation, aria-checked,
aria-expanded, reduced motion and teardown cover the new controls.

Clear aligners and Invisalign are aliases of one matching identity, `clear-aligners`.
The shared CMS reader normalises either existing topic flag and deduplicates both.
Both page paths use the same context; original CMS fields and quoted wording remain
intact. An excerpt may fall back to its alias when its own field is empty. Native
filters normalise selected values too, so aliases cannot create two requirements.
Smile Gallery already uses one Clear Aligners / Invisalign category. This is a
matching rule, not a claim that every generic aligner review names the Invisalign
brand. New components must use the same identity when connecting the prepared CMS.


Native reviews 3.6.1 adds a native Webflow filter backdrop matching the outer
drawer's 50% black overlay. It sits below the cream panel and charcoal controls,
dims the review content, fades with the panel, and tapping it dismisses filters.
Reduced motion and teardown settle/remove its runtime animation. Publish native
control markup with its matching release pin; older open tabs need a refresh to
receive new event handlers. Mobile validation includes real touch tap events.


## Stable review filter panel — 4 October

Historical 3.7.0/3.7.1 behaviour below; 3.8.0 supersedes dismissal and header controls.

Native reviews 3.7.0 uses a tall panel with a fixed top and bottom within the
review drawer. A small responsive strip of dimmed review content remains above it.
Webflow owns this geometry: heading and actions do not shrink; the middle groups
container alone scrolls. Accordion reveals use the Smile Gallery's 400ms easing
and upward-to-rest entry, independent of width-sensitive carousel duration.

Filter selection is a draft until View reviews is pressed. Tick state, availability
and counts update immediately. A 150ms scheduling window prefetches missing bodies
for the first 20 matching records through the existing cache. It never rebuilds
Swiper or replaces slides during editing. Apply awaits/reuses that batch, commits
one result sequence, then closes the panel. Reset changes the draft only. Closing
via X, Escape, backdrop or the outer drawer discards unapplied choices and cancels
their client requests. Rapid edits and close-during-apply cannot commit stale data.

Both footer numbers use the existing TDBNativeTicker. While filtering they preview
01–matching-total; applying retains that result count, while cancel restores the
applied sequence and position. Totals animate down/up using the shared duration.
Reduced motion settles immediately; teardown releases both ticker instances.
Native CMS fields, source text, consent/presence/proximity gates and later batches
are unchanged. Publish the matching native structure and Home script pin together.


### Native FAQ/pricing reveal alignment — 3.7.1

Verified against published IX2 FAQ DD Accordion Open/Close (a-50/a-51) and
Price DD Accordion Open/Close (a-74/a-75). These set natural height immediately,
then fade content over 300ms linear, move it from -20px over 400ms outQuart,
and expand a 20px spacer over 300ms outQuart. Close hides the body immediately
and eases the spacer shut. The review filter now uses those independent timings,
rather than tweening body height, movement and opacity together. Opacity reaches
1 as in pricing/Smile Gallery; the native option colours still control emphasis.
Webflow owns the native group spacer and the centred flex action-button layout.

Outside-click handling captures at the enclosing drawer: review strip, header
and outer shaded backdrop dismiss the filter without also closing the review
drawer or clicking through. The main close X retains its full-drawer action.
The filter toggle, ticker, draft/apply and prefetch logic are unchanged.


### Persistent review filters — 3.8.0

Webflow owns the selection badge, its positioning on the filter circle, the open
highlight, and the dimmed main close control. The native header now contains
Filter reviews, View N reviews and Reset. The cream action footer was removed;
the charcoal review navigation footer stays. A native visually hidden live status
becomes visible on fetch failure. No CSS is injected by the runtime.

The badge counts rating, platform, treatments and experiences; sorting does not
count as a filter. The footer ticker remains the number of matching reviews.
Choices still preview and prefetch while editing, without rebuilding Swiper.
Every filter close route (its X, View reviews, Escape, outside tap) now applies
and preserves choices using the same cached first-20 batch. An unchanged close
keeps the current review position. Reset alone clears choices. If loading fails,
the filter stays open with choices intact and a visible retry message.

Window capture consumes outside pointerdown, pointerup and the subsequent click,
including a click arriving after closure, matching Smile Gallery's protection.
The main drawer X is inert, dimmed and out of the tab order while filters are open;
it is restored when they close. The filter X stays highlighted throughout editing.
Native accordion motion, shared motion/ticker/Swiper, CMS, caching and loading gates
are unchanged. No additional script or dependency was added. Publish matching
Webflow structure/styles and the Home runtime pin together.


## Reusable filter controller — 4 October, reviews 3.9.0

`src/shared/filters.js` / `tdb-filters.js` 1.0.0 now owns the filter panel
interaction previously embedded in the review adapter. No review selectors, CMS
fields, data fetches, Swiper calls or CSS injection are in the shared controller.
Existing Webflow markup/classes and motion timings stay unchanged. Accordion
spacer targets are measured from the native expanded/collapsed state classes.

`TDBFilters.mount(panel, options)` returns the same instance for repeated mounts.
Pass actual element references: `toggle`, optional `backdrop`, `heading`, `badge`,
`escapeRoot`, `blockedControls`, `inertTargets`, and disclosure descriptors
`{ key, button, body, group?, chevron? }`. Default state classes can be overridden
through `classes`; `labels` supplies accessible open/close text. The consumer
owns native structure and selection summaries.

Hooks: `onIntent()` prepares the consumer's data; `onChange(open)` pauses/resumes
the consumer; `beforeClose({reason, signal})` applies its selection. Return false
or reject to retain the panel/choices; `onError(error)` supplies consumer-specific
feedback. Concurrent close attempts share one pending commit. Teardown invalidates
pending completion, aborts the shared signal and restores native state. Consumers
must also abort their own data requests and reject stale result commits.

API: `setCount(number)` updates the native selection badge; `requestClose(reason)`
is the user-facing apply/close path; `set(open, immediate)` and `reset(immediate)`
are programmatic lifecycle operations; `destroy()` removes listeners/animations
and permits a clean remount. `isOpen` reports state.

Reviews 3.9.0 owns all matching, sorting, aliases, availability, Reset, labels,
result prefetch/cache, counts and CMS rendering. It supplies these through the
controller hooks. Main drawer shell, icon morph, number tickers and Swiper stay
in their existing shared modules. Smile Gallery is not migrated by this release;
its future adapter can consume this controller without changing review code.

Loader 3.4.0 requests filters only where the native review drawer exists, after
the existing permission and proximity/intent checks. Registry 1.3.0 canonicalises
filters/drawer/ticker pins as well as motion/Swiper before promise deduplication.
No eager filter load, second Swiper bundle or new Webflow controls were added.

Checks: `node tests/shared-filters.browser.cjs` (Playwright Chromium; optional
`TDB_CHROMIUM` executable) exercises a standalone non-review consumer, remount,
failed/duplicate/stale close requests, reduced motion and cross-pin single loading.
The staged review adapter is also checked at mobile/desktop widths with touch
events, persistent selections, outside isolation, icon states and cached loading.


## Vimeo boundary — 4 October

Vimeo is independent of Swiper, DD text, drawers and filters. It neither imports
those modules nor adds video-specific code to them. See
[vimeo-cleanup-2026-10-04.md](vimeo-cleanup-2026-10-04.md) for the audit, native
style changes, validation and complete rollback checkpoint.

| Artifact | Responsibility |
| --- | --- |
| `tdb-vimeo-loader.js` | Early consent-trigger clicks, remembered play request, presence, 300px preparation, one CSS/controller request and retry. |
| `tdb-vimeo.js` | Existing hero/ambient/content player state machines, one Vimeo SDK, play/pause, responsive hero selection, viewport suspension and fitting. |
| `tdb-vimeo.css` | Vimeo state selectors, the existing CSS pulse, poster transitions and structural/compositing compatibility. No new visual design. |
| Native Webflow video classes | Frame, poster and control appearance, placement, responsive geometry and initial play/pause/loading visibility. |

The small deferred loader is available before consent; otherwise the first press
could not request consent. Vimeo's actual dependency is **functionality** permission,
not merely any cookie-banner response. The stylesheet is first-party presentation
and does not need that permission. The controller is requested after permission
and proximity/intent; it rechecks permission before initialising. The Vimeo SDK and
iframes remain permission-gated. Playback rules stay variant-specific.

`tdb-ui.css` no longer contains Vimeo. Its current remaining responsibilities are
Elfsight visibility, shared scroll/runtime states, deferred Lenis/consent/VIP guards
and slider-focus states. It remains an early, nonblocking global stylesheet; it is
not a presence-gated JavaScript module. Shared filter animation remains in
`tdb-filters.js`, with motion helpers in `tdb-motion.js`.

Build Vimeo with `node tools/build-vimeo.cjs` (Terser 5.39.0); use `--check` for
source/artifact parity. `python tools/build-ui.py --global-only` rebuilds just the
current global stylesheet. Do not rebuild unrelated legacy bundles during this pass.


## Standalone review archive — 4 October

The native `/reviews` page uses `tdb-review-list-loader.js` and `tdb-review-list.js` for measured masonry, batches of 20 and URL filter state. It reuses the CMS parser/cache plus the shared filter, motion and ticker modules; it does not load Swiper. The Webflow CMS renders the first batch, featured excerpts and full review text before enhancement. Webflow also owns the existing blurred quote-card styling, white review bodies, responsive columns/gaps and controls.

`tdb-review-availability.js` reads the same Banner Settings CMS feed used by the nurture pages. See [review-archive.md](review-archive.md) for ownership, gating, pagination, preset links and the deferred excerpt/context ranking boundary. The rollout is isolated to the new page; existing review component pins are unchanged.


## Review drawer touch-start stability — 5 October, reviews 3.12.3

The speech-mark SVG now stays in its native static layer for the full drawer lifecycle. Previously the first horizontal touch move reparented it out of the active card, then settlement moved it back. That changed the SVG/card rendering layers in the same frame as the initial transform and quote fade.

Webflow still owns the speech-mark position, width, artwork, colour and responsive styling. The review adapter applies only the active reading pane's vertical offset on portrait scroll; the landscape reading pane moves the layer naturally. A single passive capture listener is removed on destroy. There is one SVG, no clone, no persistent animation loop and no extra module or stylesheet. Existing shared fade durations, arrow navigation, Swiper throw/settling behaviour, permission/proximity gates and CMS ordering remain as before.

`tests/review-touch.browser.cjs` checks the native staged component with touch input: no SVG relocation during the first/cancelled/full swipe, aligned portrait/landscape reading offsets, arrow handoff, reduced motion and single-instance markup. Set `TDB_CHROMIUM` for the browser executable and optionally `TDB_REVIEW_SOURCE` to preview a local drawer module. Physical Android compositing should still be checked when reviewing the staging fix.
