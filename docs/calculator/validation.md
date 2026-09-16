# Calculator staging validation

16 September 2026. The user explicitly approved repository upload and staging publication. Production publishing remains outside this release.

## Release

- Repository: TheDentalBarns/tdb-webflow-runtime
- Feature branch: codex/treatment-calculator-20260916
- Staging baseline: 15144e3414803974be24852368fa4b8a12303d9d
- Calculator JS/CSS asset pin: d153db4c274c737585bc21f9d665c61ca639be2a
- Loader: dist/tdb-calculator-loader.js, pinned to those assets. The Webflow global footer points to the immutable commit containing this loader.
- Pilot: https://dentalbarns.webflow.io/dental-cost-lichfield#treatment-calculator
- Service/FAQ entry: https://dentalbarns.webflow.io/services/fast-track

All pre-existing global runtime URLs are preserved. The additional loader fetches full calculator assets near the pricing component or when a drawer is requested. No custom production domain was included in any publish request.

## Verification

Nineteen deterministic/DOM integration tests pass. They cover price parsing, quantities and tiers, assessment bundling, missing data, aligner inclusions, hygiene allowance, category restrictions, context conflicts, persistence/reset, escaped CMS strings, payment bounds and rounding, calendar month/leap-year dates, sequence dependencies, past/tight dates, focus logic and VIP dispatch.

Live staged browser checks:

| Check | Result |
| --- | --- |
| Progressive categories and treatment inputs | Passed |
| Whitening + assessment | £1,245 starting estimate |
| Add aligners | £4,645–£6,845; whitening and hygiene included |
| Remove aligners | Original whitening selection and £1,245 estimate restored |
| Composite bonding quantity | Two teeth: £1,240–£1,640 including assessment |
| Target date and assessment slider | Finish window changes; original target retained |
| Unknown gumline timing | Sequence visible; precise completion date withheld |
| Service and FAQ triggers | Open the same drawer and preserve the estimate |
| Same-tab navigation | Estimate restored on service page |
| Escape/close | Drawer closes, scroll lock clears, trigger receives focus |
| Keyboard Tab/Shift+Tab | Focus remains within open calculator |
| Join VIP | Calculator closes and existing VIP drawer opens; no form submitted |
| Finance visibility | Off in both Webflow components and plain FAQ entry |
| Treatment tooltip | Opens through the native information control |
| Responsive layout | Inspected at 1363, 768, 390 and 320 CSS pixels; no horizontal overflow |
| Mobile drawer | Full width at 390px, one scrolling area, 44px close control |

Responsive checks used same-origin frames on staging, giving the actual page a narrow viewport. This is layout and browser interaction coverage, not a claim of physical iOS/Android touch-device testing. The temporary frame harness is removed after acceptance.

The mobile running estimate originally sat partly behind the existing announcement bar. The final scoped adjustment reserves that bar's measured height and updates when it resizes. It does not change the announcement bar or global navigation controller.

## CMS publication proof

With the calculator running on staging, temporarily changed Gumline bonding to “Gumline bonding — CMS check” and its headline/first-tier price from £225 to £226. After staging publication and reload, the calculator displayed the new label and a £676 estimate including the £450 assessment. No calculator code changed during this proof. Restored the original label and both £225 price fields, then republished staging.

Thirteen active canonical pricing records are mapped. Nine optional CMS fields were added. Existing canonical names and commercial prices are preserved. The archived examination is unused and its temporary calculator metadata was cleared. See webflow-register.json for IDs and FAQ originals.

## Performance and regression scope

The new module is approximately 44 KB JS / 14 KB gzip, 15 KB CSS / 4 KB gzip, plus a 2.3 KB / 1.1 KB gzip loader. These are payload measurements, not a Lighthouse score or a new HAR comparison. CSS is scoped to the calculator. Existing pricing content, global script pins and the VIP form remain in place. No new analytics events or detailed treatment payloads were added.

## Decisions still required before enabling optional features

- Finance: minimum borrowing, deposit bounds, supported terms within 3–12 months and assessment eligibility. Existing published material confirms only up to twelve months at 0%, subject to eligibility. The completed illustration keeps assessment payment separate provisionally; Show Finance remains off.
- Clinical timing: durations come from the brief. Extractions, gumline bonding, additional hygiene and certain restorative/shade dependencies still require assessment before a dated plan.
- VIP: no verified supported structured-summary field exists, so selections remain in the tab rather than being injected into the form.

An initial automatic review blocked the public repository upload. The user subsequently explicitly approved upload and staging publication. Deployment proceeded through the existing repository and Webflow workflow; no alternative public hosting was used.

See README.md for editorial use and rollback. Production has not been published by this task.
