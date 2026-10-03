# Runtime module ownership

Maintained native/shared modules after the 3 October 2026 cleanup. Webflow owns
component structure, CMS content, initial layout, reserved dimensions, typography,
colour, spacing, responsive styles and control appearance. GitHub owns behaviour.

## Responsibilities

| Published artifact | Responsibility | Does not own |
| --- | --- | --- |
| `tdb-modules.js` | Resolve shared release URLs, cache one request/promise per URL, retry failed downloads. On native review pages, the review-loader pin is the common release for motion and custom Swiper. | Consent decisions, component mounting, viewport playback |
| `tdb-motion.js` | Shared duration policy; DD text opacity; general fades; timing defaults consumed by drawers, tickers and review components. | Swiper engine or interruption implementation, fetching, CMS content, layout |
| `tdb-swiper-8.4.7.min.js` | Existing custom Swiper engine plus `TDBSwiper.bindSwiper`: interruption continuity, loop handoffs and parallax transform continuity. The adapter ships in the SAME download. | Page discovery, consent, review content, component styles |
| `tdb-sliders.js` | Existing highlight/parallax carousel setup, controls, entry behaviour and slider focus. This is still a legacy combined component bundle pending component-by-component migration. | DD text implementation or a second Swiper engine |
| `tdb-drawer.js` | Shared native drawer shell: opening/closing, focus, scroll locking, lifecycle and cleanup. | Review cards, CMS selection, drawer styling |
| `tdb-ticker.js` | Animate values using native Webflow ticker templates; settle interruptions and reduced motion. Reads the shared ticker duration. | Source values, aggregate calculations, text/slot dimensions |
| `tdb-reviews-loader.js` | Review permission policy, component discovery, proximity/intent preparation, shared dependencies, CMS fetch coordination and teardown. | DD, slider or drawer animation implementation |
| `tdb-review-cms.js` | Read published CMS markup, existing context matching, aggregates, record identity and source cache. | CMS authoring/schema or review text stored in JavaScript |
| `tdb-review-introduction.js` | Summary tickers, DD binding, arrow rotation and accessible review triggers for the native introduction. | Loading policy or full drawer content |
| `tdb-review-quotes.js` | Native quote-carousel setup, quote fades, byline DD binding and interaction state. | Duplicated Swiper/ DD implementation |
| `tdb-review-cards.js` | Native review-card carousel, pagination and quote choreography. | Duplicated engine, native card artwork or sizing |
| `tdb-reviews.js` | Populate the native review drawer with CMS records, full-review slider, pagination and quote choreography. | Shared drawer shell mechanics or styling |
| `tdb-review-legacy-loader.js` | Keep earlier review patches available to components awaiting migration. | New native components |

`tdb-logo-marquee.js` and its loader remain separate: the partner marquee does not
use Swiper. General timing settings are consumed where appropriate; a change to
one timing does not automatically alter every unrelated animation on the site.

## Dependencies and lifecycle

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
URL on a native-review page. Loading one feature first therefore cannot select an
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
| `src/shared/modules.js` | `dist/tdb-modules.js` |
| `src/shared/motion.js` | `dist/tdb-motion.js` |
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

Deploy the existing registry script and native review-loader script at the same
immutable commit. The review loader resolves its own component assets relative to
that commit. The registry aligns older carousel dependency requests to that release
on native-review pages. Pages without a native review loader retain their existing
pins. The shared Swiper dependency must include both `window.Swiper` and
`window.TDBSwiper`; a conflicting manually inserted Swiper script is an error to
resolve, not a reason to silently load a second engine.

Publish to the Webflow subdomain for review. Production promotion requires the
existing sign-off. Roll back both existing script pins together to
`7e5d62929ff27a4589e83e0f8642b11834cd4cb1` if needed. This cleanup does not connect the
prepared Review Excerpts, Review Tags or Review Page Contexts CMS collections.
