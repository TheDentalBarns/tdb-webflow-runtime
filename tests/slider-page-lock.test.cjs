const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(touchSupport = true) {
  const dom = new JSDOM(
    '<div class="swiper" style="width:900px;height:400px"><div class="swiper-wrapper"><div class="swiper-slide">One</div><div class="swiper-slide">Two</div><div class="swiper-slide">Three</div></div></div>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    d = w.document,
    viewport = d.querySelector('.swiper');
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  if (!touchSupport) delete w.ontouchstart;
  Object.defineProperty(viewport, 'clientWidth', { value: 900 });
  Object.defineProperty(viewport, 'clientHeight', { value: 400 });
  Object.defineProperty(d.documentElement, 'clientWidth', { value: w.innerWidth });
  w.scrollY = 1200;
  const stops = [];
  w.lenis = {
    isScrolling: 'smooth',
    scrollTo(y, options) {
      stops.push({ y, ...options });
      this.isScrolling = false;
    },
  };
  w.eval(
    fs
      .readFileSync('src/shared/scroll-lock.js', 'utf8')
      .replace(
        '__TDB_SCROLL_LOCK_CSS__',
        JSON.stringify(fs.readFileSync('src/styles/tdb-scroll-lock.css', 'utf8')),
      ),
  );
  w.eval(fs.readFileSync('dist/tdb-swiper-8.4.7.min.js', 'utf8'));
  const swiper = w.TDBSwiper.create(viewport, { speed: 0 });
  function touch(type, x, y, count = type === 'touchend' || type === 'touchcancel' ? 0 : 1) {
    const target = viewport.querySelector('.swiper-slide');
    const point = { identifier: 1, pageX: x, pageY: y, clientX: x, clientY: y, target };
    const event = new w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      touches: Array.from({ length: count }, () => point),
      targetTouches: Array.from({ length: count }, () => point),
      changedTouches: [point],
    });
    target.dispatchEvent(event);
    return event;
  }
  return {
    dom,
    w,
    d,
    swiper,
    stops,
    touch,
    close() {
      swiper.destroy(true, true);
      w.close();
    },
  };
}

for (const ending of ['pointerup', 'pointercancel'])
  test('mouse drag stops page inertia and releases on ' + ending, () => {
    const f = fixture(false);
    try {
      assert.equal(f.swiper.support.touch, false);
      const target = f.d.querySelector('.swiper-slide');
      const pointer = (type, x) => {
        const event = new f.w.Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, {
          button: 0,
          isPrimary: true,
          pointerType: 'mouse',
          pointerId: 3,
          pageX: x,
          pageY: 100,
        });
        target.dispatchEvent(event);
      };
      pointer('pointerdown', 500);
      pointer('pointermove', 400);
      assert.equal(f.w.TDBScrollLock.active, true);
      assert.equal(f.stops.length, 1);
      pointer(ending, 400);
      assert.equal(f.w.TDBScrollLock.active, false);
    } finally {
      f.close();
    }
  });

test('horizontal drag cancels existing page inertia once and holds page until release', () => {
  const f = fixture();
  try {
    f.touch('touchstart', 500, 100);
    assert.equal(f.w.TDBScrollLock.active, false, 'a press alone must not lock browsing');
    f.touch('touchmove', 420, 102);
    assert.equal(f.w.TDBScrollLock.active, true);
    assert.deepEqual(f.stops, [{ y: 1200, immediate: true, force: true }]);
    assert.equal(f.w.getComputedStyle(f.d.documentElement).overflow, 'hidden');
    f.touch('touchmove', 350, 110);
    assert.equal(f.stops.length, 1, 'no per-move scroll writes');
    f.touch('touchend', 350, 110);
    assert.equal(f.w.TDBScrollLock.active, false);
    assert.equal(f.w.scrollY, 1200, 'release must not restore an old scroll position');
  } finally {
    f.close();
  }
});

test('vertical gestures and taps keep native browsing and page inertia', () => {
  for (const vertical of [false, true]) {
    const f = fixture();
    try {
      f.touch('touchstart', 500, 100);
      if (vertical) f.touch('touchmove', 502, 180);
      f.touch('touchend', 502, vertical ? 180 : 100);
      assert.equal(f.w.TDBScrollLock.active, false);
      assert.equal(f.stops.length, 0);
    } finally {
      f.close();
    }
  }
});

for (const end of ['touchcancel', 'blur', 'pagehide', 'pinch', 'destroy'])
  test('horizontal page lock releases on ' + end, () => {
    const f = fixture();
    try {
      f.touch('touchstart', 500, 100);
      f.touch('touchmove', 400, 102);
      assert.equal(f.w.TDBScrollLock.active, true);
      if (end === 'destroy') f.swiper.destroy(true, true);
      else if (end === 'pinch') f.touch('touchstart', 400, 102, 2);
      else if (end === 'touchcancel') f.touch(end, 400, 102);
      else f.w.dispatchEvent(new f.w.Event(end));
      assert.equal(f.w.TDBScrollLock.active, false);
    } finally {
      f.close();
    }
  });

test('carousel release cannot unlock a drawer, and existing drawer scrolling stays owned', () => {
  const f = fixture();
  try {
    f.touch('touchstart', 500, 100);
    f.touch('touchmove', 400, 102);
    const drawer = f.w.TDBScrollLock.acquire();
    f.touch('touchend', 400, 102);
    assert.equal(f.w.TDBScrollLock.active, true);
    f.touch('touchstart', 500, 100);
    f.touch('touchmove', 400, 102);
    drawer();
    assert.equal(
      f.w.TDBScrollLock.active,
      false,
      'a carousel inside an existing lock must not add another page owner',
    );
    f.touch('touchend', 400, 102);
  } finally {
    f.close();
  }
});
