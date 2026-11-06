# Services component migration

Webflow site `677cf86cf9952f978d94d80c`, Services template `6785071ede094cc233e0c72b`. Signature Assessment is the visual acceptance page. The 5 November migration used runtime base `777dc1235c1945822bca2886431d463eb761d13e` and staging runtime `e6b15f9e8f541ee1dcc9a0c443a351d5bf073f8b`, branch `services-components-20261105`.

Published to the Webflow staging subdomain only. The 5 November publish task was `1e15cf76-6943-4432-a277-5e37dff88a64`. Review at https://dentalbarns.webflow.io/services/signature-assessment. No custom-domain publish or pricing-data changes were made.

## 6 November follow-up

The review shell is now consolidated into the shared Review Carousel using a native CMS content slot. The current staging runtime is `2c4838f0a88ec791ab5a45e0a20e07c5ccdec267`, branch `services-drawer-exit-20261106`, staging publish task `8e70b0a6-cb3d-4de7-a892-40a3d97251d0`. The Services-only content helper and direct calculator-loader tags have since been retired; copy, symbols, images and CTA wiring are native CMS bindings, with a local metadata embed for the five videos. See [the current audit](services-audit-20261106.md) for ownership, verification and remaining exceptions. Payload figures and delivery details explicitly dated 5 November below are historical baselines, not a measurement of this release.

Designer owns layout, typography, native CMS bindings, responsive styles and component variants. Shared motion owns hero/photo parallax, the five-step journey, background media and poster motion. Shared disclosure and pricing-sticky controllers own FAQ state. The legacy Services inline process, Instagram, calculator-icon and Smile Design scripts must not be restored.

## Native component ownership

- Navbar, footer, Discover Smiles, Happy Patients, treatment showcase, brand marquee and location USPs reuse their established shared definitions.
- Awards contextual trio `25df2c67-ef0c-9d21-21ec-dc9b981d9818` uses the Home card definition and existing Services award references. Recognition is an optional boolean with equal vertical margins.
- Full awards `4c110b36-e067-748c-2cf9-153bf498a1c4` includes the Home archive and Instagram definition `c4af454c-92e0-8689-dc74-2f8ade47263c`.
- Supporting CTA `4893a05d-5e2e-8d3f-2721-eb585ca97082` has native light/dark variants, editable copy, optional subtext, square consultation image, calculator and alternate-link actions.
- Journey `d161e7fc-199a-5c1c-70bb-f6195172d961` copies the existing five-step CMS bindings, uses shared Vimeo players and new IDs without legacy IX2 target matches. Anchors are `service-step-1` through `service-step-5`.
- FAQ `2c1035d0-3453-b9b8-897a-0c398a308b3f` retains its native CMS queries. Investment starts expanded; all questions start closed. Existing shared assets supply category icons.

The desktop smile gallery uses the shared Discover Smiles **Contained** variant, with the benefits alongside it. Mobile has the Home margins. Benefit questions use shared disclosure animation instead of the old `faq3_question` IX2 targets. The calculator icon is a native `currentColor` mask. Contextual awards restore the Home dividers and bottom spacing; the recognition line has equal spacing above and below. The booking and Keely backgrounds and journey posters use shared parallax. The journey line interpolates between measured marker positions and section thresholds, so each step stays grey until the line reaches it. Instagram controls retain visible arrows on desktop.

FAQ headings use Pricing's cream, uppercase category treatment. The heading is above the full-width list, with no gaps between category rows. Shared disclosure reveal owns opening/closing; shared sticky coordination pushes the category away under the sticky open question, applies 20px blur, and suppresses conflicting chrome.

Native visibility on the two entry containers now binds directly to the existing Services CMS fields:

- `7e742d52-f378-4939-7a64-7218fa2807ce`: Show Cost Calculator, field `d16de97050569b235da8cc1f4f53c3c9`.
- `7e742d52-f378-4939-7a64-7218fa2807cf`: Show 5 Senses Experience, field `dfad9fe065c8a9c3adb81cd48fe5095d`.

