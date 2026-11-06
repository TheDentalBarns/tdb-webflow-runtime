# Services follow-up — 6 November 2026

Signature Assessment remains the Services template acceptance page. This pass uses headless Webflow tools and source/unit checks only; the user requested no computer control. Do not describe this pass as browser-verified.

## Native Designer ownership

- Cost region `7e742d52-f378-4939-7a64-7218fa2807ce` uses `.tdb-service-cost-region` with relative positioning and z-index 9998. It paints above the normal navigation (999) and assessment announcement (998), while the subsequent background can expose them again. Dialogs and the open navigation overlay retain their higher stacking levels.
- The consultation image on supporting CTA `4893a05d-5e2e-8d3f-2721-eb585ca97082` explicitly uses lazy loading, asynchronous decoding and low fetch priority. The existing journey poster using the same URL was already lazy.
- Shared supporting CTA image width and the journey media width use the same 90rem container, 3% desktop gutters and 5rem column gap. The supporting image remains square with shared parallax.
- Investment is the one expanded FAQ category in Designer. All questions and the remaining categories are closed. The introduction now starts with “Ask away. We’re open.”
- `.tdb-service-faq-item` owns bottom dividers instead of a top divider. This removes the extra line before the first question without a page override.
- FAQ CTA margins belong to the shared Primary Button's **FAQ answer** variant (`1de2431d-51cc-f408-ef10-db86ae2cc863`). Top spacing remains 6rem / 5rem / 3.5rem; bottom spacing is 3rem / 2rem on mobile. The four redundant margin wrappers were removed. The answer inner has no reserved CTA margin, so CMS answers without a CTA take only their content and the shared disclosure closing gap.
- FAQ answer text uses the existing `.text-rich-text.is-trans` opacity of 0.5.
- Barn icon masks reserve space without a solid fallback and use the darker cream #d6cab4. The desktop row aligns with the journey rail; mobile retains the wider VIP-style distribution.
- Recognition copy has no desktop left border; the mobile image/copy separator is retained. The recognition title's horizontal rules and the awards archive's first top divider are removed natively.

## Shared modules and loading

Services was missing `[data-tdb-reviews-feed]` and `[data-tdb-review-lazy]`. The widget created an empty fallback host and the CMS adapter requested legacy `/review-content`. Native host `9a7787bc-2dc5-d5fd-7493-74be62e83f06` now uses the same JSON URL as Home, Location and Pricing:

`https://tdb-public-availability.david-070.workers.dev/tdb-content/v2/reviews.json`

It uses the existing shared deferred review template, drawer controller, filters, selection and JSON adapter. The three service-selected quote excerpts retain their native CMS identities.

The calculator now opens through `TDBDrawer`, with shared motion, backdrop, focus/scroll handling and close artwork. Its own stylesheet keeps calculator presentation. The drawer enables the existing Pricing category/inset treatment; price data is unchanged. Nested VIP return preserves the calculator choices and scroll position.

The original “We believe everyone deserves to feel good about their smile” footer is restored only in drawer mode, using its existing dark footer styling. Inline calculator embeds do not render it.

The separate Services footer `tdb-calculator-loader.js` include was redundant: the shared runtime already contains that definition. It was removed. The calculator UI/CSS/data still load on intent. The later CMS pass also retires `tdb-service-content.js`: the journey now owns `src/embeds/service-video-metadata.html`, which derives VideoObjects from its existing native CMS-bound headings, descriptions, poster and Vimeo attributes without loading media. The Smile Design waitlist text/link are native CMS bindings, with no URL-specific runtime rewrite.

FAQ category artwork and gallery placeholders use the existing proximity/consent icon loader instead of eager native CSS URLs. The price, clock, diamond and address entries reuse existing shared asset URLs. Data-URI artwork is embedded, not a remote request; repeated uses of one URL are not separate asset downloads.

## Validation and limits

Build parity passes. The focused calculator, drawer, review JSON/lifecycle and lazy icon suite passes 91 tests. The preceding full serial run passed 947 tests with three skips and no failures. Published-source verification is recorded separately in the workspace evidence folder `../services-hero-20261105/`.

The page-break quote shell still uses shared classes/controllers around its native service-filtered CMS list; it is not yet an instance of the shared Review Carousel definition. Its Designer first-slide display still needs visual confirmation. No computer control was used in this pass. Publish only to the Webflow staging subdomain, not custom domains.

## Service display settings and drawer follow-up

The user approved replacing the legacy Review Link reference at the Services 60-field limit. Its complete prior schema and values are backed up in `../services-hero-20261105/services-cms-before-display-settings.json`. The replacement reference `service-display-settings` links eight records in Service Display Settings (`6aedd460f014a26543339e49`). It owns the service symbol, secondary hero button text/link/down arrow, supporting-image switch and calculator starting category. Existing Section 3 Image values are preserved.

Native bindings now supply lotus artwork on Nervous Patient Care and diamond artwork elsewhere, including the centred intro and both background benefit strips. The shared Benefit Strip's **On dark** variant gives the artwork darker cream independently of its CMS image. The light introduction retains its normal image colour.

Nervous Patient Care's Five Senses section is an instance of the same dark supporting CTA as the cost section. It has one lotus button with `data-tdb-senses-open`, a square treatment-chair image and shared parallax. Calculator/link/wellness button visibility is authored natively; the inactive buttons are omitted from published HTML. The small lotus follows the shared one-pixel optical artwork and inherits button colour. Nervous and General Dentistry use their original CMS lounge images in the shared square frame where a smile gallery can later be enabled.

Calculator starting categories are cosmetic for Cosmetic Dentistry and Smile Design, restorative for General Dentistry, and empty for Signature Assessment and Nervous Patient Care. No treatment is preselected. A restored session, including a deliberate empty selection, takes precedence. The drawer fills the viewport; spare height remains cream above its drawer-only belief footer. Shared closed roots use `display:none`, so descendants with `visibility:visible` cannot leak through after closing. Reopening preserves the estimate and reading position.

The service hero opts into `data-tdb-parallax-reset-top`. Shared motion restores its authored start opacity at the page top even after a fast non-gesture scroll; normal mid-page restoration remains unchanged. Source and built tests cover the return from a fully faded offscreen hero.

The staging HTML checks cover all five main services: a single correct supporting CTA, both restored CMS images, the chosen categories, no Lorem ipsum, no external service-content script, native Smile Design waitlist copy/link and five VideoObject records. These are source/unit checks, not a visual browser pass.
