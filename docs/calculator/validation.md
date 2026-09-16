# Calculator validation and deployment status

16 September 2026. **Implementation prepared; staging runtime deployment blocked.**

## Completed

- Audited existing CMS, prices, treatment inclusions, assessment package, runtime pins and VIP integration.
- Added nine optional fields to the existing Pricings collection and populated thirteen active canonical records. No canonical name/price was permanently changed. The archived examination's temporary calculator metadata was cleared.
- Added a reusable inline component to the pricing page and reusable entry block to the Services template. Both have independent category and finance controls. Finance defaults off pending confirmed lending terms.
- Prepared two existing finance FAQ CTA links. Browser inspection confirms the entry block and both FAQ links on the Signature Assessment staging service page.
- Published native CMS bindings/configuration to the Webflow subdomain only. Production custom domains were omitted from every publish request.
- A temporary staging-only change to gumline label and price (£225 → £226) appeared in the native rendered feed without a code edit. Restored label to Gumline bonding, price/tier to £225; restoration was verified in the staged browser DOM. This proves CMS transport; live calculator rendering remains unverified until runtime connection.
- Nineteen automated core/DOM integration tests pass. Coverage includes prices/tiers/units, missing data, assessment bundling, included whitening/hygiene, category restrictions, context conflicts, payment reconciliation, date sequencing/month boundaries, persistence, Escape/focus restoration logic, VIP dispatch, CMS escaping and Webflow's omitted false configuration markers.
- All new runtime files pass syntax checks. The combined JS is about 44 KB raw / 14 KB gzip; scoped CSS about 15 KB raw / 4 KB gzip; demand loader about 2.3 KB raw / 1.1 KB gzip. These are build-size measurements, not a Lighthouse/performance score.
- A standalone private HTML review file contains the same code and a labelled 16 September CMS snapshot. It demonstrates the inline UI and contextual drawers without publishing assets. Its finance controls are explicitly for review.

## Blocking approval

Automatic approval review rejected `github_create_tree` for `TheDentalBarns/tdb-webflow-runtime` because new code and CMS/pricing metadata would be transmitted to a public repository without explicit user approval. No GitHub tree/commit/branch was created remotely. No alternative public hosting or upload was attempted.

The global Webflow footer remains unchanged; there is **no calculator loader installed**. Native component fallback content and normal pricing links remain usable. The staging page is therefore prepared, not a working end-to-end calculator yet. Production was not published, and the production pricing HTML had no calculator component/loader markers.

The provided browser could inspect the public staging site, but rejected the private localhost preview with `ERR_BLOCKED_BY_CLIENT`. No alternative browser mechanism was used to bypass that restriction.

## Remaining acceptance work after approval

1. Publish the reviewed source/assets to the existing public repository's feature branch, preserving the staging base; never overwrite main.
2. Build the loader using the resulting immutable asset SHA, commit it, and append only its versioned script to the current Webflow footer.
3. Publish Webflow staging only. Verify pricing inline, service/FAQ drawers, CMS refresh, actual VIP handoff, keyboard focus/scroll behaviour, and mobile/tablet/desktop layout in the real staged browser. No enquiry submissions.
4. Resolve any visual/integration findings, record exact release pins and update this report. Do not claim responsive visual QA or real-site performance comparisons before this step.

## Policy decisions left visible

- Finance: confirm minimum borrowing, deposit bounds, supported terms within 3–12 months and assessment eligibility before enabling. Existing published material confirms only up to twelve months at 0%, subject to eligibility. Current code uses a provisional assessment-paid-separately illustration.
- Clinical timings: the brief's durations are planning assumptions. Extractions, gumline bonding, hygiene and restorative/shade dependencies withhold exact dates pending assessment.
- VIP: existing route is integrated without inventing unsupported form fields. No calculator summary is transmitted automatically.

See README.md for editor instructions and rollback; webflow-register.json lists component/field/element IDs and FAQ originals. Audit snapshots remain in the task workspace.
