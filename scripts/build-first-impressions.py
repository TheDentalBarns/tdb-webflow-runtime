from pathlib import Path
import json
import html
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
records = json.loads((source / 'records.json').read_text())
assets_path = source / 'webflow-assets.json'
assets = json.loads(assets_path.read_text()) if assets_path.exists() else {}
esc = lambda value: html.escape(str(value), quote=True)
badge = '<span class="tdb-fi-verified" role="img" aria-label="Verified patient"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 1 2.7 2.1 3.4-.1 1 3.3 2.9 1.8-.9 3.3.9 3.3-2.9 1.8-1 3.3-3.4-.1L12 23l-2.7-2.1-3.4.1-1-3.3L2 15.9l.9-3.3L2 9.3l2.9-1.8 1-3.3 3.4.1Z"/><path d="m7.5 12 3 3 6-6" fill="none" stroke="#f9f2e6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
arrow = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16M12 4l8 8-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"/></svg>'
cards=[]
for i,record in enumerate(records):
    words=' · '.join(record['words'])
    image=assets.get(record['slug'],{}).get('url',base+record['imagePath'])
    date=f'<time class="tdb-fi-date" datetime="{esc(record["date"])}">{esc(record["date"])}</time>' if record['date'] else ''
    cards.append(f'<figure class="tdb-fi-card swiper-slide{" is-current" if i==0 else ""}" role="group" aria-roledescription="slide" aria-label="{i+1} of {len(records)}" aria-hidden="{str(i!=0).lower()}" data-fi-slug="{esc(record["slug"])}"><img src="{esc(image)}" width="1080" height="1440" loading="lazy" decoding="async" draggable="false" alt="{esc(record["initials"])}’s handwritten first-visit card: {esc(", ".join(record["words"]))}."><figcaption class="tdb-fi-banner"><p class="tdb-fi-words">{esc(words)}</p><div class="tdb-fi-meta"><span class="tdb-fi-initials">{esc(record["initials"])}{badge if record["verified"] else ""}</span>{date}</div></figcaption></figure>')
embed='<style>'+css+'</style><div class="tdb-first-impressions swiper" data-tdb-first-impressions data-fi-source="staging-preview" role="region" aria-label="First visit, first impressions" aria-roledescription="carousel"><div class="tdb-fi-viewport" tabindex="0" aria-label="Patient first impressions. Use left and right arrow keys to browse.">'+''.join(cards)+'</div><div class="tdb-fi-navigation"><div class="tdb-fi-count" role="status" aria-live="polite" aria-atomic="true">1 of '+str(len(records))+'</div><div class="swiper-buttons-wrapper"><button class="slider-arrow swiper-btn-prev is-dark" type="button" aria-label="Previous first impression">'+arrow+'</button><button class="slider-arrow swiper-btn-next is-dark" type="button" aria-label="Next first impression">'+arrow+'</button></div></div></div><script defer src="'+base+'dist/tdb-first-impressions.js"></script>'
(root / 'dist/first-impressions-embed.html').write_text(embed)
print(f'Generated First Impressions embed: {len(embed)} characters, {len(records)} cards.')
