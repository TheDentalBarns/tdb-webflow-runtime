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

The final verification run passed 1,138 tests with three skipped. Formatting
passes with Windows line endings accounted for. The existing npm formatting
command uses POSIX single-quoted globs, so the same Prettier patterns were run
directly with `--end-of-line auto` on Windows.

Staging release `b92c66f1b98a1666b8e7dc037f2a7caf9d2c9624` includes the intervening
native-gallery release `03dc37cc0d07e61b6849130f9fe7843865726586`. CDN hashes matched
the local entry, foundation, UI, runtime, Blog, shared filter and drawer assets.
The Blog page head is empty; its footer retains only Breadcrumb JSON-LD.

Browser observations:

- An unchanged copy of published staging HTML on a clean loopback hostname
  showed the consent dialog, 15 native posts and a hidden filter. Only UI,
  foundation and startup assets were present before a choice. This checked the
  same loader shipped in the final release; the last patch only styled icons.
- Selecting Essential only released the Blog, motion, filter, drawer and ticker
  modules. `tdb-smile-page.css` was absent from the Blog in both states.
- On staging, In the Press produced nine visible posts and six hidden posts.
  Reset restored all 15. Closing the drawer restored its hidden state.
- Desktop and 390px mobile filter layouts passed visual checks with no horizontal
  overflow or console warnings/errors. Generated author/source icons need local
  feature CSS because Webflow omits their unused native classes from this page.
- The Smile Gallery still requested its single composed stylesheet, displayed
  34 results and opened/closed its shared filter drawer correctly on mobile.

Only the Webflow staging subdomain was published. Physical Android/iOS testing
was not part of this check.
