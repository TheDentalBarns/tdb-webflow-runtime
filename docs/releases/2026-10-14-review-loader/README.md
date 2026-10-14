# Reviews runtime handoff — staging

Built release: `839f855ea07ace90e389e16d1d5b806890d98e87`.

## Behaviour

- The consent-released runtime checks for review components/triggers, then requests the separate review feature. It uses TDBConsent.allows()/subscribe(), with no duplicate CookieScript event listeners or raw-cookie parser.
- Inline summaries/cards/quotes retain the 700px proximity threshold. Hover/focus can prepare inline content, but never warms or mounts the drawer.
- Drawer JS/HTML/CSS loads only via explicit prepare/open or user activation, both for lazy and pre-rendered drawer markup.
- First-click capture is retained while downloading the feature and while mounting inline components. Selected review IDs and shared CMS sessions are preserved.
- Standalone data-tdb-review-trigger controls can open an available drawer without a component wrapper. The lazy container is resolved when needed.
- Mounted components retain their focus/disabled states. Central event policy guards modified clicks, keyboard repeat and native keyboard synthesis without altering component motion logic.
- Teardown unsubscribes, aborts pending work and destroys mounted consumers. Detached/pending components are discarded during refresh/reconciliation. Epoch checks prevent stale mounts after permission changes.

## Placement and preservation

Home's old executable loader tag is replaced by non-executable JSON configuration preserving component base 93173cc685259f3b84404967f1e6deb6a5d451fc and lazy drawer base eb916ade51aae9fabfeb181e3399c674c0345da4. Global pins select this runtime and review loader; other pins are unchanged. No Designer layout, component animation code or drawer CSS was changed.

All 61 page custom-code records were inspected. The /reviews archive uses its own tdb-review-list-loader.js and is unchanged. The historical homepage payload experiment retains its original loader.

## Automated verification

GitHub Actions run 38580884590: 78 tests passed, 0 failed. This includes 15 review tests plus the previous Five Senses, navbar, runtime ownership, Brevo, USP and page-break tests.

## Rollback

Restore the head from site-before.json and the footer from home-before.json, then publish only to the Webflow subdomain. After snapshots contain the exact staged edits.

## Staging verification

Published to https://dentalbarns.webflow.io/ at 2026-10-14T14:29:58.940Z (task 287ef308-3dd8-4db8-82e5-52d68ff25947). Custom-domain publish timestamps remain 2026-10-01T10:10:45.669Z; production was not published.

Browser checks confirmed the new runtime and review feature pins, the inert Home configuration, and inline preparation without drawer scripts or markup. The first summary activation opened Louise Bishton's selected review. Enter reopened that review with one drawer panel. The quote and card entry points both opened Susie Boggie's selected review. The quote carousel reached its ready state; cards mounted and the next control advanced from Susie Boggie to Chloe Morris. Closing returned focus to the activating card and released the page lock. No review warnings/errors were captured.

Consent transitions and pre-decision blocking were exercised by automated tests; this browser session used its existing cookie decision.
