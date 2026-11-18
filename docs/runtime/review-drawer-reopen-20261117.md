# Review drawer reopening after filtering — 17 November 2026

Selecting Newest first, closing the review drawer, then reopening from the page summary failed with `Cannot set properties of undefined (setting 'scrollTop')`. The published production release reproduced the failure; the review feed itself remained healthy.

The review drawer's `renderSelection` rebuilt Swiper while its shell was hidden. Swiper initialized at zero width without an active slide. The following drawer `onOpen` reused that incomplete instance, then attempted to reset the missing review scroller. The shared drawer correctly unwound the failed open, leaving the introduction's retry message.

The authoritative owner is `src/reviews/native/drawer-content.js` (drawer API 3.14.2). Closed selection changes now replace the cached slide DOM and leave Swiper unmounted. The existing `build(preferred)` call in `onOpen` creates it after the shared shell is visible, selecting the requested review. Open filter changes still rebuild and reveal immediately. Review selection, quote attribution, page-specific lead, pagination, focus, scrolling, filter dismissal and motion remain with their existing owners.

This change is entirely in the already deferred review feature. It adds no initial request, DOM, CSS, consent gate, global handler or animation. Native content and closed geometry are unchanged. A null guard would have hidden the exception while leaving an unusable slider; waiting for measurable geometry restores the actual lifecycle.

The new regression cases cover closed resets and repeated named-review opens in portrait and landscape, plus immediate rebuilding while open. Browser checks cover Newest first, Oldest first, Highest rating and Lowest rating, repeated summary/quote reopening, native lead identity, unique slides, text, counts, focus return and released scroll lock at 1440×1000, 390×844 and 844×390. Physical-device Safari is not claimed.

The release build and patched Swiper artifact checks pass. `npm run verify` reports 1,256 passing tests, zero failures and three existing skips. The format check passes with PowerShell-compatible quoting and `--end-of-line auto` for the Windows checkout; no unrelated source formatting was changed. The patched browser run passes all 12 sort/viewport combinations without page errors.

Release 2.1.16 incorporates the existing staged campaign/navigation release `77433fbf38573c0d48579b5d74a23ba0d21339c4`. Preserve its native page and code configuration. Publish this review to the Webflow subdomain first. Rollback restores the saved head/footer blocks with that previous immutable pin and republishes staging; private backups and browser evidence stay outside the repository. Production promotion remains a separate sign-off.
