# Runtime ownership and bundle decisions

## Current loading model

| Stage | Owner | Conditional work |
| --- | --- | --- |
| Footer startup | Existing post-fonts loader | Appends consent and basic navbar scripts; the timing experiment is preserved. |
| Essential foundation | Consent bundle + navbar loader | Banner/policy, shared dependency registry/scroll lock, disclosure and basic navbar state. |
| Local feature release | `tdb-runtime.js` | Starts small feature launchers after a valid decision; each checks its markup and gates. |
| Nearby content / intent | Sliders, review/IG/USP/Five Senses/VIP launchers | Downloads the feature controller and its shared dependencies when needed. |
| Optional remote media / tracking | Vimeo, analytics and Brevo owners | Rechecks the relevant consent state, including after asynchronous work. |
| Other-page compatibility | Calculator, old Instagram, review archive, legacy reviews, awards | Still referenced by page/template or embedded code; migration is page-specific. |

The Home and standard pin maps differ. A filename is not enough to identify the running code. The [inventory](../../config/runtime-inventory-2026-10-14.json) records immutable versions, overrides and consumers; the [catalog](module-catalog.md) covers each artifact.

## Keep, combine or share

| Family | Decision | Why / next step |
| --- | --- | --- |
| Consent policy + banner + scroll lock + registry | Keep the existing essential bundle | Already one request; splitting small shared prerequisites would add an early dependency chain. Keep basic navigation independently testable. |
| Runtime orchestration and small launchers | Keep one runtime bundle | These co-load today. Definition-only launchers preserve demand loading of their large controllers. Fixed per-feature startup failure isolation. |
| Swiper engine + TDB adapter + entry/gap/duration plugins | Keep together; minify the entire bundle | They are a single prerequisite for consumers. Previously the adapter was appended as readable text. |
| Gallery, parallax, quotes, cards, marquee | Keep feature controllers separate | They use the same engine/motion/ticker but different page presence and proximity gates. Combining all would increase cold work. |
| Review CMS + quote adapter | Candidate for a small review-data bundle | The main review loader loads both. Archive and other consumers also use CMS alone, so compare route-level transfer/cache reuse before merging. Preserve `TDBReviewCMS` and `TDBReviewQuotes` APIs. |
| Review cards, drawer contents and drawer template | Keep separate | Near-viewport rendering and explicit drawer opening have different triggers. Do not prefetch all review DOM/data just to reduce requests. |
| Forms + VIP form behavior | Keep the existing combined VIP-form bundle | Already co-loaded. Webflow still owns submission; capture/replay must preserve validation and the submitter. |
| Five Senses renderer + experience | Keep one ES module behind its launcher | They are always used together. Now minified. Do not put image/audio/GPU work into the site runtime. |
| Vimeo loader + controller | Keep separate | Permission/proximity gate is small; controller and external player SDK should stay conditional. |
| Calculator core + UI | Keep its existing combined controller behind the loader | Core is separately readable/testable. The loader has a custom transport path to migrate to the shared registry after a CSS-before-init test. |
| Old Instagram pair | Migrate to the native/deferred system by page | The existing bootstrap selects one variant by Home page ID and desktop width; it does not ordinarily request both. They duplicate implementation/maintenance. One fetches a manual JSON snapshot; the other supplies a JS snapshot. Home now uses native IG, so verify whether the old desktop-only branch has any remaining reachable consumer. |
| Legacy review drawer / first impressions / first-visit snippets | Migrate to native CMS + shared carousel/drawer | They retain repeated review data, SVG strings, gesture/ticker/reveal logic and broad observers. They are still live elsewhere, so removal needs markup/data parity. |
| Attribution | Keep separate for this candidate | Already has readable/minified code and its own repository. Integrate its release entry here; a future source move must preserve submitted field names and consent behavior. |

## Shared resources worth extending

1. **Dependency transport:** use `TDBModules` for calculator and VIP requests once their fallback/readiness behavior is covered. Unify URL resolution, required exports, error classification and one-flight handling. Preserve stylesheet cascade position and readiness sentinels; a generic append-to-head helper is insufficient for all CSS owners.
2. **Feature lifecycle:** a small shared lifecycle scope could own AbortController, timers, observers and dispose callbacks. The newer review/IG/USP launchers already follow this pattern. Older forms/VIP/slider observers do not all share complete teardown.
3. **DOM discovery:** consider one batched added/removed-node dispatcher for runtime features. Several body-subtree observers independently rediscover nodes. Measure callback/DOM-query cost before replacing them; do not mount every feature eagerly.
4. **Overlay coordination:** reuse scroll-lock tokens and site-chrome coordination. A shared focus/overlay stack could remove VIP versus generic drawer differences, but needs nested consent/VIP/calculator/dialog focus tests before adoption.
5. **Review and availability data:** retain the shared clients already present. Review pagination guards, request sharing, cancellation and the compact availability feed are valuable; do not replace them with per-component fetches.

Small idempotent helpers embedded in two independently useful bundles are not automatically wasteful. Compare compressed bytes against the extra request and dependency delay before extracting another common file.

## Contracts to preserve

- Public `window.TDB*` APIs, custom event names and DOM hooks.
- Webflow form IDs, names, selected values, native validation and submission order.
- Accept/reject/withdrawal behavior; recheck permission after awaits.
- First input while a script is loading; cancellation while opening; rapid close/reopen.
- Focus return, inert/hidden state, scroll-lock ownership and Back/forward restoration.
- Motion durations, full-motion override, carousel progress/reversal and reduced DOM budgets.
- Native CSS ownership, authored CMS records and public asset reuse.
