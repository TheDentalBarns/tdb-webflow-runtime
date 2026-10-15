/* Optional smooth scrolling and its anchor compatibility live together. */
function initLenis() {
  if (document.documentElement.classList.contains('w-editor')) return;
  if (!window.Lenis || window.lenis) return;
  window.lenis = new Lenis({ autoRaf: true, smoothWheel: true, syncTouch: false });
}

function triggerAfterLoadIdle(callback) {
  function run() {
    if ('requestIdleCallback' in window)
      requestIdleCallback(() => requestAnimationFrame(callback), { timeout: 2000 });
    else setTimeout(() => requestAnimationFrame(callback), 300);
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
const LENIS_WARM_SESSION_KEY = 'tdb-lenis-warm';
function isLenisWarmSession() {
  try {
    return sessionStorage.getItem(LENIS_WARM_SESSION_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function markLenisWarmSession() {
  try {
    sessionStorage.setItem(LENIS_WARM_SESSION_KEY, '1');
  } catch (error) {}
}

function loadLenisAssets() {
  if (!matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)').matches) return;
  loadScript(new URL('tdb-lenis.min.js', TDBRuntimeModuleRoot).href, 'data-lenis-js')
    .then(initLenis)
    .catch(() => console.error('TDB Lenis failed to load'));
}

function startLenisForSession() {
  if (isLenisWarmSession()) {
    loadLenisAssets();
    return;
  }
  triggerAfterLoadIdle(() => {
    markLenisWarmSession();
    loadLenisAssets();
  });
}
function prepareSmoothScroll() {
  /* Let Webflow's native home section link settle during Lenis wheel inertia. */
  (() => {
    'use strict';
    document.addEventListener(
      'click',
      (event) => {
        if (
          event.defaultPrevented ||
          event.button > 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const link = event.target.closest?.('a[href="#All-treatments"]');
        if (!link || !document.getElementById('All-treatments')) return;
        // Lenis ignores native scroll events while its smooth animation is active.
        // Stop that old wheel trajectory before Webflow performs its anchor scroll.
        // Webflow continues to own the destination, focus, history and link behavior.
        if (window.lenis?.isScrolling === 'smooth') window.lenis.reset();
      },
      true,
    );
  })();

  startLenisForSession();
}
