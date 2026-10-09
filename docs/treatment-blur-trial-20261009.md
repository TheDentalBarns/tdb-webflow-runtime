# Treatment carousel: native opacity blur trial — 9 October 2026

David approved the remaining wrapper/runtime cleanup and a visual trial of fading
the existing 20px blur layer. Staging only.

Native shared component `1cc1fff8-4b9a-3eb7-19af-da2473371baf` (four instances):
- Move original copy `e1ab4f6c-7c16-0d13-bbe6-88c01d005640` and CMS link
  `e1ab4f6c-7c16-0d13-bbe6-88c01d005644` directly into the existing content layer.
- Apply existing `.tdb-treatment-source {display:none}` directly to that link,
  replacing its obsolete button combo classes. Its raw collectionPage binding,
  visibility and aria-hidden settings are identical before/after.
- Remove now-empty bottom/source wrappers `...563f` and `...5643`.
- `.tdb-treatment-blur` retains backdrop-filter:blur(20px), with opacity:1 and
  transition-property:opacity. Keep duration var(--tdb-parallax-duration,400ms),
  ease timing and zero delay. `.tdb-treatment-blur.is-current` now has opacity:0
  and no backdrop-filter override. No extra bitmap, blur layer or runtime CSS.

Rollback of the visual trial alone: remove both opacity declarations, restore
the base backdrop-filter transition with the same duration/ease, and set the
is-current backdrop-filter to blur(0px). The wrapper cleanup can remain.

Parallax 1.3.1 / Immediate Runtime 0.11.9:
- Read treatment source URLs from the retained native anchors directly.
- Cache treatment copy/blur nodes and group blur layers by logical slide index.
- Change active blur classes only on the previous/new groups, and skip repeated
  moving/entry flags. Rebuild when loop-slide identities change; reconcile any
  inherited clone classes and release detached references.
- Preserve Services/legacy adapter behavior, shared motion and all timing.

Targeted validation: built Swiper fixtures pass forward/reverse looping, one CTA,
all six CMS destinations, busy states, clone budgets and retained index across
desktop/tablet/phone transitions. Cache tests verify no repeated layer searches,
no blur class writes for unchanged state, and correct blur/copy state after
loop recreation. Existing plugin lifecycle and rendered-progress tests pass.
The native-layout browser fixture was updated to the new markup/CSS but was not
run via its standalone browser harness. Live browser review follows publication.
No frame-rate or paint-time improvement is claimed without a comparative trace.

The publication guard detected concurrent runtime release d1c4d874. The final
release carries forward its consent startup fix (CookieScript ea970578) and
preserves the independently updated footer runtime base bb49798.

## Trial decision — original blur restored

David preferred the original effect and requested its restoration at 16:36 BST
on 9 October 2026. Restored the native backdrop-filter transition (20px to 0px)
and removed the two opacity declarations. Published to staging only. Live browser
verification confirms 739ms blur-radius transitions at the review viewport, opacity
1 on both layers, 171 carousel descendants, and one CTA. All wrapper, loop,
accessibility and runtime-cache improvements remain. No runtime pin was changed.
