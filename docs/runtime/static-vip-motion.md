# Static VIP motion migration

The six static VIP pages retain their original content and layout. Their FAQ
and awards sections use native shared disclosure hooks and keep all items
collapsed initially. The original FAQ component remains available to the CMS VIP
template.

The three pages with legacy hero motion (`/vip`, `/vip-sanctuary`, and
`/vip-christmas`) load the immutable `tdb-motion-standalone.js` entry. It bundles
the existing shared profile/policy and motion implementation. It does not change
the global runtime pin or start media. The standard page-break loader still owns
scroll motion and its existing consent and first-input gates.

A measured frame may opt into coupled opacity targets using
`data-tdb-parallax-fade-selector`, but only inside an ancestor marked
`data-tdb-parallax-scope`. `data-tdb-parallax-fade-to` supplies their end opacity.
This preserves the original VIP hero/footer logo coupling without moving nodes
or adding another scroll listener. Existing page-break consumers are unchanged.

`data-tdb-motion-enter="1000"` opts a native element into the existing shared
fade controller on DOM readiness. Its starting opacity is authored in Designer.
The Christmas logo uses a separate parent for its entry fade, leaving its scroll
opacity with one owner. The original one-second entry timing is retained through
the shared motion profile.
