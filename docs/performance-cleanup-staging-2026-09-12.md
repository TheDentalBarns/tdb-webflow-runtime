# Staging performance cleanup — 12 September 2026

Published to dentalbarns.webflow.io only. Production domains were not published.

## Changes

- Cache the marquee MediaQueryList; retain live responsive speeds (40 desktop, 22 mobile), drag behaviour, 600px preparation and 200px activity margins.
- Prefer window.scrollY, including zero, in the VIP loader; use the root-element fallback only if the window offset is unavailable. No intent, restoration, peek or proximity thresholds changed.
- Consolidate the repeated partner-track and form-select CSS in the Webflow site head. Replace the three source embeds with comments; preserve their surrounding elements.
- Bypass the legacy tooltip positioning helper on homepage 677cf86df9952f978d94d8a9, where its target class has zero matching elements. The helper remains inline and available elsewhere; this is an execution guard, not removal of its transfer payload.

## Immutable pins

- Marquee and footer: 66a28eb999d7d001d2b69e7ce3b9fce27d63ec4e
- Immediate batch: fbeac3b3aba3c662aa2f89acba175616e85b4605
- Global UI, navbar, VIP, Swiper and slider pins unchanged.

## Validation

- Existing 31 loader/drawer checks passed against both source and built footer. Includes mobile and desktop intent, restored scroll, hash intent, peek suppression and network recovery.
- Added marquee test passed for responsive speed, one media-query allocation, drag, pause and cleanup. Total distinct automated checks: 32.
- All three CDN runtime bodies matched the reviewed local builds byte for byte.
- Live desktop: fresh homepage leaves VIP and slider scripts unloaded; Join VIP opens, treatment selection works, Escape closes. The slider stayed on index 2 until Next was clicked, then advanced to 3. VIP landing-page hero Join VIP also opens and closes the drawer.
- Checked select colours and marquee gap/padding/display/cursor matched the baseline. Track widths vary with demand-created clones; width was not treated as a stable comparison until initialization.
- Rendered element/text inventories on homepage and VIP landing page were unchanged. Order in randomized CMS lists varied across publishes.
- Production homepage response body remained byte-identical to the before snapshot. All four custom-domain publish timestamps remained 2026-09-11T20:23:15.972Z.
- No site-script errors appeared in the inspected desktop flows; browser-extension metadata errors were excluded.

## Limits

- No new mobile GTmetrix result: account had 0.6 API credits; base test cost is 1. Next advertised refill: 2026-09-13T02:54:59Z. No score improvement is claimed.
- Live browser verification was desktop; mobile behaviour was checked by automated loader/drawer tests. Full mobile visual verification remains outstanding.
- No valid form submission was sent.
- Webflow IX2 consolidation was not applied: the connected tools expose no supported interaction editor. Do not patch the generated published JS as a substitute.
- The large generated Webflow CSS sheets remain unchanged. No speculative CSS deletion or asynchronous critical-CSS rewrite was performed, and resolution of the unused-CSS diagnostic is not claimed.
- This is a small cleanup. Homepage HTML changed from 351057 to 350938 bytes; these are decoded HTML bytes, not a measured compressed-transfer saving. Runtime comments increased marquee decoded size by 188 bytes. Performance impact needs a matched fresh test.

## Rollback

Original site head/footer and published HTML are preserved in the separate tdb-before-performance-cleanup.zip snapshot. Restore those custom-code blocks, then restore the original style code to these component embeds:

- Banner Partners: component abd36c7c-55aa-ac3f-edd0-cc4a4068eefc, element 4dda498f-e53e-389a-28f2-fee11e0ac6d5 (partner-style.html).
- Main VIP form: component 7b3a3eb9-3c62-7eb0-8180-000712557469, element 7b3a3eb9-3c62-7eb0-8180-000712557497 (select-style.html).
- Drawer form: component 1a81a875-96cc-14f3-2f27-56aec919cb83, element 1a81a875-96cc-14f3-2f27-56aec919cbb5 (select-style.html).

Original immediate pin: 360877d9d623b3b2b95c56c4b4ee9ad601a92da4. Original footer pin: 8b96b2cb5aa58bdef1d078002a88f4503bc49396. Original marquee pin: 9ecc45134d68ac301a98b60e8a8e2971894c60ab. Publish only to staging after any rollback and recheck the affected flows.
