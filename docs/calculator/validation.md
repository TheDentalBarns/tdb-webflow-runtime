# Calculator staging validation

16 September 2026. The user authorised repository upload, CMS edits and staging publication, including the latest control/animation refinements. Every publication used `customDomains: []` and `publishToWebflowSubdomain: true`.

## Release

- Repository: TheDentalBarns/tdb-webflow-runtime
- Feature branch: codex/treatment-calculator-20260916
- Runtime version: 1.4.0
- Staging baseline: 15144e3414803974be24852368fa4b8a12303d9d
- Calculator JS/CSS asset commit: f39c81c7b5b78b769bc40c4d8dfd31326ae29d62
- Global-footer loader commit: 41b7db4a2efd2deec0a52c15aa2431bd65ca985d
- Pilot: https://dentalbarns.webflow.io/dental-cost-lichfield#treatment-calculator
- Service/FAQ entry: https://dentalbarns.webflow.io/services/fast-track

All other global runtime pins were preserved. The temporary responsive acceptance harness was removed and staging republished, preserving the original pricing-page JSON-LD script.

## Automated checks

37 deterministic and DOM integration tests pass. Coverage includes CMS parsing, price changes, per-unit quantities, assessment bundling, missing prices, inclusions, hygiene, component restrictions, persistence/reset, context conflicts, text escaping, exact finance reconciliation, calendar boundaries, dated fallback allowances, tier-specific aligner timing, per-arch Smile Trial pricing, separate upper/lower veneer stages, section-entry navigation focus, drawer/VIP handoff, timeline selection without scrolling, inline wedding expansion and reduced-motion handling for amount changes.

## Published browser checks

| Check | Observed result |
| --- | --- |
| CMS feed | Aligner tier minimum/maximum attributes publish correctly; Smile Trial is £995 per arch |
| Aligner tier 1 | £4,645 including assessment; 6–10 months for aligners and 8–12 months for the complete illustrated journey |
| Veneers and arches | One veneer plus upper trial: £2,440–£2,940. Adding lower trial adds £995 without changing tooth quantity |
| Veneer tier 2, both arches | £3,635 before hygiene, including £1,990 for two Smile Trials |
| Veneer appointments | From 16 September assessment: trial 30 September, upper preparation 7 October, upper fitting 4 November, lower preparation 11 November, lower fitting 9 December |
| Hygiene before veneer trial | Hygiene 30 September, trial 14 October, preparation 21 October; later fitting stages shift accordingly |
| Timeline details | Trial opens to show selected arches, £1,990 and its description; restoration stages identify shared fees counted once |
| Floating estimate | Fixed top 0, 6rem high; header document position and 0px top padding stay unchanged when selecting treatments |
| Footer | #222 background, orange-3 text (#d6cab4) |
| Estimate colours | #222 header, orange-3 investment/breakdown titles, cream total |
| Target card | Cream heading with asterisk and estimate qualifications |
| Reserved message space | At 320px, short and long completion messages both produce a 396.75px card, 35px note and slider offset 166.796875px from card top |
| Information control | 1px circle/strokes; same Gallery rotate/cross pattern; settled mark opacity 0 and cross opacity 1 when open; 20px panel blur |
| Whitening alignment | Information button left coordinate equals aligners: 209.34375px at 320px viewport |
| Tooth guidance | Tooltip sits immediately beside the number control; 390px check showed a 6.8px gap |
| Deadline panel | Begins 5px below the button at 320px; panel/card widths both 288px |
| Wedding advice | Expands the existing deadline panel from 252.97px to 347.13px; no nested tooltip |
| Timeline emphasis | Selected row opacity 1; other rows 0.5. Trial opening and closing both retain scrollTop 4302 |
| Bottom buttons | Native 13.3347px typography at 320px. One assessment action, without arrow; Restart keeps the up arrow |
| Assessment-only | Clears treatment selection, shows £450; heading at 93.44px below the 80px floating bar |
| Finance below threshold | Grey control remains tappable and explains £250 minimum borrowing after the £450 assessment |
| Mobile drawer | At 320px, width/scrollWidth both 320; floating bar top 0 and height 80px (6rem); close works |
| VIP handoff | Calculator closes and existing VIP drawer becomes `is-ready is-open`; no form submission |
| Responsive layout | Desktop, 390px and 320px checked through these refinement rounds; no calculator horizontal overflow |

Responsive coverage used the actual staging page in same-origin frames, not physical iOS/Android devices. Immediate post-interaction screenshots sometimes preceded the browser's settled paint; settled DOM geometry and subsequent screenshots were checked.

The native FAQ/price action lists still supply the expansion timings: immediate height change, 300ms opacity, -20px to rest over 400ms outQuart, 400ms chevron rotation. Gallery information controls use its 250ms opacity and 420ms rotation easing. Live price changes use 240ms opacity/2px motion and respect reduced motion. The amount remains mathematically exact throughout.

## CMS and planning

14 canonical pricing records are mapped, with 18 optional calculator fields. Six new number fields hold the three aligner duration ranges. Veneer friendly tiers use the existing description fields. Smile Trial is a new £995-per-arch pricing record (`6aaaa3d4ef8655079897b000`); the veneer feature list now states the separate trial fee. Existing treatment prices and treatment references are preserved.

The original pilot separately proved general CMS propagation by changing a labelled Gumline record to £226, publishing staging, observing £676 with assessment, and restoring £225. This release additionally verifies published tier-duration attributes and the new Trial record in the actual calculator.

Gumline bonding retains its canonical per-tooth price and uses an area count, one area per tooth; a separate gum-contouring treatment was not present in the CMS. Its two-week allowance and the extraction 2–4-week allowance are editable planning assumptions. Hygiene is scheduled two weeks after assessment and allows one week before subsequent treatment. Trial follows at least two weeks after the preceding required appointment, one week before preparation. Preparation-to-fitting is four weeks; lower preparation follows upper fitting by one week. All displayed dates remain indicative and subject to assessment, healing, refinements and availability. No diary availability is queried.

Finance retains 0%, 3–12 months, default 12 months, at least £250 borrowing, and a minimum upfront payment equal to the CMS assessment price. The short cooling-off reminder is within the initial planning allowance. No structured clinical summary is injected into the existing VIP form.

See README.md for editor guidance and webflow-register.json for identifiers. Production was not published by this task.
