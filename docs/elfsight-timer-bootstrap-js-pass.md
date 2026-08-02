# Elfsight timer bootstrap JavaScript extraction

This pass moves the interaction-triggered Elfsight timer bootstrap from the Webflow global footer into a dedicated external runtime.

## Moved externally

- timer shell creation
- Elfsight widget placeholder injection
- first-interaction scheduling
- requestIdleCallback fallback timing
- scroll, resize and orientation visibility updates
- mobile navbar overlap detection
- pageshow reattachment

## Kept unchanged

- Elfsight timer CSS
- one-viewport reveal threshold
- mobile navbar class and transform checks
- shell and widget IDs/classes
- 1500 ms idle timeout and 200 ms fallback
- all navbar scripts and CSS

## Rollout

1. Merge the branch and use the immutable commit URL.
2. Replace the first inline footer script with one external script tag.
3. Keep the script in the same footer position.
4. Leave the treatment sorting and navbar scripts unchanged.
5. Test desktop and mobile timer creation, hiding, revealing and navbar coordination.
