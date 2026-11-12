# Mobile navbar glass parity

Contact, Pricing and Blog use the shared always-glass navbar with `transparent-nav="false"`. The Webflow variant had an opaque cream override at the tablet breakpoint, and a phone-only runtime rule replaced the component's translucent glass tokens with fully opaque cream. The filter still computed to 20px blur, but no background detail could show through it.

The navbar now retains its native glass colour tokens for this variant, matching Home and Location's floating bar. Remove the `background-color` override from `tdb-nav-bar-glass` on the always-glass variant (`ae62b9d9-a878-1e01-e624-f50a0cc0081c`) at Webflow's `medium` breakpoint, so it inherits the base glass token. Existing open-menu classes and animations still produce solid cream on phones and desktop, then restore glass after closing. Desktop styles, scroll reveal policy, menu locking and motion timings are unchanged.

Validate the top, floating, expanded and closed states at phone and desktop widths. Release source, readable/minified outputs and build metadata together through one immutable shared installer commit, staging only.
