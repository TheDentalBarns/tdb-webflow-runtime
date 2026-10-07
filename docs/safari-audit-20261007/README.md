# Active GitHub JavaScript: Safari follow-up audit

7 October 2026. Staging: https://dentalbarns.webflow.io/.

Three current-code findings remain after the shared mobile fixes: two legacy fade
controllers still react to viewport height alone, the standalone calculator has
competing CSS/JS fade owners, and attribution can fail when storage access is
blocked. None requires a separate Safari implementation.

This was an exact-version source audit with deterministic probes and browser
inspection in cloud Chrome. It was **not a physical iPhone Safari test**. The
reported compositor glitches and page jump cannot be declared eliminated from
this evidence alone.

## Scope and evidence

- Read custom-code definitions for 53 active pages/templates and site head/footer.
- Crawled 143 rendered staging URLs, including CMS pages and component embeds.
- Resolved 22 direct external script versions and their conditional/lazy dependencies:
  **55 GitHub URL/version pairs, 54 unique byte payloads**, across the runtime,
  attribution and CookieScript repositories. This is a site-wide inventory, not
  55 simultaneous downloads per page.
- All 55 CDN requests returned 200 and matched the audited SHA-256 bytes.
- All 55 parsed as ECMAScript 2022 scripts/modules. This does not prove API or
  rendering compatibility by itself.
- The 48 existing targeted regression checks pass. The Swiper VM fixture needed
  a `matchMedia` stub after the earlier shared-motion change; this audit corrected
  that fixture without changing production JavaScript.

[Exact pins and route inventory](active-js-inventory.json) ·
[Reproduction and verification evidence](evidence.json).

The registry's allowlist and unused fallback pins were excluded. The active
footer is still `cd0ca0b`; its VIP modules come from `336d766`, and tooltips from
`61cec90`. Auditing only the newest GitHub tree would miss these versions.
Third-party vendor SDK internals and Webflow's generated runtime are outside
this GitHub-source audit.

## Confirmed findings

| Priority | Location | Evidence and impact | Smallest shared correction |
| --- | --- | --- | --- |
| Medium | `src/service-awards/service-awards.js` at `4193062`, on eight service pages; `dist/tdb-power-snippets.js` at `92dac5d`, on `/first-visit` | Both own a separate requestAnimationFrame fade using `innerHeight`, with direct `resize` listeners. In controlled execution of the published files, changing height from 800 to 900 with element top fixed at 600 and scrollY fixed at 0 changed opacity from 0.250 to 0.333. These paths do not inherit the new shared viewport/momentum handling. This establishes resize-driven opacity drift; an exact iPhone symptom still needs device verification. | Route these captions through shared DD motion and remove each old fade writer. Preserve their existing fade curves, content and layout. |
| Medium | `/dental-cost-calculator` page head; `dist/tdb-calculator.css` at `8fb72cf` | The page still loads old `.tdbc-dd-fade` CSS with `animation: tdbc-dd-text` and `animation-timeline: view()`. The global DD loader also writes inline opacity. Browser inspection observed both on the same caption. CSS animation takes precedence, bypassing the shared preservation logic in supporting engines. | Repin this page's calculator CSS to `310b98a`, which removes the old DD writer and retains the numbered-header support guard. Calculator JS can retain its current pin. |
| Medium, restricted-storage users | `tdb-webflow-attribution/dist/tdb-attribution.min.js` at `afee7b7` | `L(window.localStorage, ...)`, `L(window.sessionStorage, ...)` and corresponding writes evaluate the storage getter before entering the helper's try/catch. A throwing getter reproduced an uncaught `SecurityError` and prevented `TDBAttribution` initialization, even with no analytics consent. Normal storage initialized successfully. | Resolve the storage object inside the protected block, maintain an in-memory fallback, and guard reads/writes consistently. Retain the existing consent rules. |

Safari 26 added CSS scroll-driven animations, so the calculator's competing
owner can now activate on current Safari as well as supporting Chromium engines.
The Web Storage specification explicitly permits the storage getter itself to
throw when persistence is denied. Ordinary private browsing should not be
assumed to reproduce this: the failing condition is a denied getter.

