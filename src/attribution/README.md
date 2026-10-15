# Attribution

Maintained here from the deployed 1.5.2 source in TheDentalBarns/tdb-webflow-attribution at ed91771d20a0bffa5c79baa3be9b3203bdebac83.

The shared runtime loads this module after the existing consent handoff. Its own performance-consent policy governs storage. Hidden attribution inputs are populated at form submission, preserving the 61-field contract while avoiding eager insertion.

Edit attribution.js, run the root build and attribution-submit tests. Do not deploy a separate attribution-repository pin. Its old 1.5.1 minified output is retained only as a behavioral test fixture.
