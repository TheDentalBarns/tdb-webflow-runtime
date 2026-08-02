# Elfsight timer CSS extraction

This pass moves the complete Elfsight timer styling from Webflow custom code into `src/styles/tdb-elfsight-timer.css`.

## Moved externally

- `.tdb-elfsight-shell` positioning, transitions and hidden state
- fallback rules for `.elfsight-app-4fa0f002-95b0-40d5-b89d-0f5e97471efb`
- mobile `#tdb-elfsight-timer-shell` overrides
- mobile hidden-state reset for the inner Elfsight widget

## Not changed

- Elfsight timer JavaScript
- lazy/interaction loading behavior
- navbar/timer visibility logic
- transition durations and easing
- z-index values
- desktop/mobile hide offsets

## Rollout

1. Merge this branch and use the immutable commit URL.
2. Add the stylesheet link to the Webflow global head.
3. Remove only the Elfsight CSS from the general head style block.
4. Remove only the small Elfsight mobile `<style>` block at the top of the global footer.
5. Leave both Elfsight-related scripts untouched.
6. Publish to staging and test desktop and mobile timer reveal/hide behavior.
