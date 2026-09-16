# Treatment calculator — editor and implementation guide

Staging pilot, 16 September 2026. Production publishing is not authorised by this change.

## Edit the content

Use the existing **Pricings** CMS collection (`67a2267b404fe73dfb1d8dee`). Prices remain in `price` and `tier-1` through `tier-5`; no prices are hardcoded in the application. Update the headline and corresponding first tier together. Accepted values are £450, From £795, and £395 per tooth/surface/lesion/area/arch, with optional comma separators and pence. Missing, inconsistent or ambiguous values show **Price to confirm** and disable the payment illustration. The displayed range spans the published tiers and is not a final quote.

`Calculator label` overrides the canonical name; clearing it restores the canonical name. `Calculator tooltip` supplies the information text. Mapping uses the existing pricing record ID, never its name. The optional `Calculator record ID` mirrors that ID solely to emit a native CMS data attribute. Do not edit this identifier. Related treatment references on the canonical pricing record remain intact.

Publish CMS changes using the normal site workflow. Staging publication previews staged values; production requires a separate authorised production publication. Eight existing pricing list templates emit hidden native CMS bindings. The pricing page reads them locally; other pages fetch the same-origin pricing page once when the drawer is first requested. A reload obtains freshly published data, subject to Webflow's publication/CDN propagation. An already open calculator retains its current data until reload.

## Added fields

All calculator fields are optional. Smile Trial has its own £995-per-arch pricing item; the veneer feature list now describes the required trial and its fee. Existing treatment prices are unchanged.

| Field | Type | Purpose |
| --- | --- | --- |
| calculator-label | Plain text | Friendly display label |
| calculator-record-id | Plain text | Stable pricing identity in rendered CMS feed |
| calculator-tooltip | Plain text | Tap/keyboard information text |
| calculator-duration-minimum | Number | Minimum planning duration |
| calculator-duration-maximum | Number | Maximum planning duration |
| calculator-duration-unit | Plain text | `weeks` or `months` |
| calculator-includes-whitening | Switch | Inclusion flag on aligner record |
| calculator-includes-hygiene | Switch | Inclusion flag on aligner record |
| calculator-booking-deposit | Number | GBP amount within assessment total |
| calculator-tier-1-friendly / -2-friendly / -3-friendly | Plain text | Friendly cosmetic complexity descriptions alongside existing tier prices |
| calculator-tier-1-duration-minimum / -maximum (also tiers 2 and 3) | Number | Optional timing range for that tier, in the record’s duration unit |

## Canonical mapping

Metal filling replacement and new fillings are distinct user intents mapped to the same existing filling price. Replacement always uses the existing Tier 3 price; new fillings and other restorations show a guide range without a complexity selector. Count distinct restored surfaces; do not count the same surface under both options. Gumline bonding asks for areas, with one area per tooth and its existing per-tooth price. It is not a separate gum-contouring treatment. Other quantity treatments use teeth. Maximum 32 teeth / 160 surfaces are input bounds, not recommendations.

| Pricing ID | Calculator label | Authoritative headline | Planning duration |
| --- | --- | --- | --- |
| 681dfc7415fdf2571f077b0f | Porcelain veneers | From £995 per tooth | 4 weeks from preparation to fitting |
| 67a227e75f8c501023eb066b | Invisalign® / clear aligners | From £4,195 | 6–10 / 10–12 / 12–18 calendar months by tier |
| 681ce51276b22da0b0660090 | Whitening | From £795 | 5–5 weeks |
| 681ce7a6838a937aa274f5e6 | Composite bonding | From £395 per tooth | 2–2 weeks |
| 68386aca9ee514c02cdda9ee | Gumline bonding | From £225 per tooth | Indicative 2-week allowance |
| 681dfde1b4412464104bca59 | Airflow® hygiene | From £195 | 1 week before subsequent treatment |
| 6aa293f6253d574a41978d9e | Signature Assessment ✦ | £450 | Confirm clinically |
| 68386f15264c9bdb140b5f2e | Smile Design | £225 | Confirm clinically |
| 68d6b282da240abf72520b6a | New fillings | From £295 per surface | 0–0 weeks |
| 6a61ce5648ee7f280db22a34 | Root canal treatment | From £995 | 2–2 weeks |
| 68d7cfac090cb5cda1b931d9 | Porcelain onlays | From £995 per tooth | 4 weeks from preparation to fitting |
| 68d7ca91db5f05043ba12fa1 | Porcelain crowns | From £995 per tooth | 4 weeks from preparation to fitting |
| 68d6affec0a324b379f2c5b5 | Extractions | From £295 per tooth | Indicative 2–4-week allowance |
| 6aaaa3d4ef8655079897b000 | Smile Trial | £995 per arch | 1 week from trial to preparation |

