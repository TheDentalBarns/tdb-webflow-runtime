const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(bundled) {
  const list = Array.from({ length: 6 }, (_, i) => i);
  const dom = new JSDOM(
    `<section id="All-treatments" data-tdb-treatment-layout>
    <div class="parallax-swiper_component" data-tdb-treatment data-tdb-treatment-postage data-tdb-treatment-loop="false">
      <div class="swiper"><div class="swiper-wrapper">${list.map((i) => `<article class="swiper-slide ${i === 0 ? 'swiper-slide-active' : ''}"><a data-tdb-copy-state data-tdb-treatment-price-source="${100 + i}"></a></article>`).join('')}</div></div>
      <div data-tdb-native-progress><span></span><span></span></div>
      <div data-tdb-treatment-position><span data-tdb-treatment-current>01</span><span data-tdb-treatment-total>06</span></div>
    </div>
    <div data-tdb-treatment-stamps><div class="tdb-treatment-controls"><div class="tdb-treatment-wrapper">${list.map((i) => `<div class="tdb-treatment-card"><a href="/treatment-${i}" data-tdb-treatment-stamp>Treatment ${i}</a></div>`).join('')}</div></div></div>
    <div data-tdb-treatment-details><div class="tdb-treatment-viewport"><div class="tdb-treatment-wrapper">${list.map((i) => `<article><h3 class="tdb-treatment-title">Treatment ${i}</h3><p data-tdb-service-copy>Copy ${i}</p></article>`).join('')}</div></div></div>
    <span data-tdb-treatment-price><span class="tdb-smile-fact-value"></span><span class="tdb-smile-fact-value"></span></span>
  </section>`,
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' },
  );
  const w = dom.window,
    d = w.document,
    root = d.querySelector('[data-tdb-treatment]');
  const viewport = root.querySelector('.swiper'),
    strip = d.querySelector('.tdb-treatment-controls');
  const observers = [],
    samplers = [],
    counts = { bounds: 0, queries: 0, writes: 0 };
  let position = 0,
    scroll = 0,
    scrollWidth = 1400;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.TDBMotion = {
    reduced: { matches: true, addEventListener() {}, removeEventListener() {} },
    defaults: { ticker: 400 },
  };
  w.TDBSwiper = { register() {} };
  for (const kind of ['IntersectionObserver', 'ResizeObserver'])
    w[kind] = class {
      constructor(callback) {
        this.callback = callback;
        this.kind = kind;
        this.disconnected = false;
        observers.push(this);
      }
      observe() {}
      disconnect() {
        this.disconnected = true;
      }
    };
  w.Element.prototype.animate = () => ({ cancel() {}, finished: Promise.resolve() });
  w.TDBRenderedProgress = {
    observe(options) {
      const sampler = {
        ...options,
        destroyed: false,
        schedule() {},
        pause() {},
        destroy() {
          this.destroyed = true;
        },
      };
      samplers.push(sampler);
      return sampler;
    },
  };
  const query = w.Element.prototype.querySelector;
  w.Element.prototype.querySelector = function (...args) {
    counts.queries++;
    return query.apply(this, args);
  };
  const box = (left, width) => ({
    left,
    right: left + width,
    width,
    top: 0,
    bottom: 300,
    height: 300,
  });
  viewport.getBoundingClientRect = () => box(0, 800);
  root.querySelector('[data-tdb-native-progress]').getBoundingClientRect = () => box(0, 800);
  d.querySelector('[data-tdb-treatment-details] .tdb-treatment-viewport').getBoundingClientRect =
    () => box(0, 800);
  const slides = [...viewport.querySelectorAll('.swiper-slide')];
  slides.forEach((slide, i) => {
    slide.getBoundingClientRect = () => box(i * 500 - position, 480);
  });
  [...strip.querySelectorAll('.tdb-treatment-card')].forEach((card, i) => {
    card.getBoundingClientRect = () => box(i * 240, 200);
  });
  Object.defineProperty(strip, 'scrollWidth', {
    get() {
      counts.bounds++;
      return scrollWidth;
    },
  });
  Object.defineProperty(strip, 'clientWidth', {
    get() {
      counts.bounds++;
      return 800;
    },
  });
  Object.defineProperty(strip, 'scrollLeft', {
    get() {
      return scroll;
    },
    set(value) {
      counts.writes++;
      scroll = value;
    },
  });
  function createSwiper() {
    const events = new Map();
    return {
      slides,
      params: { loop: false },
      realIndex: 0,
      activeIndex: 0,
      animating: false,
      on(name, fn) {
        if (!events.has(name)) events.set(name, []);
        events.get(name).push(fn);
      },
      off(name, fn) {
        const listeners = events.get(name),
          index = listeners?.indexOf(fn);
        if (index >= 0) listeners.splice(index, 1);
      },
      // Like Swiper, iterate the live array to expose unsafe removal during destroy.
      emit(name) {
        events.get(name)?.forEach((fn) => fn());
      },
      destroy() {
        this.emit('beforeDestroy');
        this.destroyed = true;
        delete viewport.swiper;
      },
    };
  }
  viewport.swiper = createSwiper();
  const files = bundled
    ? ['dist/tdb-ticker.js', 'dist/tdb-parallax.js']
    : [
        'src/shared/native-ticker.js',
        'src/sliders/treatment-stamps.js',
        'src/sliders/treatment-details.js',
        'src/sliders/treatment-ticker.js',
        'src/sliders/parallax-progress.js',
      ];
  files.forEach((file) => w.eval(fs.readFileSync(file, 'utf8')));
  w.TDBParallaxProgress.refresh(root);
  const paint = () => samplers.at(-1).paint();
  paint();
  return {
    w,
    root,
    viewport,
    strip,
    observers,
    samplers,
    counts,
    paint,
    createSwiper,
    position(value) {
      position = value;
    },
    resize(value) {
      scrollWidth = value;
      observers.find((o) => o.kind === 'ResizeObserver').callback();
    },
    price() {
      return d.querySelector('[data-tdb-treatment-price]').firstElementChild.textContent;
    },
  };
}

