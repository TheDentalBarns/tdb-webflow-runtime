# Nonblocking global UI stylesheet

The Webflow head inlines the generated dist/tdb-ui-critical.css before the existing global UI link. Build with python tools/build-ui.py --global-only. Edit the source modules listed in CRITICAL_SOURCES, never a second handwritten copy in Webflow.

The full stylesheet retains its cbfc45755454e9c40161862f6a3823b3782d56d6 pin so relative feature CSS URLs do not change. It loads with media=print, switches to all on load, retains data-tdb-ui-css and status attributes, and has a noscript stylesheet fallback. --tdb-ui-ready stays exclusively in the external stylesheet so existing readiness/retry handling remains valid.

The inline subset includes fade guards, native navbar and disclosure states, phone landscape rules, paragraph layout and shared Vimeo/control pulse keyframes. Consent and runtime startup are unchanged. No new warm-up requests or timers.

Validation: generated CSS parity and exact full stylesheet byte parity are enforced in the branch workflow. Staging browser and before/after performance checks will be recorded after publishing.

Rollback: restore the before-site-head.html snapshot and publish only to the Webflow subdomain.

## Staging verification

Published only to https://dentalbarns.webflow.io/ at 2026-10-14T14:59:36.632Z. All custom production domains retain their 2026-10-01 publication.

Build: 86ace6410b3ff4c884c7fe6e099ea467b8c2f6d8. Workflow 38585349269 passed source/artifact parity, external stylesheet byte parity and critical readiness/selector checks.

Published HTML contains one data-tdb-ui-critical block (3313 minified bytes excluding final newline) before the original stylesheet link. The link is initially media=print, becomes media=all with data-tdb-loaded=true and --tdb-ui-ready=1. Existing Webflow HTTP Link preload remains. No new network requests, timers, runtime pins or consent changes.

Browser checks at desktop and 390px mobile: navbar visible, Services dropdown opens/closes, mobile menu settles at x=0 / width=390 with full-width background, shared Vimeo pulse keyframes active, consent settings open with styled controls. No console warnings/errors observed.

Matched London Chrome 4G 9/5Mbps, 125ms tests (one before/after pair):
- Before: https://gtmetrix.com/reports/dentalbarns.webflow.io/nrtkXr0f/; FCP/LCP 1244ms, TBT 478ms, CLS 0, performance 69.
- After: https://gtmetrix.com/reports/dentalbarns.webflow.io/4nJc1SJu/; FCP/LCP 1174ms, TBT 578ms, CLS 0, performance 67.
- Requests remain 49. HTML transfer increased by approximately 1.1KB.
- Results are mixed: first paint was 70ms earlier, but TBT rose by 100ms. This pair does not establish a general performance improvement. Lighthouse style/layout work was similar (811ms versus 806ms); no fixed LCP saving is claimed.
