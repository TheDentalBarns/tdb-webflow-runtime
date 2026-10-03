# Review Introduction migration — WORK IN PROGRESS

Nothing in this branch is referenced by Webflow yet. No deployment or publication has occurred.

## Ownership

Webflow owns markup, initial values, number-slot dimensions, typography, logo artwork, spacing, responsive rules, hover appearance and CMS quote selection. GitHub owns only optional number motion and behavioural controllers. The loader owns permission and download timing; the component contains no consent, CMS fetching or selection logic.

## Prepared Webflow components

- Site: `677cf86cf9952f978d94d80c`; Home: `677cf86df9952f978d94d8a9`.
- Reviews / Review Introduction: `1e6d2fa0-eb51-af7e-5dc2-307ef04c9501`.
- Reviews / Review Summary: `50534c54-e1ae-0ff8-0bc0-38fd7b938d5a`.
- Both are drafts. Introduction contains Summary but has not replaced any homepage instance.
- Original Hero - Headline and Mini Review Widget remain intact for current consumers.
- Introduction's two copied legacy script/data embeds have been removed. Static SVG embeds contain artwork only.
- Native summary preserves the existing four source logos, stars, two-row card and arrow artwork. Current static seeds: `4.93`, `(84)`; targets `4.94`, `85`. No new component properties or variables.
- Quote list is connected to Review Topics (`6ab6638e2159a2087d5413c9`) and limited to one. The owner connected Featured excerpt and Reviewer display name manually. The connector omits native CMS bindings from its readback.
- Platform SVGs are prepared and named by the required Platform condition. Conditional visibility is NOT connected yet; do not publish them as-is.

## Runtime files

`src/shared/value-tickers-native.js` exposes `TDBNativeTicker.mount(slot)`, returning `update(text, direction, animate)`, `settle()` and `destroy()`. It preserves visible initial content, uses native `review-number_value` and `review-number_incoming` classes, and only animates transforms. No CSS injection, hard-coded widths, resize measurement or font-size duplication. The host reserves space in Designer. Reduced motion settles immediately, including preference changes mid-animation. Destroy settles to the final value, removes temporary nodes and restores the original content structure.

This is a reusable primitive for later carousel migration. The existing `TDBTicker.update/count` API and existing carousel consumers have NOT been replaced; do not claim the site-wide consolidation is complete.

`src/components/review-introduction.js` exposes `TDBReviewIntroduction.mount(root, options)`. It reads final values from `[data-tdb-review-rating]` and `[data-tdb-review-count]`, and animates once at 25% visibility. It is idempotent and has explicit cleanup. Controls remain disabled unless an `openReviews({trigger, reviewId, signal})` callback is supplied. That callback must respect the AbortSignal and must not open after permission is withdrawn. Supply `closeReviews()` to close an owned drawer on cleanup. Error events are emitted as `tdb:review-error`; a native status element still needs integration.

`src/components/review-introduction-loader.js` exposes `TDBReviewIntroductionLoader.start({urls, permission, subscribe, componentOptions})`. `urls` must contain the immutable ticker and component URLs in that order. Modules only define APIs; they never initialise themselves.

- Default gate mirrors Partners: wait for a completed CookieScript decision (accept, reject or close). This is a scheduling gate, not a marketing-cookie requirement.
- No matching component: no download.
- Component more than 600px away: no download.
- Actual visibility is handled separately inside the component.
- A genuine category requirement can supply a `permission()` predicate and `subscribe(refresh)` callback returning an unsubscribe function.
- Withdrawal destroys mounted instances and stops the next download in a pending sequence. In-flight JavaScript cannot be un-downloaded, but only inert API definitions may complete.
- Permission is checked again before mounting. Later permission changes need no reload.
- Missing JS leaves the Webflow layout and seed values readable. The drawer trigger starts with `aria-disabled=true`, `tabindex=-1`.

## Confirmed blockers / remaining integration

1. The connector stores the Collection List source but rejects filters and sort with `No source connected. Set a source first.` The owner has confirmed Source is correctly selected in Designer. Do not ask them to reselect it again.
2. Set native list filters in Designer: Approved for display on; Exclude from display off; Featured excerpt set. Sort by Snippet rank ascending; keep Limit 1. Apply the relevant topic filter per page when migrating further instances.
3. Existing homepage quote Hannah Birkett (`6ab66665c4913869c0b14dc2`) is `isDraft=true`, `approved-for-display=false`, `needs-checking=true` and has never been published from CMS. Its current displayed text comes from the embedded snapshot. Only Nick Gibb and Hayley Clamp currently match the approved/not-excluded/excerpt-present data query. Do not silently substitute a quote or bulk approve CMS items.
4. Add CMS conditional visibility to each named source SVG (Platform equals Google/Facebook/Yell/Doctify). Confirm source accessibility text and historic-review disclosure where applicable. Direct/Other should not display an unrelated logo.
5. Bind the selected CMS item's identity for opening that exact review. Current runtime expects `data-tdb-review-id`; verify the field uses the drawer record ID, not the platform review ID. A slug-to-ID mapping may be preferable during drawer migration.
6. Preserve/forward the parent's existing Summary text/link properties and instance overrides. Definitions were copied but forwarding to the newly inserted nested component remains to be checked.
7. Whole-card hover must drive the arrow appearance through a native Webflow interaction; currently only the arrow's own hover style is prepared. Preserve focus/active behaviour and drawer arrow rotation when wiring the drawer.
8. Existing drawer v1.9.9 requires both `window.TDBPowerSnippets` and `[data-tdb-review-drawer-data]`. These came from the removed embeds. Prepare a separate external service/data bridge before enabling the new card. Do not rewrite the drawer or restore scripts inside the component. Keep CMS quote selection native.
9. Assemble section spacing and place the component at main-wrapper level, separate from the parallax section. Do not move the original until appearance and dependencies are verified. Check original variants and all existing instance settings.
10. Confirm native ticker classes survive published CSS generation; verify desktop/mobile/landscape/reduced-motion/delayed-JS scenarios on staging before retiring any global patch. Audit quote-height changes with different excerpts.

No current global review scripts or other carousel scripts have been removed. Retire legacy paths only once their last consumer is migrated.

## Validation

Six JSDOM behaviour tests pass: seed visibility and repeated mount; reduced-motion changes; optional drawer callback and listener cleanup; permission/proximity/download gating; withdrawal during pending download; no-component case and cookie rejection as a completed decision.

Run with Node and jsdom available: `node tests/review-introduction.test.cjs`. Alternatively set `TDB_JSDOM_PATH` to an installed jsdom module path. These are behavioural tests, not proof of browser appearance or completed integration. The native card's two-row shape was checked using Designer snapshots; full responsive page verification remains pending.

## Publication

Finish the above integration, create immutable asset pins with readable version comments, then obtain current review-section staging publication authorisation. The earlier Partners staging publish is not a claim that this unfinished review draft was published. Do not publish custom domains.
