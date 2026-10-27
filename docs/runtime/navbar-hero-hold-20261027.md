# Shared transparent navbar hero hold — 27 October 2026

Reference: [TDB Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd).

Desktop and tablet transparent navbar variants now use the existing phone scroll policy. The original bar scrolls away with the page; an upward scroll can reveal the fixed bar only after the existing 75vh threshold. The existing 120px upward and 140px downward intent distances, reveal/hide transitions, hover surfaces and mobile menu behaviour remain unchanged. This applies through the shared controller to Home's fade-entrance variant and Location's transparent variant, and other transparent consumers. Nontransparent variants retain their existing policy.

## Ownership and cost

`src/navbar/navbar-enhancement.js` owns the change, built into `dist/tdb-navbar.min.js` with its readable output and artifact manifest. Navbar version is 1.7.0; the scroll API is 1.2.0. No Designer, page-specific CSS, new global style rule, initial bundle or request is added. Central motion profile and panel timing remain unchanged. The threshold is scroll geometry, not an animation duration.

The deferred navbar changes from 23,841 to 23,830 raw bytes, 6,245 to 6,246 gzip bytes; Brotli remains 5,586. All other delivery assets remain identical. This is a requested behaviour alignment, not a performance claim.

## Verification

Node 24 build parity and full verification: 771 passed, three existing skips, zero failures. New behavioural cases at 448px, 834px and 1363px cover upward scrolling inside the hero hold, sticky reveal beyond the gate, downward hiding and returning to the original placement. Existing consent handoff, dropdown reversal, breakpoint and scroll-lock checks pass. Prettier passes after normalizing local Windows checkout line endings; custom Swiper reproducibility checks pass and its output is unchanged.

## Release and rollback

Base: Sunday documentation commit `2d172d0d0ec9c7145bfccb8ab9f01d18f0df3427`, including main. Previous staged runtime: `8d3c3cf79502a7ca3bc27547c81eefc12610f97a`.

Publish staging only with one immutable release across foundation preload, UI, noscript UI and startup entry. Exact previous site code is backed up outside the repository. Roll back those four pins together to the previous staged runtime; no native CSS or markup rollback is needed.
