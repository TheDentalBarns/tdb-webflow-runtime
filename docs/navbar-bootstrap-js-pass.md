# Navbar bootstrap JavaScript extraction

This pass combines the two small navbar bootstrap scripts from the Webflow global head into one external runtime file.

## Moved externally

- mobile navbar text-close Web Animations logic
- `.tdb-nav-bar-glass` element injection
- DOM-ready and Webflow-ready guards for those features

## Kept inline

- critical navbar CSS
- mobile navbar stylesheet link
- main navbar scroll/show/hide logic in the footer
- `tdb-nav-clear-cycle` footer logic

## Not changed

- animation timing or easing
- menu-open detection
- keyboard support
- navbar layering or scroll thresholds

## Rollout

1. Merge this branch and use the immutable commit URL.
2. Add one deferred script to the Webflow global head.
3. Remove only the two matching inline navbar bootstrap scripts.
4. Leave all navbar CSS and footer scripts unchanged.
5. Publish to staging and test menu open/close at the top and while scrolled.
