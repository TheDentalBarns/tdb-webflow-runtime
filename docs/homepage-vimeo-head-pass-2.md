# Homepage Vimeo head pass 2

## Goal

Remove Vimeo interaction-state CSS from the global Webflow head while preserving the exact first frame:

- hero placeholder visible
- hero play control visible
- hero pause control hidden
- loading indicator hidden
- content-video placeholder and play control visible
- iframe hidden until playback starts

## Add this stylesheet

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@ea40c95ab4ccd7a3d433c41183beecef042de817/src/styles/tdb-vimeo-ui.css"
>
```

## Replace the current complete Vimeo style block with this critical block

```html
<style>
  .vimeo-player[data-vimeo-update-size='cover'] {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    height: 100%;
    min-height: 100%;
    max-height: 100%;
  }

  .vimeo-controls-layer {
    position: absolute;
    inset: 0;
    z-index: 50;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .vimeo-controls-layer [data-vimeo-control] {
    pointer-events: auto;
  }

  .vimeo-controls-layer .vimeo-player__play,
  .vimeo-controls-layer .vimeo-player__pause {
    z-index: 60;
    transition: none !important;
    animation: none !important;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .vimeo-controls-layer .vimeo-player__loading {
    z-index: 70;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.45s ease, visibility 0s linear 0.45s;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .vimeo-controls-layer .vimeo-player__play .vimeo-player__btn,
  .vimeo-controls-layer .vimeo-player__pause .vimeo-player__btn,
  .vimeo-controls-layer .vimeo-player__play svg,
  .vimeo-controls-layer .vimeo-player__pause svg,
  .vimeo-controls-layer .vimeo-player__loading .vimeo-player__btn,
  .vimeo-controls-layer .vimeo-player__loading svg {
    transition: none !important;
    animation: none !important;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .video-overlay-layer,
  .vimeo-bg__placeholder,
  [data-vimeo-hero-content],
  [data-vimeo-hero-content] > * {
    pointer-events: none;
  }

  [data-vimeo-hero-content] a,
  [data-vimeo-hero-content] button,
  [data-vimeo-hero-content] [role='button'],
  [data-vimeo-hero-content] input,
  [data-vimeo-hero-content] select,
  [data-vimeo-hero-content] textarea {
    pointer-events: auto;
  }

  .vimeo-controls-layer .vimeo-player__play {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .vimeo-controls-layer .vimeo-player__pause {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .video-overlay-layer {
    opacity: 1 !important;
    visibility: visible !important;
    transition: none !important;
    animation: none !important;
  }

  .vimeo-bg,
  .vimeo-bg__placeholder,
  .vimeo-bg__iframe {
    background: transparent;
  }

  .vimeo-bg__placeholder {
    z-index: 2;
    opacity: 1;
    visibility: visible;
    display: block;
    pointer-events: none;
    transition: opacity 0.45s ease, visibility 0s linear 0.45s;
  }

  .vimeo-bg__iframe {
    z-index: 1;
    opacity: 1;
    visibility: visible;
    pointer-events: none;
    transition: none;
  }

  .vimeo-bg__iframe iframe {
    background: transparent;
  }

  [data-vimeo-player-init]:not([data-vimeo-ambient-init]):not([data-vimeo-content-init]) .vimeo-bg__iframe {
    position: relative;
  }

  .vimeo-player .vimeo-player__iframe {
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease;
  }

  .vimeo-player .vimeo-player__btn {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }

  .vimeo-player .vimeo-player__pause {
    display: flex;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .vimeo-player .vimeo-player__pause .vimeo-player__btn {
    opacity: 0;
  }

  .vimeo-player .vimeo-player__play {
    opacity: 1;
    pointer-events: auto;
    transition: none;
  }

  .vimeo-player .vimeo-player__loading {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.45s ease, visibility 0s linear 0.45s;
  }
</style>
```

## Staging checks

1. Disable cache and hard reload.
2. Confirm the hero placeholder and play icon appear immediately.
3. Confirm no pause or loading icon flashes before interaction.
4. Play, pause and resume the hero.
5. Test consent-denied and consent-accepted states.
6. Test a standard content Vimeo lower on the homepage.
7. Test buffering/loading UI on a throttled connection.
8. Confirm the external CSS appears in Network as `tdb-vimeo-ui.css`.

Do not publish to production until all checks pass.
