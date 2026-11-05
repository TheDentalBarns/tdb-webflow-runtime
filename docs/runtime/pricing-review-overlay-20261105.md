# Pricing headphones review overlay — 5 November 2026

The existing headphones Page Break Image and Review Carousel instances are composed in one native wrapper on Pricing, beneath the treatment calculator. The review instance was moved from its former separate section, not copied. No new component definition, image, script, runtime override or animation owner was added.

## Native ownership

- Page: `677cfbbb752fa1bb44264481`.
- Composition: `10e655ed-6222-3a57-cf85-d15e2d056256`, class `tdb-review-image-break`, DOM id `pricing-patient-stories`. Native position:relative, width:100%, overflow:hidden.
- Page Break Image: existing definition `30d55327-1ca1-3a76-9cf2-5722b1366486`; existing instance `9e345c2a-50d0-9ead-fb4d-efd8b3d85994`. New **Review background** variant `10700323-20e3-bbe9-acce-02b6ac8f02c1`; variant prop `69ce180b-0784-d82b-f2af-935e3308e0ca`.
- Review Carousel: existing definition `63c143be-60b7-7cf7-7a84-9ff3c467f0bf`; existing instance `5ee77335-e5ea-fff7-ce03-bf11b7ffd5f7`. New **On image** variant `adef231b-171f-72aa-ca94-1f52d7214ab4`; variant prop `896fb913-4864-85e9-cd9a-a18626fc9ede`.
- Designer owns responsive height/crop, the static dark gradient, white colour variable, overlay placement and spacing. The existing stars, typography and numbered pagination remain native.
- Only these two Pricing instances select the new variants. Base instances retain their previous appearance. Home's page breaks and review carousel remain Base.
- Existing shared page-break motion, quote carousel, author fade, ticker, review selection/feed, drawer, consent and proximity behaviour are unchanged. No preview controls or prototype JavaScript were installed.

Desktop height is clamp(32rem,65vh,46rem); tablet caps at 42rem. Below 768px it is clamp(34rem,75svh,44rem). The photo retains its 4vh overscan; cover crop is 50%/56% on desktop and 55%/50% below 480px. Review copy and numbering use the native White variable. Exact native write actions are recorded in the adjacent changes JSON.

## Verification

Staging publish task `40b76f0d-b582-4a63-a0e0-c1957f0a1cf0` completed at 2026-11-05T11:40:20.511Z. All four production custom domains retain 2026-10-01T10:10:45.669Z. Runtime remains `c598db4610ecc61bb62fafec1278a63d8a8db7c2`; no release pin changed.

- 22 existing quote-carousel and page-break loader tests passed, zero failures.
- Desktop browser: image and white overlay render at identical 1363 × 608.39px bounds; no horizontal page overflow. Keyboard navigation wraps through three reviews and the shared ticker settles correctly.
- The current CMS selection hydrates the authored fallback cards as before. Opening TheHayleyRose's quote displayed the matching full review; close returned focus into the overlay, released scroll locking and preserved its 147.375px viewport top.
- The photo uses the existing responsive 1600px Webflow source and shared vertical transform. No new image is loaded.
- Captured browser warnings/errors contained extension metadata errors only, not site script errors.
- Native published CSS includes the intended tablet/mobile media rules. **Mobile visual QA and physical Safari were not completed.** The browser rejected the data-URL mobile-frame harness under its URL security policy; no workaround was attempted.
- Raw Pricing elements: 4,149 → 4,150 (one composition wrapper). One review carousel and three authored slides before and after. Home remains 1,132 elements.
- Pricing HTML: 426,221 → 426,716 bytes. Native Pricing CSS: 167,260 → 168,902 bytes; locally recompressed gzip 27,384 → 27,767. External script URLs and page-break image sources are unchanged on Pricing and Home. These are byte/structure checks, not a performance benchmark.

Browser screenshot: `tdb-pricing-review-overlay-staging-20261105.jpg`. Before/after published HTML, extracted variant CSS and comparison JSON are in the task evidence directory.

## Follow-up: quote spacing and contextual trio selection

The overlay retains the shared native star decoration, quote viewport, byline and pagination rules. The decoration has 7rem bottom padding (3rem below 480px), and the quote viewport overlaps that padding by 3rem. The viewport reserves a minimum `300px + 3rem`; all cards participate in the flex track's height and are vertically centred. The author has a 2rem top margin and pagination reserves 44px. There is no per-slide auto-height animation. Consequently shorter quotations have more surrounding room without moving the stars or pagination. These are not identical fixed gaps around each quotation. The On image variant changes only the surrounding height, padding, crop, placement and colour; no extra blank spacer was added.

Desktop DOM measurement at the fluid 14.92px root size: stars 17.89px high; decoration bottom padding 104.44px; viewport/track/all slides 344.75px; byline margin 29.84px; pagination 44px. The shared quote frame was 466.33px high. Mobile spacing rules were checked in published CSS, not visually emulated.

The review selector previously used editorial positions 2–4 for every contextual page. `src/reviews/native/cms.js` now tells the JSON session whether a separate introduction contains an actual quotation. `src/reviews/native/json.js` reserves position one only in that case. Home/Location retain positions 2–4 after their opening quote; Pricing's rating-only introduction does not reserve a quotation, so its trio uses positions 1–3. The presence flag is part of the session cache key. Context ranking, native lead identity, duplicate handling, drawer order, pagination count, loading and motion are unchanged; legacy non-editorial featured lists are unchanged.

Focused selection, JSON, loader lifecycle and native CMS checks: 48 passed, zero failures. Regression cases cover no introduction, rating-only introduction, a real opening quotation, cache separation and a list with fewer than three reviews. Full `npm run verify`: build reproducibility passed; 934 tests, 931 passed, three existing skips, zero failures. Changed source formatting and `git diff --check` passed.

## Rollback

Set the two Pricing instance Variant props to `base`. Move the existing Page Break Image before Pricing section `74eaf8d2-e788-4f8c-9e88-c4f583816673`; move the existing Review Carousel before Instagram instance `c32368d0-00e7-457d-5ee3-1ad66316f9ad`, both under main wrapper `f3a6c255-9ed7-32a9-be96-9b7f1e282565`. Remove the now-empty composition wrapper, then publish staging only. The unused native variants can remain for review without adding page elements. This layout rollback does not require a runtime rollback. To reverse the separate trio-selection fix, restore the unified `c598db4610ecc61bb62fafec1278a63d8a8db7c2` runtime pin in the existing seven site/page code locations. Original component trees and instance props are in `pricing-review-overlay-before-20261105.json`.
