/* TDB shared quote carousel v4.1.0. Explicit owner startup; shared review engine. */
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
  if (window.TDBQuoteCarousel || !['dentalbarns.webflow.io', 'thedentalbarns.com', 'www.thedentalbarns.com', 'thedentalbarns.co.uk', 'www.thedentalbarns.co.uk'].includes(location.hostname)) return;
  const base = new URL('./', document.currentScript.src);
  const prepared = new WeakMap(), mounted = new Map();
  let dependencyFlight, proximity, generation = 0;
  const observed = new Set(), enhancing = new Map();
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
    // Preserve the authored viewport label for each variant.
  }

  function mount(root, { onActivate, intro = true } = {}) {
    if (mounted.has(root)) return mounted.get(root);
    const state = prepared.get(root) || prepare(root);
    if (!state?.cards.length) return;
    const { cards, track } = state;
    track.querySelectorAll('.is-static').forEach(node => node.classList.remove('is-static'));
    const motion = window.TDBMotion;
    const viewport = root.querySelector('[data-tdb-team-viewport]');
    const position = root.querySelector('[data-tdb-team-position]');
    const ticker = window.TDBNativeTicker.mount(root.querySelector('[data-tdb-team-current]'));
    const controller = new AbortController(), { signal } = controller;
    let swiper, dd, revealTimer = 0, entryControl;
    let entryPending = intro && cards.length > 1, opening = false, direction = 1, gesture = false;
    let destroyed = false, looping = false, activating = false;
    const copies = () => window.TDBSwiper.matchingSlides(swiper);
    const authorLines = () => copies().flatMap(card => [...card.querySelectorAll('[data-tdb-team-author-line]')]);
    root.dataset.tdbSliderFirstView = entryPending ? 'pending' : 'drawn';
    root.dataset.tdbTeamQuoteState = 'ready';
    root.classList.add('is-enhanced');
    const contents = () => [...track.querySelectorAll('[data-tdb-team-content]')];
    const clearReveal = () => { clearTimeout(revealTimer); revealTimer = 0; };
    function cancelEntry() {
      entryControl?.destroy();
      if (entryPending || opening) { entryPending = false; root.dataset.tdbSliderFirstView = 'manual'; }
      opening = false;
      contents().forEach(node => node.classList.remove('is-entry'));
    }
    function accessible() {
      window.TDBCarouselVisibility.bind(swiper, {activeOnly:true}).update();
    }
    function updateCount() {
      ticker.update(String(swiper.realIndex + 1).padStart(2, '0'), direction);
      position.setAttribute('aria-label', (swiper.realIndex + 1) + ' of ' + cards.length);
      accessible();
    }
    function settle(delay = motion.carousel.nextDelay) {
      clearReveal();
      const index = swiper.realIndex;
      revealTimer = setTimeout(() => {
        if (!destroyed && !swiper.animating && !gesture && swiper.realIndex === index)
          copies().forEach(card => card.querySelector('[data-tdb-team-content]').classList.add('is-visible'));
      }, delay);
    }
    function conceal() {
      clearReveal();
      contents().forEach(node => node.classList.remove('is-visible', 'is-entry'));
    }
    function start() {
      if (looping) return;
      conceal();
      dd?.enter(authorLines(), { atPosition: true });
      if (opening) copies().forEach(card => card.querySelector('[data-tdb-team-content]').classList.add('is-entry', 'is-visible'));
    }
    function finish(reason) {
      if (gesture || looping) return;
      accessible();
      if (opening) {
        opening = false;
        contents().forEach(node => node.classList.remove('is-entry'));
        root.dataset.tdbSliderFirstView = 'drawn';
      } else if (!entryPending) settle(reason === 'release' ? motion.carousel.settleDelay :
        direction < 0 ? motion.carousel.previousDelay : motion.carousel.nextDelay);
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
    swiper.on('beforeLoopFix', () => { looping = true; });
    swiper.on('loopFix', () => { looping = false; accessible(); });
    swiper.on('slideChangeTransitionStart', start);
    const stopSettled = window.TDBSwiper.onSettled(swiper, finish);
    swiper.on('touchStart', () => { gesture = true; cancelEntry(); clearReveal(); });
    swiper.on('sliderFirstMove', conceal);
    swiper.on('touchEnd', () => {
      gesture = false; direction = swiper.swipeDirection === 'prev' ? -1 : 1;
    });
    swiper.init();
    updateCount();
    // Designer keeps native owner quotes readable before JS. Preserve the active
    // quote during preparation, while removing visibility from offscreen copies.
    if (root.matches(selector)) {
      const active = new Set(copies());
      track.querySelectorAll('[data-tdb-team-slide]').forEach(card =>
        card.querySelector('[data-tdb-team-content]').classList.toggle('is-visible', active.has(card)));
    }
    window.TDBSwiper.watchDuration(root, viewport, swiper, '--tdb-team-duration', () => viewport.clientWidth);
    swiper.on('resize', () => {
      swiper.params.longSwipesRatio = Math.min(1, 40 / Math.max(1, viewport.clientWidth));
      if (!entryPending && !swiper.animating) settle(0);
    });
    // clientWidth rounds fractional fluid-rem layouts to whole CSS pixels. Keep
    // Swiper's geometry equal to the native viewport, including narrow phones.
    swiper.on('beforeResize', () => { swiper.params.width = viewport.getBoundingClientRect().width; });
    dd = motion.ddText(track.querySelectorAll('[data-tdb-team-author-line]'));
    dd.enter(authorLines(), { atPosition: true });
    if (!entryPending) settle(0);
    if (entryPending) {
      entryControl = window.TDBSwiper.firstView(root, {
        target: viewport, threshold: .2, frames: 0,
        ready: () => entryPending && !gesture && !swiper.animating && !destroyed,
        enter() {
          entryPending = false; opening = true; direction = 1;
          root.dataset.tdbSliderFirstView = 'moving'; swiper.slideNext();
        },
        cancel() { cancelEntry(); if (!destroyed && !gesture && !swiper.animating) settle(0); }
      });
    }
    function navigate(key) {
      if (cards.length < 2 || destroyed) return;
      cancelEntry(); opening = false;
      direction = key === 'ArrowLeft' ? -1 : 1;
      direction < 0 ? swiper.slidePrev() : swiper.slideNext();
    }
    viewport.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || cards.length < 2 ||
          event.altKey || event.ctrlKey || event.metaKey ||
          event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
      event.preventDefault(); navigate(event.key);
    }, { signal });
    // Optional action belongs to the consumer (review drawer, future quote drawer).
    // Swiper owns drag/click discrimination; only the physical active slide is actionable.
    async function activate(event) {
      if (!onActivate || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
      const trigger = event.target.closest?.('[data-tdb-quote-action]');
      if (!trigger || activating || !root.contains(trigger) || !swiper.allowClick || swiper.animating || gesture ||
          trigger.closest('[data-tdb-team-slide]') !== swiper.slides[swiper.activeIndex]) return;
      event.preventDefault();
      if (trigger.getAttribute('aria-busy') === 'true') return;
      cancelEntry();
      activating = true; trigger.setAttribute('aria-busy', 'true');
      try { await onActivate({ trigger, slide: swiper.slides[swiper.activeIndex], signal }); }
      catch (error) { if (!signal.aborted) root.dispatchEvent(new CustomEvent('tdb:quote-action-error', { bubbles: true, detail: { error } })); }
      finally { activating = false; trigger.removeAttribute('aria-busy'); }
    }
    root.addEventListener('click', activate, { signal });
    root.addEventListener('keydown', activate, { signal });
    const api = Object.freeze({
      swiper,
      navigate,
      on: (...args) => swiper.on(...args),
      get destroyed() { return destroyed; },
      destroy() {
        if (destroyed) return;
        destroyed = true; entryControl?.destroy(); controller.abort(); clearReveal();
        stopSettled(); dd.destroy(); ticker.destroy(); swiper.destroy(true, true);
        mounted.delete(root); root.classList.remove('is-enhanced'); showFallback(root); prepared.delete(root);
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
  function enhance(root, manual = false, keys = []) {
    const existing = mounted.get(root);
    if (existing) { keys.forEach(existing.navigate); return Promise.resolve(existing); }
    const pending = enhancing.get(root);
    if (pending) {
      pending.manual ||= manual;
      pending.keys.push(...keys);
      return pending.promise;
    }
    if (!root.isConnected || !prepare(root)) return Promise.resolve(null);
    proximity?.unobserve(root); observed.delete(root);
    const request = { manual, keys: [...keys], generation };
    request.promise = (async () => {
      try {
        await dependencies();
        if (generation !== request.generation || !root.isConnected) return null;
        const instance = window.TDBSwiper.mount('owner-quotes', root, { intro: !request.manual });
        request.keys.forEach(instance.navigate);
        return instance;
      } catch (error) {
        if (generation === request.generation && root.isConnected) {
          showFallback(root);
          root.dispatchEvent(new CustomEvent('tdb:team-quotes-error', { bubbles: true, detail: { error } }));
        }
        return null;
      } finally { if (enhancing.get(root) === request) enhancing.delete(root); }
    })();
    enhancing.set(root, request);
    return request.promise;
  }
  function init() {
    if (!window.TDBConsent?.allows()) return;
    document.querySelectorAll(selector).forEach(root => {
      const section = root.closest('.section_standard-testimonial');
      const state = prepare(root);
      if (!state) { if (section) section.hidden = true; return; }
      if (mounted.has(root) || observed.has(root) || enhancing.has(root)) return;
      if ('IntersectionObserver' in window) {
        proximity ||= new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            enhance(entry.target);
          }
        }, { rootMargin: '800px' });
        proximity.observe(root);
        observed.add(root);
      } else enhance(root);
    });
  }
  window.TDBQuoteCarousel = window.TDBTeamQuotes = Object.freeze({ version: '4.1.0', refresh: init, mount,
    activate: (root, keys = []) => root.matches(selector) ? enhance(root, true, keys) : Promise.resolve(null),
    isMounted: root => mounted.has(root),
    destroy() {
      generation++; proximity?.disconnect(); proximity = null;
      observed.clear(); enhancing.clear();
      [...mounted.values()].forEach(instance => instance.destroy());
    }
  });
  // Loading this engine for patient reviews does not opt owner quotes into work.
  // TDBConsent explicitly calls refresh() or activate() when their gate opens.
})();
