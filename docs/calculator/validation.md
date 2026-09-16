# Calculator staging validation

16 September 2026. The user explicitly approved repository upload and staging publication, including both refinement rounds. No custom production domain was included in a publish request.

## Release

- Repository: TheDentalBarns/tdb-webflow-runtime
- Feature branch: codex/treatment-calculator-20260916
- Runtime version: 1.2.0
- Staging baseline: 15144e3414803974be24852368fa4b8a12303d9d
- Calculator JS/CSS asset commit: e3b10005c1547b1fe07f18a02393a186b2c0aca8
- Global-footer loader commit: 9043e9495820a05f3b9b57ef49a2382cb0e2d6b0
- Pilot: https://dentalbarns.webflow.io/dental-cost-lichfield#treatment-calculator
- Service/FAQ entry: https://dentalbarns.webflow.io/services/fast-track

Pre-existing global runtime URLs are preserved. The demand loader fetches the full calculator assets near the pricing component or when a drawer is requested.

## Verification

Twenty-eight deterministic and DOM integration tests pass. They cover CMS parsing, prices and quantities, assessment bundling, missing data, inclusions, hygiene, restrictions, context conflicts, persistence/reset, text escaping, finance bounds and exact payment reconciliation, calendar boundaries, treatment ordering, completion-date limits, section-entry focus and VIP handoff.

Browser checks for this refinement:

| Check | Result |
| --- | --- |
| Initial view | Category choice and section footer; no estimate or treatment controls |
| Automatic section focus | Navigation hidden on viewport entry before a form interaction |
| Restart | Choices cleared, panels collapsed, estimate removed, section returned to top |
| Native treatment headings | Font family, size, weight, spacing and line height match the pricing heading exactly |
| Native gutters | Existing padding-global: 3% desktop and 5% mobile |
| Section footer | #222 background; final 320px check spans the viewport without overflow |
| Running estimate | Fixed at viewport top 0; 6rem high; tag/clock on value row; native down arrow |
| Estimate shortcut | Summary reaches the viewport beneath the bar; observed top 95px at 390px width |
| Whitening plan | £1,245, seven weeks; earliest finish 4 November 2026 from 16 September assessment |
| Timeline slider | 73-day move gives 28 November assessment and 16 January 2027 finish |
| Earlier attempt | Left key and pointer drag at minimum open the deadline message; later movement dismisses it |
| Finance | Defaults to 12 months; £450 upfront + £66.25 × 12 = £1,245; interest £0 |
| Tooth-count tooltip | Six/eight front-tooth guidance; 20px blur; fits within 320px viewport |
| Estimate surfaces | Cream total panel with dark breakdown and finance |
| Expansion | Panel transition is 0s; contents use native fade/move timing |
| Drawer close | Dedicated close control remains visible and closes the drawer at 320px; bar top 0, height 6rem |
| VIP handoff | Calculator closes and existing VIP drawer becomes is-open; no submission |
| Responsive layout | Final 320px and 390px layouts checked, plus desktop; no horizontal overflow at 320px |

The native FAQ action lists a-50/a-51 and pricing a-74/a-75 confirm immediate height changes, 300ms opacity, -20px to 0 over 400ms outQuart, and 400ms chevron rotation. The calculator no longer interpolates panel height. Treatment headings retain the existing DD text opacity keyframes.

Responsive acceptance uses same-origin frames to give the actual staging page a mobile viewport. This is browser layout and interaction coverage, not physical iOS/Android testing. The temporary page-footer frame harness is removed after acceptance, preserving the existing pricing JSON-LD script.

## CMS publication proof

The original staging release verified live CMS propagation by temporarily changing Gumline bonding to a labelled £226 check record. After publication, the calculator showed the new label and £676 including assessment. The original label and £225 values were restored and republished. No code change was needed for that proof.

Thirteen active canonical records are mapped. Twelve optional fields exist, including three friendly tier descriptions added in the first refinement. Aligner and composite-bonding descriptions have been checked in the published feed. Canonical names, commercial prices and treatment references remain intact. Both component finance switches are enabled and remain configurable.

## Performance and scope

Final payloads are 58,553 bytes JS (18,039 gzip), 19,371 bytes CSS (4,773 gzip) and 2,354 bytes loader (1,173 gzip). These are payload measurements, not a Lighthouse result. No framework, management credentials or new treatment-detail analytics are shipped.

Dates are illustrative. Extractions, gumline bonding, additional hygiene and certain restorative/shade dependencies require assessment before a dated plan. No appointment availability is queried. Finance follows the requested £450 assessment-inclusive minimum upfront payment, £250 minimum borrowing and 3–12 months at 0%, subject to confirmed eligibility. No unsupported structured-summary field is injected into the VIP form.

See README.md for editor guidance and rollback, and webflow-register.json for CMS and component identifiers. Production has not been published by this task.
