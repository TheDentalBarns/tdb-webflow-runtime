/* Hosted feature modules share the release pin; loading stays in the footer runtime. */
const TDB_MODULE_ROOT = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@61cec90cdba3d42a29d3c31194b692c251e8d421/dist/';
function tdbEnsureSliderRuntime() {
  return tdbEnsureUI().then(() => loadScriptWithRecovery(TDB_MODULE_ROOT + 'tdb-sliders.js', 'data-tdb-sliders-js'));
}

function prepareTooltipLoader() {
  function start() {
    const icons = [...document.querySelectorAll('.tooltip2_element-wrapper')];
    if (!icons.length) return;
    const parents = [...new Set(icons.map(icon => icon.parentElement))];
    let flight = null, loaded = false, observer;
    function cleanup() {
      observer?.disconnect();
      parents.forEach(parent => ['pointerover', 'focusin', 'pointerdown', 'keydown'].forEach(type => parent.removeEventListener(type, demand, true)));
    }
    function demand() {
      if (loaded || flight) return;
      flight = loadScriptWithRecovery(TDB_MODULE_ROOT + 'tdb-tooltips.js', 'data-tdb-tooltips-js')
        .then(() => {
          if (!window.TDBTooltips) throw new Error('Tooltip module did not initialise');
          window.TDBTooltips.refresh();
          loaded = true;
          cleanup();
        }).catch(() => {
          flight = null;
          console.error('TDB Tooltips failed to load');
        });
    }
    parents.forEach(parent => ['pointerover', 'focusin', 'pointerdown', 'keydown'].forEach(type => parent.addEventListener(type, demand, { capture: true, passive: true })));
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) demand();
      }, { rootMargin: '600px 0px' });
      parents.forEach(parent => observer.observe(parent));
    }
    // With no viewport observer, actual pointer/keyboard intent remains available.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

function prepareSliderFocusLoader() {
  function start() {
    const selector = '.highlight-swiper_component,.parallax-swiper_component,.swiper,.w-slider';
    const sliders = [...document.querySelectorAll(selector)].filter(slider => !slider.closest('.logo-slider'));
    if (!sliders.length || window.TDBSliderFocus) return;
    let flight = null, loaded = false, observer, seed = null;
    const types = ['pointerover', 'focusin', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'keydown'];
    const snapshot = event => ({ target: event.target, button: event.button, isPrimary: event.isPrimary,
      pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, key: event.key });
    function cleanup() {
      observer?.disconnect();
      types.forEach(type => document.removeEventListener(type, onIntent, true));
    }
    function demand() {
      if (loaded || flight) return;
      if (window.TDBSliderFocus) { loaded = true; cleanup(); seed = null; return; }
      flight = tdbEnsureSliderRuntime().then(() => {
        if (!window.TDBSliderFocus) throw new Error('Slider focus module did not initialise');
        loaded = true;
        cleanup();
        window.TDBSliderFocus.resume(seed);
        seed = null;
      }).catch(() => { flight = null; console.error('TDB Slider Focus failed to load'); });
    }
    function onIntent(event) {
      const target = event.target;
      const slider = target.closest?.('.logo-slider') ? null : target.closest?.(selector);
      if (event.type === 'pointerdown') {
        seed = slider ? { down: snapshot(event), y: window.scrollY } : null;
      } else if (event.type === 'pointermove') {
        if (seed?.down && !seed.end && seed.down.pointerId === event.pointerId) seed.move = snapshot(event);
        return;
      } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
        if (seed?.down?.pointerId === event.pointerId) seed.end = snapshot(event);
        return;
      } else if (slider && (event.type === 'click' || event.type === 'keydown')) {
        // Store focus intent only. Slide commands always run on the original event.
        if (event.type === 'click') {
          seed = seed || { y: window.scrollY };
          seed.click = snapshot(event);
        } else seed = { key: snapshot(event), y: window.scrollY };
      }
      if (slider) demand();
    }
    types.forEach(type => document.addEventListener(type, onIntent, { capture: true, passive: true }));
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) demand();
      }, { rootMargin: '100px 0px' });
      // Custom motion sliders already preload through the 800px motion loader.
      // This observer is only for native/standalone sliders needing focus alone.
      sliders.filter(slider => !slider.closest('.highlight-swiper_component,.parallax-swiper_component'))
        .forEach(slider => observer.observe(slider));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
