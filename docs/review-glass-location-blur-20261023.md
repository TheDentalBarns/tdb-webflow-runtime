# Review progress and location scroll glass

Home has a native progress track and cream marker inside the review holder.
When its existing lazy carousel mounts, the controller borrows those same
Designer nodes for the navigation footer. Destroy returns them to the holder,
so consent changes and later mounts do not lose or duplicate the bar. The
existing rendered-position sampler still drives marker width and travel.

Designer owns the 5px track, orange-3 cream, translucent background and 20px
backdrop blur. Two new Designer
variables under Review embed own Footer base height (6rem) and Progress height
(5px). Card footer/navigation height, card padding and Read more placement all
consume their sum; navigation padding also includes the progress height. The
native progress class references Progress height directly. The lazy-card
stylesheet consumes these variables because Webflow omits classes without
authored instances from published CSS. No duplicate sizing values live in the
runtime. Edit the two values in Designer's Variables panel, under Review embed.

The Home location photo in Component 1 - Bg image receives a direct image
filter. The previous full-viewport sticky backdrop layer was removed after it
continued overlapping the following treatment section. The existing image is
the only filtered node: no extra image, backdrop surface or request is added.
The maximum radius uses Designer's Effects/Blur variable (20px). Native data
attributes set the range: title centre at 50vh starts the blur, reaching 20vh
finishes it. The existing page-break scheduler writes only the image filter;
its parallax and darkening keep their existing owners. Leaving the section
removes the blur filter entirely; scrolling back restores the correct progress.
Teardown restores the original filter. Shared BG instances outside Home remain
unchanged. No additional scroll listener or perpetual animation loop is added.

Focused validation covers review bar identity/restoration, no duplicates,
heading threshold/midpoint/end, offscreen release, reverse scrolling, Home-only
scope, unaffected treatment images, resize and teardown, alongside
the existing image parallax and review loading lifecycle tests.
