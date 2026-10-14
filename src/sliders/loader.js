/* Existing 800px dependency loader; runtime owns release and scheduling. */
function prepareSliderLoader() {
  const selector = '.highlight-swiper_component, .parallax-swiper_component';
  const files = {parallax: 'tdb-parallax.js', gallery: 'tdb-gallery.js'};
  const flights = new Map(), ready = new Set(), observed = new WeakSet();
  let proximityObserver = null;
  const kindOf = root => root.matches('.parallax-swiper_component') ? 'parallax' : 'gallery';
  const pluginOf = kind => kind === 'parallax' ? window.TDBParallaxPlugin : window.TDBGallery;

  function loadKind(kind) {
    if (flights.has(kind)) return flights.get(kind);
    const flight = Promise.all([
      tdbEnsureUI(), tdbEnsureSliderUI(), tdbEnsureSliderFocus(),
      ...(kind === 'parallax' ? [
        window.TDBModules.load(new URL('tdb-rendered-progress.js', TDBRuntimeModuleRoot), {
          ready: () => Boolean(window.TDBRenderedProgress)
        })
      ] : []),
      window.TDBModules.load(new URL('tdb-motion.js', TDBFooterModuleRoot)),
      window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', TDBFooterModuleRoot), {
        attribute: 'data-swiper-js', ready: () => typeof window.Swiper === 'function' && typeof window.TDBSwiper?.create === 'function'
      }),
    ]).then(() => window.TDBModules.load(new URL(files[kind], TDBFooterModuleRoot), {
      attribute: 'data-tdb-' + kind + '-js', ready: () => Boolean(pluginOf(kind))
    })).then(() => {
      const plugin = pluginOf(kind);
      if (!plugin) throw Error('Carousel plugin did not initialise: ' + kind);
      ready.add(kind);
      return window.TDBRuntime.schedule(() => { plugin.refresh(); return plugin; });
    }).catch(error => {
      flights.delete(kind);
      console.error('TDB carousel plugin failed to load: ' + kind);
      throw error;
    });
    flights.set(kind, flight);
    return flight;
  }

  function loadSliders(root) {
    window.TDBParallax?.refresh(root || document);
    if (root instanceof Element) {
      const component = root.matches(selector) ? root : root.closest(selector);
      if (component) return loadKind(kindOf(component)).then(plugin => { plugin.refresh(component); return plugin; });
    }
    const kinds = new Set([...document.querySelectorAll(selector)].filter(node => !node.closest('.logo-slider')).map(kindOf));
    return Promise.all([...kinds].map(loadKind));
  }
  const loadSafely = root => { loadSliders(root).then(() => proximityObserver?.unobserve(root)).catch(() => {}); };
  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && !target.closest('.logo-slider')) {
      const root = target.closest(selector);
      if (root) loadSafely(root);
    }
  }
  // Hold an arrow action only after runtime is released, while its module arrives.
  const queuedArrows = new WeakSet();
  function onArrowIntent(event) {
    if (window.TDBParallaxPlugin || (event.type === 'keydown' && !['Enter',' '].includes(event.key))) return;
    if (event.button > 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const arrow = event.target.closest?.('.swiper-btn-prev,.swiper-btn-next');
    const root = arrow?.closest('.parallax-swiper_component');
    if (!root || arrow.matches(':disabled,[aria-disabled="true"],.swiper-button-disabled')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (queuedArrows.has(root)) return;
    queuedArrows.add(root); root.setAttribute('aria-busy','true');
    loadKind('parallax').then(plugin => {
      if (!root.isConnected || !arrow.isConnected) return;
      plugin.refresh(root); window.TDBSwiper.mount('parallax', root);
      root.removeAttribute('aria-busy'); arrow.click();
    }).catch(() => {}).finally(() => { queuedArrows.delete(root); root.removeAttribute('aria-busy'); });
  }
  document.addEventListener('click',onArrowIntent,true);
  document.addEventListener('keydown',onArrowIntent,true);
  function observeSlider(root) {
    if (!(root instanceof Element) || root.closest('.logo-slider') || observed.has(root)) return;
    observed.add(root);
    if (ready.has(kindOf(root))) pluginOf(kindOf(root)).refresh(root);
    else if (proximityObserver) proximityObserver.observe(root);
    else loadSafely(root);
  }
  function discover(root = document) {
    window.TDBParallax?.refresh(root);
    if (root instanceof Element && root.matches(selector)) observeSlider(root);
    root.querySelectorAll?.(selector).forEach(observeSlider);
  }
  if ('IntersectionObserver' in window) proximityObserver = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach(entry => loadSafely(entry.target));
  }, {rootMargin: '800px 0px'});
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  function start() {
    discover();
    new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => { if (node instanceof Element) discover(node); }));
      if (mutations.some(mutation => mutation.removedNodes.length)) window.TDBSwiper?.prune();
    }).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
  window.TDBSliderLoader = Object.freeze({version: '1.0.0', load: loadSliders,
    status: () => ({loaded: ready.size > 0, loading: flights.size > ready.size, plugins: [...ready], swiperAvailable: typeof window.Swiper === 'function'})});
  // Older embeds can keep their public calls; implementation lives in plugins.
  window.TDBSliders ||= Object.freeze({version: '1.0.0', refresh: () => loadSliders(), activate: root => window.TDBSwiper?.mount('parallax', root)});
  window.dispatchEvent(new Event('tdb:slider-loader-ready'));
}

function prepareCarouselStyles() {
  const seen = new WeakSet();
  let observer, changes, ready = false;
  function prepare() {
    if (ready) return;
    tdbEnsureSliderUI().then(() => {
      ready = true; observer?.disconnect(); changes?.disconnect();
      ['pointerover','focusin','pointerdown','keydown'].forEach(type => document.removeEventListener(type, intent, true));
    }).catch(() => {});
  }
  function intent(event) {
    if (event.target.closest?.('.carousel-arrow')) prepare();
  }
  function scan(root = document) {
    const arrows = [...(root.matches?.('.carousel-arrow') ? [root] : []), ...root.querySelectorAll('.carousel-arrow')];
    for (const arrow of arrows) {
      if (seen.has(arrow)) continue;
      seen.add(arrow);
      if (observer) observer.observe(arrow); else prepare();
    }
  }
  if ('IntersectionObserver' in window) observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) prepare();
  }, {rootMargin:'800px 0px'});
  ['pointerover','focusin','pointerdown','keydown'].forEach(type => document.addEventListener(type, intent, {capture:true, passive:true}));
  scan();
  changes = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node instanceof Element) scan(node);
    }
  });
  changes.observe(document.body, {childList:true, subtree:true});
}
