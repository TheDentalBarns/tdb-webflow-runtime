# Services audit and motion follow-up — 6 November 2026

This pass uses Webflow headless tools, published HTML/CSS/JavaScript and automated source/built-output checks. No computer control or visual browser session was used, as requested. Signature Assessment is the principal Services acceptance page; Home, Location and Pricing provide shared-component comparisons.

## Changes

- The hero's rapid-return safeguard now runs only after the page has left the top. Initial mounting, image readiness and viewport/font measurement retain the first painted crop instead of applying an extra translation during the phased entrance. A genuine rapid return still restores the hero opacity beneath the transparent navigation.
- The shared supporting CTA parent now owns the native stacking rule for both calculator and Five Senses variants. The assessment banner stays behind this whole section and can appear again over the following background.
- Desktop Five Senses volume uses the navigation's 2vw side inset. Home hero play/pause uses native Designer 2% horizontal padding, with its previous mobile inset restored at the tablet breakpoint. This is horizontal alignment; no new vertical collision policy was introduced.
- Five Senses closes with the same slide-down-and-fade keyframes on desktop and mobile. Existing duration, scroll lock and audio handoff remain shared.
- Supporting CTA geometry is native: automatic height, one explicit desktop grid row, equal columns, a square clipped media frame and balanced section padding. The image's 120% overscan is intentional parallax coverage, not section padding.
- The awards archive header contains a native flex row with the shared trophy image and label, rather than positioned background artwork. Its cream variant is shared by Home and Services. The first pricing divider is removed natively; the final FAQ category retains the overall ending divider.
- Service background benefits use equal native grid columns. The booking background has a service-specific variant, recognized by the existing page-break controller, without changing the Home/Location background variants.

## Ownership and loading findings

- Native CMS bindings supply the service copy, service symbol, images, button destination/visibility and starting calculator category. The retired `tdb-service-content.js` and direct Services `tdb-calculator-loader.js` script tags are absent from the published page.
- The remaining local video metadata embed derives five VideoObject records from the section's CMS-bound headings, descriptions, posters and Vimeo attributes. It makes no media requests and does not rewrite page copy, links or layout.
- The review drawer uses the shared JSON feed and drawer modules. Calculator and Five Senses internals remain external feature modules with their own styling and shared lifecycle/motion.
- Investment is the first expanded FAQ category in Designer. The other categories and every question are closed. CTA-specific spacing belongs to the button variant, so an answer without a CTA does not reserve a CTA block.
- The consultation image, macaron review background and booking lounge photograph are marked lazy. The image whose filename contains `practice-amenities` is the lounge/sofa booking background intentionally present on Signature Assessment; it is not an unrelated hidden Five Senses image. Native lazy loading can fetch before an element is visible, so markup is not proof of exact request timing.
- Monochrome controls use the shared mask system where appropriate; CMS award logos and editorial imagery remain native images. Masks still fetch their SVG URLs. Repeated references to the same URL do not by themselves demonstrate duplicate transfers; data-URI entries are embedded artwork.

## Remaining exceptions

- Published-source matching finds no active IX2 event targets on Signature Assessment, Home, Location or Pricing. Webflow still includes an IX2-bearing bundle, and Signature Assessment has six residual Vimeo `data-w-id` hooks. This is not a claim that all IX2 bytes or historical configuration have been removed.
- The service review page-break still has its own native filtered CMS shell using shared classes/controllers. It is not yet an instance of the shared Review Carousel definition. Component consolidation remains outstanding.
- Approximately 3.65 KB of inline startup/critical CSS remains on Signature Assessment, matching the shared startup contract. Layout fixes in this pass were made in Designer, not hidden in a page-specific stylesheet.
- A fresh uncached network recording, visual mobile/desktop comparison and physical-device interaction pass remain unverified. No Lighthouse/GTmetrix improvement or exact early-transfer saving is claimed.

## Validation

- Full serial JavaScript suite: 965 tests, 962 passing, three skipped, zero failures.
- Source and generated tests cover initial hero crop at 390px and 1440px, image/resize readiness, smooth first scroll and recovery from a fully faded hero.
- Generated build parity and the custom Swiper artifact check pass. Prettier passes with end-of-line auto; the default LF-only check reports Windows checkout line endings rather than code-format differences.
- Webflow readbacks confirm native FAQ defaults, equal background columns, award icon/label structure and supporting CTA geometry. Final staging-source checks and release assets are recorded privately in the workspace evidence folder; full settings and page snapshots are not committed here.

Publish this work only to the Webflow staging subdomain. Production custom domains are outside this release.
