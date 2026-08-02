# Site asset-loader JavaScript extraction

This pass moves the final large asset-loader block from the Webflow global footer into a dedicated external runtime.

## Moved externally

- duplicate-safe dynamic script injection
- immediate loading of forms, consent, VIP drawer and logo marquee
- settled-LCP scheduling for CookieScript, attribution, Finsweet, Swiper, sliders and Vimeo
- load-plus-idle scheduling for Lenis
- Lenis initialization guards
- existing error logging

## Kept unchanged

- every asset URL and version
- every data attribute used for duplicate prevention
- immediate versus delayed load order
- 4000 ms LCP fallback
- 1000 ms LCP settle delay
- 2000 ms idle timeout
- 300 ms non-idle fallback
- `Promise.allSettled` behavior
- Webflow editor and duplicate Lenis guards

## Rollout

1. Merge the branch and use the immutable commit URL.
2. Replace only the large inline asset-loader footer script.
3. Keep the Meta noscript block, main navbar script and all other external footer runtimes unchanged.
4. Test forms, consent, VIP drawer, logo marquee, sliders, Vimeo and smooth scrolling.
5. Confirm the loader and its downstream assets appear once in Network.