The canonical £450 Signature Assessment contains Smile Design and the comprehensive examination. Its £225 booking deposit is part of £450. The separate £225 Smile Design option is available before treatment is selected; any treatment upgrades the starting care to Signature Assessment once. Deselecting all treatment returns to the user's manual starting choice, or no starting choice. Reset clears everything. Archived examination and duplicate cosmetic-category package rows are not used.

## Place and configure the component

**Treatment Calculator** is the inline component on `/dental-cost-lichfield`. **Treatment Calculator Entry** is the reusable service-template entry block. Both expose independent Show Cosmetic, Show Restorative and Show Finance boolean properties. Keep at least one treatment category enabled. Entry also has a Preselected Treatment text property. Supported keys: `whitening`, `aligners`, `bonding`, `veneers`, `gumline`, `replacement`, `fillings`, `rct`, `crowns`, `onlays`, `extractions`.

The boolean properties bind to visibility on hidden configuration spans; the controller reads their published presence/conditional visibility (Webflow omits false component-prop elements). Retain these spans when editing components. Put at most one inline calculator per page. Drawer views reuse the same state and engine.

For any additional link/button, set a normal fallback URL `/dental-cost-lichfield#treatment-calculator` and optional attributes:

```html
<a href="/dental-cost-lichfield#treatment-calculator"
   data-tdb-calc-open="true"
   data-cosmetic="true" data-restorative="false"
   data-finance="false" data-treatment="bonding">Explore treatment costs</a>
```

The hash URL is also sufficient for FAQ CTA fields. No matching on link text is used. Finance defaults on for plain FAQ links; `data-finance="false"` disables it. The two pilot FAQ CTAs are “Do you offer finance for cosmetic dentistry in Lichfield?” and “Do you offer 0% finance for treatment planned through the Signature Assessment?”. Only their CTA label/link changes.

A contextual trigger uses its preselection on an empty estimate. If an estimate exists, it offers to retain it or explicitly start with the new options. Restricted contexts disclose existing selections instead of charging invisibly. Closing/reopening and same-tab navigation retain state for four hours from the last change. Reset clears it. No treatment details are placed in URLs or new analytics calls.

## Cost and planning rules

- Aligner inclusions are confirmed by existing CMS package features: whitening, hygiene and retainers. The calculator charges whitening/hygiene zero when their inclusion switches are set. A previously selected whitening option becomes chargeable again after removing aligners.
- Every cosmetic selection calls out gum health. Existing FAQ policy makes hygiene conditional on clinical need; outside aligners the user may explicitly add its allowance. Additional periodontal care is unpriced.
- Restorative stages precede cosmetic stages. Aligners precede whitening, then final bonding/veneers. Whitening contains three weeks plus two settling weeks. The assessment lead-in is fourteen days. Durations come from the user-supplied brief and remain illustrative.
- Every plan keeps an indicative date. Gumline bonding uses a 2-week planning allowance and extractions 2–4 weeks; these are editable assumptions, not clinical recovery promises. Hygiene is scheduled two weeks after assessment, with one week before subsequent treatment. Any shade-related changes to restorative sequencing are explained in the plan notes.
- Aligner timing uses CMS tier ranges of 6–10, 10–12 or 12–18 calendar months, not a fixed number of weeks. Without a tier choice the range is 6–18 months. Dates preserve month-end/leap-year behaviour. The target initially uses the earliest estimated finish from an assessment today. The adjacent slider moves the assessment and every stage later; longer treatment ranges remain visible. A manually chosen date is converted to a non-past assessment date. Attempts to move before the earliest finish show the deadline message. No diary availability is claimed.
- Tooth counts change price, not duration. Final scheduling may combine visits or require additional visits.
- Veneers always add Smile Trial at the current CMS fee for each selected arch. Upper/lower selection changes only the trial fee; the tooth count remains the total veneer quantity. At least one arch is selected. Trial occurs at least two weeks after assessment or the last required appointment, then preparation one week later and fitting four weeks later. With both arches, upper fitting is followed by lower preparation one week later and lower fitting four weeks after that. Crowns/onlays have separate preparation/fitting stages four weeks apart.
- Clickable timeline stages disclose the selected care, price and short description. Repeated preparation/fitting stages reference the same treatment fee and explicitly count it only once. A brief finance arrangement/cooling-off reminder fits within the initial two-week planning allowance.

