# Promote approved staging reviews and team quotes

Production publishing previously left staging-only hostname guards active. As a result, production did not initialize the headline reviews, review drawer, embedded review cards, or the CMS-driven team quotes. The quote feed also remained visible without its runtime's critical CSS.

This release expands the guards to the approved staging hostname and all four production hostnames. Runtime behaviour, review data, styling, and quote content are preserved from staging.

## Runtime provenance

- Review drawer and Power Snippets: `a6b46c22388d53cad7f0b1325f47928cb930112f`.
- Team quotes: `f488e26be47dad6ba3479b38ee298473496149a8`.
- Existing Instagram production release remains `c54b180bd2bd8cdf36cd41763f8ad25831ead3e5`.

The distributed JavaScript files are copied from the exact assets currently used on staging, with only the hostname guard changed. Do not rebuild Power Snippets for this promotion: that historical commit contains source version 1.2.0 while the approved deployed asset is version 1.1.0. Associated source and CSS files are retained for reference.

## Webflow deployment

Update the shared Hero – Headline and Hero – Headline VIP inline runtime guards and drawer URL/integrity pairs. Update the Testimonial – Standard team quote loader guard and runtime URL/integrity pair. Update the Google Reviews embedded loader guard, preserving its existing Home/First Visit path scope. Update the First Visit page's review data embed with the new Power Snippets and drawer URL/integrity pairs.

The existing `staging-snapshot` data mode remains unchanged because it identifies the approved fixed review dataset, not a hostname permission. The dataset contains 83 rated reviews and the approved CMS-driven team quotes remain unchanged.

Publish all four production domains and the Webflow subdomain together. Verify rendered reviews, drawer interaction, hidden raw quote feeds, approved team quote text, and Instagram on fresh page loads.

## Validation

All six JavaScript source/distribution files pass `node --check`. Each file was compared against its exact original Git version, asserting that the single hostname guard replacement is the only difference. Recalculate SHA-384 integrity values from the exact distributed bytes before updating Webflow loaders. Verify CDN bytes before publishing.