Sources: [WebKit Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
and [Web Storage standard](https://html.spec.whatwg.org/multipage/webstorage.html).

There is also an **older-Safari compatibility limit**: the legacy first-visit
review drawer (`tdb-reviews.js` at `efdd9b2`) reads its current `gzip-base64` data
through `DecompressionStream`. It explicitly rejects when that API is missing,
with no uncompressed fallback. Safari added the API in 16.4. If earlier versions
remain in scope, migrate this drawer to the shared CMS implementation or supply
an uncompressed data fallback. This is not a new Safari 26 regression.
[WebKit Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/).

## Other module families reviewed

| Family | Audit conclusion and remaining limits |
| --- | --- |
| Shared motion, background/sketch page breaks, DD, slider focus | New viewport-height and momentum handling is present in the active release. Tests cover height changes, long momentum, restoration, actual layout/width changes, retry and cleanup. The same coarse-pointer logic applies to iOS and Android. |
| Swiper engine, immersive/treatment plugin, gallery, quote carousel, review cards | Checked interruption/loop behavior, touch cancellation, progress ownership, button feedback and focus handling. No additional Safari-specific blocker was established. Treatment blur publishes both prefixed and standard transitions. |
| Shared reviews, CMS/list/filter modules, legacy review summaries, first impressions | Checked loading gates, keyboard/touch paths, dates, focus and drawer ownership. The legacy first-visit branches above remain separate from the shared rollout. |
| Navbar, VIP variants, announcement, USP drawer, tooltips | Checked viewport/keyboard branches, focus restoration, scroll locking and cleanup. The ordinary phone path does not initialize Lenis: its gate requires desktop width, fine pointer and hover. Physical iOS keyboard and drawer-edge scrolling remain verification items. |
| Five senses and Vimeo | Five-senses audio unlock begins within the activation event, includes the WebKit AudioContext fallback and handles cancellation/visibility. Rendering has mask prefixes and a GPU-loss fallback. Vimeo uses muted inline playback and catches playback failures. No new confirmed Safari blocker; test device audio interruptions and rendering under memory pressure. |
| Consent, immediate/footer loaders, attribution/forms | Idle scheduling has time-based fallbacks; required batch waits are bounded and optional attribution no longer blocks priority UI. Brevo's unknown-consent reload guard is present in the existing Webflow footer. Attribution's storage getter is the outstanding failure. Form validation is independently loaded. |
| Logo marquee, tickers, home awards, Instagram modules, gallery count | Checked presence/viewport gates, observer use, animation cleanup and pointer cancellation. No new Safari-specific blocker was established. This is not an exhaustive interaction or performance guarantee. |

The five-senses image loader falls back to HTMLImageElement when createImageBitmap
is absent, but not when the supported API rejects a decode. It then shows its
existing retry/error state. Adding decode fallback is optional resilience work;
this audit did not establish it as the cause of the user's Safari symptoms.

## Android impact and follow-through

The proposed corrections belong in shared code. The resize drift and denied-storage
failure are cross-browser conditions; the calculator owner conflict already
exists in supporting Chromium engines. Keep the current curves/timing and use
feature/viewport checks rather than a Safari user-agent fork. Android regression
checks should include carousel swipes, momentum scrolling, drawer close position
and calculator fades after the remaining fixes.

The previously approved release `310b98acf5271a9be342b9cf4283dd53663850a5` and
Designer blur correction are published to staging. No newly identified runtime
fix from this follow-up audit has been published. This audit changes only the
verification fixture and documentation.

Real-device follow-through: scroll through background and sketch effects while
the toolbar collapses, return through Back/Forward, open/close VIP with the
keyboard visible, test review/gallery drawer edges, try audio after backgrounding,
and repeat with blocked storage. Compare Safari with Android using the same
staging build. No new cause of a spontaneous page jump was confirmed here.

![Staging treatment after the earlier approved blur correction](staging-treatment.jpg)