## Finance illustration

The practice requested 0% illustrations over 3–12 months, with at least £250 financed after the upfront payment. The minimum upfront payment is the current CMS Signature Assessment price (£450 at this release); it is included once in the estimate. The separate £225 appointment booking deposit remains part of that assessment, never an extra charge. The deposit slider is capped so the lower guide price retains at least £250 borrowing. Below that threshold the calculator explains why an illustration is unavailable. The finance panel opens at twelve months, with a slider back to three months and an explicit £0 interest line. Integer-pence calculations adjust the final payment to reconcile exactly. Finance is enabled on the pilot and entry component; its existing boolean property remains available. This is an illustration, subject to eligibility and lender approval.

## VIP handoff

Join VIP closes the calculator, restores page scrolling, and opens the site's existing VIP route. The estimate remains in session storage. The existing form has no verified supported field for a structured calculator summary, so this release does not silently inject clinical selections into it. The user can return to the estimate in the same tab. No test enquiry is submitted.

## Build and verification

```sh
npm ci --prefix tools/runtime-tests --ignore-scripts
node --test tests/calculator/*.test.cjs
node tools/build-calculator.cjs
# After publishing assets in a commit, build the loader with that immutable SHA:
node tools/build-calculator.cjs FULL_ASSET_COMMIT_SHA
```

The dependency-free runtime is split into deterministic core, shared view, scoped CSS and demand loader. jsdom is used only by the repository's existing test environment, never shipped. The global footer appends one versioned loader script; all previous runtime pins are retained. Full JS/CSS only load near the inline section or after a drawer trigger. No framework or management API credentials are shipped.

Automated tests cover 40 scenarios across pricing, bundling, restrictions, persistence, context conflicts, VIP handoff, text escaping, finance and date boundaries. See `validation.md` for actual staged-browser evidence and release pins.

## Rollback

1. Remove only the two-line calculator version comment and loader script from the global footer. Preserve all pre-existing scripts.
2. Remove the pricing-page Treatment Calculator instance and the service-template Treatment Calculator Entry instance. Removing these new components restores the original page structures.
3. Restore both pilot FAQ CTA labels to “View Dental Fees” and their URLs to `https://www.thedentalbarns.co.uk/dental-cost-lichfield` (original values also recorded in the private audit snapshot).
4. Remove the eight empty CMS-feed embeds and two inclusion marker embeds if retiring the feature. Their element IDs are recorded in `webflow-register.json`.
5. Optional new CMS fields can remain unused. If removing the schema, first clear this feature's bindings and confirm no new editorial consumers. If reverting the latest refinement, remove the new Smile Trial pricing item only after removing its runtime dependency, and restore the veneer feature-3 wording from the prior release. Production values were not published by this task.
6. Publish staging only to verify rollback. Production rollback/publication needs its own authorisation.

Code lives on a dedicated feature branch from the current staging runtime base `15144e3414803974be24852368fa4b8a12303d9d`. No existing global bundle is replaced.

## Current interaction pattern

The initial view contains the introduction, category choice and a compact dark footer with orange-3 text using the existing footer tagline style. A selected category opens treatments; treatment selection adds Step 3 (target date), Signature Assessment, cosmetic hygiene preparation and the estimate. Restart estimate clears choices, collapses the form and returns immediately to its top.

The running estimate is fixed to the viewport top while the calculator section is visible. It stays mounted outside document flow and slides in/out over 420ms using the navbar easing; there is no conditional header padding. Its mobile height is 6rem, with a 20px dark glass backdrop. Price-tag and clock icons sit beside the values on the second row. The site's down-arrow button scrolls to the full estimate. The drawer includes a close control in this bar.

