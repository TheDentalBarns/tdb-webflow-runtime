"""Update one dependency stage to a real immutable commit; never publishes."""
import argparse,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('stage',choices=['drawers','footer']);p.add_argument('sha');a=p.parse_args()
if not re.fullmatch('[0-9a-f]{40}',a.sha):p.error('A complete verified immutable commit SHA is required')
root=Path(__file__).resolve().parent.parent
base='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'
if a.stage=='drawers':
 f=root/'src/runtime/site-asset-loader.js';s=f.read_text()
 s,n1=re.subn(r"const legacyUrl = '[^']+/dist/tdb-vip-drawer(?:-legacy)?\.js';",f"const legacyUrl = '{base}{a.sha}/dist/tdb-vip-drawer-legacy.js';",s)
 s,n2=re.subn(r"const jsUrl = demand \? '[^']+/dist/tdb-vip-drawer\.js' : legacyUrl;",f"const jsUrl = demand ? '{base}{a.sha}/dist/tdb-vip-drawer.js' : legacyUrl;",s)
 if (n1,n2)!=(1,1):raise SystemExit('Expected drawer pin declarations not found uniquely; no file written')
 s=s.replace("version: '1.4.0'", "version: '1.4.1'")
 t=root/'tools/runtime-tests/vip-demand.test.cjs';test=t.read_text()
 test,count=re.subn(r"const EXPECTED_LEGACY_VIP_URL = '[^']+';",f"const EXPECTED_LEGACY_VIP_URL = '{base}{a.sha}/dist/tdb-vip-drawer-legacy.js';",test)
 if count!=1:raise SystemExit('Expected pinned test fixture not found uniquely; no loader file written')
 t.write_text(test)
else:
 f=root/'src/runtime/immediate-runtime-batch.js';s=f.read_text()
 s,n=re.subn(r"https://cdn\.jsdelivr\.net/gh/TheDentalBarns/tdb-webflow-runtime@[0-9a-f]+/dist/tdb-footer-runtime\.min\.js",f'{base}{a.sha}/dist/tdb-footer-runtime.min.js',s)
 if n!=1:raise SystemExit('Expected footer pin not found uniquely; no file written')
 s=s.replace("const VERSION = '0.8.5-performance-cleanup';", "const VERSION = '0.8.6-a11y-staging';")
f.write_text(s);print(f'Updated {a.stage} dependency in {f}; rebuild before committing')
