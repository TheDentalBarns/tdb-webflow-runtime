# Nonblocking global UI stylesheet

The Webflow head inlines the generated dist/tdb-ui-critical.css before the existing global UI link. Build with python tools/build-ui.py --global-only. Edit the source modules listed in CRITICAL_SOURCES, never a second handwritten copy in Webflow.

The full stylesheet retains its cbfc45755454e9c40161862f6a3823b3782d56d6 pin so relative feature CSS URLs do not change. It loads with media=print, switches to all on load, retains data-tdb-ui-css and status attributes, and has a noscript stylesheet fallback. --tdb-ui-ready stays exclusively in the external stylesheet so existing readiness/retry handling remains valid.

The inline subset includes fade guards, native navbar and disclosure states, phone landscape rules, paragraph layout and shared Vimeo/control pulse keyframes. Consent and runtime startup are unchanged. No new warm-up requests or timers.

Validation: generated CSS parity and exact full stylesheet byte parity are enforced in the branch workflow. Staging browser and before/after performance checks will be recorded after publishing.

Rollback: restore the before-site-head.html snapshot and publish only to the Webflow subdomain.
