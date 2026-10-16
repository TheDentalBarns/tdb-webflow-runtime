# Immediate foundation and static startup chrome — 16 October 2026

Requested by David: run foundation without the settling gate, remove initial entry animations, retain rollback, and run three GTmetrix staging tests.

Base / rollback release: `584765c8615827bc6364a1f629a67f9c32a7a0e9`.
Branch: `perf/immediate-foundation-20261016`.

## Changes

- The deferred single entry requests foundation immediately when the DOM is ready. It no longer waits for fonts, an animation frame or a 50ms timer.
- Initial navigation, hero controls and pre-playback poster are visible without entry fades.
- First-visit consent opens immediately, including its text, focus and scroll lock.
- Consent choices, its existing 470ms close/event handoff, settings reopening, playback state, feature gates and ongoing motion remain unchanged.
- The shared UI stylesheet is byte-identical to the rollback release. Only the dedicated startup style block in Webflow head changes.

## Deployment

Use this branch's implementation commit in all three existing single-release URLs. Retain the site head/footer outside that pin replacement and the dedicated `data-tdb-chrome-entry` block. Verify current blocks still match the saved before files immediately before writing; reconcile unrelated edits instead of overwriting them. Publish only to the Webflow staging subdomain, with no custom domains.

The after template uses `COMMIT` for the implementation commit. Homepage freeform blocks were empty and need no update.

## Rollback

If no later edits exist, restore `site-head-before.html` and `site-footer-before.html`, then publish only to staging. These restore the prior release and entrance rules together. If other work has arrived, preserve it: restore only this change's release references and `data-tdb-chrome-entry` block, or revert this implementation atop the newer release and repin all three URLs to that new commit. Do not revert someone else's CSS work.

No Designer styles, CMS data or production domains are changed by this implementation.
