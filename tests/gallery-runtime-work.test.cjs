const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const source = (file) => {
  const before =
    process.env.TDB_GALLERY_BEFORE &&
    path.join(process.env.TDB_GALLERY_BEFORE, path.basename(file));
  return before && fs.existsSync(before) ? fs.readFileSync(before, 'utf8') : read(file);
};

test('ordinary gallery interruptions skip per-card parallax measurements and keep track/loop continuity', () => {
  let reads = 0;
  const window = {},
    events = {},
    moves = [];
  const code = source('src/sliders/swiper-behaviour.js').replace(
    '/* TDB_SWIPER_PLUGINS */',
    ['swiper-entry', 'swiper-gap', 'swiper-duration', 'swiper-plugins']
      .map((n) => read('src/sliders/' + n + '.js'))
      .join('\n'),
  );
  vm.runInNewContext(code, {
    window,
    getComputedStyle: (n) => ({ transform: n.pose }),
    queueMicrotask,
  });
  const swiper = {
    params: { speed: 700, loop: true, slidesPerGroup: 1 },
    activeIndex: 1,
    animating: true,
    enabled: true,
    slides: Array.from({ length: 34 }, (_, i) => ({
      getAttribute: () => String(i),
      querySelectorAll: () => [],
      getBoundingClientRect() {
        reads++;
        return { left: i * 300 };
      },
    })),
    wrapperEl: { pose: 'matrix(1,0,0,1,-125,0)', style: {}, offsetWidth: 600 },
    isHorizontal: () => true,
    on: (name, fn) => (events[name] = fn),
    slideTo(...args) {
      moves.push(args);
      return true;
    },
    loopFix() {
      this.activeIndex = 2;
    },
    slidePrev() {},
    getTranslate: () => -125,
    setTranslate(value) {
      this.corrected = value;
    },
  };
  window.TDBSwiper.bindSwiper(swiper);
  for (let n = 0; n < 120; n++) swiper.slideTo(2, 700, true);
  console.log('ordinary interrupted gallery card rectangles:', reads);
  assert.equal(reads, 0);
  assert.equal(swiper.wrapperEl.style.transform, 'matrix(1,0,0,1,-125,0)');
  assert.equal(moves.length, 120);
  assert.deepEqual(moves[0].slice(0, 3), [2, 700, true]);
  swiper.loopFix();
  assert.equal(reads, 2, 'loop correction still measures the two anchor positions');
  assert.equal(swiper.corrected, -425);
  events.beforeDestroy();
});

test('shared visibility avoids repeated attribute checks during travel within the same exposed cards', () => {
  const dom = new JSDOM(
    '<main>' +
      Array.from(
        { length: 40 },
        (_, i) => `<article data-swiper-slide-index="${i}"><button>Open</button></article>`,
      ).join('') +
      '</main>',
    { runScripts: 'outside-only' },
  );
  try {
    const w = dom.window,
      root = w.document.querySelector('main'),
      events = new Map();
    w.eval(source('src/shared/carousel-visibility.js'));
    const s = {
      el: root,
      slides: [...root.children],
      activeIndex: 1,
      translate: -450,
      slidesSizesGrid: Array(40).fill(300),
      isHorizontal: () => true,
      on(names, fn) {
        names.split(' ').forEach((n) => events.set(n, [...(events.get(n) || []), fn]));
      },
      off() {},
      emit(n) {
        for (const fn of events.get(n) || []) fn();
      },
    };
    s.slides.forEach((node, i) => (node.swiperSlideOffset = i * 400));
    root.getBoundingClientRect = () => ({ left: 0 });
    w.innerWidth = 800;
    const api = w.TDBCarouselVisibility.bind(s, { overflowViewport: true });
    let checks = 0;
    for (const node of s.slides) {
      const get = node.getAttribute.bind(node),
        has = node.hasAttribute.bind(node);
      node.getAttribute = (name) => {
        if (name === 'aria-hidden') checks++;
        return get(name);
      };
      node.hasAttribute = (name) => {
        if (name === 'inert') checks++;
        return has(name);
      };
    }
    for (let n = 0; n < 120; n++) {
      s.translate = -450 - n / 10;
      s.emit('setTranslate');
    }
    console.log('shared visibility attribute checks across 120 moving frames:', checks);
    assert.equal(checks, 0);
    s.translate = -800;
    s.activeIndex = 2;
    s.emit('setTranslate');
    assert.equal(s.slides[1].getAttribute('aria-hidden'), 'true');
    assert.equal(s.slides[3].hasAttribute('inert'), false);
    s.slides[3].setAttribute('aria-hidden', 'true');
    api.update();
    assert.equal(
      s.slides[3].getAttribute('aria-hidden'),
      'false',
      'explicit reconciliation checks live state',
    );
    s.slides[3].setAttribute('inert', '');
    s.emit('resize');
    assert.equal(s.slides[3].hasAttribute('inert'), false, 'layout invalidates the cached paint');
    api.destroy();
    assert.equal(s.slides[3].getAttribute('aria-hidden'), null);
  } finally {
    dom.window.close();
  }
});

