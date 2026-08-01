# TDB Webflow Runtime

Versioned JavaScript and CSS runtime for The Dental Barns Webflow website.

## Current module

### Forms `v0.1.0`

Source:

```text
src/forms/forms.js
```

Production build:

```text
dist/tdb-forms.min.js
```

The forms module currently handles:

- Required-field and required checkbox/radio validation
- Submit-button enabled/disabled state
- Treatment select placeholder state
- UK mobile number normalisation on submission
- Dynamically inserted or moved forms
- Safe repeat initialisation

## Production loading

Use a fixed release tag rather than `main`:

```html
<script defer src="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.1.0/dist/tdb-forms.min.js"></script>
```

For the existing Webflow loader:

```javascript
loadScript(
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.1.0/dist/tdb-forms.min.js',
  'data-tdb-forms-js'
);
```

## Release rule

Published version tags are immutable. Any behavioural change receives a new semantic version.
