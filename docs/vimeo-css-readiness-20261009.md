# Vimeo CSS readiness — 9 October 2026

Loader v1.1.1 caches the successful CSS readiness promise, including the case
where the stylesheet was already available. The native homepage head explicitly
declares that its shared UI stylesheet includes Vimeo UI states:

```html
<link data-tdb-ui-css data-tdb-vimeo-ui
  rel="stylesheet" href="EXISTING_SHARED_UI_URL" media="print"
  onload="this.onload=null; this.media='all'; this.dataset.tdbVimeoUiReady='true';"
  onerror="this.dataset.tdbVimeoUiFailed='true';" />
```

Use the existing immutable shared-UI URL (verified to include the Vimeo CSS).
The flag is set only after the load event switches the stylesheet to `all`.
The loader waits for load/error when necessary and trusts readiness only while
that sheet is enabled and applies to all media. Its normal path never queries
computed styles. Failure, timeout or disabled CSS still uses the existing
standalone stylesheet. Failed fallback requests remain retryable.

Older heads retain one CSS-marker check per readiness attempt. Successful
attempts are cached, avoiding the previous repeated read after play-state DOM
mutations. Permission/proximity gates, queued playback and the controller are
unchanged. Keep this release based on `ba1f9cac77c094fcb0f725398d9b3e8556faa7c9`
so its relative controller remains Vimeo v1.2.0; the registry's branch contains
an older controller and must not be substituted.

Validation:

- Nine stylesheet browser scenarios: already loaded, delayed, failure before
  and after loader startup, timeout, disabled, legacy head, missing shared CSS,
  failed fallback and retry. Explicit readiness performs zero computed-style
  queries; successful fallback/legacy readiness is cached; queued play runs once.
- Existing absent/distant/reject/withdraw-in-flight/controller-retry scenarios.
- Existing mobile (390px) and desktop (1440px) playback checks: consent handoff,
  responsive hero, manual pause, content playback, ambient visibility and one SDK.

The tests stub the Vimeo SDK, not real streaming. No Lighthouse timing saving is
claimed. The previously reported 61 ms includes pending browser layout work.

Rollback: restore the prior Vimeo loader URL. The added stylesheet flags are
harmless to that loader; they may also be removed. Shared UI/CSS and controller
bytes are unchanged. Publish staging only.