test('closed Smile presentation does no repainting on unrelated page gestures; opening and new clones still work', async () => {
  const dom = new JSDOM('<main></main><button id="outside">Elsewhere</button>', {
    url: 'https://fixture.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  try {
    const w = dom.window,
      root = w.document.querySelector('main');
    root.setAttribute('data-tdb-smile-slider', '');
    root.setAttribute('data-tdb-slider-first-view', 'pending');
    root.innerHTML =
      '<div class="swiper-wrapper">' +
      Array.from(
        { length: 6 },
        (_, i) =>
          `<div class="swiper-slide" data-swiper-slide-index="${i}"><a class="tdb-smile-card" href="#">Smile ${i}</a><div class="tdb-smile-details"></div><div class="tdb-smile-overlay"></div><span class="tdb-smile-image-label"></span></div>`,
      ).join('') +
      '</div><div data-tdb-smile-presentation><span class="tdb-smile-counter-current"></span><span class="tdb-smile-counter-total"></span><span class="tdb-smile-counter-label"></span><div class="tdb-smile-static-facts">' +
      Array.from(
        { length: 3 },
        () => '<div class="tdb-smile-fact-ticker"><span class="tdb-smile-fact-slot"></span></div>',
      ).join('') +
      '</div><div data-tdb-smile-ticker-template></div></div>';
    w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    w.TDBMotion = { reduced: { matches: false }, carousel: { nextDelay: 200 } };
    w.TDBNativeTicker = { mount: () => ({ update() {}, settle() {}, destroy() {} }) };
    w.TDBModules = { load: () => Promise.resolve() };
    let opens = 0;
    w.TDBSmileFeed = {
      presentation: () => ({
        facts: () => ['a', 'b', 'c'],
        update() {},
        fade() {},
        overSummary: () => false,
        open() {
          opens++;
        },
      }),
    };
    w.eval(source('src/sliders/gallery-presentation.js'));
    const api = w.TDBSmileCards.prepare(root);
    await Promise.resolve();
    const observer = new w.MutationObserver(() => {});
    observer.observe(root, { subtree: true, attributes: true });
    opens = 0;
    for (let n = 0; n < 100; n++)
      w.document
        .querySelector('#outside')
        .dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
    const mutations = observer.takeRecords().length;
    console.log('closed Smile attribute mutations across 100 outside gestures:', mutations);
    assert.equal(mutations, 0);
    assert.equal(opens, 0);
    const card = root.querySelector('.tdb-smile-card');
    card.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
    assert.equal(card.getAttribute('aria-expanded'), 'true');
    w.document
      .querySelector('#outside')
      .dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
    assert.equal(card.getAttribute('aria-expanded'), 'false');
    const clone = card.parentElement.cloneNode(true);
    clone.classList.add('swiper-slide-duplicate');
    root.querySelector('.swiper-wrapper').append(clone);
    await Promise.resolve();
    card.dispatchEvent(new w.MouseEvent('pointerover', { bubbles: true }));
    assert.equal(clone.querySelector('.tdb-smile-card').getAttribute('aria-expanded'), 'true');
    observer.disconnect();
    api.destroy();
  } finally {
    dom.window.close();
  }
});

test('review cards have one resize observer and one coalesced, movement-safe layout owner', () => {
  const card = (i) =>
    `<article class="tdb-review-cards_slide" data-review-id="r${i}" style="width:200px"><span data-cards-render="name">Person ${i}</span><blockquote data-cards-render="excerpt">Quote</blockquote><div data-cards-render="text" style="line-height:20px">Body</div><span data-cards-render="date"></span><span data-cards-render="rating"></span><a data-tdb-cards-open></a></article>`;
  const dom = new JSDOM(
    '<section><div data-tdb-cards-viewport style="padding:0px;width:800px"><div data-tdb-cards-track>' +
      Array.from({ length: 8 }, (_, i) => card(i)).join('') +
      '</div></div><span data-tdb-cards-status></span><nav data-tdb-cards-navigation><span data-tdb-cards-current></span><span data-tdb-cards-total></span><button data-tdb-cards-prev></button><button data-tdb-cards-next></button><span data-tdb-cards-progress><span></span></span></nav></section>',
    { url: 'https://fixture.test/', runScripts: 'outside-only', pretendToBeVisual: true },
  );
  try {
    const w = dom.window,
      root = w.document.querySelector('section'),
      viewport = root.querySelector('[data-tdb-cards-viewport]'),
      frames = new Map(),
      observers = [];
    let id = 0,
      width = 800,
      settled;
    w.requestAnimationFrame = (fn) => {
      frames.set(++id, fn);
      return id;
    };
    w.cancelAnimationFrame = (n) => frames.delete(n);
    const frame = () => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn());
    };
    w.ResizeObserver = class {
      constructor(fn) {
        this.fn = fn;
        observers.push(this);
      }
      observe(node) {
        this.node = node;
      }
      unobserve() {
        this.disconnected = true;
      }
      disconnect() {
        this.disconnected = true;
      }
    };
    w.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    };
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    for (const name of ['clientWidth', 'offsetWidth'])
      Object.defineProperty(viewport, name, { get: () => width });
    Object.defineProperty(viewport, 'clientHeight', { get: () => 500 });
    w.HTMLElement.prototype.getBoundingClientRect = function () {
      const n = [...(this.parentElement?.children || [])].indexOf(this);
      return {
        left: this.matches('article') ? n * 200 : 0,
        right: this.matches('article') ? (n + 1) * 200 : width,
        width: this.matches('article') ? 200 : width,
        height: 120,
        top: 0,
        bottom: 120,
      };
    };
    const reduced = new w.EventTarget();
    reduced.matches = false;
    w.TDBMotion = {
      reduced,
      duration: () => 700,
      reviews: { easing: 'ease', fade: 0 },
      fadeController: () => ({ to() {}, destroy() {} }),
    };
    w.TDBReviewCMS = { contextForPath: () => 'default' };
    w.TDBNativeTicker = { mount: () => ({ update() {}, settle() {}, destroy() {} }) };
    w.TDBRenderedProgress = { observe: () => ({ schedule() {}, pause() {}, destroy() {} }) };
    w.eval(read('dist/tdb-swiper-8.4.7.min.js'));
    w.TDBSwiper = {
      ...w.TDBSwiper,
      firstView: () => ({ destroy() {} }),
      onSettled(s, fn) {
        settled = fn;
        return () => {};
      },
    };
    w.eval(source('src/reviews/native/cards.js'));
    const records = Array.from({ length: 8 }, (_, i) => ({
      id: 'r' + i,
      name: 'Person ' + i,
      excerpt: 'Quote',
      text: 'Body',
      displayDate: 'Today',
      rating: 5,
      platform: 'Google',
      excerpts: {},
    }));
    const api = w.TDBReviewCards.mount(
        root,
        { records, total: 8, hasMore: false },
        { openReviews: async () => {} },
      ),
      s = viewport.swiper;
    console.log('review viewport resize observers:', observers.length);
    assert.equal(observers.length, 1);
    let layouts = 0;
    const updateSlides = s.updateSlides.bind(s);
    s.updateSlides = (...args) => {
      layouts++;
      return updateSlides(...args);
    };
    width = 760;
    for (let n = 0; n < 100; n++)
      observers[0].fn([{ target: viewport, contentRect: { width, height: 500 } }]);
    frame();
    frame();
    assert.equal(layouts, 1, 'resize bursts have one full layout refresh');
    layouts = 0;
    s.touchEventsData.isTouched = true;
    width = 640;
    observers[0].fn([{ target: viewport, contentRect: { width, height: 500 } }]);
    frame();
    frame();
    assert.equal(layouts, 0);
    s.touchEventsData.isTouched = false;
    settled('release');
    assert.equal(layouts, 1);
    assert.equal(s.width, 640);
    s.emit('resize');
    api.destroy();
    frame();
    assert.equal(layouts, 1, 'queued refresh is cancelled on destroy');
    assert(observers[0].disconnected);
  } finally {
    dom.window.close();
  }
});
