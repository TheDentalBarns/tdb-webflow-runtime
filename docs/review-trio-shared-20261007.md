# Review trio migration — pending release

Local commit 5bb365327b132c883845760d34764489276d9c70 on cleanup/shared-quote-carousel-20261007.
Push was rejected by automatic approval review because public TheDentalBarns/tdb-webflow-runtime requires explicit user approval. Do not retry until approved.

## Implemented

- Shared quote engine version 4, canonical dist/tdb-quote-carousel.js (legacy TDBTeamQuotes alias retained).
- Review adapter dist/tdb-review-quote-adapter.js hydrates native cards, uses shared engine and forwards selected review ID to existing drawer.
- Review loader 3.8 discovers data-tdb-review-quotes, retains permission/proximity and optional drawer preparation.
- Native Webflow Review Carousel component 63c143be-60b7-7cf7-7a84-9ff3c467f0bf rebuilt using existing tdb-team-quotes classes. Visible section and three currently featured CMS review excerpts; no runtime root replacement.
- Home instance 295fb315-8295-6a8c-a936-9165b5e35167 moved after USP ce5ea7bd-8bf1-cf3a-9f2b-0f1ca16105c0. Replaced Testimonial Standard instance a029d5ff-bac4-132f-8bdf-62dffe937073 removed. Hidden clone template removed.
- Native cursor/focus combo tdb-team-quotes_content + tdb-quote-action. Source icon tdb-quotes_source uses inline-block, vertical-align middle, .65rem right margin.

## Release steps after approval

1. Push branch. Do not repin shared registry; other work changed registry from d71d7f0 to 287030d6f062f8b763608623c8d60b1fc49f9feb during this task. Distinct quote adapter filename deliberately avoids old registry remapping and preserves other releases.
2. Re-read site HEAD and Home footer immediately before writes, retaining concurrent changes.
3. Replace site head 6b05f1035007233cada725512d5c075de6e97b84/dist/tdb-team-quotes.js with new full commit/dist/tdb-quote-carousel.js. Existing fallback handler retained.
4. Extend the small existing state rule in style[data-tdb-owner-quotes-empty]: replace both :where([data-tdb-team-cms]) occurrences with :where([data-tdb-team-cms],[data-tdb-review-quotes].is-enhanced). This lets the shared is-visible native classes control review fades. No layout CSS added.
5. Replace Home footer 00dae682bb50a90a102a2cc6afc47267b4363318/dist/tdb-reviews-loader.js with new commit/dist/tdb-reviews-loader.js; update adjacent version comment.
6. Publish staging only. Verify native stars, first view, portrait/landscape/tablet, no horizontal overflow/section height change, CMS hydration, drawer selected identity, touch loop, and owner regression.

## Validation

12 focused tests pass: shared loop/snap-back/teardown, source identity, review selection through loop, inactive copies and swipes cannot activate, keyboard activation once, consent teardown/remount, single review no loop; review-loader permission/proximity regression. Swiper behavior/plugin tests also passed before action changes. Build --check and diff --check pass.

Visual validation incomplete: Designer snapshot failed; local Chromium download returned invalid archive. No staging or production publication, no freeform script pin changes made.

Code source still src/team-quotes/team-quotes.js for backwards-compatible tests/build, now a shared engine. Existing owner native attributes/classes intentionally reused to avoid migrating working author CMS structure. Review fallback cards are authored native content hydrated by the same CMS featured selection as before, not a new bound CMS collection list.
