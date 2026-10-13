**Consent and Vimeo cleanup — 13 October 2026**

Implementation branch: `work/consent-vimeo-gate-20261013`, based on the current staged UI release `d9aede36fbefe928fd108357fb560b2c16c70453`. Publication status: published to the Webflow staging subdomain only, using asset commit `a7d4fe2f1ccfc46404b107a5b65cf78c28853464`. Production has not been published. Draft PR: https://github.com/TheDentalBarns/tdb-webflow-runtime/pull/25.

**Scope and loading contract**

Native consent and navigation remain early. The existing shared consent script becomes the single permission boundary for Vimeo. Before a valid functionality choice, it performs a presence check and delegates Play clicks to cookie settings; it does not fetch the Vimeo loader, Vimeo CSS, controller, SDK or iframe, and does not create a Vimeo observer. After permission, the loader observes proximity (300px) and prepares on proximity, focus, pointer intent or remembered Play. Saved permitted choices release automatically. Reject, invalid or absent choices stay blocked. Pending work rechecks permission after every asynchronous stage.

Only Vimeo moves to this gate. Quote carousels, other sliders, motion assets, shared registry pins, the immediate runtime and footer runtime retain their existing published URLs and loading policies. The deployed analytics, Meta and Intellimize integration functions/events are retained. The working branch contained an older consent source; it was aligned with the actual `dead3424` consent release so the already-retired Elfsight integration is not reintroduced.

**Audit and changes**

- Audited all 61 Webflow page-code records and global head/footer code. No additional page-code Vimeo loading route was found. The old global head tag fetched the Vimeo loader before any choice, and the loader fetched Vimeo CSS immediately; live saved-reject testing confirmed both tags. Readable source and deployed pins were compared before editing. The actual loader was v1.2.0, newer than the v1.1.1 supplied in discussion.
- Consent v4.0.7 retains Designer markup, existing appearance, two-choice behaviour, stored-choice compatibility, the 30-day cookie, public CookieScript methods/properties, category/accept/reject events, callbacks and dataLayer notifications. `acceptAction()` still treats a selection containing performance as accept-all and otherwise rejects. No compatibility method was removed without evidence.
- The current repository and staged v4.0.6 already had the explicit inactive-banner keyboard return described in the handoff. It was retained and regression tested, rather than claiming a new fix. Empty contenteditable elements now receive the same exemption as other editable controls.
- Reused existing text reset cleanup and removed an unused reference. The 70ms text entrance delay, 420ms closing text animation and 470ms close completion are unchanged. A direct native hide settles a pending Vimeo request without inventing a CookieScriptClose event.
- TDBScrollLock v1.0.3 uses fixed rules from the existing early `data-tdb-critical-base` style. Dynamic scrollbar compensation remains in JS. Home page `677cf86df9952f978d94d8a9` locks only the document root because body overflow would disrupt its viewport-sticky sketch; other pages retain root-and-body locking. CSS activates only while a lock owner exists.
- One canonical scroll-lock source remains embedded behind an idempotent guard in consent and navbar startup. Both can still start independently if the other request fails. This small deliberate fallback is retained instead of adding a helper request or breaking navigation recovery. Existing drawer fallback definitions and consumers reuse the first registered helper. No drawer or carousel release was repinned.
- Shared consent v0.5.0 adds currentState/allows/subscribe/settle. Subscribers receive the current state immediately, then deduplicated decision changes. Vimeo v2.0.0 loader uses the existing module registry for deduplication, readiness, timeout and retry instead of its own network machinery. Controller v1.3.0 consumes the central state and no longer duplicates raw consent listeners/polling.
- Network failure can be retried by the next intent. A failed controller initialization cannot falsely report readiness or rebind partially initialized work. Withdrawing permission during loader/CSS/controller/SDK preparation blocks the next stage. Once a player already exists, withdrawal preserves the previous pause/cancel behaviour; already downloaded SDKs/iframes are not unloaded.

**Measured sizes**

Bytes below are exact artifact sizes; gzip uses level 9 and Brotli quality 11. They are reproducible with `node tools/measure-consent-vimeo.cjs`, not browser transfer or LCP measurements. The previously suggested 5–10% reduction is not used as a target. Before/after JS assets are minified. Shared consent is measured against the actual `tdb-consent.min.js` at `dead3424`, as referenced by the current immediate runtime, rather than the older v0.3.0 source remaining on the base branch. `tdb-consent.js` and `.min.js` are identical minified build aliases. The new head requests `.js`: CDN verification found jsDelivr adds a 336-byte dynamic wrapper to the `.min.js` URL, whereas `.js` matches the committed bytes exactly.

