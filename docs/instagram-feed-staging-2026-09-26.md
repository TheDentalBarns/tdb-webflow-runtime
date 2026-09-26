# Instagram card prototype — staging, 26 September 2026

Version: 0.5.3.

## Scope

Replace the four existing Instagram widget placements on dentalbarns.webflow.io with first-party cards using the 112 manually imported WebP images. The bootstrap is restricted to the staging hostname. It does not change the production feeds, Google reviews, Google Maps or announcement banner.

The data is an explicit manual CMS export, not an Instagram API connection or live CMS endpoint. Draft CMS entries are previewed without changing their publication/visibility flags. Regenerate the snapshot to include subsequent CMS edits; replace this data provider with the agreed ongoing CMS workflow before production promotion.

## Appearance and behaviour

- Cards fill their entire gallery column, with square corners and no decorative borders or dividers. Desktop two-column sections show one full-width card with no neighbouring peeks. Wide Instagram sections show a centred row of three cards, with the existing half-opacity adjacent-card emphasis, 20px gaps and full-width controls. Every main photo uses the same 4:5 frame. Mobile retains the full-width card, 2vw gap and faded neighbouring peeks.
- Separate 6rem top and bottom strips mirror the top/bottom edges of the same image. Navigation-matched glass uses rgba(255,252,247,.88) with saturate(150%) blur(20px), plus a readable opaque fallback. The main photo is not overlaid or blurred.
- Original TDB logo SVG, static at the top left inside a static colour ring. No logo animation, rotation, transition or transform.
- All card headers and profile links use thedentalbarns. Original post links and source provenance are retained.
- Larger black modern Instagram glyph at the top right; Crisp 1 CSS-pixel outline heart, comment bubble and sharp share plane below. The bubble is mirrored across the vertical axis so its tail points right. The view-post arrow uses the exact Smile Gallery SVG. The camera glyph uses the same thin outline treatment as the action icons.
- Likes, comments and shares are optional CMS integers. Only verified present values render next to the corresponding icon; missing values are not shown as zero. Like/comment links open the original post, while Share shares/copies the post URL.
- 31 like counts and 19 comment counts were migrated from visible legacy feed labels on 26 September 2026. Their upstream cache age is unknown and recorded in CMS. No share counts were available. Live sync and remaining counts require the Instagram account’s authorised API/Insights connection.
- Uses .highlight-swiper_component and the existing pinned TDBSliders 0.6.1 runtime. The existing engine owns the 400ms movement, one-time first-view advance, loop handling, drag, keyboard and navigation.
- Existing TDBSliderFocus 1.2.0 owns banner, navbar and VIP-footer movement and release; no parallel focus controller is added.
- Adjacent cards use the Smile Gallery half-opacity emphasis, with no edge mask. Smile Gallery arrow SVGs and native control classes provide the circular buttons on the right and pagination count on the left.

## Integration

Before the bundle loads, a staging-only head flag enables placeholders with the exact 4:5 image + 12rem glass bars + 5rem controls geometry. Mobile overflow follows Smile Gallery so faded neighbours remain visible. Instagram embed wrappers use natural height and full available width before and after hydration. This replaces legacy 50vh/40vw width and 140vw/90vh height constraints. Awards grid items explicitly use min-width:0, width:100% and natural height; inline-size containment on each known Instagram mount prevents the flex slide track from contributing an expanding min-content width. The same rules cover Home and First Visit awards, Happy Patients, Meet the Team and The Practice. Desktop placeholder widths use the same one-column or three-card calculation as the final viewport, preserving section space before the bundle loads.

The source stylesheet is appended once to the Webflow site head. The bootstrap is appended once to the footer; it checks the staging hostname and renames only the four known Instagram mounts before loading the immutable bundle. Other Elfsight widgets retain their classes and existing loader behaviour.

Rebuild with `python tools/build-instagram.py CMS_SNAPSHOT MEDIA_MANIFEST`. Then commit source, data and bundle, replace @RELEASE@ in the Webflow bootstrap with that exact immutable commit SHA, and publish only to the Webflow subdomain.

Rollback: remove the `data-tdb-instagram-preview-flag`, `data-tdb-instagram-card-style` and `data-tdb-instagram-staging` blocks from site custom code and republish staging. Original Webflow embed content remains intact.


## Topic tags and card refinements — v0.5.3

Media Gallery's existing Categories multi-reference is the canonical tag field. The Media Categories collection now contains 21 reusable tags. All 112 covers/titles were reviewed; 98 posts received additional editorial topics. Original four feed memberships remain unchanged. The full source captions were missing for all 112 posts and only two original hashtag strings were available, so treatment labels were not inferred from patient appearance or branded bags.

The manual bundle includes CMS tag slugs on every post. Existing mounts can opt into a relevant feed using `data-tdb-ig-tags="comfort,nervous-patients"` (any matching tag), `data-tdb-ig-tag-mode="all"` for an intersection, `data-tdb-ig-exclude-tags="seasonal"` to omit a topic and `data-tdb-ig-label="Feeling comfortable"` for its accessible title. Tagged feeds draw from the whole gallery. With no tag attribute, the original feed membership and order are retained. Empty tag results render a short empty state rather than unrelated posts. CMS edits still require rebuilding this explicit staging snapshot.

Awards text alignment is reset to left, matching every other card. The narrow-card rule now hides only `.tdb-ig-open-label`, leaving the native arrow visible. Both reflection wrappers are inset 3 CSS pixels on each side, with overflow:hidden and clip-path:inset(0) clipping the entire painted surface. The mirrors retain their original full-card image scale and have no direct blur filter. The glass again owns the original saturate(150%) blur(20px) backdrop treatment and rgba(255,252,247,.88) tint. It extends 3 pixels beyond each horizontal bar edge and is cropped by the bar, moving its compositing boundary outside the visible area. This restores the original glass appearance after the rejected direct-image-blur experiment in v0.5.2. The card, bar and reflection wrapper backgrounds remain transparent; the photo loading colour stays on the main photo. All feeds, breakpoints and loop copies share this rule.

Coverage after review: The Practice 87; Patient Experience 75; Practice Setting 35; Five Senses 33; Comfort 30; Awards 16; Seasonal 16; Patient Stories 15; Refreshments 13; First Visit 12; Happy Patients 9; Dental Technology 8; Team 3; Meet the Team 3; Hygiene 3; Nervous Patients 2; Smile Makeovers 2; Invisalign, Composite Bonding, Veneers and Whitening 0 confirmed. Tags overlap. The two Nervous Patients posts explicitly show the relevant award category. Existing Meet the Team membership is inherited from the legacy import and needs editorial review: its covers concern reviews and in-chair viewing rather than staff biographies.

## Production promotion — 26 September 2026

User approved publication to all four connected custom domains. The early layout flag and bootstrap now allow dentalbarns.webflow.io, thedentalbarns.com, www.thedentalbarns.com, thedentalbarns.co.uk and www.thedentalbarns.co.uk. The approved v0.5.3 card design and manual data bundle are unchanged. Automatic Instagram/CMS syncing is still pending; the public feed uses the existing 112-post snapshot. Earlier staging-only scope notes describe the prototype phase.
