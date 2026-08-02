# Footer runtime consolidation

This pass combines four already-tested footer runtimes into one external file:

- Elfsight timer bootstrap
- treatment smile-gallery sorter
- site asset loader
- navbar clear-cycle helper

The main navbar scroll runtime remains inline and the deferred navbar bootstrap remains in the head.

## Runtime order

The consolidated file executes in this order:

1. Elfsight timer bootstrap
2. treatment smile-gallery sorting
3. site asset loader
4. navbar clear-cycle helper

This preserves the proven dependencies:

- gallery sorting runs before delayed Swiper initialization;
- the asset loader retains all immediate, settled-LCP and load-idle scheduling;
- navbar clear-cycle runs after the main inline navbar runtime.

## Rollout

Replace these four footer script tags:

- `tdb-elfsight-timer-bootstrap.min.js`
- `tdb-smile-gallery-sort.min.js`
- `tdb-site-asset-loader.min.js`
- `tdb-nav-clear-cycle.min.js`

with one `tdb-footer-runtime.min.js` tag placed after the main inline navbar script and Meta noscript block.

Do not remove or move:

- the main inline navbar runtime;
- the Meta noscript pixel;
- the deferred head navbar bootstrap;
- any head CSS or smile-gallery guard.

Test all previously signed-off behaviors and confirm the four old runtime requests are replaced by one consolidated request.
