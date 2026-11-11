# Treatment page spacing and shared FAQ labels

The five-step treatment guide now keeps its real parallax image on the same sticky surface at phone widths as at desktop widths. Native phone styles use equal 8rem top and bottom padding and natural card height, making the image visible beneath the card when the viewport has room. Short viewports retain the existing natural-scroll fallback; completion and teardown restore the image to its original position.

Webflow changes on the Treatments template use the existing pricing navigation controller via `data-tdb-price-section` on the price list wrapper. The price-list introduction now has the Instagram section's 7rem desktop / 8rem tablet and phone spacing. Existing FAQ component definitions share the Instagram accent-label classes and standard H2 class. The pricing-page introduction uses the same accent colour.

Runtime module: treatment guide scroll 1.1.0. Base staging release: `17729eddb457273ab1feb70bee4072fed1e18943`. Runtime changes are limited to the guide source, its two built distributions and readable copies, build manifest, and responsive guide tests. Native styling remains in Webflow.

Publish to `dentalbarns.webflow.io` only. Restore the prior immutable runtime pin and the recorded native styles/attributes to roll back. Native snapshots and browser evidence are in the task's `treatment-tweaks-20261111` directory.
