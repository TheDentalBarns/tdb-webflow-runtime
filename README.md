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

The treatment-specific Smile Gallery ordering script remains inline because it must correct slide order before the gallery is revealed. The GSAP logo slider remains separate and is not part of this module.

## Production loading

Use fixed release tags rather than `main`.

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

## Release rule

Published version tags are immutable. Any behavioural change receives a new semantic version.
