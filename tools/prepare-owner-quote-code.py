"""Prepare the narrow owner-quote head patch. Does not write to Webflow or publish."""
import argparse
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--input', required=True)
parser.add_argument('--commit', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
if not re.fullmatch(r'[0-9a-f]{40}', args.commit):
    raise SystemExit('An immutable 40-character commit is required')
blocks = json.loads(Path(args.input).read_text())
head = next(block for block in blocks if block['location'] == 'head')
content = head['content']
old_quotes = '6e71c4a5b0630d8991038bb6c830d1dd45798178'
vimeo_release = 'a7d4fe2f1ccfc46404b107a5b65cf78c28853464'
pattern = r'''<!-- TDB Owner Quotes[^>]*-->\s*<script\b(?:"[^"]*"|'[^']*'|[^'">])*>\s*</script>'''
old_tag = re.search(pattern, content)
assert old_tag and 'data-tdb-team-quote-runtime' in old_tag[0], 'Expected the owner quote startup block'
content, removed = re.subn(pattern, '', content)
assert removed == 1, 'Expected exactly one eager owner-quote tag'
pins_match = re.search(r"data-tdb-asset-pins='([^']+)'", content)
assert pins_match, 'Existing shared dependency pins required'
pins = json.loads(pins_match[1])
for file in ['tdb-quote-carousel.js', 'tdb-quote-carousel.min.js']:
    assert pins.get(file) == old_quotes, 'Unexpected existing quote release'
    pins[file] = args.commit
# Consent's own release changes, but Vimeo keeps the exact previous loader URL
# and therefore all of its existing relative asset URLs and cache entries.
assert pins.get('tdb-vimeo-loader.js', vimeo_release) == vimeo_release
pins['tdb-vimeo-loader.js'] = vimeo_release
content = content[:pins_match.start(1)] + json.dumps(pins, separators=(',', ':')) + content[pins_match.end(1):]
old_consent = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+vimeo_release+'/dist/tdb-consent.js'
assert content.count(old_consent) == 1, 'Expected the current shared-consent release exactly once'
content = content.replace(old_consent, old_consent.replace(vimeo_release, args.commit))
content = content.replace('<!-- TDB consent v0.5.0 | shared state; Vimeo starts only with functionality permission. -->',
    '<!-- TDB consent v0.6.0 | Vimeo: functionality permission. Owner quotes: either choice or direct interaction. -->')
head['content'] = content
Path(args.output).parent.mkdir(parents=True, exist_ok=True)
Path(args.output).write_text(json.dumps(blocks, indent=2)+'\n')
