const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(__dirname + '/../src/treatment-guide/scroll.js', 'utf8');

function setup(options = {}) {
  const dom = new JSDOM(
    '<section data-tdb-guide data-tdb-guide-scroll><div class="treatment-guide_layout" style="margin-bottom:-100px"><div class="treatment-guide_dial-art"></div><div class="treatment-guide_content"></div></div></section>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    root = w.document.querySelector('section'),
    layout = root.firstElementChild;
  w.innerWidth = 390;
  w.innerHeight = options.height || 844;
  w.scrollY = options.y || 0;
  const reduced = new w.EventTarget();
  reduced.matches = !!options.reduced;
  w.matchMedia = () => reduced;
  w.TDBMotion = { reduced: { matches: false } };
  w.TDBScrollLock = { active: false };
  let owners = 0,
    active = 0,
    frameId = 0;
  const frames = new Map(),
    changes = [],
    scrolls = [];
  w.TDBSiteChrome = {
    acquire() {
      owners++;
      let live = true;
      return () => {
        if (live) owners--;
        live = false;
      };
    },
  };
  w.TDBSliderFocus = { release() {} };
  w.requestAnimationFrame = (fn) => {
    frames.set(++frameId, fn);
    return frameId;
  };
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
  const cardTop = () =>
    root.classList.contains('is-guide-scroll-enabled')
      ? Math.max(-15, 1000 - w.scrollY)
      : 1000 - w.scrollY;
  layout.getBoundingClientRect = () => ({
    top: cardTop(),
    bottom: cardTop() + 760,
    width: 390,
    height: 760,
  });
  layout.querySelector('.treatment-guide_dial-art').getBoundingClientRect = () => ({
    top: cardTop() + 20,
    bottom: cardTop() + 375,
    width: 355,
    height: 355,
  });
  layout.querySelector('.treatment-guide_content').getBoundingClientRect = () => ({
    top: cardTop() + 395,
    bottom: cardTop() + 660,
    width: 355,
    height: 265,
  });
  w.eval(source);
  const api = w.TDBTreatmentGuideScroll.mount(root, {
    select(index) {
      active = index;
      changes.push(index);
    },
    current: () => active,
    interact() {},
  });
  const track = root.querySelector('.tdb-guide-scroll-track');
  track.getBoundingClientRect = () => ({ top: 1000 - w.scrollY, width: 390 });
  const tick = () => {
    const list = [...frames.values()];
    frames.clear();
    list.forEach((fn) => fn(0));
  };
  tick();
  return {
    w,
    root,
    layout,
    track,
    api,
    changes,
    scrolls,
    reduced,
    move,
    tick,
    owners: () => owners,
    current: () => active,
    setIndex: (index) => {
      active = index;
      api.manual(index);
    },
    close() {
      api.destroy();
      w.close();
    },
  };
}

test('native scroll holds chrome across five chapters, then releases in both directions', () => {
  const t = setup();
  try {
    assert.equal(t.api.enabled, true);
    assert.equal(t.owners(), 0);
    for (let i = 0; i < 5; i++) {
      t.move(1015 + i * 312 + 10);
      t.tick();
      assert.equal(t.current(), i);
      assert.equal(t.api.pinned, true);
      assert.equal(t.owners(), 1);
    }
    assert.deepEqual(t.changes, [0, 1, 2, 3, 4]);
    t.move(1015 + 1561);
    t.tick();
    assert.equal(t.api.pinned, false);
    assert.equal(t.owners(), 0);
    t.move(1015 + 3 * 312);
    t.tick();
    assert.equal(t.current(), 3);
    t.move(1014);
    t.tick();
    assert.equal(t.current(), 0);
    assert.equal(t.owners(), 0);
    // This feature must not intercept or cancel browser gestures.
    for (const name of ['wheel', 'touchmove']) {
      const event = new t.w.Event(name, { bubbles: true, cancelable: true });
      t.root.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
  } finally {
    t.close();
  }
});

test('manual selection synchronises scroll progress through the existing Lenis owner', () => {
  const t = setup({ lenis: true });
  try {
    t.move(1100);
    t.tick();
    t.setIndex(3);
    t.tick();
    assert.equal(t.current(), 3);
    assert.ok(Math.abs(t.w.scrollY - (1015 + 3.15 * 312)) < 0.01);
    assert.equal(t.owners(), 1);
    t.w.TDBScrollLock.active = true;
    t.move(1015 + 312);
    t.tick();
    assert.equal(t.current(), 3, 'a modal owns reading while open');
    t.w.TDBScrollLock.active = false;
    t.move(1015 + 312);
    t.tick();
    assert.equal(t.current(), 1);
  } finally {
    t.close();
  }
});

test('short/reduced-motion screens retain the native card with no extra scroll travel', () => {
  for (const options of [{ height: 390 }, { reduced: true }]) {
    const t = setup(options);
    try {
      assert.equal(t.api.enabled, false);
      assert.equal(t.track.style.paddingBottom, '');
      t.move(1150);
      t.tick();
      assert.equal(t.owners(), 0);
      assert.deepEqual(t.changes, []);
    } finally {
      t.close();
    }
  }
});

test('rotation and teardown remove consumed travel without throwing the reader past the card', () => {
  for (const destroy of [false, true]) {
    const t = setup();
    try {
      t.move(1015 + 2 * 312);
      t.tick();
      if (destroy) t.api.destroy();
      else {
        t.w.innerHeight = 390;
        t.w.dispatchEvent(new t.w.Event('resize'));
        t.tick();
      }
      assert.equal(t.w.scrollY, 1015);
      assert.equal(t.owners(), 0);
      assert.equal(t.root.classList.contains('is-guide-scroll-enabled'), false);
      if (destroy) assert.equal(t.layout.parentElement, t.root);
    } finally {
      t.close();
    }
  }
});

test('restored positions do not get extra content inserted above them; return can arm the trial', () => {
  const t = setup({ y: 2100 });
  try {
    assert.equal(t.api.enabled, false);
    assert.equal(t.w.scrollY, 2100);
    t.move(800);
    t.tick();
    assert.equal(t.api.enabled, true);
    t.move(1020);
    t.tick();
    assert.equal(t.api.pinned, true);
  } finally {
    t.close();
  }
});

test('Escape, pagehide and reduced-motion changes release only this guide owner', () => {
  const t = setup();
  try {
    t.move(1100);
    t.tick();
    t.w.document.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape' }));
    t.tick();
    assert.equal(t.api.pinned, false);
    assert.equal(t.current(), 4);
    t.move(1100);
    t.tick();
    t.w.dispatchEvent(new t.w.Event('pagehide'));
    assert.equal(t.owners(), 0);
    t.w.dispatchEvent(new t.w.Event('pageshow'));
    t.tick();
    assert.equal(t.owners(), 1);
    t.reduced.matches = true;
    t.reduced.dispatchEvent(new t.w.Event('change'));
    t.tick();
    assert.equal(t.api.enabled, false);
    assert.equal(t.owners(), 0);
  } finally {
    t.close();
  }
});
