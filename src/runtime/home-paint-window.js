/* Shared Home/Location carousel surfaces only need painting near the viewport.
 * Keep layout, images, Swiper state and all visible motion owned by their
 * existing controllers. This guard never unloads or remounts a carousel.
 */
function createHomePaintWindow() {
  'use strict';
  if (
    !document.querySelector('.tdb-service-parallax') ||
    typeof IntersectionObserver !== 'function'
  )
    return null;

  const mobile = matchMedia('(max-width: 991px)'),
    roots = [
      ...document.querySelectorAll(
        '.tdb-service-parallax,[data-tdb-treatment],[data-tdb-ig-placeholder]',
      ),
    ],
    states = new Map(roots.map((root) => [root, { timer: 0, frame: 0 }])),
    idle = 'data-tdb-home-paint-idle',
    resuming = 'data-tdb-home-paint-resuming';
  let observer = null,
    disposed = false;

  function cancel(state) {
    clearTimeout(state.timer);
    cancelAnimationFrame(state.frame);
    state.timer = state.frame = 0;
  }
  function restore(root, state) {
    cancel(state);
    if (!root.hasAttribute(idle) && !root.hasAttribute(resuming)) return;
    // Restore the authored blur before the section reaches view, without
    // introducing a new blur animation on every vertical re-entry.
    root.setAttribute(resuming, '');
    root.removeAttribute(idle);
    state.frame = requestAnimationFrame(() => {
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        root.removeAttribute(resuming);
      });
    });
  }
  function reset() {
    observer?.disconnect();
    observer = null;
    for (const [root, state] of states) {
      cancel(state);
      root.removeAttribute(idle);
      root.removeAttribute(resuming);
    }
  }
  function sync() {
    reset();
    if (disposed || !mobile.matches || !roots.length) return;
    const current = new IntersectionObserver(
      (entries) => {
        if (disposed || observer !== current) return;
        for (const entry of entries) {
          const root = entry.target,
            state = states.get(root);
          if (!state) continue;
          if (entry.isIntersecting) restore(root, state);
          else if (!root.hasAttribute(idle) && !state.timer) {
            // Avoid allocating/retiring surfaces repeatedly while a fling
            // briefly crosses the distant boundary and reverses direction.
            state.timer = setTimeout(() => {
              cancel(state);
              root.removeAttribute(resuming);
              root.setAttribute(idle, '');
            }, 180);
          }
        }
      },
      { rootMargin: '1500px 0px', threshold: 0 },
    );
    observer = current;
    roots.forEach((root) => observer.observe(root));
  }
  mobile.addEventListener('change', sync);
  window.addEventListener('pageshow', sync);
  sync();
  return {
    destroy() {
      disposed = true;
      reset();
      mobile.removeEventListener('change', sync);
      window.removeEventListener('pageshow', sync);
    },
  };
}
