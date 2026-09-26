# Instagram card prototype — staging, 26 September 2026

Version: 0.2.0.

## Scope

Replace the four existing Instagram widget placements on dentalbarns.webflow.io with first-party cards using the 112 manually imported WebP images. The bootstrap is restricted to the staging hostname. It does not change the production feeds, Google reviews, Google Maps or announcement banner.

The data is an explicit manual CMS export, not an Instagram API connection or live CMS endpoint. Draft CMS entries are previewed without changing their publication/visibility flags. Regenerate the snapshot to include subsequent CMS edits; replace this data provider with the agreed ongoing CMS workflow before production promotion.

## Appearance and behaviour

- Full-width cards with square corners, edge-to-edge images and no decorative borders or dividers. Main photos retain their full native aspect ratio; the viewport follows the active photo height.
- Separate 6rem top and bottom strips mirror the top/bottom edges of the same image. Navigation-matched glass uses rgba(249,242,230,.75) with saturate(150%) blur(20px), plus a readable opaque fallback. The main photo is not overlaid or blurred.
- Original TDB logo SVG, static at the top left inside a static colour ring. No logo animation, rotation, transition or transform.
- White modern Instagram glyph at the top right; SVG heart, comment, share and view-post arrow below. The glyph is reused from the site's Instagram footer link.
- Counts are omitted because the manual import does not contain verified engagement totals. Like/comment links open the original Instagram post; share copies or shares its permalink.
- Uses .highlight-swiper_component and the existing pinned TDBSliders 0.6.1 runtime. The existing engine owns the 400ms movement, one-time first-view advance, loop handling, drag, keyboard and navigation.
- Existing TDBSliderFocus 1.2.0 owns banner, navbar and VIP-footer movement and release; no parallel focus controller is added.
- Adjacent cards use the Smile Gallery half-opacity emphasis, with no edge mask. Smile Gallery arrow SVGs and native control classes provide the circular buttons on the right and pagination count on the left.

## Integration

The source stylesheet is appended once to the Webflow site head. The bootstrap is appended once to the footer; it checks the staging hostname and renames only the four known Instagram mounts before loading the immutable bundle. Other Elfsight widgets retain their classes and existing loader behaviour.

Rebuild with `python tools/build-instagram.py CMS_SNAPSHOT MEDIA_MANIFEST`. Then commit source, data and bundle, replace @RELEASE@ in the Webflow bootstrap with that exact immutable commit SHA, and publish only to the Webflow subdomain.

Rollback: remove the `data-tdb-instagram-card-style` and `data-tdb-instagram-staging` blocks from site custom code and republish staging. Original Webflow embed content remains intact.
