/* TDB shared carousel arrow feedback v1.0.1.
 * Inline once in the site footer. Native controls own their styling and
 * carousel modules retain navigation. Match Services' last-clicked state.
 */
(() => {
  'use strict';
  if (window.TDBCarouselArrowFeedback) return;
  window.TDBCarouselArrowFeedback = Object.freeze({version: '1.0.1'});
  function select(event) {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    const arrow = event.target.closest?.('.carousel-arrow');
    if (!arrow || event.button > 0 || arrow.closest('[inert]') ||
        arrow.matches(':disabled,[aria-disabled="true"],.is-disabled,.swiper-button-disabled,.swiper-button-lock')) return;
    // Every native/legacy pair shares one immediate controls wrapper.
    // Stay inside it: selection in one carousel must not clear another's.
    for (const sibling of arrow.parentElement.children) {
      if (sibling.matches('.carousel-arrow')) sibling.classList.toggle('is-selected', sibling === arrow);
    }
  }
  document.addEventListener('click', select, true);
  // Swiper's div-based buttons handle Enter/Space without dispatching click.
  // Change presentation only; their existing handler still advances the slide.
  document.addEventListener('keydown', select, true);
})();