The hidden calculator/experience marker embeds and `body:has(...)` visibility workaround have been removed. Staging source confirms calculator-only on Signature Assessment, experience-only on Nervous Patient Care, and neither on Hygiene Care. The existing 5 Senses entry presentation rules remain in `src/styles/tdb-service-entry-states.css` because Nervous Patient Care still consumes that component; they are not dead CSS.

## Page-break review selection

Native Review Excerpts list `fa6279a4-5d7b-9d90-621a-96dc285dc4a8` has Available and Lead predicates plus **Featured services contains Current Service**, rank ascending and limit three. The dynamic filter was verified in Designer. Do not replace it with Home context; the headless settings read does not fully serialize this dynamic filter.

`Review Excerpts.featured-services` is a multi-reference to Services. Existing approved text is retained. Twenty-one rows supply three selections for each of eight services, with shared selections where appropriate. Facial Aesthetics uses general welcome/care statements, not invented treatment claims.

The hidden `data-tdb-review-record-id` node binds through Review Master to its slug. The loader now detects these nodes inside the shared component's slot and uses the CMS-selected IDs in their authored order; the legacy `data-tdb-review-native-selection` root marker remains supported. The loader fetches the corresponding verified full reviews; the adapter preserves authored excerpts and wires the standard quote carousel and review drawer. Home and Pricing keep their default slot content and feed selection. Location retains its separate Review Introduction.

The visible review break uses the shared Review Carousel's **On image • balanced spacing** variant and Stars decoration. Padding belongs to the native shared variant; the outer image parent still owns its height. The Google review widget boundary is on the review image wrapper, which restores the floating tab after this section. The review drawer opens from either the quote or the floating tab.

### Completed native component consolidation — 6 November

The Services instance `478f1a7b-e9d7-712f-8064-2358574a508c` now uses shared Review Carousel definition `63c143be-60b7-7cf7-7a84-9ff3c467f0bf`. Slot property `78bbe4ff-1a65-a645-4fa9-bd5fc7a6db32` contains the service-filtered native Collection List. The definition's default cards are supplied by nested component `163200f6-944e-8fee-1d46-2a0beff1ac88`, so the existing Home and Pricing instances retain their defaults.

The native CMS list was moved into the Services slot in Designer without recreating its filters. Available, Lead excerpt, Featured services = Current Service, rank ascending and limit three were verified in the Collection List settings. The first review is visible in Designer. The previous duplicated section `4d8220f8-d025-fbcd-72ae-bf7f150cbdb5` has been removed.

Wrapper `4def05a1-dbfa-c9e1-27ef-873fad67706d` retains its image, motion and widget-boundary hooks. Native list `fa6279a4-5d7b-9d90-621a-96dc285dc4a8` retains the three CMS selections and hidden record identities. Desktop and 390px staging checks confirm pagination, the clicked full review in the shared 91-review drawer, focus restoration and released scroll lock after closing. Home and Pricing default content still renders; Location's separate introduction is unchanged. Automated coverage includes legacy-marker and marker-free slot selections, preserved excerpts and remounting.

## 5 November delivery and verification (historical)

At that release, the Services page head was empty: the old layout and compatibility stylesheets and inline patches had been removed. Its footer still had the external calculator loader and `dist/tdb-service-content.js`, both deferred. Those two direct tags have since been removed, as recorded in the 6 November audit. The 5 November site runtime and global UI used the immutable release recorded at the start of this document. The UI CDN SHA-256 was checked against the built file before updating the pin.

At that release, `src/services/native-content.js` was compiled into the Services-only helper, not the site-wide foundation. The foundation was byte-identical to the implementation base (32,801 bytes). The journey root owned both `data-tdb-service-process` and `data-process-schema`; five VideoObjects were generated from the existing authored video metadata. The current release derives that metadata locally from CMS-authored section attributes without the retired helper. Consent, proximity and first-interaction gates remain in the shared media loaders.