The calculator uses the native padding-global and container-large classes, with orange-3 section rules. Treatment group headings use the same div and text-style-tagline-restored class as the pricing page, together with DD text opacity keyframes. Expansion follows the existing FAQ and price action lists: height changes immediately, content fades over 300ms and moves from -20px to rest over 400ms; the chevron rotates over 400ms. There is no panel-height tween.

Tooltips use the Smile Gallery filter design: transparent 1px orange circle and orange information strokes, filling with darker cream glass and a black close icon when open and the same 420ms rotation/cross reveal. The expansion chevron stays at the row end; whitening reserves its column so the information buttons align and use the gallery filter's darker cream at 84% opacity and 20px backdrop blur. Cosmetic quantity guidance explains six front teeth (3–3) and eight (4–4). The first outside tap closes an open tooltip and is consumed before page/menu controls run; a second tap activates the page normally. Escape also closes the panels. Unselected treatment and complexity choices are grey; selected choices are black. Friendly complexity choices are enabled for aligners, bonding and veneers, using their CMS fields. There is no guide-range reset link or whitening expansion.

Viewport entry holds the shared navigation focus state without requiring a form interaction. Calculator-specific CSS keeps the navigation, VIP bar, outer Elfsight timer shell and portalled Elfsight bar away even if another runtime attempts to reveal them. Dismissing a tooltip reasserts the visible calculator’s shared focus hold; leaving the section still releases it normally. They are released when the section leaves view or the calculator hands off to VIP.

The target completion card starts with the shortest estimated duration, including the two-week assessment lead-in. It keeps the longer finish date visible for uncertain ranges, and never implies diary availability. The slider explores up to two years of additional delay; a date input supports direct selection within that interval. A leftward attempt at the minimum opens an inline deadline message. The asterisk explains that dates are a rough guide, with healing, refinements and appointment availability affecting the confirmed plan. Missing timing fields use documented planning defaults and disclose that allowance. Need it sooner uses an inline chevron disclosure, with a solid cream panel spanning the full width of the target-date card, without backdrop blur. The background is on the non-animated disclosure wrapper so it appears immediately; only the content fades and moves into place. Wedding advice has its own nested chevron. Both use the shared expansion animation; clicking elsewhere leaves these inline disclosures open. The completion title uses orange-3, matching the estimate title. A hidden, aria-hidden full-length completion message reserves responsive space so the short/long variants do not shift the slider.

The estimate has a dark total and breakdown/finance panel, with the investment and breakdown titles in orange-3. Below-threshold finance stays grey but tappable to explain the £250 borrowing minimum. The final actions offer both Restart estimate (up arrow) and assessment-only, using the native filled black TDB button classes. The gap before the dark footer uses the native padding-section-large class, matching the top spacing of the following pricing section in both collapsed and expanded states. The final content block adds no duplicate bottom padding. Lines follow assessment, hygiene, restorative care, aligners, whitening and finishing cosmetic work. The native VIP checkbox and upward-arrow CTA are retained.

The live amount uses a subtle 240ms fade with a 2px movement when its value changes; reduced-motion preferences skip this. Timeline rows start at 50% opacity and brighten independently as they approach a broad focus band around 42% of the viewport. Neighbouring rows overlap through a continuous position-based curve, with 600ms eased transitions for the whole row and its dot. Only one stage remains semantically current. Tapping a row highlights and opens it without scrolling; the next scroll resumes position-based emphasis. Reduced-motion preferences disable the transitions. Only the bottom action pair remains. Restart retains the native up arrow; assessment-only has no arrow. The footnote text size is scoped to the paragraph so both buttons inherit normal native typography. Only section introductions are indented to their headings; the assessment-price note and hygiene supporting text align with the left edge of their content.


### Pending v1.4.6 copy and timing update

Deadline wording includes brides and grooms. Aligner choices use inline CMS durations: 6 months, 6–12 months and 12–18 months. Their numeric CMS fields drive the completion schedule. The related CMS FAQ explains in-house planning and weekly DentalMonitoring reviews, with individual timing and refinements remaining estimates. DentalMonitoring monitoring capabilities checked against https://dentalmonitoring.com/contactpoint/. The 41 core/UI tests passed locally. Upload and staging release remain pending explicit repository approval following automatic approval review rejection.
