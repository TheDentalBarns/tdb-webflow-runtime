"""Build the staging Instagram cards from an explicitly exported CMS snapshot.

Usage: python tools/build-instagram.py /path/to/cms-items.json /path/to/media-manifest.json
No credentials, private upload metadata or full CMS records are bundled.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/instagram'
items = json.loads(Path(sys.argv[1]).read_text())
manifest = {x['cms_item_id']: x for x in json.loads(Path(sys.argv[2]).read_text())}
mapping = [
    ('d03f7f34-0953-4575-946c-bca5b6a21bed', 'happy-patients', 'Happy Patients', '6ab7b9fabdfdf7aa5db3558f'),
    ('9abfdbc1-5cc2-4de0-bf56-1093d967c2be', 'awards', 'Awards', '6ab7b743e5d9f17124ef7ab3'),
    ('35374f05-af95-4b8c-9480-e091c19319c8', 'meet-the-team', 'Meet the Team', '6ab7b9fabdfdf7aa5db35591'),
    ('3cbfb5f1-fbeb-4c0c-b53c-6a91daa4aa04', 'the-practice', 'The Practice', '6ab7b41d76a5f592a5b6dd3f'),
]
taxonomy = json.loads((SOURCE / 'gallery-tags.json').read_text())
tag_keys = {tag['id']: tag['key'] for tag in taxonomy}
data = {'version': '0.5.3', 'importedAt': '2026-09-26', 'tags': {tag['key']: tag['name'] for tag in taxonomy}, 'posts': {}, 'feeds': {}}
items.sort(key=lambda item: item['fieldData'].get('date') or '', reverse=True)
items.sort(key=lambda item: (not item['fieldData'].get('featured', False), item['fieldData'].get('display-order') or 0))
for item in items:
    f = item['fieldData']
    url = f['instagram-link'].rstrip('/')
    assert re.fullmatch(r'https://www\.instagram\.com/(?:p|reel)/[A-Za-z0-9_-]+', url)
    shortcode = url.rsplit('/', 1)[-1]
    assert re.fullmatch(r'[A-Za-z0-9_.]+', f['source-account'])
    assert f['image']['url'].startswith('https://cdn.prod.website-files.com/') and f['image']['url'].endswith('.webp')
    m = manifest.get(item['id'], {})
    title = f.get('alt-text') or f.get('caption') or f['name']
    if title.startswith('Instagram post '): title = 'A moment at The Dental Barns, shared on Instagram.'
    data['posts'][shortcode] = {'shortcode': shortcode, 'account': f['source-account'], 'date': f.get('date'), 'url': url, 'image': f['image']['url'], 'alt': title, 'width': m.get('width', 1080), 'height': m.get('height', 1440)}
    data['posts'][shortcode]['tags'] = [tag_keys[id] for id in f.get('categories', []) if id in tag_keys]
    for metric, field in [('likes', 'instagram-likes'), ('comments', 'instagram-comments'), ('shares', 'instagram-shares')]:
        count = f.get(field)
        if isinstance(count, (int, float)) and not isinstance(count, bool) and count >= 0 and int(count) == count:
            data['posts'][shortcode][metric] = int(count)
for widget, key, label, category in mapping:
    ids = [item['fieldData']['instagram-link'].rstrip('/').rsplit('/', 1)[-1] for item in items if category in item['fieldData'].get('categories', [])]
    assert ids
    data['feeds'][widget] = {'key': key, 'label': label, 'posts': ids}
(SOURCE / 'manual-gallery.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
bundle = '/* TDB Instagram manual gallery v0.5.3 | 26 September 2026 */\nwindow.TDBInstagramManualData=' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n' + (SOURCE / 'instagram-feed.js').read_text()
(ROOT / 'dist/tdb-instagram-feed.js').write_text(bundle)
print(json.dumps({'posts': len(data['posts']), 'feeds': {v['label']: len(v['posts']) for v in data['feeds'].values()}, 'bundle_bytes': len(bundle.encode())}))
