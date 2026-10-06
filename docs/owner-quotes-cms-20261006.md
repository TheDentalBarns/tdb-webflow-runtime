# Native owner quotes CMS — 6 October 2026

This supersedes the rich-text feed architecture in `owner-quotes-native-20261006.md`.
The staging owner plugin is version 3.0.0, pinned to commit
`dd7e13bf7edadba5799177e5d946b70ca4e38a52`.

## Editorial ownership

The Owner Quotes collection holds the 24 migrated, approved records with their
original wording, attribution, page assignment, rank, active status and tags.
Quote and referenced Team name/job title are bound directly to native elements.
The Team Website Quotes field remains an explicitly archived rollback source.
Do not edit that archived field to change the carousel.

Native lists on Home, First visit, Contact, Location and the Services template
filter Active and Placement Key, sort Rank ascending and limit to three items.
Use the exact static page name as Placement Key, or the service slug for a
service quote. Page Path and Service reference retain editorial context; the
Placement Key is the list's native filter. Tags do not route quotes at runtime.
Content-only quote detail URLs are excluded from the sitemap and use noindex.

Webflow does not allow a live Collection List inside a reusable component.
Only the five owner quote instances were unlinked. They share native styles and
one plugin. The original patient testimonial component and its instances remain.
The obsolete bottom-of-page Team feeds and the owner sections' old Webflow
Sliders were removed. No approved content was deleted from the CMS.

## Reserved native layout

- The track explicitly uses a single flex row with stretched slides. Every
  selected quote participates in intrinsic height calculation before scripts.
- The original 300px floor, responsive 7rem/3rem ornament offset, type sizes,
  container widths and outer padding are retained.
- The 44px counter area is in normal flow. A one-quote counter is hidden with
  visibility, retaining its space.
- Author fields are inline with zero paragraph margins.
- Native quote and byline opacity is 1 so both are visible in Designer.

`src/team-quotes/native-empty-state.css` documents the small site-head rules:
the published entry opacity is 0 until existing motion reveals it; an empty
native CMS list hides its enclosing owner section before JavaScript. This empty
state rule is needed because Services already has the maximum 60 custom fields
and Webflow does not permit the proposed nested Collection List existence gate.
Empty-section suppression is head CSS, not a Designer conditional-visibility
switch; the Designer can still show the surrounding section when previewing a
service with no quotes. Positive quote layout and all its sizing are native.

## Runtime boundary

Removed from the owner plugin: rich-text metadata parsing, page/tag routing,
selection/sorting/deduplication, feed reading, template cloning and quote/byline
text replacement. Webflow's native query is now the content source.

Retained: shared Swiper geometry and loop clones, fractional viewport width,
first-view opening move, 400ms copy fade, DD author motion, ticker, focus and
keyboard controls, touch/drag thresholds, rapid transition interruption,
resize handling, proximity/focus lazy loading, failure fallback, teardown and
shared full-motion policy. No other carousel or global dependency pin changed.

## Verification

The 12 staging exports have the expected 0/1/2/3 item counts and correct author
bindings; the old quote feed is absent from all of them. The original 24 records
are still present in the Owner Quotes collection.

93 browser fixture cases use captured staging markup, exact published styles,
fonts and shared engine. Widths include 320, 375, 390, 479, 480, 568, 667, 767,
768, 820, 991, 992, 1024, 1280, 1440 and 1920px. Each measures before scripts,
after a delay, during initialization and after the opening movement. All passed
with 0px movement of the following content from initialization.

Desktop, narrow portrait and phone landscape passed keyboard navigation, rapid
navigation, dragging, looping in both directions and breakpoint resizing.
The final Designer-visible opacity change passed a further 16 responsive cases,
including native preview visibility and the published opening reveal. Two-quote
looping and rapid navigation were checked separately.
Dependency failure preserves geometry and reveals the first quote; below-fold
loading remains lazy. Full motion remains enabled under OS reduced-motion.
The live staging home was also checked in the browser for native CMS items,
absence of the feed, and working keyboard navigation.

Run `node --test tests/team-quotes.test.cjs`. The responsive harness is
`tests/team-quotes.browser.cjs`; it expects private staging captures and their
asset manifest in the supplied directory. Editorial snapshots are deliberately
excluded from the public code repository.

Only the Webflow staging subdomain was published. Shared head code was read
immediately before scoped edits and checked afterward to preserve concurrent
navbar, Services, gallery and page-break work.
