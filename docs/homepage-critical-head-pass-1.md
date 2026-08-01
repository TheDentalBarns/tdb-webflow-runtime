# Homepage critical-head extraction — pass 1

## Goal

Reduce global Webflow head HTML without changing the homepage first paint or interaction behaviour.

## Extracted into CSS

```text
src/styles/tdb-deferred-ui.css
```

This first low-risk bundle contains:

- Lenis support rules
- CookieScript presentation and stacking overrides
- Complete mobile VIP drawer styling
- The later VIP black-glass overrides merged into the base drawer rules
- The later consent z-index override merged into the CookieScript rules

The source stylesheet is 10,391 bytes uncompressed and approximately 2,455 bytes gzip.

## Critical inline guard to retain

Keep this in the Webflow global head so the drawer cannot flash before the external stylesheet arrives:

```html
<style>
  #tdb-mobile-vip-cta,
  #tdb-vip-drawer {
    display: none !important;
  }

  @media (max-width: 767px) {
    #tdb-vip-drawer {
      display: flex !important;
      visibility: hidden;
    }
  }
</style>
```

The runtime adds `.is-ready` after initialisation, and the external stylesheet controls its visible states.

## Staging link

Use the immutable extraction commit for the first staging test:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@54656ff1b36ae4f9224d4575e5c5d57809587ee8/src/styles/tdb-deferred-ui.css"
>
```

For the first pass this is intentionally a normal stylesheet, not an `onload` stylesheet swap. It removes the inline HTML duplication and enables cross-page caching without risking an unstyled VIP drawer or consent UI. A later pass can test deferred delivery once the critical subset is proven.

## Webflow blocks to remove after adding the link

Remove only these complete existing blocks from the global head:

1. The `<style>` block beginning with:

```css
html.lenis,
html.lenis body
```

2. The `<style>` block beginning with:

```css
/* CookieScript: kill fade / slide animation */
```

3. The large `<style>` block beginning with:

```css
#tdb-mobile-vip-cta,
#tdb-vip-drawer
```

Keep the small critical guard shown above in its place.

4. The later `<style>` block beginning with:

```css
/* VIP DRAWER — BLACK NAV-STYLE GLASS */
```

5. The final `<style>` block beginning with:

```css
/* Consent UI must always sit above site overlays */
```

Do not remove the `tdb-vip-drawer.js` loader from the footer.

## Test checklist

- Homepage first paint unchanged on desktop and mobile
- No VIP drawer flash during loading
- VIP drawer peeks, opens and closes correctly
- VIP form fields, checkbox and submit button retain styling
- Navbar moves away correctly while the VIP drawer is open
- CookieScript banner and badge appear above the VIP drawer
- CookieScript has no fade or slide animation
- Lenis scrolling and scroll locking still work
- DevTools Network shows `tdb-deferred-ui.css`
- View Source confirms the removed CSS is no longer duplicated inline

## Not included in pass 1

These remain inline pending separate visual testing:

- Navbar initial state and animations
- Vimeo placeholder and player states
- Slider visibility and transitions
- Treatment gallery pre-sort guard
- Typography and first-paint background rules
