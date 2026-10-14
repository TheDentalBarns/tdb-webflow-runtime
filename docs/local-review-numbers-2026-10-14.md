# Component-local review numbers

Review Summary 50534c54-e1ae-0ff8-0bc0-38fd7b938d5a owns current and incoming number elements. Initial values remain the existing Designer properties (4.93, (84)) and inline 84; authored destinations 4.94/(85)/85 stay clipped below the slot. The existing review loader still reads CMS aggregates and supplies final values through data attributes. No new network fetch or consent rule.

Ticker 1.2.0 adopts local value/incoming elements, reads current value alone, reuses incoming elements and no longer queries the footer. Explicit custom templates and plain-text consumers remain supported. Incoming number Designer class adds transform:translateY(100%); Web Animations overrides that during motion. Existing 400ms timing, direction and scroll gate unchanged.

Home footer template 4c8e5b24-0116-2a8d-4190-53cdd4860ef6 removed. The functional data-tdb-usp-mount placeholder remains. Other footer variants are outside this homepage structural edit.

Validation: node --test tests/ticker-local-markup.test.cjs (local hydration, rapid updates, remount, legacy/custom callers). Staging only.

Rollback: restore prior ticker pin fe41fd2b8789fdffd710bda8e8d3ae7f487023d4; first restore Summary to a plain Text 1 property on child 50534c54-e1ae-0ff8-0bc0-38fd7b938d63, Text 2 on root 50534c54-e1ae-0ff8-0bc0-38fd7b938d6f, inline 84 under 73d9ff21-6df6-05ef-0ad0-a72b2e0237ce; remove new number elements; remove incoming transform; restore footer hidden template containing both number classes. Prior element trees and property bindings inspected before change.

Footer area links: both use collection 699058c919f4a1adcc157cad. Sutton filters area=69904d94845a85dbe9608172; Tamworth uses three curated records. Current API reports filters/source/curatedItemIds canBind:false. No destructive consolidation or conversion to manual links performed.
