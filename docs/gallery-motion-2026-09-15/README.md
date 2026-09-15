# Smile Gallery motion override

Owner requested restoring desktop gallery chevron, filter-floater, card and treatment-caption animations after explicitly choosing motion for all visitors. Gallery page 6aa3efd54f3f705caf98c687.

Removed four page-head reduced-motion media blocks and changed gallery-local policy from matchMedia to {matches:false}. Existing timing, selectors, filtering, card navigation and caption opacity curve remain unchanged. No added requests. Before/after snapshots provide exact rollback: restore the two before blocks on this page only, then publish staging.

Validation: parsed all scripts; verified one JS policy substitution and four CSS block removals. Executed existing caption fade helper for browse and expanded-card roots, confirming opacity reaches 0.5 at the test position and cleanup removes inline opacity. Visual device acceptance remains to be checked. Production is excluded from publication.
