# First Impressions staging implementation

The three supplied patient cards are JH (Calm, Relaxing, Great), EC (Calming, Refreshments, Kindness), and SD (Calm, Relaxing, Informative). The originals are unchanged 1080 × 1440 WebP files. Their dates were not supplied and are intentionally empty; do not substitute import dates.

## CMS blocker

On 26 September 2026 the Webflow API refused collection creation with HTTP 409: “Upgrade to Business Hosting to create more collections.” The site contains 20 collections. No existing collection was repurposed or deleted. `src/first-impressions/cms-schema.json` defines the requested dedicated collection and `records.json` holds the import data. The staging component currently uses server-rendered preview records; it is not CMS-backed yet.

After the collection allowance is increased, create the collection and fields from the schema, import these records, and bind a page-level Collection List to it. Sort by Display order ascending. The native CMS list should render each record using the existing `.tdb-fi-card` figure, `.tdb-fi-banner`, words, initials and optional date markup. Keep the Collection List at page scope: CMS bindings inside component definitions did not resolve on this site. Keep the heading component and runtime separated if necessary. A missing date hides only the date, without changing the fixed banner height. Standard CMS draft/archive controls determine inclusion.

## Layout and behaviour

- Critical CSS and HTML render together so image aspect ratio and a 6rem caption are reserved before JavaScript and images load.
- Full 3:4 images, no crop, with a 20px blur and 140% saturation caption overlay.
- One central card, neighbours faded to 50%, 300ms fade and 400ms slide. Circular arrows and the native black-at-25%-opacity count match other sliders.
- Looping next/previous; rapid clicks advance immediately without an interaction lock. Horizontal pointer gestures and arrow keys work. Vertical page scrolling is preserved.
- Once 30% of the card is visible, advance once after 160ms. Prior user interaction cancels that introduction. There is no continuous autoplay. Existing site slider-focus handlers recognise `.swiper`, `.swiper-slide` and `.swiper-btn-*`, handling navbar, live banner and bottom bar movement.
- A single record remains static without repeated clones or an intro move.
- `?first-impressions-preview=mobile` on Webflow staging provides a narrow 390px geometry preview. It is not mobile-device emulation.

## Integration and rollback

Site: `677cf86cf9952f978d94d80c`; First Visit page: `678960b4f377f07e06aa5447`.

Replace only the HtmlEmbed `85f15e14-1084-3520-419b-feff621db820` in component `85f15e14-1084-3520-419b-feff621db811`. Leave the shared heading/intro and the separate review bootstrap embed unchanged. Publish to the Webflow subdomain only.

Original embed for rollback:

```html
<div class="elfsight-app-733db009-b31a-486c-80d7-7f571924fbc5" data-elfsight-app-lazy></div>
```

Build with `python scripts/build-first-impressions.py COMMIT_SHA`. The generated embed pins code to the immutable commit. The site has a restrictive CSP; public runtime/image sources should remain on its already-used GitHub CDN or Webflow asset host.
