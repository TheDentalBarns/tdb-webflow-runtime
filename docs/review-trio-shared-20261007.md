# Review trio migration — staging released

Released with explicit user approval on cleanup/shared-quote-carousel-20261007.
Runtime release: 831282ea83ed94b826ab3896cd417fbc858e435f. Published https://dentalbarns.webflow.io/ only; production unchanged.

## Implemented

- Shared quote engine version 4, canonical dist/tdb-quote-carousel.js (legacy TDBTeamQuotes alias retained).
- Review adapter dist/tdb-review-quote-adapter.js hydrates native cards, uses shared engine and forwards selected review ID to existing drawer.
- Review loader 3.8 discovers data-tdb-review-quotes, retains permission/proximity and optional drawer preparation.
- Native Webflow Review Carousel component 63c143be-60b7-7cf7-7a84-9ff3c467f0bf rebuilt using existing tdb-team-quotes classes. Visible section and three currently featured CMS review excerpts; no runtime root replacement.
- Home instance 295fb315-8295-6a8c-a936-9165b5e35167 moved after USP ce5ea7bd-8bf1-cf3a-9f2b-0f1ca16105c0. Replaced Testimonial Standard instance a029d5ff-bac4-132f-8bdf-62dffe937073 removed. Hidden clone template removed.
- Native cursor/focus combo tdb-team-quotes_content + tdb-quote-action. Source icon tdb-quotes_source uses inline-block, vertical-align middle, .65rem right margin.

## Release

GitHub connector published the approved branch after local Git push lacked credentials. Site HEAD now loads the shared quote engine and Home footer loads review-loader 3.8 from the release SHA. The existing entry-state opacity rule includes enhanced review quotes. Shared registry and concurrent changes were preserved. Native Designer component changes were published to staging.

## Validation

12 focused tests pass: shared loop/snap-back/teardown, source identity, review selection through loop, inactive copies and swipes cannot activate, keyboard activation once, consent teardown/remount, single review no loop; review-loader permission/proximity regression. Swiper behavior/plugin tests also passed before action changes. Build --check and diff --check pass.

Cloud browser verified native stars and CMS hydration, forward/reverse wrapping, owner quote navigation, and clicking Connie's quote opening Connie's full review in the existing drawer. No application warnings/errors observed. Desktop visual check completed. Physical touch, mobile/tablet visual checks, and quantitative layout-shift measurement remain unverified.

Code source still src/team-quotes/team-quotes.js for backwards-compatible tests/build, now a shared engine. Existing owner native attributes/classes intentionally reused to avoid migrating working author CMS structure. Review fallback cards are authored native content hydrated by the same CMS featured selection as before, not a new bound CMS collection list.
