/* Continue the same spinner rotation until its opacity transition finishes. */
(() => {
  'use strict';
  if (!document.querySelector('[data-tdb-hero-toggle]')) return;

  function loadingFade(event) {
    const art = event.target;
    if (
      event.propertyName !== 'opacity' ||
      event.pseudoElement !== '::after' ||
      !art.matches?.('.tdb-hero-toggle-art') ||
      !art.closest('[data-tdb-hero-toggle]')
    )
      return;

    if (event.type === 'transitionrun') {
      art.style.setProperty('--tdb-hero-spin', 'running');
    } else {
      // Loading-state CSS still runs the animation if the fade was reversed.
      art.style.removeProperty('--tdb-hero-spin');
    }
  }

  document.addEventListener('transitionrun', loadingFade);
  document.addEventListener('transitionend', loadingFade);
  document.addEventListener('transitioncancel', loadingFade);
})();
