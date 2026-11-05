# Services component migration

Webflow site `677cf86cf9952f978d94d80c`, Services template `6785071ede094cc233e0c72b`. Signature Assessment is the visual acceptance page. This release extends runtime base `777dc1235c1945822bca2886431d463eb761d13e`.

Designer owns layout, typography, native CMS bindings, responsive styles and component variants. Shared motion owns hero/photo parallax, the five-step journey, background media and poster motion. Shared disclosure and pricing-sticky controllers own FAQ state. The legacy Services inline process, Instagram, calculator-icon and Smile Design scripts must not be restored.

## Native component ownership

- Navbar, footer, Discover Smiles, Happy Patients, treatment showcase, brand marquee and location USPs reuse their established shared definitions.
- Awards contextual trio `25df2c67-ef0c-9d21-21ec-dc9b981d9818` uses the Home card definition and existing Services award references. Recognition is an optional boolean with equal vertical margins.
- Full awards `4c110b36-e067-748c-2cf9-153bf498a1c4` includes the Home archive and Instagram definition `c4af454c-92e0-8689-dc74-2f8ade47263c`.
- Supporting CTA `4893a05d-5e2e-8d3f-2721-eb585ca97082` has native light/dark variants, editable copy, optional subtext, square consultation image, calculator and alternate-link actions.
- Journey `d161e7fc-199a-5c1c-70bb-f6195172d961` copies the existing five-step CMS bindings, uses shared Vimeo players and new IDs without legacy IX2 target matches. Anchors are `service-step-1` through `service-step-5`.
- FAQ `2c1035d0-3453-b9b8-897a-0c398a308b3f` retains its native CMS queries. Investment starts expanded; all questions start closed. Existing shared assets supply category icons.

## Page-break review selection

Native Review Excerpts list `fa6279a4-5d7b-9d90-621a-96dc285dc4a8` has Available and Lead predicates plus **Featured services contains Current Service**, rank ascending and limit three. The dynamic filter was verified in Designer. Do not replace it with Home context; the headless settings read does not fully serialize this dynamic filter.

`Review Excerpts.featured-services` is a multi-reference to Services. Existing approved text is retained. Twenty-one rows supply three selections for each of eight services, with shared selections where appropriate. Facial Aesthetics uses general welcome/care statements, not invented treatment claims.

The hidden `data-tdb-review-record-id` node binds through Review Master to its slug. Only roots marked `data-tdb-review-native-selection` use these CMS-selected IDs. The loader fetches the corresponding verified full reviews; the adapter preserves authored excerpts and wires the standard quote carousel and review drawer. Home and Location keep their existing selection.

## Delivery and verification

The Services head retains its two pinned layout/compatibility stylesheets. The footer retains only the pinned calculator loader. Site runtime and global UI use one immutable release commit. Publish only to the Webflow staging subdomain; custom domains are outside this release.

Initial automated run: 946 tests, 943 passed, three skipped, zero failures. Coverage includes service journey lifecycle, native review selection, preserved excerpts, disclosure/sticky behaviour, shared motion and Vimeo consent gates. Responsive staging checks are recorded separately in the workspace release evidence.
