# Location shared review introduction — 27 October 2026

Reference: [TDB architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd).

## Implementation and ownership

Home and Location now use the same **Review Introduction** component (`1e6d2fa0-eb51-af7e-5dc2-307ef04c9501`). Location instance `aabf5f7f-f427-954d-cde2-ac736b94f04c` replaces its old Hero – Headline instance at the start of gallery17_component (`47ad5e0a-f800-8f9f-e93a-24406fb4540d`). It uses the existing Dark variant, title “Beautiful Inside and Out”, tagline “No Waiting Rooms. Just Living Rooms.” and new **Review topic** property `location`. The property defaults to empty, preserving Home's selection. The existing component root receives the bound `data-tdb-review-topic` attribute; no elements or slots were added to the shared definition or Home.

Designer owns structure, reserved geometry, typography and static light/dark appearance. The Dark variant platform filter is now `grayscale(100%)`, preserving the Facebook artwork instead of flattening it to a solid circle. All generated styling remains external. No custom CSS embed was introduced.

External `src/reviews/native/cms.js` owns explicit topic selection through the existing canonical selection service, ranked by `snippetRanks` and using topic excerpts. Cache context includes the topic. `src/reviews/native/loader.js` hydrates the existing quote, attribution and platform nodes only from a matching excerpt, then marks the root `data-tdb-review-topic-ready`. The full index, total and average are retained; the drawer still contains all reviews, with contextual entries first. The published feed currently selects Hayley Rose's Location excerpt first. No CMS review records or hardcoded testimonial copies were added.

A single empty Location-only lazy host uses the existing review feed URL and loader. The existing consent decision and proximity gates remain authoritative. Before data is ready, or if there is no matching excerpt, the quote area retains its geometry but stays hidden; it cannot display Home's unrelated native fallback. Home's empty topic keeps its existing first-paint fallback. This is a page-level topic context; multiple independent conflicting topics on one page are not part of this change.

The readiness safeguard belongs to `src/styles/tdb-feed-holders.css`, composed into external early `tdb-ui.css`. Its early consumer is the native introduction present before deferred data loads. It adds no observer, motion, timing source or request. Existing review drawer, focus restoration, scroll locking, consent and shared motion services remain in use.

Runtime release: `c676910d85db2c3acb9ba9d6832e6c1b76a3e0a2`. Existing site head/footer CDN pins were advanced from `a0f146664e1e1d0d47187b71fd6e606fee3b97ed`; startup and foundation payloads are unchanged. Five pinned assets returned HTTP 200 and matched local bytes. Final staging publish: `3054a437-8cdc-41a9-8370-00149de81ceb`. No production domain was published.

## Four-perspective assessment and delivery cost

- Startup: Home remains 1,132 elements and its review introduction remains 39 elements. Introduction markup is identical after removing the new empty topic attribute. Location drops from 1,695 to 1,606 elements, including the new lazy host. Native Home fallback remains; Location reserves its quote area until a matching excerpt is ready.
- In-page use: the quote opens the matching full review in the shared drawer. Closing restores focus to its trigger, clears expanded state and releases scroll locking. Summary totals remain the complete 90-review index, with observed average 4.94.
- Visual polish: desktop, phone and tablet previews show the shared dark card, heading, quote and legible platform attribution without horizontal overflow. Existing central motion and reveal behaviour are reused.
- Maintenance: one component definition, native variant and topic property replace the old Location introduction and inline snippet bulk. Shared external modules own selection/readiness. No page-specific runtime fork or Home DOM expansion was introduced.

Measured byte costs (raw / gzip; these are payload measurements, not fresh speed or LCP claims):

| Payload | Before | After | Change |
| --- | --- | --- | --- |
| Home native page CSS | 183,562 / 30,097 | 184,200 / 30,227 | +638 / +130 |
| Location native page CSS | 175,897 / 29,071 | 183,632 / 30,072 | +7,735 / +1,001 |
| Shared early UI CSS | 14,224 / 3,184 | 14,388 / 3,226 | +164 / +42 |
| Deferred review CMS JS | 23,715 / 8,110 | 23,971 / 8,167 | +256 / +57 |
| Deferred review loader JS | 11,172 / 3,739 | 11,318 / 3,782 | +146 / +43 |

First migration publication HTML captures: Home 184,887 → 184,964 raw bytes (32,179 → 32,239 gzip); Location 286,356 → 202,991 raw bytes (76,113 → 37,148 gzip). Publication can reorder existing CMS partner entries, so whole-document compression differences are not an isolated runtime effect. The final icon correction changes CSS only. Shared native CSS is unchanged. Location adopts the existing deferred review pipeline; the initial HTML reduction does not imply that its deferred resources are free. Two changed deferred scripts add 402 raw / 100 gzip bytes together. No new custom request category or controller was introduced.

Webflow changed existing hero image `sizes` serialization on publication; after excluding those attributes, both Home and Location hero markup is unchanged, with unchanged element counts. No authored hero change forms part of this migration.

## Acceptance and limitations

Full runtime suite: 777 tests, 774 passed, 3 skipped, 0 failed. Build checks passed. New tests cover ranked topic selection while retaining the complete index, revealing only matching excerpts, and hydrating existing quote nodes. Browser previews cover 1280px desktop, 390×844 phone and 834×1112 tablet. Desktop and phone drawer opening/closing were verified; no final captured browser errors or warnings. Physical-device acceptance and a fresh performance benchmark are not claimed.

Raw Designer baseline, before/final HTML and CSS, feed, comparison results, logs and final desktop/mobile screenshots are retained in the task's `review-alignment-evidence` directory. The synced `sources/` directory was not modified.

One uninstantiated rollback copy remains: **Archive — Review Introduction before Location alignment 2026-10-27** (`98dde563-7e90-07e7-74ab-c03ea2200a75`). Its instance count is zero and it adds no page DOM, but Webflow emits its duplicated variant selectors (approximately 619 raw bytes, included in the totals above). Automatic approval review rejected its deletion as an irreversible site mutation without specific authorization. Cleanup is pending explicit permission; do not describe this copy as removed.

## Rollback

Restore the saved Location Hero – Headline component (`cb30dcb1-276f-19a9-f09a-634f34472f56`) and its recorded properties at the start of gallery17_component, replacing only the new Location review instance. Remove the Location-only lazy host `da5450a8-7ecf-a5f6-f9f6-380988c2369c`. Original instance properties/tree are in `baseline-designer.json`. Restore head/footer runtime pins to `a0f146664e1e1d0d47187b71fd6e606fee3b97ed` using `site-code-before.json`, then publish staging only. The empty-default Review topic property can remain without affecting Home. If reverting the Dark variant artwork rule, the former filter was `brightness(0%) invert(100%)`. Do not change Home's instance or add replacement nodes there.
