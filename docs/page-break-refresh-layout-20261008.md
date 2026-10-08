# Page-break refresh layout reads — 8 October 2026

The uploaded Chrome trace shows the page-break memory observer forcing layout through its repeated innerHeight reads while body nodes are still being parsed. The second reload also has a font completion immediately before native scroll anchoring. This change addresses the observer's layout reads only; it is not proof that every intermittent full-page jump is resolved.

## Change

Page-break memory v1.8.3 captures the viewport height once in the reload/back-forward bootstrap and reuses that value for snapshot validation and restored-offset bounds. Fresh navigation does not read restoration geometry or restore imagery. Saving continues to read the current viewport, so subsequent reloads validate against the dimensions at save time.

Source and dist are aligned with the live v1.8.2 bootstrap, retaining its data-tdb-parallax-reveal-final snapshot identity introduced after this branch's earlier v1.8.1 copy. All existing opacity, transform, ownership and snapshot checks remain. There are no changes to Treatment layout, fonts, animation timing or browser scroll restoration.

## Verification

- 16 page-break memory regression checks pass, including reload/back-forward parser batches, fresh navigation, live viewport dimensions when saving, invalid snapshots and shared motion handoff.
- Controlled Chromium parser fixture with eight page-break images: mobile 390px, old script 8 forced layouts from restore(), fixed script 0. Both restore all eight image offsets.
- Desktop 1363px: 0 restore() forced layouts in both variants; all offsets restored.
- One early bootstrap layout remains in both versions; repeated body-parser measurements are removed.
- This fixture tests the exact source change, not full-site font loading or the user's entire recording.

## Deployment

Replace only the Page-break memory script in the freshly read site-wide Webflow head with the matching source. Preserve other code blocks and runtime pins. Publish to the Webflow staging subdomain only. Production custom domains remain unpublished by this change.
