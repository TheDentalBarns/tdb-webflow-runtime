# Parallax CTA touch feedback — staging, 14 September 2026

Published to dentalbarns.webflow.io at 20:47:30.946 UTC. Production domains remain at 12 September 2026 19:20:19.204 UTC.

User preference supersedes earlier mobile-glass correction: hold solid white after a touch press, reset when leaving and returning to Home or Location. Resting dark glass retains 20px backdrop blur. Mouse hover and keyboard focus remain visible.

Implementation: existing prepareParallaxCTA controller owns is-touch-held. Touch pointerdown sets it; release retains it; another pointerdown, keyboard use, pointercancel, pagehide or pageshow clears it. Page lifecycle reset disables transition until next interaction so a cached white state does not fade on return. All added listeners removed on slider destruction. Native touch hover does not control colour; scoped CSS prevents stale browser hover from overriding dark glass. No new polling, dependencies or CMS requests.

Versions: sliders 0.5.3; CSS 1.3.4; immediate 0.8.23-parallax-touch-hold-staging.
Slider JS/CSS: e12db5658189b11ff59c759a0d2194c5127ad83b
Footer: 73ccf1769e2828620765c14b448be24f1213a116
Immediate: b0264d4af2946b4153cb9066bab8af604baace9d

Validation: nine focused jsdom tests pass, including Home and Location touch release, persisted pagehide/pageshow, cancellation, keyboard, outside tap, disabled state, cleanup and existing CMS navigation tests. Four immutable CDN assets byte-match local builds. Both published pages serve the new immediate pin. Physical mobile rendering and actual browser Back-cache visual sequence remain unverified; simulated lifecycle events are not a real-device test.

Rollback: replace immediate pin b0264d4af2946b4153cb9066bab8af604baace9d in current Webflow site footer with previous 5ba3cf5cb927a2fa8b4860bce1d7438a5e880478; reconcile manifest comments (previous footer 6aafa80f61fd6cd7ebc4814af90be0e22a53f858, slider 3635c7bf8a4d591c3406ba9fd0652fcefdc30d3d). Preserve unrelated current code. Publish only Webflow subdomain, customDomains empty. No main branch or production changes.