for (const bundled of [false, true]) {
  const label = bundled ? 'bundle' : 'source';
  test(`${label}: unchanged geometry needs no repeated limit/instance lookups; resized limits remain correct`, () => {
    const f = fixture(bundled);
    try {
      Object.keys(f.counts).forEach((key) => {
        f.counts[key] = 0;
      });
      for (let i = 0; i < 120; i++) {
        f.position(i * 2);
        f.paint();
      }
      assert.equal(f.counts.bounds, 0);
      assert.equal(f.counts.queries, 0);
      const writes = f.counts.writes;
      f.paint();
      f.paint();
      assert.equal(f.counts.writes, writes);
      f.position(2500);
      f.paint();
      assert.equal(f.strip.scrollLeft, 600);
      f.resize(1000);
      f.paint();
      assert.equal(f.strip.scrollLeft, 200, 'ResizeObserver invalidates the cached scroll limit');
    } finally {
      f.w.close();
    }
  });
  test(`${label}: destroy disconnects resources without skipping sibling hooks; same-wrapper remount updates price`, () => {
    const f = fixture(bundled);
    try {
      let sibling = 0;
      f.viewport.swiper.on('beforeDestroy', () => sibling++);
      f.viewport.swiper.destroy();
      assert.equal(sibling, 1);
      assert.ok(f.samplers.every((s) => s.destroyed));
      assert.ok(f.observers.every((o) => o.disconnected));
      f.viewport.swiper = f.createSwiper();
      f.w.TDBParallaxProgress.refresh(f.root);
      f.paint();
      assert.equal(f.samplers.length, 2);
      f.viewport.swiper.realIndex = f.viewport.swiper.activeIndex = 2;
      f.viewport.swiper.emit('slideChange');
      f.paint();
      assert.equal(f.price(), 'From £102');
    } finally {
      f.w.close();
    }
  });
  test(`${label}: detached progress is pruned and may be initialized on reattachment`, () => {
    const f = fixture(bundled);
    try {
      const parent = f.root.parentElement;
      f.root.remove();
      f.w.TDBParallaxProgress.prune();
      assert.ok(f.samplers.every((s) => s.destroyed));
      assert.ok(f.observers.every((o) => o.disconnected));
      parent.prepend(f.root);
      f.w.TDBParallaxProgress.refresh(f.root);
      f.paint();
      assert.equal(f.samplers.length, 2);
      assert.equal(f.samplers.at(-1).destroyed, false);
    } finally {
      f.w.close();
    }
  });
}
