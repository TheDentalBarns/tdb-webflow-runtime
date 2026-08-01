# TDB Webflow Runtime

Versioned JavaScript and CSS runtime for The Dental Barns Webflow website.

## Modules

### Forms `v0.1.0`

Source:

```text
src/forms/forms.js
```

Production build:

```text
dist/tdb-forms.min.js
```

Handles:

- Required-field and required checkbox/radio validation
- Submit-button enabled/disabled state
- Treatment select placeholder state
- UK mobile number normalisation on submission
- Dynamically inserted or moved forms
- Safe repeat initialisation

### Sliders `v0.2.0`

Source:

```text
src/sliders/sliders.js
```

Distribution build:

```text
dist/tdb-sliders.js
```

Handles:

- Highlight Swiper initialisation
- Highlight slide counter updates
- Parallax Swiper initialisation
- Parallax fade-state behaviour
- IntersectionObserver-based lazy initialisation
- Dynamically inserted slider components
- Duplicate Swiper protection

The treatment-specific Smile Gallery ordering script remains inline because it must correct slide order before the gallery is revealed.

### Consent `v0.3.0`

Source:

```text
src/consent/consent.js
```

Distribution build:

```text
dist/tdb-consent.js
```

Handles:

- Cookie settings link behaviour
- Existing CookieScript consent-state checks
- Consent-gated Google Analytics, Intellimize and Meta Pixel loading
- Elfsight loading after a consent decision
- Duplicate script and duplicate initialisation protection
- Safe repeat refresh and status inspection

The Elfsight timer-shell display and navbar interaction remain inline because they are interface behaviour rather than consent loading.

### Native logo marquee `v0.5.0`

Source:

```text
src/logo-marquee/logo-marquee.js
```

Distribution build:

```text
dist/tdb-logo-marquee.js
```

Replaces the GSAP + Observer logo marquee while preserving:

- Continuous desktop and mobile motion
- Seamless duplicated-logo looping
- Pointer and touch dragging
- Frame-rate-independent smoothing
- IntersectionObserver pause when off-screen
- Resize and late-image recalculation
- Dynamic element discovery
- Accessible, non-focusable cloned logos
- Safe repeat initialisation and cleanup

Default Webflow selectors:

```text
.logo-slider .partner-featured_component
.partner_logos
```

Optional settings can be supplied before loading the script:

```javascript
window.TDBLogoMarqueeConfig = {
  speedDesktop: 40,
  speedMobile: 22,
  smoothing: 0.18
};
```

Inspection and lifecycle API:

```javascript
TDBLogoMarquee.status();
TDBLogoMarquee.refresh();
TDBLogoMarquee.destroy();
```

## Production loading

Use fixed release tags or commit-pinned URLs rather than `main`.

Forms:

```javascript
loadScript(
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.1.0/dist/tdb-forms.min.js',
  'data-tdb-forms-js'
);
```

Sliders:

```javascript
loadScript(
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.2.0/dist/tdb-sliders.js',
  'data-tdb-sliders-js'
);
```

Consent:

```javascript
loadScript(
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.3.0/dist/tdb-consent.js',
  'data-tdb-consent-js'
);
```

Native logo marquee staging loader:

```javascript
loadScript(
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@COMMIT_SHA/dist/tdb-logo-marquee.js',
  'data-tdb-logo-marquee-js'
);
```

## Release rule

Published version tags are immutable. Any behavioural change receives a new semantic version.
