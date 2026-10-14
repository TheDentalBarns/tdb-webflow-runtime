/* TDB shared carousel arrow feedback v1.1.0.
 * Installed once by the consent-released runtime. Native controls own styling and
 * carousel modules retain navigation. Match Services' last-clicked state.
 */
function prepareCarouselArrowFeedback() {
  'use strict';
  if (window.TDBCarouselArrowFeedback) return;
  function selectArrow(arrow) {
    if (!arrow || arrow.closest('[inert]') ||
        arrow.matches(':disabled,[aria-disabled="true"],.is-disabled,.swiper-button-disabled,.swiper-button-lock')) return;
    // Every native/legacy pair shares one immediate controls wrapper.
    // Stay inside it: selection in one carousel must not clear another's.
    for (const sibling of arrow.parentElement?.children || []) {
      if (sibling.matches('.carousel-arrow')) sibling.classList.toggle('is-selected', sibling === arrow);
    }
  }
  function clearPair(arrow) {
    for (const sibling of arrow?.parentElement?.children || []) {
      if (sibling.matches('.carousel-arrow')) sibling.classList.remove('is-selected');
    }
  }
  window.TDBCarouselArrowFeedback = Object.freeze({version: '1.1.0', select: selectArrow, clear: clearPair});
  function select(event) {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (event.button > 0) return;
    selectArrow(event.target.closest?.('.carousel-arrow'));
  }
  document.addEventListener('click', select, true);
  // Swiper's div-based buttons handle Enter/Space without dispatching click.
  // Change presentation only; their existing handler still advances the slide.
  document.addEventListener('keydown', select, true);
}
