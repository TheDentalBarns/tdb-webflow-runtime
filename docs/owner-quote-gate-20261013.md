**Owner quote loading — 13 October 2026**

Prepared on `work/owner-quote-gate-20261013`, based on the consent/Vimeo work at `31d0ee555c3136f447496cd77e4698333867f433`. Scope: native owner quote carousels. Patient review loading policy, Vimeo permission policy, shared motion/Swiper/ticker and all unrelated modules retain their existing behaviour and releases. Production publication is not part of this change.

**Loading contract**

- Before any valid cookie choice, the shared consent script does only an owner-presence check and delegated intent handling. No owner-specific carousel script, dependencies or observers start automatically.
- Either `accept` or `reject` releases the owner module; a saved valid choice works immediately. That module then prepares owners within the existing 800px proximity margin. Absent, invalid and legacy close-only states do not count as a choice.
- Pointer/touch, focus or relevant keyboard intent can start the targeted owner quote before a choice, without modifying cookies, opening settings or enabling other modules. Initial arrow keys are retained while assets load. An initial drag starts loading; the in-progress drag itself is not replayed after a network delay.
- Direct startup skips the introductory automatic advance, leaving navigation under the visitor's control. Normal consent/proximity startup keeps the existing introduction and motion timings. The active first quote remains visible while awaiting that introduction.
- Owner quote startup is explicit. Loading the shared engine for patient reviews no longer auto-discovers or observes owners. Reviews still use the same `mount(root, {onActivate})` integration and drawer actions.

**Implementation and native layout**

Shared consent v0.6.0 owns the owner gate alongside Vimeo. There is no new loader file or eager head/footer request. Owner quotes and patient reviews request the same canonical `tdb-quote-carousel.js` URL through the existing module registry, sharing in-flight requests and existing motion, ticker and Swiper dependencies. Both published quote aliases now contain the identical minified v4.1.0 build; readable source remains in `src/team-quotes/team-quotes.js`.

The eager owner script and its JS-only error fallback are removed from global head code. Native content and bylines use the existing Designer `is-visible` and `is-static` combo classes, scoped to owner CMS templates. Applied to Home, First visit, Services Template, Contact and Location. The draft payload experiment was inspected but not changed. Review markup and base/shared styles are unchanged. No new CSS rules or stylesheet requests are introduced. Native collection sizing and slide order are retained.

Repeated refreshes retain proximity gating. Anonymous per-root discovery focus listeners are replaced by the one delegated shared-gate handler. Per-root dependency work is deduplicated; destruction invalidates pending mounts, removes mounted handlers and restores the native fallback. Failed requests can retry on later interaction. The existing shared review API and engine geometry, including fractional viewport width, remain intact.

The head patch changes only shared consent and both quote file pins, removes the eager quote tag, and adds an explicit `tdb-vimeo-loader.js` pin to its previous `a7d4fe2f1ccfc46404b107a5b65cf78c28853464` release. That explicit pin keeps every Vimeo relative asset URL and cache entry unchanged when shared consent moves to its new release. Native consent, navbar, global footer and other registry pins remain byte-for-byte unchanged.

**Measured artifact sizes**

Exact bytes; gzip level 9, Brotli quality 11. Reproduce with `node tools/measure-owner-quotes.cjs`. These are compressed build artifacts, not measured page transfer or LCP savings. The old deployed `.min.js` CDN URL also carries a dynamic-minification wrapper; the new canonical `.js` URL avoids that wrapper.

| Asset | Raw before → after | gzip before → after | Brotli before → after |
| --- | ---: | ---: | ---: |
| Shared consent | 5000 → 6281 | 1967 → 2386 | 1719 → 2100 |
| Quote engine | 7351 → 8207 | 2833 → 3167 | 2496 → 2803 |
| Initial consent + eager quote → consent only | 12351 → 6281 | 4800 → 2386 | 4215 → 2100 |

The early shared gate adds 419 gzip bytes but removes the entire eager quote request: a net 2414 gzip bytes from these two initial assets on a fresh undecided visit, before considering dependencies previously triggered by proximity. Once released, the quote engine is 334 gzip bytes larger to support explicit startup, retained input and safe teardown. CSS source increase: zero; two existing state classes are added to each owner CMS template.

**Verification**

46 focused automated checks passed: 20 new owner-gate checks and 26 existing native quote, patient-review and Vimeo checks. They use the actual minified consent, registry, quote and custom Swiper builds in JSDOM, controlled network completion and observer fixtures. Shared motion and ticker are stubbed only in the owner-gate fixture; their assets and releases are unchanged.

Coverage includes first/invalid/close-only states, saved/new accept and reject, no-owner pages, proximity, repeated refreshes, direct pointer/touch/focus/keyboard startup, retained arrows, no consent mutation, shared-request deduplication, passive loading by review consumers, loader/dependency failure and retry, detached roots, destroy during loading, remount handler cleanup and missing IntersectionObserver. Existing review tests cover review identity/actions, inactive copies, swipe discrimination, keyboard activation, teardown/remount and entry cancellation. Vimeo gate, withdrawal and recovery checks still pass.

The prepared head patch was checked for a single eager quote removal, preserved unrelated script URLs/pins, unchanged critical styles, unchanged footer and an exact pin for the existing Vimeo release. Designer updates returned success. The Designer screenshot tool returned `status: false`; a rendered screenshot has not been verified at this stage. Automated fixtures do not substitute for physical mobile swipe or visual motion checks.

**Rollback**

Git rollback branch: `checkpoint/before-owner-quote-gate-20261013` at `31d0ee555c3136f447496cd77e4698333867f433`. Exact old global code and Designer style lists are in `rollback-owner-quotes-20261013/`. Restore the previous global head and the original style lists for the five changed layouts together, then publish only the staging subdomain. Preserve later unrelated edits when applying a rollback; the global footer did not change.

`python tools/prepare-owner-quote-code.py --input docs/rollback-owner-quotes-20261013/site-code.json --commit FULL_COMMIT_SHA --output /tmp/owner-site-code.json` prepares the narrow site-code patch without publishing. Release and published readback evidence will be added after staging verification.
