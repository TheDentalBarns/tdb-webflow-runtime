/* Keep the shared quotation artwork in the native reading flow between slides. */
(() => {
  'use strict';
  window.TDBReviewQuoteMark = Object.freeze({
    mount(mark, overlay) {
      const originalParent = mark.parentNode;
      const originalTranslate = mark.style.translate;
      const originalReading = mark.classList.contains('is-reading');
      const originalStationary = mark.classList.contains('is-stationary');
      function park(offset = 0) {
        if (mark.parentNode !== overlay) overlay.append(mark);
        mark.classList.remove('is-reading');
        mark.classList.add('is-stationary');
        mark.style.translate = offset ? `0px ${-offset}px` : originalTranslate;
      }
      return {
        park,
        attach(slide) {
          const slot = slide?.querySelector('.tdb-review-drawer_mark-space');
          if (!slot) return;
          if (mark.parentNode !== slot) slot.append(mark);
          mark.classList.remove('is-stationary');
          mark.classList.add('is-reading');
          mark.style.translate = originalTranslate;
        },
        destroy() {
          originalParent.append(mark);
          mark.classList.toggle('is-reading', originalReading);
          mark.classList.toggle('is-stationary', originalStationary);
          mark.style.translate = originalTranslate;
        },
      };
    },
  });
})();
