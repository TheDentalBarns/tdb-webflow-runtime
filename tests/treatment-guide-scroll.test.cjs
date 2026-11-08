const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(__dirname + '/../src/treatment-guide/scroll.js', 'utf8');
function setup(options = {}) {
  const dom = new JSDOM(
    '<section data-tdb-guide data-tdb-guide-scroll><div class="treatment-guide_layout" style="margin-bottom:-100px"><div class="treatment-guide_dial-art"><div class="treatment-guide_rim"></div></div><div class="treatment-guide_content"></div></div></section>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    root = w.document.querySelector('section'),
    layout = root.firstElementChild;
  w.innerWidth = options.width || 390;
  w.innerHeight = options.height || 844;
  w.scrollY = options.y || 0;
  if (options.zoom) {
    w.visualViewport = new w.EventTarget();
    Object.assign(w.visualViewport, { scale: options.zoom, height: w.innerHeight });
  }
  const reduced = new w.EventTarget();
  reduced.matches = !!options.reduced;
  w.matchMedia = () => reduced;
  w.TDBMotion = { reduced: { matches: false } };
  let locks = 0,
    chrome = 0,
    active = 0,
    time = 0,
    id = 0;
  const frames = new Map(),
    scrolls = [],
    changes = [];
  w.TDBScrollLock = {
    get active() {
      return locks > 0;
    },
    acquire() {
      locks++;
      let live = true;
      return () => {
        if (live) locks--;
        live = false;
      };
    },
  };
  w.TDBSiteChrome = {
    acquire() {
      chrome++;
      let live = true;
      return () => {
        if (live) chrome--;
        live = false;
      };
    },
  };
  w.TDBSliderFocus = { release() {} };
  w.requestAnimationFrame = (fn) => (frames.set(++id, fn), id);
  w.cancelAnimationFrame = (id) => frames.delete(id);
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  const move = (y) => {
    w.scrollY = y;
    w.dispatchEvent(new w.Event('scroll'));
  };
  w.scrollTo = ({ top }) => {
    scrolls.push(top);
    move(top);
  };
  if (options.lenis)
    w.lenis = {
      scrollTo(top, config) {
        assert.equal(config.immediate, true);
        assert.equal(config.force, true);
        scrolls.push(top);
        move(top);
      },
    };
  layout.getBoundingClientRect = () => ({
    top: 1000 - w.scrollY,
    bottom: 1760 - w.scrollY,
    width: 390,
    height: 760,
  });
  root.querySelector('.treatment-guide_dial-art').getBoundingClientRect = () => ({
    top: 1020 - w.scrollY,
    bottom: 1375 - w.scrollY,
    width: 355,
    height: 355,
  });
  root.querySelector('.treatment-guide_content').getBoundingClientRect = () => ({
    top: 1395 - w.scrollY,
    bottom: 1660 - w.scrollY,
    width: 355,
    height: 265,
  });
  w.eval(source);
  const api = w.TDBTreatmentGuideScroll.mount(root, {
    current: () => active,
    select(index) {
      active = index;
      changes.push(index);
    },
    interact() {},
  });
  const tick = (count = 1) => {
    for (let i = 0; i < count; i++) {
      time += 16;
      const list = [...frames.values()];
      frames.clear();
      list.forEach((fn) => fn(time));
    }
  };
  const input = (delta, props = {}) => {
    const e = new w.WheelEvent('wheel', {
      deltaY: delta,
      bubbles: true,
      cancelable: true,
      ...props,
    });
    root.dispatchEvent(e);
    tick();
    return e;
  };
  tick();
  return {
    w,
    root,
    layout,
    api,
    reduced,
    move,
    tick,
    input,
    scrolls,
    changes,
    start: () => 1020 - w.innerWidth * 0.05,
    locks: () => locks,
    chrome: () => chrome,
    current: () => active,
    offset: () => parseFloat(root.querySelector('circle').style.strokeDashoffset),
    manual(index) {
      active = index;
      api.manual(index);
    },
    close() {
      api.destroy();
      w.close();
    },
  };
}
test('pinning holds one real position and never inserts or changes native layout', () => {
  const t = setup();
  try {
    const before = t.layout.outerHTML;
    assert.equal(t.root.querySelector('.tdb-guide-scroll-track'), null);
    t.move(t.start() + 5);
    t.tick();
    assert.equal(t.api.pinned, true);
    assert.equal(t.locks(), 1);
    assert.equal(t.w.scrollY, t.start());
    assert.equal(t.layout.parentElement, t.root);
    assert.equal(t.layout.getAttribute('style'), 'margin-bottom:-100px');
    const calls = t.scrolls.length;
    for (let i = 0; i < 4; i++) {
      assert.equal(t.input(312).defaultPrevented, true);
      assert.equal(t.w.scrollY, t.start());
      assert.equal(t.current(), i);
      assert.equal(t.offset(), 80 - i * 20);
    }
    assert.equal(t.input(312).defaultPrevented, true);
    assert.equal(t.current(), 4);
    assert.equal(t.offset(), 0);
    assert.equal(t.api.pinned, false);
    assert.equal(t.locks(), 0);
    assert.equal(t.scrolls.length, calls);
    assert.equal(t.input(100).defaultPrevented, false, 'the following gesture can leave normally');
    assert.ok(before.includes('margin-bottom:-100px'));
  } finally {
    t.close();
  }
});
test('wheel input aligns once at 5vw and its remaining distance advances only the ring', () => {
  const t = setup({ lenis: true });
  try {
    t.move(t.start() - 40);
    t.tick();
    assert.equal(t.input(196).defaultPrevented, true);
    assert.equal(t.api.pinned, true);
    assert.equal(t.w.scrollY, t.start());
    assert.equal(t.offset(), 90);
    const calls = t.scrolls.length;
    t.input(156);
    assert.equal(t.offset(), 80);
    assert.equal(t.scrolls.length, calls);
  } finally {
    t.close();
  }
});

test('fractional input completes cleanly, while horizontal scrolling and zoom are not consumed', () => {
  const t = setup();
  try {
    t.move(t.start());
    t.tick();
    assert.equal(t.input(20, { deltaX: 60 }).defaultPrevented, false);
    assert.equal(t.input(20, { ctrlKey: true }).defaultPrevented, false);
    assert.equal(t.offset(), 100);
    for (let i = 0; i < 10; i++) t.input(156);
    assert.equal(t.offset(), 0);
    assert.equal(t.api.pinned, false);
    assert.equal(t.w.scrollY, t.start());
  } finally {
    t.close();
  }
});
test('manual controls animate segment endpoints before arrival and on non-pinning screens', () => {
  for (const options of [{}, { height: 390 }, { reduced: true }]) {
    const t = setup(options);
    try {
      assert.ok(t.root.classList.contains('is-guide-progress-ready'));
      t.manual(2);
      t.tick();
      if (!options.reduced) {
        assert.equal(t.offset(), 100);
        t.tick(12);
        assert.ok(t.offset() < 100 && t.offset() > 40);
      }
      t.tick(40);
      assert.equal(t.offset(), 40);
      assert.equal(t.current(), 2);
      assert.equal(t.w.scrollY, 0);
      assert.deepEqual(t.scrolls, []);
      assert.equal(t.api.pinned, false);
    } finally {
      t.close();
    }
  }
});
test('arrows finish and release without moving the page; reversing at the same point can hold again', () => {
  const t = setup();
  try {
    t.move(t.start());
    t.tick();
    const calls = t.scrolls.length;
    t.manual(4);
    t.tick(40);
    assert.equal(t.offset(), 0);
    assert.equal(t.api.pinned, false);
    assert.equal(t.w.scrollY, t.start());
    assert.equal(t.scrolls.length, calls);
    t.manual(3);
    t.tick(40);
    assert.equal(t.offset(), 20);
    assert.equal(t.api.pinned, true);
    assert.equal(t.w.scrollY, t.start());
  } finally {
    t.close();
  }
});
test('rotation and scroll gestures share progress, interrupt animation and never scroll the document', () => {
  const t = setup();
  try {
    t.move(t.start());
    t.tick();
    t.manual(3);
    t.tick(8);
    const before = t.offset(),
      calls = t.scrolls.length;
    assert.equal(t.api.beginRotation(), true);
    t.api.rotate(0.5);
    assert.ok(Math.abs(t.offset() - (before - 10)) < 0.001);
    t.api.rotate(-0.25);
    const stopped = t.offset();
    t.api.endRotation();
    t.tick(40);
    assert.equal(t.offset(), stopped);
    t.input(156);
    assert.ok(Math.abs(t.offset() - (stopped - 10)) < 0.001);
    assert.equal(t.scrolls.length, calls);
    assert.equal(t.w.scrollY, t.start());
    t.api.beginRotation();
    t.api.rotate(10);
    t.api.endRotation();
    assert.equal(t.offset(), 0);
    assert.equal(t.api.pinned, false);
  } finally {
    t.close();
  }
});
test('single-finger vertical input drives progress while annulus rotation and pinch are not double counted', () => {
  const t = setup();
  try {
    t.move(t.start());
    t.tick();
    const touch = (type, y, count = 1) => {
      const e = new t.w.Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, { touches: Array(count).fill({ clientY: y }) });
      t.root.dispatchEvent(e);
      return e;
    };
    touch('touchstart', 400);
    assert.equal(touch('touchmove', 244).defaultPrevented, true);
    assert.equal(t.offset(), 90);
    touch('touchstart', 400, 2);
    assert.equal(touch('touchmove', 200, 2).defaultPrevented, false);
    assert.equal(t.offset(), 90);
    t.api.beginRotation();
    touch('touchstart', 400);
    touch('touchmove', 200);
    assert.equal(t.offset(), 90);
    t.api.rotate(0.5);
    assert.equal(t.offset(), 80);
    assert.equal(t.w.scrollY, t.start());
  } finally {
    t.close();
  }
});
test('reverse travel holds at the same point and unwinds without a synthetic page runway', () => {
  const t = setup();
  try {
    t.move(t.start());
    t.tick();
    t.input(1560);
    t.move(t.start() + 300);
    t.tick();
    t.move(t.start() - 3);
    t.tick();
    assert.equal(t.api.pinned, true);
    assert.equal(t.w.scrollY, t.start());
    t.input(-780);
    assert.equal(t.offset(), 50);
    t.input(-780);
    assert.equal(t.offset(), 100);
    assert.equal(t.api.pinned, false);
    assert.equal(t.input(-40).defaultPrevented, false);
  } finally {
    t.close();
  }
});
test('menus clear for the complete visible wheel, independent of hold and fallback', () => {
  for (const height of [844, 390]) {
    const t = setup({ height });
    try {
      t.move(1020 - height + 1);
      t.tick();
      assert.equal(t.chrome(), 1);
      t.move(1400);
      t.tick(); // First arrival may align if it crosses the hold point.
      if (t.api.pinned) {
        t.manual(4);
        t.tick(40);
        t.move(1400);
        t.tick();
      }
      assert.equal(t.chrome(), 0);
      t.move(1300);
      t.tick();
      assert.equal(t.chrome(), 1);
    } finally {
      t.close();
    }
  }
});
test('restored positions, short screens, reduced motion and zoom do not trap navigation', () => {
  for (const options of [{ y: 1800 }, { height: 390 }, { reduced: true }, { zoom: 2 }]) {
    const t = setup(options);
    try {
      assert.equal(t.api.pinned, false);
      assert.equal(t.locks(), 0);
      assert.deepEqual(t.scrolls, []);
      if (!options.y) {
        t.move(t.start());
        t.tick();
        assert.equal(t.api.pinned, false);
        assert.equal(t.api.enabled, false);
      }
      t.manual(2);
      t.tick(40);
      assert.equal(t.offset(), 40);
    } finally {
      t.close();
    }
  }
});

