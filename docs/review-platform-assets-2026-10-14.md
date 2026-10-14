# Shared review platform assets

The shared `TDBReviewCMS.platformAsset(platform)` lookup owns canonical Google, Facebook, Yell and Doctify SVG URLs. Drawer source icons and the quote adapter use it without footer templates. Static Designer images and review-card CSS remain unchanged. Quote/Star template compatibility remains available.

Deploy the CMS and both quote-adapter variants together. Preserve all other asset pins. Verification: `node --test tests/review-native-assets.test.cjs` (3 passing cases, including the minified adapter and activation forwarding).

## Webflow footer change

Site: 677cf86cf9952f978d94d80c
Home page: 677cf86df9952f978d94d8a9
Footer Home component: 4c8e5b24-0116-2a8d-4190-53cdd4860ef5
Removed platform-only embed: 4c8e5b24-0116-2a8d-4190-53cdd4860ef9
Keep sibling `tdb-runtime_templates` counters in place; counter restructuring is a separate task.

Prior asset pin for all three outputs: f6e0b206ee40a4b104c9ff4de1860883caba0b43.
Rollback: restore the embed below inside Footer Home before restoring these three prior pins. Publish only dentalbarns.webflow.io.

```html
<div hidden data-tdb-review-asset-templates="1"><span hidden="" data-tdb-review-icon="Google"><img src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac7b972653444187f404ca8_tdb-review-google.svg" loading="lazy" width="100%" height="100%" alt="" aria-hidden="true"></span><span hidden="" data-tdb-review-icon="Facebook"><img src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac7b973ba7906fe700055be_tdb-review-facebook.svg" width="100%" height="100%" alt="" aria-hidden="true" loading="lazy" fetchpriority="low"></span><span hidden="" data-tdb-review-icon="Yell"><img src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac7b973ba7906fe700055e8_tdb-review-yell.svg" width="100%" height="100%" alt="" aria-hidden="true" loading="lazy" fetchpriority="low"></span><span hidden="" data-tdb-review-icon="Doctify"><img src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac7b973dd39bbf3927772e6_tdb-review-doctify.svg" width="100%" height="100%" alt="" aria-hidden="true" loading="lazy" fetchpriority="low"></span></div>
```
