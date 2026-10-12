"""Generate the small consent-only font faces inserted once in the global head.

Usage: python tools/runtime-build/build-consent-fonts.py
Requires fonttools[woff] (including Brotli). Regenerate after changing banner text.
Designer owns the family's assignment; this file defines font assets only.
"""
import base64
import hashlib
import io
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/"
FONTS = {
    300: "682444d6cd79a0899f83eea1_SweetSansProLight.woff2",
    400: "68245761078dfe24e80413ca_SweetSansProRegular.woff2",
}


class BannerText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = False
        self.text = {300: [], 400: []}

    def handle_starttag(self, tag, attrs):
        if dict(attrs).get("id") == "cookiescript_header":
            self.title = True

    def handle_endtag(self, tag):
        if tag == "div":
            self.title = False

    def handle_data(self, data):
        self.text[300 if self.title else 400].append(data.strip())


parser = BannerText()
parser.feed((ROOT / "src/consent/banner.html").read_text())
rules, manifest = [], []
for weight, name in FONTS.items():
    source = urlopen(BASE + name, timeout=45).read()
    font = TTFont(io.BytesIO(source))
    text = " ".join(parser.text[weight])
    options = subset.Options()
    options.recalc_timestamp = False
    worker = subset.Subsetter(options=options)
    worker.populate(text=text)
    worker.subset(font)
    output = io.BytesIO()
    font.save(output)
    data = output.getvalue()
    encoded = base64.b64encode(data).decode("ascii")
    # Embedded data is available before body layout. Optional also forbids a
    # late swap if a browser cannot decode it during its initial font window.
    rules.append('@font-face{font-family:"TDB Consent";font-style:normal;'
                 f'font-weight:{weight};font-display:optional;'
                 f'src:url("data:font/woff2;base64,{encoded}") format("woff2")' + '}')
    manifest.append({"weight": weight, "source": BASE + name,
                     "sourceSha256": hashlib.sha256(source).hexdigest(),
                     "bytes": len(data), "characters": "".join(sorted(set(text)))})

(ROOT / "src/consent/critical-fonts.html").write_text(
    '<!-- Consent-only font metrics available before first layout. -->\n'
    '<style data-tdb-consent-fonts="1.0.0">\n' + "\n".join(rules) + '\n</style>\n')
(ROOT / "src/consent/critical-fonts.json").write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({"fonts": [{"weight": f["weight"], "bytes": f["bytes"]} for f in manifest]}))