test('navigation beyond the guide does not snap the page back to its hold point', () => {
  const t = setup();
  try {
    t.move(5000);
    t.tick();
    assert.equal(t.w.scrollY, 5000);
    assert.equal(t.api.pinned, false);
    assert.deepEqual(t.scrolls, []);
  } finally {
    t.close();
  }
});
test('resize, teardown and pagehide release only the guide lock, without scroll compensation', () => {
  for (const action of ['resize', 'destroy', 'pagehide']) {
    const t = setup();
    try {
      t.move(t.start());
      t.tick();
      const other = t.w.TDBScrollLock.acquire(),
        y = t.w.scrollY,
        calls = t.scrolls.length;
      if (action === 'resize') {
        t.w.innerHeight = 390;
        t.w.dispatchEvent(new t.w.Event('resize'));
        t.tick();
      } else if (action === 'pagehide') t.w.dispatchEvent(new t.w.Event('pagehide'));
      else t.api.destroy();
      assert.equal(t.locks(), 1);
      assert.equal(t.w.scrollY, y);
      assert.equal(t.scrolls.length, calls);
      assert.equal(t.api.pinned, false);
      other();
    } finally {
      t.close();
    }
  }
});
test('drawer ownership pauses the guide while its own independent hold survives', () => {
  const t = setup();
  try {
    const other = t.w.TDBScrollLock.acquire();
    t.move(t.start());
    t.tick();
    assert.equal(t.api.pinned, false);
    other();
    t.move(t.start() - 10);
    t.move(t.start());
    t.tick();
    assert.equal(t.api.pinned, true);
    const drawer = t.w.TDBScrollLock.acquire();
    t.root.setAttribute('inert', '');
    const before = t.offset();
    t.input(312);
    t.manual(3);
    t.tick(40);
    assert.equal(t.offset(), before);
    t.root.removeAttribute('inert');
    drawer();
    assert.equal(t.locks(), 1);
    t.input(312);
    assert.equal(t.offset(), 80);
  } finally {
    t.close();
  }
});
test('Escape, outside focus and external anchors release the hold without resetting progress or position', () => {
  for (const kind of ['escape', 'focus', 'anchor']) {
    const t = setup();
    try {
      t.move(t.start());
      t.tick();
      t.input(312);
      const before = t.offset(),
        calls = t.scrolls.length;
      if (kind === 'escape')
        t.w.document.dispatchEvent(
          new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
      else if (kind === 'focus')
        t.w.document.body.dispatchEvent(new t.w.Event('focusin', { bubbles: true }));
      else t.move(t.start() + 500);
      assert.equal(t.api.pinned, false);
      assert.equal(t.locks(), 0);
      assert.equal(t.offset(), before);
      assert.equal(t.scrolls.length, calls);
      t.move(t.w.scrollY - 10);
      t.tick();
      assert.equal(t.api.pinned, false, 'first departure is not recaptured');
    } finally {
      t.close();
    }
  }
});
