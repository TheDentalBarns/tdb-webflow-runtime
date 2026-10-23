# Review progress and location scroll glass

Home has a native progress track and cream marker inside the review holder.
When its existing lazy carousel mounts, the controller borrows those same
Designer nodes for the navigation footer. Destroy returns them to the holder,
so consent changes and later mounts do not lose or duplicate the bar. The
existing rendered-position sampler still drives marker width and travel.

Designer owns the 5px track, orange-3 cream, translucent background and 20px
backdrop blur. The card footer and navigation are now `calc(6rem + 5px)`;
matching card padding and Read more placement are native too. Their previous
external geometry declarations were removed. The external stylesheet retains
only the lazy parked-state visibility and existing carousel presentation.

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
