/* TDB owner/principal quotes v3.0.2. Native CMS slides and layout; shared Swiper, motion and ticker. */
(function () {
  'use strict';
  // Webflow selects, sorts and renders the actual slides. Do not clone or
  // rewrite quote content: all CMS cards must participate in native sizing.
  function readNativeSlides(root) {
    const track = root.querySelector('[data-tdb-team-track]');
    return track ? [...track.children].filter(card => card.matches('[data-tdb-team-slide]')) : [];
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { readNativeSlides }; return;
  }
  if (window.TDBTeamQuotes || !['dentalbarns.webflow.io', 'thedentalbarns.com', 'www.thedentalbarns.com', 'thedentalbarns.co.uk', 'www.thedentalbarns.co.uk'].includes(location.hostname)) return;
  const base = new URL('./', document.currentScript.src);
  const prepared = new WeakMap(), mounted = new Map();
  let dependencyFlight, proximity;
  const discovered = new WeakSet();
  const selector = '[data-tdb-team-quotes][data-tdb-team-cms]';

  function prepare(root) {
    if (prepared.has(root)) return prepared.get(root);
    const track = root.querySelector('[data-tdb-team-track]');
    const cards = readNativeSlides(root);
    if (!cards.length) return null;
    cards.forEach((card, index) => {
      card.setAttribute('aria-label', (index + 1) + ' of ' + cards.length);
      card.inert = index !== 0;
      card.setAttribute('aria-hidden', String(index !== 0));
    });
    root.dataset.quoteCount = cards.length;
    root.querySelector('[data-tdb-team-current]').textContent = '01';
    root.querySelector('[data-tdb-team-total]').textContent = String(cards.length).padStart(2, '0');
    const count = root.querySelector('[data-tdb-team-position]');
    count.classList.toggle('is-hidden', cards.length < 2);
    count.setAttribute('aria-label', '1 of ' + cards.length);
    const state = { track, cards };
    prepared.set(root, state);
    return state;
  }

  function showFallback(root) {
    const state = prepared.get(root);
    if (!state) return;
    state.cards.forEach((card, index) => {
      card.inert = index !== 0;
      card.setAttribute('aria-hidden', String(index !== 0));
      card.querySelector('[data-tdb-team-content]').classList.toggle('is-visible', index === 0);
    });
    root.querySelector('[data-tdb-team-current]').textContent = '01';
    root.querySelector('[data-tdb-team-position]').setAttribute('aria-label', '1 of ' + state.cards.length);
    // Native fallback byline state is visible even if shared motion could not load.
    state.cards[0]?.querySelector('[data-tdb-team-author-line]')?.classList.add('is-static');
    root.dataset.tdbTeamQuoteState = 'fallback';
    root.querySelector('[data-tdb-team-viewport]').setAttribute('aria-label', 'From our team');
  }

  function mount(root) {
    if (mounted.has(root)) return mounted.get(root);
    const state = prepared.get(root);
    if (!state?.cards.length) return;
    const { cards, track } = state;
    track.querySelectorAll('.is-static').forEach(node => node.classList.remove('is-static'));
    const motion = window.TDBMotion;
    const viewport = root.querySelector('[data-tdb-team-viewport]');
    const position = root.querySelector('[data-tdb-team-position]');
    const ticker = window.TDBNativeTicker.mount(root.querySelector('[data-tdb-team-current]'));
    const controller = new AbortController(), { signal } = controller;
    let swiper, dd, revealTimer = 0, entryTimer = 0, entryObserver;
    let entryPending = cards.length > 1, opening = false, direction = 1, gesture = false;
    let destroyed = false;
    root.dataset.tdbSliderFirstView = entryPending ? 'pending' : 'drawn';
    root.dataset.tdbTeamQuoteState = 'ready';
    const contents = () => [...track.querySelectorAll('[data-tdb-team-content]')];
    const clearReveal = () => { clearTimeout(revealTimer); revealTimer = 0; };
    function cancelEntry() {
      clearTimeout(entryTimer); entryTimer = 0; entryObserver?.disconnect();
      if (entryPending) { entryPending = false; root.dataset.tdbSliderFirstView = 'manual'; }
    }
    function accessible() {
      swiper.slides.forEach((card, index) => {
        card.inert = index !== swiper.activeIndex;
        card.setAttribute('aria-hidden', String(index !== swiper.activeIndex));
      });
    }
    function updateCount() {
      ticker.update(String(swiper.realIndex + 1).padStart(2, '0'), direction);
      position.setAttribute('aria-label', (swiper.realIndex + 1) + ' of ' + cards.length);
      accessible();
    }
    function settle(delay = motion.carousel.nextDelay) {
      clearReveal();
      const index = swiper.activeIndex;
      revealTimer = setTimeout(() => {
        if (!destroyed && !swiper.animating && !gesture && swiper.activeIndex === index)
          swiper.slides[index].querySelector('[data-tdb-team-content]').classList.add('is-visible');
      }, delay);
    }
    function conceal() {
      clearReveal();
      contents().forEach(node => node.classList.remove('is-visible', 'is-entry'));
    }
    function start() {
      conceal();
      dd?.enter(swiper.slides[swiper.activeIndex].querySelectorAll('[data-tdb-team-author-line]'), { atPosition: true });
      if (opening) swiper.slides[swiper.activeIndex].querySelector('[data-tdb-team-content]').classList.add('is-entry', 'is-visible');
    }
    function finish() {
      accessible();
      if (opening) {
        opening = false;
        contents().forEach(node => node.classList.remove('is-entry'));
        root.dataset.tdbSliderFirstView = 'drawn';
      } else if (!entryPending) settle(direction < 0 ? motion.carousel.previousDelay : motion.carousel.nextDelay);
    }
    swiper = window.TDBSwiper.create(viewport, {
      init: false, direction: 'horizontal', wrapperClass: 'tdb-team-quotes_track', slideClass: 'tdb-team-quotes_slide',
      slidesPerView: 1, spaceBetween: 0, loop: cards.length > 1, loopAdditionalSlides: 1,
      width: viewport.getBoundingClientRect().width,
      loopPreventsSlide: false, preventInteractionOnTransition: false, observer: false,
      speed: motion.duration(viewport.clientWidth), threshold: 12, longSwipesMs: 0,
      longSwipesRatio: Math.min(1, 40 / Math.max(1, viewport.clientWidth)),
      keyboard: { enabled: false }, a11y: { enabled: false }, autoplay: false,
    });
    // Callbacks are attached after assignment so synchronous init cannot read an
    // unassigned instance. All movement is performed by the common engine.
    swiper.on('slideChange', updateCount);
    swiper.on('slideChangeTransitionStart', start);
    swiper.on('slideChangeTransitionEnd', finish);
    swiper.on('touchStart', () => { gesture = true; cancelEntry(); clearReveal(); });
    swiper.on('sliderFirstMove', conceal);
    swiper.on('touchEnd', () => {
      gesture = false; direction = swiper.swipeDirection === 'prev' ? -1 : 1;
      queueMicrotask(() => { if (!destroyed && !swiper.animating) settle(motion.carousel.settleDelay); });
    });
    swiper.init();
    updateCount();
    window.TDBSwiper.watchDuration(root, viewport, swiper, '--tdb-team-duration', () => viewport.clientWidth);
    swiper.on('resize', () => {
      swiper.params.longSwipesRatio = Math.min(1, 40 / Math.max(1, viewport.clientWidth));
      if (!entryPending && !swiper.animating) settle(0);
    });
    // clientWidth rounds fractional fluid-rem layouts to whole CSS pixels. Keep
    // Swiper's geometry equal to the native viewport, including narrow phones.
    swiper.on('beforeResize', () => { swiper.params.width = viewport.getBoundingClientRect().width; });
    dd = motion.ddText(track.querySelectorAll('[data-tdb-team-author-line]'));
    dd.enter(swiper.slides[swiper.activeIndex].querySelectorAll('[data-tdb-team-author-line]'), { atPosition: true });
    if (!entryPending) settle(0);
    if (entryPending) {
      entryObserver = new IntersectionObserver(entries => {
        clearTimeout(entryTimer);
        if (!entryPending || !entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .2)) return;
        entryTimer = setTimeout(() => {
          if (!entryPending || gesture || swiper.animating || destroyed) return;
          entryPending = false; opening = true; direction = 1; entryObserver.disconnect();
          root.dataset.tdbSliderFirstView = 'moving'; swiper.slideNext();
        }, motion.carousel.entryStart);
      }, { threshold: .2 });
      entryObserver.observe(viewport);
    }
    viewport.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || cards.length < 2) return;
      event.preventDefault(); cancelEntry(); opening = false;
      direction = event.key === 'ArrowLeft' ? -1 : 1;
      direction < 0 ? swiper.slidePrev() : swiper.slideNext();
    }, { signal });
    const api = Object.freeze({
      swiper,
      on: (...args) => swiper.on(...args),
      get destroyed() { return destroyed; },
      destroy() {
        if (destroyed) return;
        destroyed = true; controller.abort(); clearReveal(); clearTimeout(entryTimer); entryObserver?.disconnect();
        dd.destroy(); ticker.destroy(); swiper.destroy(true, true);
        mounted.delete(root); showFallback(root);
      },
    });
    mounted.set(root, api);
    return api;
  }
  function dependencies() {
    if (dependencyFlight) return dependencyFlight;
    const flight = (async () => {
      if (!window.TDBModules) throw Error('Shared dependency registry unavailable');
      await window.TDBModules.load(new URL('tdb-motion.js', base), { ready: () => !!window.TDBMotion });
      await Promise.all([
        window.TDBModules.load(new URL('tdb-ticker.js', base), { ready: () => !!window.TDBNativeTicker }),
        window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', base), { attribute: 'data-swiper-js', ready: () => typeof window.TDBSwiper?.create === 'function' }),
      ]);
      window.TDBSwiper.register('owner-quotes', { mount });
    })();
    dependencyFlight = flight;
    flight.catch(() => { if (dependencyFlight === flight) dependencyFlight = null; });
    return flight;
  }
  async function enhance(root) {
    if (mounted.has(root)) return;
    try {
      await dependencies();
      if (root.isConnected) window.TDBSwiper.mount('owner-quotes', root);
    } catch (error) {
      showFallback(root);
      root.dispatchEvent(new CustomEvent('tdb:team-quotes-error', { bubbles: true, detail: { error } }));
    }
  }
  function init() {
    document.querySelectorAll(selector).forEach(root => {
      const section = root.closest('.section_standard-testimonial');
      const state = prepare(root);
      if (!state) { if (section) section.hidden = true; return; }
      if (discovered.has(root)) { if (!mounted.has(root)) enhance(root); return; }
      discovered.add(root);
      if ('IntersectionObserver' in window) {
        proximity ||= new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            proximity.unobserve(entry.target); enhance(entry.target);
          }
        }, { rootMargin: '800px' });
        proximity.observe(root);
      } else enhance(root);
      root.addEventListener('focusin', () => enhance(root));
    });
  }
  window.TDBTeamQuotes = Object.freeze({ version: '3.0.2', refresh: init, mount,
    destroy() { proximity?.disconnect(); [...mounted.values()].forEach(instance => instance.destroy()); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
