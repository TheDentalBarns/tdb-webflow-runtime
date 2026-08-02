# Navbar clear-cycle JavaScript extraction

This pass moves the final small navbar clear-cycle helper from the Webflow global footer into a dedicated external runtime.

## Moved externally

- mobile-at-top detection on menu pointerdown
- `tdb-nav-clear-cycle` class toggling
- menu-button class observation
- 470 ms close cleanup
- desktop breakpoint reset

## Kept unchanged

- selectors and class names
- transparent-nav guard
- capture-phase passive pointer listener
- menu-transitioning and open-state checks
- 470 ms timing
- main navbar scroll and menu-state runtime
- navbar bootstrap runtime and CSS

## Rollout

1. Merge the branch and use the immutable commit URL.
2. Replace only the final inline `tdb-nav-clear-cycle` footer script.
3. Keep the main navbar footer script unchanged.
4. Test mobile top-of-page menu open and close.
5. Confirm the transparent close transition remains clean and desktop resizing clears the temporary class.
