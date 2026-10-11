# Combined viewport reload memory — 11 October 2026

Follow-up target: consider keeping this inline versus removing reload memory entirely. Measure its load-time CPU, DOM scanning, storage work and retained memory before deciding. User reviewed staging and reported that it seems okay; defer that assessment for later.

Measured size comparison against the immediately preceding deployment: global head plus DD loader is 14,473 bytes versus 15,957 bytes (1,484 bytes less). Separately gzip-compressing those two resources estimates 5,971 versus 6,093 bytes (122 bytes less), before this follow-up comment. The approximately 48% reduction compares the combined minified memory code with the two original unminified memory sources; it is not a whole-page network saving. Browser checks retained image translation and DD opacity exactly across reloads, with scroll position preserved; Services navigation opened. No overall load-time speedup has been measured.

One inline coordinator serves the existing TDBDDMemory and TDBPageBreakMemory contracts. Shared motion remains pinned to f56768bfea12b6f616358e57dba661e376036518. The page-break loader is unchanged; DD returns to loader 310b98acf5271a9be342b9cf4283dd53663850a5, avoiding its duplicated memory module.

The snapshot includes only elements intersecting the viewport plus 25% of its height on each side, selected using cached geometry from the effects. No geometry or computed-style reads are added. One session-storage record holds both categories; existing runtime lifecycle calls update each category independently. A reload/back-forward snapshot expires after 24 hours, requires equal width and less than 25% height change, and matches content/configuration fingerprints. It deliberately does not migrate old full-page snapshots: the first visit records the new format.

One parser-time mutation observer examines newly added content and affected ancestors, then disconnects at DOMContentLoaded. Fresh navigation or an empty snapshot installs no observer. Existing runtime take/save interfaces and animation ownership remain unchanged. The early inline block does not start either effect, request external scripts or change scroll position.

Validation: tests/viewport-memory.test.cjs covers viewport filtering, geometry-free saving/restoration, DD/image/black/opacity/reveal restoration, invalid/stale state, changed content and dimensions, streamed parser content, no repeated document scans, unavailable storage and integration with the existing motion implementation.

Rollback: replace only script[data-tdb-viewport-memory] with the page-break script from the adjacent before-head.html; restore DD loader d513653ad6aa5b0c9bce64cb63560ae56523d11e. Preserve subsequent unrelated custom-code changes. Staging only.
