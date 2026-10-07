# DD reload and quote entrance changes — 7 October 2026

Shared motion 1.11.0 restores each document DD element's opacity on reload/back navigation in the same tab. The small early head memory script restores static text before paint; later component mounts claim their own values. Snapshots are scoped by page, viewport and text identity, expire after 24 hours, and are optional when browser storage is unavailable. New navigations start at native opacity 1. Initial offscreen fresh nodes align to their curve; visible and restored nodes retain their painted opacity and converge on user scrolling. Only opacity is written.

Owner quotes 3.0.1 use the current native CMS plugin from dd7e13bf, with an explicit shared DD entrance reset for the active/incoming author line. Slider names start at 1 on entry independently of page scrolling. Quote entrances and local drawer positions are intentionally excluded from reload opacity memory.

Designer quote byline already has opacity 1. Existing page text defaults are opaque; the previous global .5 fallback becomes 1. Legacy IX2 bridge remains required until DD action lists are deleted in Designer.

The registry and DD loader must use this release together; the registry routes all shared-motion consumers to one version. Update only these head pins and the owner-quote pin, add the inline memory block, and replace the DD fallback block. Preserve unrelated in-flight site changes. Staging only.

Verification: 22 automated tests cover reload/back/first navigation, stale viewport rejection, parser/dynamic identity, opacity zero, drawer isolation, explicit quote entry, offscreen first load, restored scroll, reversal and no layout writes. All 32 artifact mappings match sources.
