const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture({ portrait = false } = {}) {
  const dom = new JSDOM(
    '<section class="parallax-swiper_component" data-tdb-treatment data-tdb-banner-parallax data-tdb-treatment-postage data-tdb-treatment-loop="false">' +
      '<div class="swiper"><div class="swiper-wrapper">' +
      Array.from(
        { length: 4 },
        () => '<article class="swiper-slide tdb-treatment-slide"></article>',
      ).join('') +
      '</div></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    root = w.document.querySelector('section');
  const timers = new Map(),
    events = {},
    calls = [];
  let serial = 0,
    entry,
    settled,
    swiper,
    rendered = 0;
  w.setTimeout = (fn, delay) => {
    timers.set(++serial, { fn, delay });
    return serial;
  };
  w.clearTimeout = (id) => timers.delete(id);
  w.matchMedia = (query) => ({
    matches: portrait ? query.includes('portrait') : query.startsWith('(min-width:'),
    addEventListener() {},
    removeEventListener() {},
  });
  w.TDBMotion = {
    duration: () => 500,
    reduced: { matches: false },
    carousel: {
      nextDelay: 100,
      previousDelay: 100,
      settleDelay: 50,
      entryStart: 100,
      entryRetry: 650,
      entryFallback: 200,
    },
  };
  w.Swiper = function () {};
  const slides = [...root.querySelectorAll('.swiper-slide')];
  for (const slide of slides) slide.getBoundingClientRect = () => ({ width: 400 });
  w.TDBSwiper = {
    register() {},
    nativeGap: (_, value) => value,
    bindSwiper() {},
    watchDuration() {},
    onSettled(_, fn) {
      settled = fn;
    },
    firstView(_, options) {
      entry = options;
      return { destroy() {}, cancel() {} };
    },
    create(element, params) {
      swiper = {
        params,
        slides,
        activeIndex: 0,
        realIndex: 0,
        enabled: true,
        animating: false,
        wrapperEl: element.firstElementChild,
        translate: 0,
        touchEventsData: {},
        on(names, fn) {
          for (const name of names.split(' ')) (events[name] ||= []).push(fn);
        },
        off() {},
        init() {
          emit('beforeInit');
          this.initialized = true;
        },
        update() {},
        updateSlides() {},
        slideTo(index, speed) {
          calls.push(['slideTo', index, speed]);
          this.activeIndex = this.realIndex = index;
          this.translate = -index * 400;
          // Match the engine's same-target no-op: do not repair rendered pixels.
          if (speed > 0) this.animating = true;
          return true;
        },
        slideNext(speed = params.speed) {
          this.slideTo(this.activeIndex + 1, speed);
        },
        getTranslate: () => rendered,
        setTranslate(value) {
          calls.push(['setTranslate', value]);
          rendered = value;
        },
        setTransition(value) {
          calls.push(['setTransition', value]);
        },
        transitionEnd() {
          this.animating = false;
          calls.push(['transitionEnd']);
          queueMicrotask(settled);
        },
      };
      element.swiper = swiper;
      return swiper;
    },
  };
  w.TDBParallax = {
    prepare: () => ({ bind() {}, setBusy() {} }),
    bind() {},
    setEntry() {},
    setMoving() {},
  };
  w.TDBCarouselVisibility = { bind() {} };
  const emit = (name) => events[name]?.forEach((fn) => fn());
  w.eval(fs.readFileSync('src/sliders/parallax-plugin.js', 'utf8'));
  w.TDBParallaxPlugin.mount(root);
  const fire = (delay) => {
    const found = [...timers].find(([, timer]) => timer.delay === delay);
    assert.ok(found, 'expected deadline at ' + delay);
    timers.delete(found[0]);
    found[1].fn();
  };
  return {
    w,
    root,
    calls,
    swiper,
    timers,
    entry,
    emit,
    fire,
    settled,
    freeze() {
      rendered = -180;
    },
    rendered: () => rendered,
    close: () => w.close(),
  };
}

test('desktop entrance uses visibility gating; portrait retains immediate entry', () => {
  for (const portrait of [false, true]) {
    const f = fixture({ portrait });
    try {
      assert.equal(f.entry.observe, !portrait);
      assert.equal(f.entry.immediate, portrait);
    } finally {
      f.close();
    }
  }
});

for (const animating of [true, false])
  test('entry deadline repairs a stranded rendered track, animating=' + animating, () => {
    const f = fixture();
    try {
      f.entry.enter();
      f.freeze();
      f.swiper.animating = animating;
      f.fire(800);
      assert.equal(f.rendered(), -400);
      assert.equal(f.swiper.activeIndex, 1);
      assert.equal(f.swiper.animating, false);
      assert.equal(f.root.classList.contains('tdb-entry-pending'), false);
      assert.ok(f.calls.some((call) => call[0] === 'transitionEnd'));
    } finally {
      f.close();
    }
  });

test('normal settlement removes the fallback without a second slide change', () => {
  const f = fixture();
  try {
    f.entry.enter();
    f.swiper.animating = false;
    f.settled();
    assert.equal(
      [...f.timers.values()].some((timer) => timer.delay === 800),
      false,
    );
    assert.equal(f.calls.filter((call) => call[0] === 'slideTo').length, 1);
  } finally {
    f.close();
  }
});

for (const takeover of ['drag', 'new-slide'])
  test('entry recovery leaves visitor-owned ' + takeover + ' alone', () => {
    const f = fixture();
    try {
      f.entry.enter();
      f.freeze();
      if (takeover === 'drag') f.swiper.touchEventsData = { isTouched: true, isMoved: true };
      else f.swiper.realIndex = f.swiper.activeIndex = 2;
      f.fire(800);
      assert.equal(f.rendered(), -180);
      assert.equal(
        f.calls.some((call) => call[0] === 'setTranslate'),
        false,
      );
    } finally {
      f.close();
    }
  });

test('teardown cancels the pending entrance deadline', () => {
  const f = fixture();
  try {
    f.entry.enter();
    f.emit('beforeDestroy');
    assert.equal(f.timers.size, 0);
  } finally {
    f.close();
  }
});
