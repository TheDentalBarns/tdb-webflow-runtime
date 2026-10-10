# Homepage preservation pass - 9 October 2026

The homepage consolidation is staged at https://dentalbarns.webflow.io/. Production domains were not published. The implementation follows the exact deployed cohorts, rather than assuming repository main represented the working page.

- Raw homepage HTML: **528,755 -> 486,941 bytes** (41,814 bytes / 7.91% less).
- Inline style blocks: **42 -> 32**. Inline style attributes: **118 -> 5**. No inline mask declarations remain.
- Four dormant inline scripts and the 2,906-byte calculator entry download leave the homepage. Static external script tags: **18 -> 17**. These figures are source measurements, not compressed transfer or frame-rate claims.
- All **96 automated tests pass**. Published delivery was verified for the home page and 17 other page/template owners; 62 published pages informed ownership. The unpublished `/style-guide` returned 404.
- Each stage has a commit and a private complete-block/native-element rollback record. No real forms were submitted or lead data changed.

## Finding outcomes

- **F01 - Completed.** Consent owns focus throughout its 470 ms close. VIP focus adapters use the consent API and the correct fallback class; nested drawer/consent behaviour remains intact.
- **F02 - Already resolved in the actual deployed version.** The consent bridge no longer starts Elfsight. No new deletion was needed.
- **F03 - Completed.** Ten legacy CSS blocks moved out of global delivery into one compatibility stylesheet, linked by 18 existing page/template owners. The original page head contents and SEO code were preserved. Native homepage Instagram/Smile rules stay local.
- **F04 - Foundation and first migration completed.** The shared registry supports script/style/module types, per-consumer readiness, timeout, retry, existing-tag adoption and single-flight loading. Navbar now uses it while retaining an independent failure fallback. The release manifest records the other entry contracts. CSS sentinels, consent gates and early loaders remain feature-specific; this is not a claim that every loader was replaced.
- **F05 - Completed.** One carousel visibility helper replaces competing copies. Smile/Instagram retain interactive peeking cards; quote and drawer surfaces retain active-only behaviour. Original accessibility attributes are restored during teardown. Cached geometry avoids new drag-time layout reads. The Swiper vendor prefix is unchanged.
- **F06 - Completed.** Smile, parallax and reviews share settlement hooks with cleanup on destruction. Directional delays, same-slide release, snapback and deferred review append behaviour are preserved.
- **F07 - Completed.** Shared first-view lifecycle owns visibility, interruption and cancellation for gallery, parallax, cards and quotes. Each component keeps its original threshold, arming, delay and animation sequence. Hidden or interrupted sequences do not keep running.
- **F08 - Completed.** The review drawer delegates matching and ordering to the existing CMS policy. Stable ties, topic aliases, filtering and nonmutation are checked. The CMS source and deployed data contract are unchanged.
- **F09 - Completed.** Gallery/parallax share the native-gap reader. Designer CSS remains the spacing owner; protected inline-margin removal/restoration still handles Swiper's responsive measurement correctly. Existing rendered-progress sampling remains shared; finite and looping geometries stay distinct.
- **F10 - Conservative cleanup completed.** Removed one redundant paragraph rule and two duplicate review-arrow rules. Distinct focus rings, first-paint guards and short-landscape layout rules remain because merging them would change the cascade or presentation.
- **F11 - Completed.** One mask stylesheet replaces repeated declarations in 97 native nodes and 12 source embeds: 103 rendered SVG rects and 10 spans. Original geometry/fills/assets remain intact. All 113 computed mask styles matched at the same scroll position; review/filter masks were also checked after hydration.
- **F12 - Conservative cleanup completed.** Navbar/consent/drawer build from canonical scroll-lock source; navbar and VIP share panel-motion source. Native menu handoff, recovery and nested ownership are tested. VIP visualViewport/mobile keyboard handling, desktop dropdowns and Five Senses overflow restoration retain their distinct adapters.
- **F13 - Conservative cleanup completed.** Static native Smile and Instagram no longer observe parent/slide mutations. Resize and breakpoint updates remain. VIP candidate discovery scans once and refreshes labels only for drawer-related changes. Dynamic forms, success observation, generic validation, attribution and one-time multiline text compatibility remain.
- **F14 - Retained for supported authoring work.** The homepage has no matching IX2 targets in the audited 198-event / 40-action-list configuration. The available Webflow interaction API manages IX3, not this IX2 payload. Native navbar, dropdowns and forms still need other Webflow modules, and other pages retain interactions. No generated runtime was stripped or destroyed late.
- **F15 - Candidate implemented, not deployed.** Commit `a68d127` moves shell styling to first open and reads the shared motion policy. Three local entry/cancellation/query tests pass. The candidate and original version both stalled the cloud browser after the loading view. The original `8fb72cf` loader was restored. Full scene, audio and close/reopen need a reliable browser/device comparison before this candidate is enabled.
- **F16 - Homepage delivery cleanup completed; UX variants retained.** Four unchanged inline sources now have one repository owner and generated page-specific footer snippets. The calculator loader is delivered to its 11 actual owners. All 17 page/template owners were verified after publishing; Smile Design hero, process rail, calculator open/close and legacy Instagram wrap were checked. Physical-phone classifier variants and global text selection are deliberately retained pending device/design validation.

