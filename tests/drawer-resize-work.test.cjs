const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const file = process.env.TDB_DRAWER_READING_SOURCE || 'src/shared/drawer-reading.js';

function fixture() {
  const dom = new JSDOM(
    '<div id="pane"><div id="viewport"><div id="track"><article></article><article></article><article></article></div></div><footer></footer></div>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    d = w.document,
    frames = new Map(),
    observers = [],
    events = new Map();
  let sequence = 0,
    width = 390,
    height = 1200;
  const query = new w.EventTarget();
  query.matches = false;
  w.matchMedia = () => query;
  w.requestAnimationFrame = (fn) => (frames.set(++sequence, fn), sequence);
  w.cancelAnimationFrame = (id) => frames.delete(id);
  w.ResizeObserver = class {
    constructor(fn) {
      this.fn = fn;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  };
  w.TDBMotion = { duration: (x) => x / 2, reduced: { matches: false } };
  const viewport = d.querySelector('#viewport'),
    track = d.querySelector('#track'),
    pane = d.querySelector('#pane'),
    footer = d.querySelector('footer');
  Object.defineProperty(viewport, 'clientWidth', { get: () => width });
  Object.defineProperties(pane, {
    scrollHeight: { get: () => height },
    clientHeight: { value: 400 },
  });
  Object.defineProperty(footer, 'offsetHeight', { value: 80 });
  const swiper = {
    params: {},
    originalParams: {},
    slides: [...track.children],
    activeIndex: 1,
    updates: 0,
    animating: false,
    touchEventsData: { isTouched: false },
    jump: false,
    on(name, fn) {
      if (!events.has(name)) events.set(name, new Set());
      events.get(name).add(fn);
    },
    off(name, fn) {
      events.get(name)?.delete(fn);
    },
    emit(name) {
      for (const fn of [...(events.get(name) || [])]) fn();
    },
    update() {
      this.updates++;
      if (this.jump) this.activeIndex = 2;
    },
    slideTo(index, duration, callbacks) {
      assert.equal(duration, 0);
      assert.equal(callbacks, false);
      this.activeIndex = index;
    },
  };
  w.TDBSwiper = {
    onSettled(s, fn) {
      s.on('settled', fn);
      return () => s.off('settled', fn);
    },
  };
  w.eval(fs.readFileSync(file, 'utf8'));
  const reader = w.TDBDrawerReading.mount({
    pane,
    footer,
    viewport,
    track,
    nodes: () => [pane, ...swiper.slides],
    slideScroll: () => swiper.slides[swiper.activeIndex],
    swiper: () => swiper,
    active: () => true,
  });
  reader.bind();
  return {
    w,
    query,
    swiper,
    reader,
    pane,
    frames,
    observers,
    dimensions(a, b = height) {
      width = a;
      height = b;
    },
    resize() {
      swiper.emit('resize');
      for (const observer of observers) if (!observer.disconnected) observer.fn();
    },
    flush() {
      const list = [...frames.values()];
      frames.clear();
      list.forEach((fn) => fn());
    },
    close() {
      reader.destroy();
      w.close();
    },
  };
}

test('drawer reading reuses the slider observer and batches resize bursts', () => {
  const f = fixture();
  try {
    for (let n = 0; n < 8; n++) {
      f.dimensions(400 + n);
      f.resize();
    }
    f.flush();
    assert.equal(f.swiper.updates, 1);
    assert.equal(f.observers.length, 0, 'the shared reader needs no second ResizeObserver');
    assert.equal(f.frames.size, 0);
  } finally {
    f.close();
  }
});

test('drawer resize waits for touch and transition settlement without changing the selected slide', () => {
  const f = fixture();
  try {
    f.swiper.touchEventsData.isTouched = true;
    f.dimensions(844);
    f.resize();
    f.flush();
    assert.equal(f.swiper.updates, 0);
    f.swiper.touchEventsData.isTouched = false;
    f.swiper.animating = true;
    f.resize();
    f.flush();
    assert.equal(f.swiper.updates, 0);
    f.swiper.animating = false;
    f.swiper.jump = true;
    f.swiper.emit('settled');
    f.flush();
    assert.equal(f.swiper.updates, 1);
    assert.equal(f.swiper.activeIndex, 1);
  } finally {
    f.close();
  }
});

test('drawer resize preserves landscape reading anchors and ignores auto-height feedback', () => {
  const f = fixture();
  try {
    f.query.matches = true;
    f.query.dispatchEvent(new f.w.Event('change'));
    f.pane.scrollTop = 730;
    f.reader.capture();
    const start = f.swiper.updates;
    f.dimensions(390, 900);
    f.resize();
    f.flush();
    assert.equal(f.swiper.updates, start);
    assert.equal(f.pane.scrollTop, 430);
    f.dimensions(650);
    f.resize();
    f.flush();
    assert.equal(f.swiper.updates, start + 1);
    assert.equal(f.pane.scrollTop, 430);
  } finally {
    f.close();
  }
});

test('hidden and destroyed drawers do not perform queued layout work', () => {
  const f = fixture();
  try {
    f.dimensions(0);
    f.resize();
    f.flush();
    assert.equal(f.swiper.updates, 0);
    f.dimensions(650);
    f.resize();
    f.reader.destroy();
    f.flush();
    f.resize();
    f.flush();
    assert.equal(f.swiper.updates, 0);
    assert.equal(f.frames.size, 0);
  } finally {
    f.w.close();
  }
});

test('both native reading drawers delegate full resize updates to the shared reader', () => {
  for (const file of ['src/reviews/native/drawer-content.js', 'src/usp/drawer.js'])
    assert(/updateOnWindowResize:\s*false/.test(fs.readFileSync(file, 'utf8')), file);
});

for (const loop of [false, true])
  test(`real slider resize ownership preserves selection (loop=${loop})`, async () => {
    const dom = new JSDOM(
      '<div id="pane"><div class="swiper"><div class="swiper-wrapper"><article class="swiper-slide">One</article><article class="swiper-slide">Two</article><article class="swiper-slide">Three</article></div></div><footer></footer></div>',
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    const w = dom.window,
      d = w.document,
      frames = new Map(),
      observers = [];
    let width = 390,
      sequence = 0;
    w.requestAnimationFrame = (fn) => (frames.set(++sequence, fn), sequence);
    w.cancelAnimationFrame = (id) => frames.delete(id);
    const flush = () => {
      const list = [...frames.values()];
      frames.clear();
      list.forEach((fn) => fn());
    };
    w.ResizeObserver = class {
      constructor(fn) {
        this.fn = fn;
        observers.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    w.TDBMotion = { duration: () => 400, reduced: { matches: false } };
    const viewport = d.querySelector('.swiper'),
      track = viewport.firstElementChild;
    for (const name of ['clientWidth', 'offsetWidth'])
      Object.defineProperty(viewport, name, { get: () => width });
    Object.defineProperty(viewport, 'clientHeight', { value: 600 });
    w.eval(fs.readFileSync('dist/tdb-swiper-8.4.7.min.js', 'utf8'));
    w.eval(fs.readFileSync('src/shared/drawer-reading.js', 'utf8'));
    const swiper = w.TDBSwiper.create(viewport, {
      init: false,
      slidesPerView: 1,
      loop,
      initialSlide: 1,
      updateOnWindowResize: false,
    });
    const reader = w.TDBDrawerReading.mount({
      pane: d.querySelector('#pane'),
      footer: d.querySelector('footer'),
      viewport,
      track,
      nodes: () => [],
      slideScroll: () => swiper.slides[swiper.activeIndex],
      swiper: () => swiper,
      active: () => true,
    });
    try {
      reader.bind();
      swiper.init();
      assert.equal(observers.length, 1);
      assert.equal(swiper.realIndex, 1);
      let layouts = 0;
      const update = swiper.updateSlides.bind(swiper);
      swiper.updateSlides = (...args) => {
        layouts++;
        return update(...args);
      };
      width = 844;
      for (let n = 0; n < 8; n++)
        observers[0].fn([{ target: viewport, contentRect: { width, height: 600 } }]);
      flush();
      flush();
      assert.equal(layouts, 1);
      assert.equal(swiper.width, 844);
      assert.equal(swiper.realIndex, 1);
      layouts = 0;
      swiper.touchEventsData.isTouched = true;
      swiper.emit('touchStart');
      width = 390;
      observers[0].fn([{ target: viewport, contentRect: { width, height: 600 } }]);
      flush();
      flush();
      assert.equal(layouts, 0);
      swiper.touchEventsData.isTouched = false;
      swiper.emit('touchEnd');
      await Promise.resolve();
      flush();
      assert.equal(layouts, 1);
      assert.equal(swiper.realIndex, 1);
    } finally {
      reader.destroy();
      swiper.destroy();
      w.close();
    }
  });
