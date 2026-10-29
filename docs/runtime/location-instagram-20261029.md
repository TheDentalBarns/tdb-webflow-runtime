# Shared Location Instagram feed and DD headings

29 October 2026. Runtime release `abb0778bb430934704e84db20e6f3a8bae7a50a5`; website published to staging only. The additive Practice route on the existing shared Cloudflare worker was separately approved by the user and deployed.

Reference: [TDB Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd), version 36, plus the site's Home engineering, motion and shared-artwork rules.

## Ownership and maintenance

Home Awards and Location Practice share the native **Deferred Instagram Feed** definition (`9020b442-3d16-64ec-90ec-9f212bd2da62`). Home's existing three-node holder was transformed in place; no extra wrapper or Home element was added. Native properties **Feed key** and **Feed JSON endpoint** select the data. Home retains `awards` and `/tdb-content/v1/instagram.json`; Location uses `the-practice` and `/tdb-content/v1/instagram-practice.json` on the existing public-content worker.

Location's outer **Behind the Barns** component (`92469d5f-32c1-828d-002c-f51c93371392`) owns the Smile Gallery heading hierarchy, copy, responsive spacing, Follow us on Instagram button, canonical Instagram mask and nested reserved feed holder. Its only new native combo gives the button icon explicit dimensions and zero padding, preventing Webflow's empty-span padding in Designer. No runtime layout workaround was added.

`src/instagram/deferred.js` retains the existing proximity preparation, validated JSON, image readiness, atomic reveal, shared carousel, controls and motion. It adds the allowlisted Practice URL and descriptive gallery labels. The native Instagram JS and CSS remain shared and unchanged. Designer/no-JS retain the useful heading, CTA and Instagram holding link; deferred card internals remain module-owned as on Home.

Twenty existing, newest Practice posts were enabled and published with user approval. Future editing belongs in **Media Gallery**: choose **The Practice**, switch **Visible** on, and publish. The service excludes drafts/archived/hidden records and caps results at 20 using the existing display-order/date sorting. It uses the same validation/projection with an isolated Practice cache key. This is published CMS content, not an automatic live Instagram import. Existing source photographs, captions and imported metrics were preserved.

Location's former Elfsight mount and page-level snapshot bootstrap were removed. Contact still uses the old Instagram component and bootstrap; that migration remains separate. The shared old definition was retained because Contact consumes it.

## Shared DD text effect

The small-cap **BEHIND THE BARNS** and Home **SMILE GALLERY** labels now carry `data-tdb-dd-page="native"` and `data-tdb-dd-preset="standard"`. Their IDs are respectively `92469d5f-32c1-828d-002c-f51c93371395` in the Behind the Barns definition and `e5ae130e-ae75-c267-a526-a16778f167ec` on Home. The existing runtime registers them with `TDBMotion.ddText` in `src/shared/motion.js`. This restores the established scroll fade without adding nodes, classes, scripts, style rules or IX2 bindings. Native text remains visible; the shared motion owner retains first-paint/restoration behaviour and scroll progress. The large headings and body copy were not given this effect.

## Verification and cost

- Actual Designer desktop/mobile views verified Sweet Sans Pro x, native heading/button layout and reserved holder. Published Location at 390px has no section overflow, the full Instagram button label, 20 Practice posts and working next navigation (Post 2 of 20). Desktop carousel navigation also passed. Home Awards remains ready with 16 posts and the Awards endpoint. Both DD labels have published hooks and changing inline opacity during real browser scrolling.
- Public Practice/Awards/reviews/smiles/partners endpoints returned HTTP 200. Practice has 20 records; Awards retains 16. No unrelated feed change was observed.
- Build and generated-artifact parity passed. The 62 focused feed/Instagram tests passed. The full suite reported 835 passed, three skipped and one strict floating-point equality failure in the unrelated marquee test; its isolated rerun passed all ten tests. This is not recorded as a clean full-suite pass. The final heading changes are native attribute-only reuse, verified in the browser.
- Home stays at **1,133** initial elements. Location changes **1,546 -> 1,548** for the requested new heading/CTA/feed composition. Contact stays **943**. The DD changes add zero elements. Each shared feed holder remains three native nodes.
- Location HTML changes **186,845 -> 185,728 raw bytes** (35,537 -> 34,955 local gzip). Its native CSS changes **229,574 -> 230,993 raw** (39,817 -> 40,024 gzip). The unchanged foundation/start/UI assets total **53,629 raw** / **16,162 gzip**. This scoped initial HTML + native CSS + those three runtime assets changes **470,048 -> 470,350 raw** and **91,516 -> 91,141 gzip**. Other existing scripts, fonts, consent/provider assets and media are excluded from that subtotal and remain part of total page cost.
- Deferred Instagram loader/native JS/native CSS/Practice JSON total **45,000 raw bytes** (11,978 + 13,923 + 11,522 + 7,577), excluding shared dependencies and photographs. Location no longer calls the old 65,326-byte snapshot bundle. These phase-specific figures do not establish an overall page performance gain.

Four engineering perspectives: startup retains a three-node reserved holder and unchanged Home DOM; in-page behaviour reuses the existing shared carousel and motion owner; visual readiness retains the native fallback and image preparation; maintenance is now one feed component/module with CMS content and isolated feed selection. No new audit framework or animation controller was introduced.

Evidence is retained in the workspace `location-instagram-evidence` folder: before/final HTML and feed snapshots, CMS/native/code backup, Cloudflare source before deployment, test output, cost calculations, and Designer/staging screenshots. Latest heading publish task: `bcaf60e7-0aba-4560-b6f1-387b709a223f`.

## Rollback

Remove the two DD attribute pairs to restore static labels. To roll back the section migration, restore Location's prior retained component instance and saved page footer bootstrap from the backup; retain the shared old definition for Contact. Restore all four global runtime pins together to `07a67af80ec84263e2e11ad0c8e3de5efe095770` if the runtime is rolled back. The additive Practice route can remain unused without changing Awards or the other feeds. Any worker rollback must preserve its existing modules, bindings, secrets and routes. CMS visibility/publication changes are separate user-approved content changes; do not silently revert them as part of a code rollback.
