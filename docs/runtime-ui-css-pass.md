# Runtime UI CSS extraction

This pass moves the remaining small, non-critical runtime UI rules out of Webflow custom code into `src/styles/tdb-runtime-ui.css`.

## Moved externally

- `html { scroll-behavior: auto !important; }`
- `.no-scroll`
- Webflow slider dot colours
- fade-slide visibility states
- parallax moving-state fade override
- submit-button disabled/enabled presentation

## Kept inline

- root typography sizing
- body background colour
- navbar base transitions and layering
- Vimeo first-paint CSS
- smile-gallery sorting guard
- VIP drawer visibility guard

## Not changed

- slider JavaScript
- form JavaScript
- Lenis setup
- navbar behaviour
- animation timings or colours

## Rollout

1. Merge the branch and use the immutable commit URL.
2. Add the stylesheet to the Webflow global head.
3. Remove only the matching runtime UI rules from the general head style block.
4. Remove the separate footer `scroll-behavior` style block.
5. Publish to staging and test sliders, forms, scroll locking, and Lenis behaviour.
