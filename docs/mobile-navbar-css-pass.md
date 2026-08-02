# Mobile navbar CSS extraction

This pass moves the two dedicated mobile navbar interaction/style blocks from Webflow global head custom code into `src/styles/tdb-mobile-navbar.css`.

## Kept inline

The small shared navbar base rules remain inline in the main critical head block:

- `.navbar10_component` z-index and transform/background transitions
- `.navbar10_component.z-hold`
- `.navbar_line` opacity transition
- `.navbar-bg_layer` visibility rules

These protect first-paint structure and existing navbar behaviour.

## Moved externally

- mobile logo/icon and link colour transitions
- open/close menu background animations
- mobile menu text motion
- navbar glass layer styles
- scrolled/open/close glass states
- backdrop-filter fallback
- reduced-motion override

## Not changed

- navbar JavaScript
- scroll thresholds
- Webflow navbar behaviour
- desktop styling
- timing values
- glass colours and blur values

## Rollout

1. Load the stylesheet from an immutable commit URL.
2. Remove the two matching inline `<style>` blocks from Webflow global head.
3. Keep both navbar `<script>` blocks unchanged.
4. Publish to staging and test top-of-page, scrolled, open, close, rapid open/close, and reduced-motion states on mobile.
