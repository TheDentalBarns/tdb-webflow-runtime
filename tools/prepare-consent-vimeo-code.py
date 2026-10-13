#!/usr/bin/env python3
"""Prepare the narrow site-code patch; never publishes or changes page code."""
import argparse
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', type=Path, required=True)
parser.add_argument('--commit', required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
if not re.fullmatch(r'[a-f0-9]{40}', args.commit):
    raise SystemExit('Use an immutable full commit SHA.')

blocks = json.loads(args.input.read_text())
by_location = {block['location']: block for block in blocks}
head = by_location['head']['content']
footer = by_location['footer']['content']
base = f'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@{args.commit}/dist/'

def replace_once(pattern, replacement, text):
    value, count = re.subn(pattern, replacement, text, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected one match, got {count}: {pattern}')
    return value

if 'data-tdb-consent-js' in head or 'html.tdb-scroll-locked' in head:
    raise SystemExit('The consent/scroll-lock patch already appears present; inspect before changing it.')

css = (Path(__file__).resolve().parents[1] / 'dist/tdb-scroll-lock.css').read_text().strip()
head = replace_once(r'(<style data-tdb-critical-base>.*?)(</style>)',
                    lambda m: m[1] + css + m[2], head)
head = replace_once(r'https://cdn\.jsdelivr\.net/gh/TheDentalBarns/tdb-webflow-runtime@[^/]+/dist/tdb-consent-startup\.min\.js',
                    base + 'tdb-consent-startup.min.js', head)
head = head.replace('TDB native consent v4.0.6', 'TDB native consent v4.0.7')
head = replace_once(r'<!-- Vimeo: native Webflow defaults; early consent UI and gated player\. -->\s*<script\b[^>]*\bdata-tdb-vimeo-loader\b[^>]*></script>', '', head)
gate = '\n<!-- TDB consent v0.5.0 | shared state; Vimeo starts only with functionality permission. -->\n'
gate += '<script defer data-tdb-consent-js src="' + base + 'tdb-consent.js"></script>'
head = replace_once(r'(<script\b[^>]*src="[^"]*/tdb-modules\.js"[^>]*></script>)',
                    lambda m: m[1] + gate, head)
footer = replace_once(r'https://cdn\.jsdelivr\.net/gh/TheDentalBarns/tdb-webflow-runtime@[^/]+/dist/tdb-navbar-loader\.js',
                      base + 'tdb-navbar-loader.js', footer)
by_location['head']['content'] = head
by_location['footer']['content'] = footer
args.output.write_text(json.dumps(blocks, indent=2) + '\n')
print(f'Prepared {args.output}; page code and unrelated asset pins are unchanged.')
