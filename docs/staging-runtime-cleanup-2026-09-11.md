# Staging runtime cleanup — 11 September 2026

This pass consolidates the approved Home/Location parallax slider behavior without intentionally changing page behavior.

## Before cleanup

Webflow staging footer used:

- Slider runtime v0.2.3 direct override: `b2799bcc959f9c95644c7e00253abe5a016303f3`
- Footer runtime v1.0.2: `f5fda2c134733f1b0c745264fb6d0c69fd396ef7`
- Inline mobile slider entry test
- Inline mobile slider navigation test
- Inline desktop slider entry visibility guard
- Inline desktop slider navigation test

The deployed footer runtime itself still referenced slider v0.2.0 internally.

## After cleanup

Webflow staging footer now uses:

- Slider runtime v0.3.0: `31386d986982aa60eb6c9199b6e6b4c03693897b`
- Slider UI v1.0.0: `3ccf519affaca89635efa68fb481464e7c56dd58`
- Footer runtime v1.0.3: `50cbe79a8f2113af75a6686b6911c6c87292aa3f`

The direct slider override and the four inline slider test blocks were removed.

## Behavior intentionally preserved

### Mobile portrait — Home and Location

- initial `[data-fade-slide]` content hidden
- slider advances one slide when initialized at the existing 100px proximity threshold
- autoplay stops
- bottom-right previous/next controls remain visible
- pagination remains hidden
- selected navigation button uses the existing lighter state

### Desktop/tablet — Home and Location

- initial `[data-fade-slide]` content hidden
- slider advances one slide at the existing 100px proximity threshold
- autoplay disabled
- navigation rail remains 100vw with 3vw page gutters
- previous and next controls remain vertically centered
- pagination remains hidden
- selected navigation button uses the existing lighter state

## Rollback

Rollback is intentionally simple and does not require reverting Git history.

1. Restore the previous Webflow footer block captured before this pass.
2. Restore the direct slider override pin to:
   `b2799bcc959f9c95644c7e00253abe5a016303f3/dist/tdb-sliders.js`
3. Restore footer runtime pin to:
   `f5fda2c134733f1b0c745264fb6d0c69fd396ef7/dist/tdb-footer-runtime.min.js`
4. Remove the `tdb-slider-ui.css` link.
5. Restore the four inline slider helper/test blocks.
6. Publish to the Webflow subdomain only and retest before any production publish.

No production custom domain was published during this cleanup pass.

## Deliberately not removed in this pass

- Webflow critical head CSS, including mobile navbar first-paint styling
- Home/Location page-specific first-paint reveal code
- desktop/mobile VIP runtimes
- the small VIP visual-refinement block in the footer
- the footer runtime's fallback dependency-loading calls
- historical Webflow registered scripts whose active application status could not be proven safely

These are left in place because removing them would provide little practical benefit while increasing regression risk.
