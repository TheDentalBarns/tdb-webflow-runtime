/* TDB owner/principal quotes v2.0.0. Native Webflow layout, CMS content, shared Swiper. */
(function () {
  'use strict';
  const routes = Object.freeze({
    home: '/', 'first-visit': '/first-visit', contact: '/contact', location: '/location',
    cosmetic: '/services/cosmetic-dentist', nervous: '/services/nervous-patient-care',
    'nervous-patient-care': '/services/nervous-patient-care',
    restorative: '/services/general-dentistry', hygiene: '/services/hygiene-care',
    'signature-assessment': '/services/signature-assessment', 'smile-design': '/services/smile-design',
    local: '/services/dentist-near-me', 'dentist-near-me': '/services/dentist-near-me',
    'facial-aesthetics': '/services/facial-aesthetics'
  });
  const path = value => String(value || '/').trim().toLowerCase().replace(/\/+$/, '') || '/';
  function assignedPage(record) {
    if (record.page?.trim()) return path(record.page);
    const tag = (record.tags || []).find(value => routes[value]);
    return tag ? routes[tag] : null;
  }
  function chooseTeamQuotes(records, pathname) {
    const seen = new Set();
    // Preserve the established global duplicate policy, explicit page precedence,
    // exclusive tag fallback, rank order and maximum of three visible quotations.
    return records.filter(record => record.active !== false && record.text && record.author)
      .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999) || a.id.localeCompare(b.id))
      .filter(record => {
        const key = record.text.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key); return true;
      })
      .filter(record => assignedPage(record) === path(pathname)).slice(0, 3);
  }
  function readFeed(feed) {
    const records = [];
    feed?.querySelectorAll('.w-dyn-item').forEach(item => {
      const author = item.querySelector('[data-tdb-team-author]')?.textContent.trim();
      const role = item.querySelector('[data-tdb-team-role]')?.textContent.trim() || '';
      const content = item.querySelector('[data-tdb-team-quote-content]');
      if (!author || !content || author.includes('{{wf')) return;
      let record;
      content.querySelectorAll('h3,blockquote,p').forEach(node => {
        if (node.tagName === 'P' && node.closest('blockquote')) return;
        const text = node.textContent.trim();
        if (node.tagName === 'H3') {
          record = { id: author + ':' + text, label: text, author, role, text: '', tags: [], page: '', rank: 999, active: true };
          records.push(record);
        } else if (record && node.tagName === 'BLOCKQUOTE') record.text = text;
        else if (record && node.tagName === 'P') {
          const match = text.match(/^(Tags|Page|Rank|Active):\s*(.*)$/i);
          if (!match) return;
          const key = match[1].toLowerCase(), value = match[2].trim();
          if (key === 'tags') record.tags = value.toLowerCase().split(',').map(tag => tag.trim()).filter(Boolean);
          if (key === 'page') record.page = value;
          if (key === 'rank') record.rank = Number(value) || 999;
          if (key === 'active') record.active = !/^(no|false|off|0)$/i.test(value);
        }
      });
    });
    return records;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { chooseTeamQuotes, assignedPage, readFeed, routes }; return;
  }
  if (window.TDBTeamQuotes || !['dentalbarns.webflow.io', 'thedentalbarns.com', 'www.thedentalbarns.com', 'thedentalbarns.co.uk', 'www.thedentalbarns.co.uk'].includes(location.hostname)) return;
  const base = new URL('./', document.currentScript.src);
  const prepared = new WeakMap(), mounted = new Map();
  let dependencyFlight, proximity;
  const discovered = new WeakSet();
  const selector = '[data-tdb-team-quotes]';

  function prepare(root, records) {
    if (prepared.has(root)) return prepared.get(root);
    const track = root.querySelector('[data-tdb-team-track]');
    const template = track?.querySelector('[data-tdb-team-slide]');
    if (!template) throw Error('Native owner quote template unavailable');
    const cards = records.map((record, index) => {
      const card = template.cloneNode(true);
      card.dataset.quoteId = record.id;
      card.setAttribute('aria-label', (index + 1) + ' of ' + records.length);
      card.querySelector('[data-tdb-team-text]').textContent = record.text;
      card.querySelector('[data-tdb-team-author-line]').textContent = record.author + (record.role ? ', ' + record.role : '');
      card.querySelector('[data-tdb-team-content]').classList.remove('is-visible', 'is-entry');
      card.inert = index !== 0;
      card.setAttribute('aria-hidden', String(index !== 0));
      return card;
    });
    track.replaceChildren(...cards);
    root.dataset.quoteCount = records.length;
    root.querySelector('[data-tdb-team-current]').textContent = '01';
    root.querySelector('[data-tdb-team-total]').textContent = String(records.length).padStart(2, '0');
    const count = root.querySelector('[data-tdb-team-position]');
    count.classList.toggle('is-hidden', records.length < 2);
    count.setAttribute('aria-label', '1 of ' + records.length);
    root.hidden = false;
    const state = { records, track, cards };
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
    root.querySelector('[data-tdb-team-position]').setAttribute('aria-label', '1 of ' + state.records.length);
    // Native fallback byline state is visible even if shared motion could not load.
    state.cards[0]?.querySelector('[data-tdb-team-author-line]')?.classList.add('is-static');
    root.dataset.tdbTeamQuoteState = 'fallback';
    root.querySelector('[data-tdb-team-viewport]').setAttribute('aria-label', 'From our team');
  }

  function mount(root) {
    if (mounted.has(root)) return mounted.get(root);
    const state = prepared.get(root);
    if (!state?.records.length) return;
    const { records, track } = state;
    track.querySelectorAll('.is-static').forEach(node => node.classList.remove('is-static'));
    const motion = window.TDBMotion;
    const viewport = root.querySelector('[data-tdb-team-viewport]');
    const position = root.querySelector('[data-tdb-team-position]');
    const ticker = window.TDBNativeTicker.mount(root.querySelector('[data-tdb-team-current]'));
    const controller = new AbortController(), { signal } = controller;
    let swiper, revealTimer = 0, entryTimer = 0, entryObserver;
    let entryPending = records.length > 1, opening = false, direction = 1, gesture = false;
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
      position.setAttribute('aria-label', (swiper.realIndex + 1) + ' of ' + records.length);
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
      slidesPerView: 1, spaceBetween: 0, loop: records.length > 1, loopAdditionalSlides: 1,
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
    const dd = motion.ddText(track.querySelectorAll('[data-tdb-team-author-line]'));
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
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || records.length < 2) return;
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
    const feed = document.querySelector('[data-tdb-team-quote-feed]');
    const records = chooseTeamQuotes(readFeed(feed), location.pathname);
    document.querySelectorAll(selector).forEach(root => {
      const section = root.closest('.section_standard-testimonial');
      if (!records.length) { if (section) section.hidden = true; return; }
      prepare(root, records);
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
  window.TDBTeamQuotes = Object.freeze({ version: '2.0.0', refresh: init, mount, readFeed, chooseTeamQuotes,
    destroy() { proximity?.disconnect(); [...mounted.values()].forEach(instance => instance.destroy()); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
