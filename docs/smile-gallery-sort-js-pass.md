# Treatment smile gallery sorting JavaScript extraction

This pass moves the treatment-specific smile-gallery sorter from the Webflow global footer into a dedicated external runtime.

## Moved externally

- treatment page path detection in the footer sorter
- priority selector lookup
- numeric priority parsing
- slide reordering within each gallery wrapper
- removal of `tdb-smile-sorting` after sorting

## Kept inline

- the small head script that adds `tdb-smile-sorting` before paint
- the CSS that hides priority fields
- the CSS that temporarily hides the gallery while sorting

## Not changed

- treatment slugs
- priority class names
- gallery selectors
- fallback priority value
- sorting order
- slider initialization

## Rollout

1. Merge this branch and use the immutable commit URL.
2. Replace only the treatment-specific footer sorter with the external script.
3. Keep the head guard script and smile-sorting CSS unchanged.
4. Test Composite Bonding, Invisalign and Veneers pages.
5. Confirm gallery visibility returns and slide ordering matches the priority fields.
