# First Impressions

The three supplied patient cards are JH (Calm, Relaxing, Great), EC (Calming, Refreshments, Kindness), and SD (Calm, Relaxing, Informative). The originals are unchanged 1080 × 1440 WebP files. Their dates were not supplied and are intentionally empty; do not substitute import dates.

## CMS

The dedicated **First Impressions** collection was created after the collection allowance was upgraded on 26 September 2026. Collection ID: `6ab78cf13064e85727165c73`. `src/first-impressions/cms-schema.json` describes the fields; `records.json` is the original import manifest, not the live content source.

Edit Card image, Word one/two/three, Initials, optional Review date, Verified patient, Display order and Image description in Webflow CMS. Lower display-order numbers appear first. Images were imported into Webflow's asset hosting. Standard CMS draft/archive controls determine inclusion at publish time. Publishing content refreshes the native feed; no runtime rebuild is required for content changes.

A hidden page-level Collection List (`f6ff16c3-7917-5b1f-f498-eebbf88bd474`) supplies the runtime, sorted by Display order ascending, maximum 100 items. Keep it at page scope: CMS bindings inside component definitions did not resolve on this site. The native image, words, initials, date, slug and description have `data-fi-*` markers. The verified marker's visibility is bound to the Verified patient switch. The runtime creates slide text using DOM text nodes and omits blank dates. An empty feed hides the carousel instead of showing stale seed data.

## Layout and behaviour

- Critical CSS reserves the full 3:4 portrait and navigation space before JavaScript or images load.
- Portraits are uncropped, with a dark-to-transparent top-left gradient. Captions use white, left-aligned text, the existing 5% padding rhythm and a 6rem caption area. No blur.
- First Impressions uses the site's light cream section background.
- One central card, neighbours faded to 50%, 300ms fade and 400ms slide. Circular arrows and the native black-at-25%-opacity count match other sliders.
- Looping next/previous; rapid clicks advance immediately without an interaction lock. Horizontal pointer gestures and arrow keys work. Vertical page scrolling is preserved.
- Once 30% of the card is visible, advance once after 160ms. Prior user interaction cancels that introduction. There is no continuous autoplay. Existing site slider-focus handlers recognise `.swiper`, `.swiper-slide` and `.swiper-btn-*`, handling navbar, live banner and bottom bar movement.
- A single record remains static without repeated clones or an intro move.
- `?first-impressions-preview=mobile` on Webflow staging provides a narrow 390px geometry preview. It is not mobile-device emulation.

## Integration and rollback

Site: `677cf86cf9952f978d94d80c`; First Visit page: `678960b4f377f07e06aa5447`.

The runtime shell lives in HtmlEmbed `85f15e14-1084-3520-419b-feff621db820`, component `85f15e14-1084-3520-419b-feff621db811`. Leave the heading/intro and separate regular-review bootstrap unchanged. Publish to the Webflow subdomain only.

Original embed for rollback:

```html
<div class="elfsight-app-733db009-b31a-486c-80d7-7f571924fbc5" data-elfsight-app-lazy></div>
```

Build with `python scripts/build-first-impressions.py COMMIT_SHA`. The generated embed pins code to the immutable commit. The site has a restrictive CSP; runtime/image sources remain on its already-used GitHub CDN or Webflow asset host.
