/* TDB native home awards v1.0.0.
 * Designer owns markup, responsive layout, artwork, open/closed states and CSS
 * transitions. Shared DD motion owns recognition-copy fades. This controller
 * only changes state and accessibility; it never moves or generates content.
 */
(() => {
  'use strict';
  function init() {
    document.querySelectorAll('[data-tdb-awards-native]').forEach(root => {
      if (root.dataset.tdbAwardsReady) return;
      root.dataset.tdbAwardsReady = '1.0.0';
      root.querySelectorAll('.tdb-home-awards-question').forEach(question => {
        const item = question.parentElement;
        const answer = item.querySelector('.tdb-home-awards-answer');
        const icon = question.querySelector('.tdb-home-awards-icon');
        const spacer = item.querySelector('.tdb-home-awards-spacer');
        if (!answer) return;
        function set(open) {
          answer.classList.toggle('is-open', open);
          icon?.classList.toggle('is-open', open);
          spacer?.classList.toggle('is-open', open);
          question.setAttribute('aria-expanded', String(open));
          answer.setAttribute('aria-hidden', String(!open));
          answer.inert = !open;
        }
        function toggle(event) {
          event.preventDefault();
          set(question.getAttribute('aria-expanded') !== 'true');
        }
        // Reconcile accessibility to the native first frame without changing it.
        set(answer.classList.contains('is-open'));
        question.addEventListener('click', toggle);
        question.addEventListener('keydown', event => {
          if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) toggle(event);
        });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
