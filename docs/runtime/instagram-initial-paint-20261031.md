# Instagram initial paint guard — 31 October 2026

An iPhone 16 Pro Max user reported black rendering and Safari's webpage error while rapidly crossing the Instagram feed on staging Home and Location, particularly during initialization. The physical-device crash has not been reproduced in Windows WebKit; rendering pressure during initial feed preparation is a hypothesis, not a confirmed browser fault.

## Change

The native image window already prepares the current post and neighboring posts, including matching loop copies. The new CSS reuses its `data-ig-image-ready` marker: in an enhanced feed, unprepared slides retain their layout but are hidden and their two glass panels have backdrop filtering disabled. Preparing a slide immediately restores its existing styles.

The guard is scoped to `data-tdb-ig-ready` and excludes `data-ig-loading-fallback`. Native/unmounted content and the explicit loading fallback remain visible. No JavaScript, markup, image-selection logic, timing, controls, loop configuration, reflections or blur values change. Prepared glass remains `saturate(150%) blur(20px)` at the current site setting; the existing opacity transitions, first-view slide and 300 ms feed fade remain intact.

This is an initialization guard. Prepared posts remain prepared as the carousel is explored; it does not promise a bounded lifetime GPU or image-memory budget.

## Validation before staging publication

- Built runtime and the pinned custom Swiper bundle with Node 24.19.0. Generated changes are confined to `dist/tdb-instagram-native.css`.
- `npm run verify`: 850 passed, 0 failed, 3 skipped (853 total).
- Prettier passed using the equivalent direct command with Windows-compatible glob quoting and `--end-of-line auto`; the package script's single-quoted globs are not interpreted by Windows cmd.
- Windows Playwright WebKit against both staging pages, replacing only the requested Instagram CSS with the built candidate: repeated rapid viewport crossings during initialization; widths 440, 768, 992 and 1440; return to 440 with a shorter viewport; next/previous controls; a complete carousel loop using its ordinary transition speed.
- Both pages passed without page errors or crashes. Every sampled loop card was prepared, visible and had its image loaded. A single feed and the original physical slide counts remained throughout.
- At initial 440 px readiness, Home's 40 glass panels and Location's 48 panels were reduced to 10 panels with enabled backdrop filters (five prepared physical slides). Prepared filters remained 20 px; entrance animation remained 300 ms; mobile carousel speed remained 400 ms, with the original responsive speeds at wider widths.
- Explicit fallback and unmounted-state checks retained visible cards and their original blur.

These are CSS/computed-style and browser observations, not a measurement of physical iPhone GPU memory or proof that the reported crash is fixed. Physical iPhone Safari testing remains the next step.

## Release and rollback

Base: `8be9e1ba5b0f14a74a2613807f7d4b264b4c8c7c`, containing the deployed runtime and subsequent documentation. Current `main` is an ancestor; no incoming main changes were omitted. Unrelated local work remains outside this isolated release.

Publish only to `dentalbarns.webflow.io`, with all four global installation references on this one immutable release commit. The exact current head/footer blocks are backed up privately outside the repository. No page-specific overrides are added.

Rollback: restore all four installation references to `5a542b5e6bb7aa3a64ac0b648b4fd0ed620c9c01` using that backup, then publish the Webflow subdomain only. Production custom domains are excluded.
