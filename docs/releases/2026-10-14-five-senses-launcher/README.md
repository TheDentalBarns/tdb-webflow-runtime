# Five Senses launcher — staging

Built release: `b6a31f35dc24def4608372326b2a107b3ff72d62`.

## Behaviour

- The consent-released runtime installs the lightweight delegated launcher after either cookie decision.
- No Five Senses controller, scene module or scene stylesheet is requested by the launcher until activation. There is no hover, viewport or idle warm-up.
- Home links remain navigation to /five-senses-experience. Nervous Patients opens the overlay through its existing data attribute, retaining the page URL as fallback.
- Full controller moved out of Home, dedicated-page and Services-template footer tags. Its asset defaults now live beside the controller.
- The scene module and CSS remain pinned to c847ee9841b79a6749c39eb482d0c91c23f38ec0. Existing page CSS remains unchanged.

## Reliability

Safe asset JSON parsing; delegated keyboard activation; capture-phase click handling ahead of Webflow empty-hash interception; retryable controller loading; shared scroll-lock token; runtime teardown; graceful optional morph-decoration fallback; aborted partial scene mounts on retry.

## Verification

GitHub Actions run 38579293573: 63 tests passed, 0 failed. Covers first activation, native navigation/modifiers, dynamic triggers, retry, teardown, malformed assets, morph fallback, focus restoration and audio carry-over, alongside existing navbar/runtime/USP/page-break/Brevo checks.

Staging published 2026-10-14T14:19:09.856Z. All custom-domain publish timestamps remained 2026-10-01T10:10:45.669Z.

## Rollback

Restore the head block from site-before.json, and footer blocks from home-before.json, experience-before.json and services-before.json; then publish to Webflow subdomain only. The after snapshots preserve all other existing code.

Browser verification on staging: dedicated page had the new runtime but no Five Senses controller before activation; activation loaded the pinned controller and original scene CSS, completed morph handover, and held the shared scroll lock. Start enabled the sound scene. Close removed the dialog, released the lock, restored trigger focus, and retained the floating piano/birdsong control; mute toggled its accessible label to Unmute. Nervous Patients opened the ready overlay without changing its URL. Home retained both ordinary page links and no controller tag. No Five Senses warnings/errors were captured.
