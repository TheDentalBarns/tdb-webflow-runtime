from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
source = root / 'src/first-impressions'
css = (source / 'first-impressions.css').read_text()
js = (source / 'first-impressions.js').read_text()
(root / 'dist/tdb-first-impressions.css').write_text(css)
(root / 'dist/tdb-first-impressions.js').write_text(js)
if len(sys.argv) < 2:
    raise SystemExit('Pass the immutable runtime commit SHA to generate the Webflow embed.')
revision = sys.argv[1]
base = f'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@{revision}/'
arrow = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16M12 4l8 8-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"/></svg>'
# Content is supplied by a native page-level CMS list. Critical CSS reserves
# the portrait and navigation space before the runtime or images arrive.
embed = (
    '<style>' + css + '</style>'
    '<div class="tdb-first-impressions swiper" data-tdb-first-impressions data-fi-source="cms" role="region" aria-label="First visit, first impressions" aria-roledescription="carousel" aria-busy="true">'
    '<div class="tdb-fi-viewport" tabindex="0" aria-label="Patient first impressions. Use left and right arrow keys to browse."></div>'
    '<div class="tdb-fi-navigation"><div class="tdb-fi-count" role="status" aria-live="polite" aria-atomic="true"></div>'
    '<div class="swiper-buttons-wrapper">'
    '<button class="slider-arrow swiper-btn-prev is-dark" type="button" aria-label="Previous first impression" disabled>' + arrow + '</button>'
    '<button class="slider-arrow swiper-btn-next is-dark" type="button" aria-label="Next first impression" disabled>' + arrow + '</button>'
    '</div></div></div><script defer src="' + base + 'dist/tdb-first-impressions.js"></script>'
)
(root / 'dist/first-impressions-embed.html').write_text(embed)
print(f'Generated CMS First Impressions embed: {len(embed)} characters.')