## Release and rebuild

- **Authoritative deployment map:** `releases/home-preservation-2026-10-09.json`. It includes static URLs, registry bases/overrides, observed lazy assets, loader gates and retained boundaries.
- **Do not repin every asset to branch HEAD.** The page is a selective composition, and the Five Senses candidate is intentionally disabled. Existing unmodified tag-based dependencies remain inherited; release changes use full commit pins.
- Build only named preservation targets: `node tools/runtime-build/build-preservation.cjs dist/<target>`. Swiper uses `npm run build --prefix tools/custom-swiper` with its existing security backport. The 86,337-byte vendor prefix was preserved.
- Generate page footer snippets with `node tools/runtime-build/page-compat.cjs <page-id>`; the ownership map is `config/webflow-page-compat.json`. Prepend the generated snippet to the page's otherwise unchanged footer. Do not place it back in site-wide code.
- The test dependency `src/shared/filters.js` is restored unchanged from the deployed `fe41fd2` carousel cohort (blob `0e0fc0adac9cdefb61a34b6a1416610b837c603a`). This fixes a missing local fixture, with no deployed filter change.
- Run tests with JSDOM available: `node --test tests/*.test.cjs`. The final recorded run is 96 passed, zero failed/skipped.

## Review and rollback

- Desktop browser checks cover Services/Smile navigation, overflow cards, Instagram details, review paging/filter/order/reset/close, navbar keyboard handoff, consent/VIP focus and VIP treatment labels. Other-page smoke checks cover migrated calculator and legacy Instagram. Mask geometry and computed styles were compared directly.
- Physical iOS/Android keyboard and orientation, tablet transitions, and a controlled compressed-transfer/frame-time comparison remain unverified. No assertion of measured FPS or zero CLS is made.
- For a bounded rollback, restore only that stage's full custom-code block or source-element attributes from the private record, after comparing the current version. Never overwrite a newer edit blindly.
- For F11, restore the original 97 node attribute sets and 12 embed bodies plus the preceding global head. For F16, restore its 17 original owner footers and preceding site footer together. For JavaScript stages, restore the corresponding prior pin cohort.
- Publish rollback or review changes to the Webflow subdomain only. Production domains remain at their original 1 October 2026 publication and require a separate release decision.
- Next review should focus on physical-phone equivalence, the two blocked F14/F15 boundaries, and optional remaining loader adapters. The existing timings, CMS contracts, consent gates, artwork and global text-selection policy are preserved.
