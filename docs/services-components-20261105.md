# Services component migration

Webflow site `677cf86cf9952f978d94d80c`, Services template `6785071ede094cc233e0c72b`. Signature Assessment is the visual acceptance page. Runtime base: `777dc1235c1945822bca2886431d463eb761d13e`. Final staging runtime: `e6b15f9e8f541ee1dcc9a0c443a351d5bf073f8b`, branch `services-components-20261105`.

Published to the Webflow staging subdomain only. Latest publish task: `1e15cf76-6943-4432-a277-5e37dff88a64`. Review at https://dentalbarns.webflow.io/services/signature-assessment. No custom-domain publish or pricing-data changes were made. The visual and runtime corrections are verified; the review shell still needs the native component consolidation described below.

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

The hidden `data-tdb-review-record-id` node binds through Review Master to its slug. Only roots marked `data-tdb-review-native-selection` use these CMS-selected IDs. The loader fetches the corresponding verified full reviews; the adapter preserves authored excerpts and wires the standard quote carousel and review drawer. Home and Location keep their existing selection.

The visible review break now uses the shared quote-section classes and Stars decoration variant. Top/bottom padding is equal: 105px at the tested 1440px desktop viewport and approximately 109px at 390px mobile. The Google review widget boundary is on the review image wrapper, which restores the floating tab after this section. The review drawer opens from either the quote or the floating tab.

### Remaining native Designer work

The outer review shell is still page-level markup using shared classes/controllers, **not an instance of the shared Review Carousel definition** `63c143be-60b7-7cf7-7a84-9ff3c467f0bf`. Do not describe this as fully consolidated.

The headless connector rejected converting the live, service-filtered Collection List into a component. Available builder tools can populate existing component slots but could not create the required slot. Native desktop input was unavailable while the user's computer was locked. This is an editing-tool limitation, not a Webflow platform limitation: Webflow supports Collection Lists in component slots and collection settings as component properties. References: [component slots](https://origin.webflow.com/updates/component-slots-support-elements), [component properties](https://help.webflow.com/hc/en-us/articles/33961219350547-Component-properties).

Finish in native Designer by giving the shared carousel a CMS-content slot while preserving existing default/static instances, then insert the current service-filtered list into the Services instance. Keep wrapper `4def05a1-dbfa-c9e1-27ef-873fad67706d` and its image/motion/widget-boundary hooks. The page-level section is `4d8220f8-d025-fbcd-72ae-bf7f150cbdb5`; the native CMS list is `fa6279a4-5d7b-9d90-621a-96dc285dc4a8`. Retain Stars, the shared padding, three CMS selections, hidden record identities, and the review drawer. Recheck Home and Location defaults before publishing that structural change.

## Delivery and verification

The Services page head is now empty: the old layout and compatibility stylesheets and inline patches are removed. Its footer has the external calculator loader and new `dist/tdb-service-content.js`, both deferred. Site runtime and global UI use the immutable release above. The UI CDN SHA-256 was checked against the built file before updating the pin.

`src/services/native-content.js` is compiled into the Services-only helper, not the site-wide foundation. This preserves its DOM-ready schema/copy timing without charging Home, Location or Pricing for service-specific work. The foundation is byte-identical to the implementation base (32,801 bytes). The journey root now owns both `data-tdb-service-process` and `data-process-schema`; five VideoObjects are generated from the existing authored video metadata. Consent, proximity and first-interaction gates remain in the shared media loaders.

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
