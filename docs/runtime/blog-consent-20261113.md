# Blog ownership and consent

The Blog follows the shared cookie-decision gate. Either Accept or Essential only
releases first-party interactive features after the banner closes. Before that
choice, the native page remains readable without the article-filter module.

## Ownership

- Webflow Designer owns the page layout, cream filter landing bar, its spacing and
  centred home, hidden metadata and hidden drawer/filter shell.
- `src/runtime/blog-feature-loader.js` owns consent subscription and lifecycle.
  It only exists on pages marked `data-tdb-blog-page`.
- `src/blog/filters.js` defines the controller without starting itself. It checks
  consent before mounting and between asynchronous dependencies. Cancellation or
  disposal cannot reveal a late-arriving filter.
- `src/styles/tdb-filters.css` contains shared filter interaction states and
  controls. The Blog requests this subset after consent, never the gallery sheet.
- `src/styles/tdb-blog.css` contains the consent-released filter's generated
  options, checked/disabled states, drawer layout and result-hiding rules.

External JavaScript does not automatically justify another stylesheet. Native
initial styles stay in Designer; a deferred sheet is for UI that the module
creates or coordinates. These feature styles resolve from the same immutable
release as the shared entry. There are no Blog-specific pinned imports in the
page head or footer. Breadcrumb JSON-LD remains on the page.

The Smile Gallery's existing CSS bundle composes `tdb-filters.css` with its own
gallery styles at build time. It retains one stylesheet request and one maintained
source for the common filter rules.

## Validation

`tests/blog-consent.test.cjs` covers no-choice inertness, a single concurrent load,
consent withdrawal, teardown during loading and pages without a Blog owner.
`tests/blog-filters.test.cjs` retains the article-filter behaviour checks.

The full verification run passed 1,137 tests with three skipped. Staging browser
checks must additionally cover native initial appearance, Essential only,
opening/closing filters, filtering/reset, and the Smile Gallery's shared styles.
