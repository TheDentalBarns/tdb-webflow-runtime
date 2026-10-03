# Review Introduction migration — unpublished draft

The homepage has NOT been replaced, and no new runtime references have been added to Webflow. No publication has occurred. Final integration is blocked by automatic approval review of the legacy data upload described below.

## Completed native Webflow work

- Site `677cf86cf9952f978d94d80c`; Home `677cf86df9952f978d94d8a9`.
- Reviews / Review Introduction `1e6d2fa0-eb51-af7e-5dc2-307ef04c9501` contains Reviews / Review Summary `50534c54-e1ae-0ff8-0bc0-38fd7b938d5a`.
- Existing component property definitions and variants retained; no new properties or variables. Parent Link/Text 1/Text 2 forward into the nested Summary instance `c7a11e05-861f-13e4-45c1-cd63a4085171`.
- Agreed numeric seeds are 4.93 and (84); runtime targets remain 4.94 and 85. The old homepage instance still has its original (76) override; migrate that deliberately to the agreed (84) seed while preserving its other settings.
- Native summary owns the white two-row card, logos, stars, number slots, arrow, label and focus outline. Full-card arrow hover is IX3 interaction `i-b45a20a6`. It is saved, but interactive preview verification remains necessary.
- Introduction contains no executable script embeds. Remaining embeds are static SVG artwork.
- CMS quote and reviewer name are bound by the owner. Platform icons have the owner-configured conditional visibility and accessible source labels.
- Collection List `40497428-30ac-9198-c945-e4762a4c09d3`: Review Topics `6ab6638e2159a2087d5413c9`, Match all: approved on, exclude off, featured excerpt set; Snippet rank ascending; limit 1. Owner screenshot confirmed these settings. The API incorrectly rejects filter writes despite the valid Designer source, so do not ask the owner to repeat this setup.
- Native quote reserves six lines on desktop/tablet, eight at the small breakpoint and ten at tiny. Flex centres shorter quotes vertically; min-height allows longer text/zoom to expand without clipping. Existing 84 excerpts were inspected; a full rendered maximum-height audit across devices is not complete.
- Root is a semantic section with native `review-intro_section` styling. Top/bottom padding: main 7rem/14rem, medium 6rem/13rem, small 4rem/11rem, tiny 8rem/16rem; horizontal 3%. Existing internal title margins and Extra Padding property remain intact. Actual page spacing still needs comparison before replacing the old section.
- Native status element `195bb6f3-5aa2-4472-22fe-b18100f95687` is positioned within the reserved bottom space, so drawer errors do not push page content.
- Quote/author have `data-tdb-review-excerpt` / `data-tdb-review-author` hooks. The bridge resolves identity from the already-rendered CMS content; it never selects or rewrites the page quote.

## Runtime code saved on the review branch

Branch: `work/review-introduction-2026-10-03`.

- `src/shared/value-tickers-native.js`: native-style ticker primitive; WAAPI transforms only, preserves seeds, handles reduced motion and cleanup.
- `src/components/review-introduction.js` v1.1.0: plays once at >=25% card visibility, updates native error status, observes drawer busy/expanded state for the native arrow class, removes listeners/observers on destroy.
- `src/components/review-introduction-loader.js`: default completed CookieScript decision gate (accept/reject/close), component presence and 600px proximity gates; optional permission predicate/subscription; withdrawal prevents subsequent downloads and destroys mounted instances. In-flight downloads only define inert APIs. No new marketing-consent requirement.
- `src/reviews/review-drawer-bridge.js`: uses the existing drawer service, resolves the exact visible CMS excerpt where the snapshot matches uniquely, otherwise opens the general review list. Checks AbortSignal before loading/opening and closes only an owned drawer. The shared legacy drawer itself remains outside this migration's lifecycle rewrite.
- `src/components/review-introduction-entry.js`: external bootstrap. `dist/tdb-review-introduction-loader.js` concatenates bridge, loader and entry; relative module URLs derive from its immutable commit URL.
- Nine passing JSDOM tests across `tests/review-introduction.test.cjs` and `tests/review-drawer-bridge.test.cjs`. Tests cover visibility threshold, reduced motion, delayed permission/download, revocation, idempotency, errors, cleanup and drawer identity/cancellation. They do not prove visual appearance or exported CSS.

