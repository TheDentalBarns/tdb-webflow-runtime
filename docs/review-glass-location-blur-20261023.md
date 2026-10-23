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

The Home scroll image variant of Component 1 - Bg image has one native 20px
backdrop-blur layer. The title is its scroll reference. Native data attributes
set the range: its centre at 50vh starts the fade, reaching 20vh finishes it.
The existing page-break scheduler reads that heading and writes only the
overlay opacity; the photo's parallax and darkening keep their existing owners.
Scrolling back reverses it, and teardown restores native opacity. No additional
scroll listener, perpetual animation loop, interaction engine or request is added.

Focused validation covers review bar identity/restoration, no duplicates,
heading threshold/midpoint/end, reverse scrolling, resize and teardown, alongside
the existing image parallax and review loading lifecycle tests.
