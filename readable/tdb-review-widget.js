/* Deferred review button. Visibility belongs only to the review-section boundary. */
(() => {
  'use strict';
  if (window.TDBReviewWidget) return;
  let instance;
  function mount() {
    if (instance) return instance;
    // Older pages have the review hero but no native drawer mount point yet.
    // This empty host lets the existing review loader fetch its drawer on intent.
    let host;
    if (!document.querySelector('[data-tdb-reviews],[data-tdb-review-lazy]')) {
      host = document.createElement('div');
      host.setAttribute('data-tdb-review-lazy', '');
      document.body.append(host);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tdb-review-widget';
    button.setAttribute('data-tdb-review-trigger', '');
    button.setAttribute('aria-label', 'Read our patient reviews');
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML =
      '<span class="tdb-review-widget_copy" aria-hidden="true">' +
      '<span class="tdb-review-widget_stars">' +
      '<span></span>'.repeat(5) +
      '</span>' +
      '<span class="tdb-review-widget_label">Google reviews</span></span>' +
      '<img class="tdb-review-widget_google" alt="" width="32" height="32" ' +
      'src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac7b972653444187f404ca8_tdb-review-google.svg">';
    button.inert = true;
    button.setAttribute('aria-hidden', 'true');
    document.body.append(button);
    // Establish the offscreen pose before the first reveal, including restored scroll.
    button.getBoundingClientRect();
    let visible = false;
    instance = Object.freeze({
      setVisible(next) {
        if (visible === next) return;
        visible = next;
        button.inert = !next;
        button.setAttribute('aria-hidden', String(!next));
        button.classList.toggle('is-visible', next);
      },
      destroy() {
        button.remove();
        if (host && !host.childElementCount) host.remove();
        instance = null;
      },
    });
    return instance;
  }
  window.TDBReviewWidget = Object.freeze({ mount });
})();
