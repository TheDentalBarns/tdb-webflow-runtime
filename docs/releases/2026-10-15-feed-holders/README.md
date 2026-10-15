# Feed holders and review cards

The Home review carousel is rendered from the shared batched JSON API near the viewport. Its fixed external template contains one empty card seed; the initial HTML contains only a colour-matched holder. The native slide entrance, context ordering and shared drawer remain intact. One Read more action belongs to the focus frame; movement hides/disables it until the new review settles.

Instagram, Smiles and Reviews use the TDB rotation timing around a stationary 2.75rem icon. The icons and 1px spinner arcs use the native orange-3 cream token (#d6cab4), matching the line weight of the carousel control outlines. Masks reuse the original three SVG asset URLs. The spinner runs only during work, stops on success/failure/revocation, and respects reduced motion. Holding geometry lives in the early asynchronous tdb-ui.css; full card styles load at proximity. The holder remains beneath the shared 300ms reveal fade.

The head fragment adds exact jsDelivr and jQuery CloudFront preconnects, retaining their respective request modes. It removes the redundant 1920px font-size breakpoint and duplicate theme-colour variants; font smoothing inherits from html. The existing Webflow viewport meta is updated to preserve viewport-fit=cover without adding another viewport. Font fallbacks and essential layout/entry rules stay early. The asynchronous global stylesheet remains non-blocking; no fixed TBT or handshake saving is claimed.

## Validation

- 379 passing tests, 3 intentional skips; fresh 12-second deadlines per JSON request and retryable network timeout errors.
- Full runtime test suite, including delayed artwork, failure/retry, consent revocation and duplicate-mount tests.
- Desktop/mobile browser checks use a fixture with the migrated Designer CSS removed; verify one Read more action opens the focused review.
- Slow-feed fixture verifies stationary holders and rings before reveal.
- Production domains are not published. Webflow draft rollback page: 6ad0df61ec1886443e782ccc.

The preceding review batches release is 61049c30efb48194c31f3713ac1325a88bed0703. Cloud API deployment remains a5a9fe9f-4dce-4d21-9d8f-4e1d5f1b9a21.
