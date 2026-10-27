# Shared Owner Quotes section

Home and Location now use one native **Owner Quotes** component (`de5a60ab-b9bb-67af-7cc1-11c4d0146737`, two instances). Home's existing section root was converted in place; Location's older section was replaced at the same position. No Home wrapper or element was added. The component retains the nested Quote Decoration component, native CMS cards, accessibility attributes and counter.

## Content and ownership

The native Owner Quotes collection (`6ac53e993d8165264b27bded`) supplies all three quotes and author references. Its shared dynamic query is Active on, Placement Key equals current page Name, Rank ascending, limit three, offset zero, without pagination. Home resolves Home and Location resolves Location in Designer and published HTML. Conversion normalized the switch condition from `isOn` to `equals: "true"`; the rendered selections remain identical. There is no JavaScript content selection or replacement.

Edit quote copy, Author, Active, Placement Key and Rank in CMS → Owner Quotes. Use the exact static page name for Placement Key; update matching keys if a page is renamed. Page Path and Tags are legacy editorial fields and do not control this component's native query. No filter property is needed on the instance: the shared rule follows its page context automatically. Maintain three active ranked records per page to retain the authored three-item counter fallback.

Designer owns the existing section geometry, CMS selection and markup. The unchanged `src/team-quotes/team-quotes.js` / `TDBQuoteCarousel` reads the native cards, prepares accessibility/count state and enhances through the existing consent/runtime lifecycle. Its 800px proximity gate, focus/keyboard intent, first-key replay, shared Swiper adapter, TDBMotion and TDBNativeTicker remain authoritative. The runtime pin stays `6623aa6f837afabee6a609dcbf0ba20c44f815c9`; no runtime source, head installation, CSS source, style definition or new request was added.

## Validation and delivery

This follows the [canonical engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd), home-engineering-standard, shared-artwork-and-html-budget and full-motion-design-review rules.

- Startup: Home remains 1,133 initial elements. Its owner quote section HTML is byte-identical and both native stylesheet URLs are unchanged. Location falls from 1,551 to 1,543 initial elements; the section's descendants fall from 37 to 29. Its inline quote SVG is replaced by the existing shared quote decoration. The old native wrappers and hidden star subtree are removed.
- Interaction: keyboard navigation moves Location from 01 to David's quote at 02 and back to 01; Home advances to its own David quote at 02. Shared counter and accessible position settle correctly. Existing consent and dependency gates are unchanged.
- Presentation: Home and Location each measure 1280 × 747.67px for the section at a 1280 × 900 viewport. Location at 390 × 844 has a 351px viewport, fits its quote/byline/counter and has no horizontal page overflow. Native Designer and initial published HTML both contain the correct three page-specific quotes and bylines in unchanged order.
- Maintenance: one section definition replaces two separately authored structures; quote decoration and motion remain shared. No compensating JavaScript or custom CSS was required.

| Affected delivery | Raw bytes | Controlled gzip bytes |
| --- | ---: | ---: |
| Home whole HTML | +243 | +54 |
| Home native CSS and external runtime | 0 | 0 |
| Location whole HTML | −1,517 | −367 |
| Location native CSS | +112 | −10 |
| Location combined HTML/CSS | **−1,405** | **−377** |

Whole HTML includes publication-dependent output outside the identical Home quote section. Location native CSS adds exports for the reused Quote Decoration and removes obsolete rules; the compiler repeats one existing pseudo-element content declaration. No bespoke style was authored to change these totals. These counts and locally controlled gzip sizes are not speed or LCP measurements.

No new automated tests were added for this native-only change. Published HTML comparisons and direct desktop/mobile browser checks validate the affected component. The previous runtime test result remains applicable to unchanged assets; it was not rerun. Native fallback content was checked in HTML, not a separate JavaScript-disabled browser. Physical-device gesture performance is not certified by the viewport check.

## Staging and rollback

Published to the Webflow subdomain only, task `3ac893f7-e241-4c13-b278-ee570096e74a`. The Location instance is `74701c5e-0464-bf6f-4329-e4b8179870ee`. Raw before/after HTML, original native trees, the shared definition, stylesheet comparisons and screenshots are saved in `owner-quotes-evidence` outside the repository.

For native rollback, unlink the Home section instance in place and restore Location's saved original section tree and CMS bindings, then remove only its replacement instance. Preserve CMS records, the shared Quote Decoration definition and unrelated components. A runtime repin is neither required nor sufficient to undo this native composition change.
