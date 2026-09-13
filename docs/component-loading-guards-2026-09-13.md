# Component loading guards — 13 September 2026

Retained on staging: Vimeo component guard only. The navbar component guard was implemented, published, tested and reverted because it delayed discovery of a script required on ordinary pages.

Final staging publication: 2026-09-13T11:20:19.921Z. All four production domains remain at 2026-09-12T19:20:19.204Z. No production publication occurred.

## Active source identity

- Repository: TheDentalBarns/tdb-webflow-runtime.
- Review branch: codex/component-loading-guards-20260913.
- Active immediate runtime: `38c70b683e60ec924767901f5f904d07bb389947/dist/tdb-immediate-runtime-batch.min.js`.
- Immediate version: `0.8.7-vimeo-guard-staging`.
- Navbar remains the original static deferred tag at `0c4f2c8abd91eaf491ae41abebcc71c6e8cd0370/dist/tdb-navbar.min.js`.
- Footer dependency remains `b12d8a2d308cdccc55485e4f70b0abc9d7490c32/dist/tdb-footer-runtime.min.js`.
- Global head is byte-for-byte identical to the pre-task snapshot, including Global UI pin `c868196ea7711143c3182090246124a6c79b86b5`.
- Drawer and slider dependency pins are unchanged. The previous accessibility and caption fixes remain.
- The temporary query-only viewport harness was removed before final retention.

The Vimeo guard uses the exact controller component selector and preserves the existing load position, dependency URLs, priority readiness and settled readiness array. If the document is unfinished and no component is yet present, it rechecks once after DOMContentLoaded. It does not introduce a new external file. Its build adds 303 decoded bytes and 101 compressed body bytes in the observed HARs.

## Rejected navbar experiment

Experimental commit `1412448ea2768c42475a2ec933a7fe738da4e23e` replaced the static navbar tag with a 649-byte inline component gate. Responsive menu geometry matched and the existing bundle initialised, but early parser discovery was lost. On the homepage, the navbar request started 795 ms after the immediate bundle's request instead of alongside it. The navbar response then finished about 268 ms after DOMContentLoaded in that run. The final rollback restored near-simultaneous request starts (4 ms apart). The scores were not the reason for rejection.

The rejected loader is preserved under experiments for evidence. Do not deploy it by copying its source or the intermediate footer. `snippets/staging-site-footer.html` records the retained Vimeo-only footer.

## Verification and limits

Sixteen source/build Vimeo lifecycle checks and thirty-two navbar predicate/deduplication fixture checks passed. Final source checks passed on eighteen published routes, including all eleven sitemap VIP landing pages. All VIP pages retain their supported video component. Six sampled routes without custom video omit the Vimeo controller in the live browser. The article's standalone iframe remains present.

Desktop 1363x936 and same-origin frames at 390x844 and 768x900 checked video component selection and navigation geometry; the frames do not emulate physical touch. Desktop keyboard navigation and VIP Escape close/focus return were exercised. Frame Escape checks were not conclusive: immediate keyboard observations and the pre-change frame menu did not reliably show closure. This is not claimed as a new passing keyboard regression test.

The homepage and VIP hero controls bound successfully. A baseline Play intent requested consent; accepting consent loaded the Vimeo player API and iframe. Vimeo's iframe reported a connection-security restriction in this browser, preventing successful playback verification. This restriction was not bypassed. Real-device video playback, physical touch and software keyboards still need checking before production approval. No enquiry was submitted.

Three fresh GTmetrix tests cost 6.9 credits, leaving 8.6 at the last test. Their scores and timing varied substantially; no speed gain is claimed. The final homepage run had 2.8 seconds TTFB and 626 ms TBT. Slow response explains delayed paint, not all of that blocking time; its cause was not isolated. The guard's retained benefit is one avoided controller request on pages without supported video, with about 17,748 fewer decoded JavaScript bytes after its 303-byte loader overhead.

## Rollback

To remove the retained Vimeo guard, restore the exact pre-task global footer saved in `before/site-footer.html`, which uses immediate pin `c2ee70f6b229f6156ff126fabb9d509e2441543b`, then publish only to the Webflow subdomain with an empty custom-domain list. No head, page-level code, styles, forms or CMS content needs changing. Preserve any intervening user edits before restoring the snapshot.