Run each test file with Node; use `TDB_JSDOM_PATH` if jsdom is installed outside the normal module path.

## Automatic approval block — do not bypass

Creating `src/reviews/legacy-review-service.js` in `TheDentalBarns/tdb-webflow-runtime` was rejected by automatic approval review because the file includes the existing 85-review snapshot (names, review text, ratings and associated metadata). The rejection requires explicit owner authorisation for that data to be uploaded to this GitHub repository. No such upload succeeded. Do not switch tools or destinations to circumvent the rejection.

The concrete prepared file is at `/tmp/tdb-review-work/src/reviews/legacy-review-service.js`. It externalises the existing homepage preview JSON, gzip drawer data and PowerSnippets JavaScript, preserving other homepage review consumers. Only source-icon lookup expands to recognise native Summary artwork. It contains legacy CSS/animations for those existing consumers; it does not style or select the new native CMS quote. This legacy service is distinct from the tiny new ticker and remains a later cleanup target.

The original homepage embeds remain the only current data/service source. Removing the old Hero - Headline before replacing that dependency would break other review consumers. Therefore no homepage replacement or new script pins were applied after the rejection.

## Remaining integration after owner resolves the data-upload approval

1. Upload the prepared legacy service only if explicitly authorised, then verify its unchanged consumers before migration. Preserve a single service/data source and existing drawer pin/integrity.
2. Add immutable external references with readable version comments. Arrange the external legacy dependency before its consumers and the new entry; preserve all unrelated custom code. New module loading remains gated separately from this existing shared service.
3. Insert Review Introduction before `section_gallery14` (`ff59c3f7-f50e-2c3c-3dfd-1fddce4bd13b`) as a main-wrapper sibling, like Banner Partners. Main wrapper is `f3a6c255-9ed7-32a9-be96-9b7f1e282565`.
4. Copy the old homepage instance settings: base variant, Low Caps Visibility false, Lower Caps Text override retained, other settings unchanged apart from the explicitly agreed numeric seeds. Original instance is `cb30dcb1-276f-19a9-f09a-634f34472f55`, component `cb30dcb1-276f-19a9-f09a-634f34472f56`.
5. Remove the original homepage instance only when replacement dependencies and appearance are verified. Original component definitions and other instances remain intact.
6. Remove duplicate leading padding from this homepage parallax's `padding-section-large` (`ff59c3f7-f50e-2c3c-3dfd-1fddce4bd13e`). Native class `review-intro_following-parallax` is prepared but unapplied; ensure combo specificity at every breakpoint. Do not edit shared global padding rules.
7. Check CSS export includes native runtime classes `review-number_value`, `review-number_incoming`, `review-summary_arrow-open`. Check full-card hover repeats, touch press, focus, arrow state and restored parent variants in a real preview.
8. Verify actual desktop/mobile/landscape layout, fonts, long CMS quotes and reload behaviour on staging after publication is authorised. Designer snapshot now succeeds, but its transparent background hides black text; it is not adequate evidence for all visual checks.
9. No CMS review approval/status was changed. Only two items currently qualify. The prior embedded homepage quote is an unapproved draft CMS item, so native approved/ranked selection deliberately differs. Broader historical-review editorial eligibility/disclosure remains a CMS audit item.

No global review patch or other carousel ticker has been retired. Retire each only after its last consumer is migrated. The site-wide ticker consolidation is not complete. Review-section publication is not yet authorised; do not publish staging or custom domains without the owner's next instruction.