### Payload and waste audit

Compared with the captured pre-migration Signature Assessment staging source:

| Measure | Before | After |
| --- | ---: | ---: |
| HTML bytes | 431,848 | 240,308 |
| HTML controlled gzip bytes | 94,212 | 39,975 |
| HTML element count | 2,834 | 1,892 |
| Inline executable JavaScript bytes | 39,061 | 311 |
| Inline CSS bytes | 12,099 | 3,653 |
| Active IX2 event matches | 12 | 0 |
| Initial HTML + linked/preloaded CSS/JS bytes | 1,232,400 | 1,014,155 |
| Same subtotal, controlled gzip bytes | 267,895 | 208,176 |

The 311 executable bytes are the common Webflow class initializer and viewport bootstrap. The 3,653 CSS bytes are the common critical styles and Global Styles component, matching Location and Pricing. Home has an additional existing 549-byte responsive patch. JSON-LD is counted separately from executable JavaScript.

The initial subtotal includes the preloaded foundation, deduplicates URLs, and excludes the noscript stylesheet duplicate. It does **not** include images, fonts, deferred feeds, media or all later feature downloads. It is a source/compression comparison, not measured network transfer, LCP, CLS, or a physical-phone benchmark.

Later-file growth against implementation base `777dc12`: shared motion +2,941 bytes, shared runtime +1,126, review loader +288, review CMS +58, quote adapter +58, slider CSS +388 (4,859 bytes total; +1,428 controlled gzip). Global UI grows by 1,498 bytes (+381 gzip). The new Services-only helper is 3,033 bytes (1,354 gzip), already included in the initial subtotal. These figures use a different baseline from the captured old page and must not be blindly added to its savings.

Remaining exported costs are explicit: Webflow's main site bundle is still 322,646 bytes and native Services CSS is 241,510 bytes across shared and page styles. Removing a site-wide Webflow bundle or shared styles without a site-wide dependency audit would affect unrelated pages. Six inert `data-w-id` values remain in shared media markup but match no active IX2 events. Home, Location and Pricing also have zero active event matches. No Elfsight SDK is loaded; the announcement's historical `tdb-elfsight-shell` class is only a compatibility name. Two repeated Webflow-generated grid IDs remain from shared component instances; authored section anchors are not duplicated.

### Acceptance checks and evidence

Final `npm run verify`: 948 tests, 945 passed, three skipped, zero failures, including generated-build parity. Relevant coverage includes unequal-height journey geometry/lifecycle, native review selection and preserved excerpts, disclosure/sticky coordination, shared motion, and Vimeo consent gates. No tests were added solely to mirror the native visual changes.

Staging browser checks at desktop and 390px mobile confirmed the review Stars/padding, awards borders, loaded smile gallery/margins, benefit disclosure widths, calculator open/close, moving video stills, Instagram arrows, full-width FAQ rows, initial Investment state, sticky-question/category push and 20px blur, Google review drawer and VIP drawer. The VIP service preselection was checked without submitting a form. The final desktop console had no warnings/errors. Calculator/experience/neither CMS branches were separately checked in published source.

Workspace evidence is under `../services-hero-20261105/`: `final-audit/report.json`, `final-audit/runtime-costs.json`, `final-verify-5.log`, `native-cta-visibility.json`, `review-desktop-final.jpg`, `review-mobile-final.jpg` and the pre-migration `before.html`, `native-before.json`, `release-code-before.json`. These local captures are not runtime dependencies or a new audit framework.

### Rollback

Runtime commits are immutable. For the last visibility change, restore the native containers and marker embeds from the pre-change evidence **together with** the prior `0b35e5a` UI pin; reverting only the CSS would hide both CTAs after marker removal. For the complete migration, restore the corresponding Webflow template/component version plus `release-code-before.json` and its runtime pins. Do not restore the old inline Services scripts over the new native components. Publish rollback to staging and repeat the affected checks before considering a custom-domain release.
