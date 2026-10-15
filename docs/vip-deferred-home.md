# Deferred Home VIP drawer

Only the Home footer opts in through data-tdb-vip-lazy on #tdb-vip-drawer. Keep its native handle and empty .tdb-vip-drawer-body. The other pages and footer enquiry form remain native.

Scrolling can prepare the shell/peek controller. First open requests tdb-vip-content.js and tdb-vip-content.css plus the existing form behaviour, mounts the form, registers it with Webflow forms, then runs the existing panel entrance. No content JSON or CMS credential is needed. Later opens reuse the same form and entered values. Escape cancels pending opening; failed preparation falls back to the footer form and can retry.

Webflow still owns submission. The original field names, page/element IDs, success/error regions, consent and capture-phase attribution are retained. Native forms.ready() discovers the new form; existing footer button and success state are saved/restored around that call. Validation is refreshed on the new form before opening.

The content CSS preserves the published native cascade for the form. Shared Designer classes remain because 24 other drawer instances and the native footer still use them. The shell/handle keep their existing native motion styles.

Validation: deferred-content lifecycle tests cover no initial fetch, scroll-only shell, first-open readiness, repeat opens/data retention, Escape, load failure/retry, native registration and old-page compatibility. An isolated integration fixture using the published Webflow forms chunk checks real serialization, phone normalization, failure/retry and success without sending a live enquiry.

Rollback: remove data-tdb-vip-lazy from the Home drawer and reinsert component 1a81a875-96cc-14f3-2f27-56aec919cb83 (VIP Drawer Form) inside the existing body. Restore the previous c14fe4de8cfd73528f16fa3a613a7fea235cc08d runtime pin if rolling back code too. Publish staging only.