| Asset | Raw before → after | gzip before → after | Brotli before → after |
| --- | ---: | ---: | ---: |
| tdb-consent-startup.min.js | 10788 → 10356 | 3894 → 3783 | 3441 → 3342 |
| Shared consent (old .min.js → new .js) | 2421 → 5000 | 1075 → 1967 | 891 → 1719 |
| tdb-navbar-loader.js | 17955 → 17561 | 5877 → 5769 | 5063 → 4973 |
| tdb-vimeo-loader.js | 4936 → 2658 | 1997 → 1238 | 1740 → 1055 |
| tdb-vimeo.js | 20470 → 19699 | 5701 → 5543 | 5052 → 4928 |
| tdb-vimeo.css | 7448 → 7448 | 1131 → 1131 | 973 → 973 |
| tdb-ui.css | 3264 → 3264 | 1235 → 1235 | 1051 → 1051 |
| tdb-scroll-lock.css (inserted in existing critical style) | 0 → 235 | 0 → 167 | 0 → 125 |

The Vimeo loader is 46.2% smaller raw and 38.0% smaller gzip. Its entire request, plus the unchanged 7,448-byte Vimeo CSS request, moves behind functionality permission. The shared consent gzip cost increases by 892 bytes as it takes ownership of that gate. Fixed scroll-lock CSS is a 235-byte build artifact; 234 bytes without its trailing newline are inserted in the existing style block. It adds no network request. Independent compression of this tiny CSS is shown for comparison; the actual compressed HTML increment depends on the whole document.

**Validation**

45 focused checks passed across the consent, Vimeo, scroll-lock, navigation, UI-loading and VIP overlap suites. An existing navbar test fixture initially expected JS to inject the CSS; it was updated to supply the new early stylesheet contract, with all assertions retained. Separate registry/recovery checks also passed.

- Fresh/no/invalid choices, saved accept/reject, legacy stored choices and no-video pages.
- Native event order, 470ms close, rapid reopen, double activation, focus trapping/restoration and keyboard scrolling after closure.
- Shared lock ownership/release, scrollbar compensation, Lenis attribute restoration, internal wheel and simulated mobile touch scrolling, background/edge containment, and consent over VIP at 390px/1440px.
- No prepermission Vimeo asset/observer work, saved permission, near-viewport preparation, stylesheet readiness, remembered Play and settings cancellation.
- Withdrawal during loader, CSS, controller and SDK flights; active playback pause; loader/CSS/controller request retry; partial initialization failure.
- Navigation before consent, overlapping owners, native close handoff, rapid reversals, resize and pagehide/pageshow recovery.
- Deployed performance-tracker policy, one-time tracker loading, no tracker release for functionality alone, and no retired Elfsight reintroduction.
- Existing modular CSS declarations and unrelated slider/announcement/VIP stylesheet readiness retained.

Tests use JSDOM and controlled network/observer/player fixtures; they do not substitute for physical iOS touch or visual animation review. A live saved-reject baseline confirmed the old eager loader/CSS before this change. After publication, the browser service timed out on reload and remained unresponsive when its recovery documentation was requested. New live interaction and screenshot verification could not be completed in this session; it must not be reported as passed. Fresh/saved choices and interaction coverage above are the automated fixtures, not a post-release visual inspection.

**Release and rollback**

Only global site head/footer code changes. The prepared patch adds fixed CSS to the existing early style, repins native consent and navbar startup, removes the unconditional Vimeo tag, and places the updated existing shared consent script after the dependency registry. Its `data-tdb-consent-js` marker prevents the unchanged immediate batch from fetching an older second copy. The asynchronous shared UI stylesheet remains asynchronous. No page code, Designer element or unrelated asset pin is changed.

Rollback branch: `checkpoint/before-consent-vimeo-gate-20261013` at `d9aede36fbefe928fd108357fb560b2c16c70453`. Exact original global blocks are in `rollback-consent-vimeo-20261013/site-code.json`; page-code audit snapshots are in `page-code.json`. Restore both original global blocks together and publish only the Webflow subdomain. If subsequent edits have occurred, reverse the narrow patch against the latest blocks instead of overwriting unrelated work. Restoring the old script pins also restores the old injected CSS; do not roll back only the stylesheet.

The patch can be reproduced with `python tools/prepare-consent-vimeo-code.py --input docs/rollback-consent-vimeo-20261013/site-code.json --commit FULL_COMMIT_SHA --output /tmp/site-code-after.json`. The tool prepares JSON only; it does not publish.

**Published-code verification**

The Webflow API readback exactly matched the prepared head/footer patch. Publication response `4ae4843a-845c-4ba0-ab3a-99495a6c5ab1` specified `customDomains: []` and `publishToWebflowSubdomain: true`. A subsequent fetch of https://dentalbarns.webflow.io/ confirmed the three new consent/navigation pins, the existing early scroll-lock CSS, exactly one shared consent script, no unconditional Vimeo script tag and no Vimeo iframe src in the delivered HTML. Existing quote carousel and immediate runtime pins are unchanged.

All six intended CDN JS/CSS assets matched the committed files byte for byte. The actual head uses the `.js` shared-consent alias to avoid jsDelivr’s extra dynamic-minification wrapper. Exact new blocks, CDN checksums and published HTML checks are saved in `consent-vimeo-validation-20261013/`. Full visual motion, real Vimeo playback and physical mobile touch checks remain outstanding because of the browser service limitation.
