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
      on(name, callback) {
        assert.equal(name, 'scroll');
        this.paintScroll = callback;
        return () => {
          this.paintScroll = null;
        };
      },
      scrollTo(top, config) {
        assert.equal(config.immediate, true);
        assert.equal(config.force, true);
        scrolls.push(top);
        move(top);
      },
    };
  const cardTop = () => {
    if (!root.classList.contains('is-guide-scroll-enabled')) return 1000 - w.scrollY;
    const style = root.querySelector('.tdb-guide-scroll-track').style;
    const top = parseFloat(style.getPropertyValue('--tdb-guide-pin-top')) || 0;
    const travel = parseFloat(style.getPropertyValue('--tdb-guide-scroll-travel')) || 0;
    return Math.min(Math.max(top, 1000 - w.scrollY), 1000 + travel - w.scrollY);
  };
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

test('native scroll releases pinning in both directions while visible wheel keeps menus clear', () => {
  const t = setup();
  try {
    assert.equal(t.api.enabled, true);
    assert.equal(t.owners(), 0);
    for (let i = 0; i < 5; i++) {
      t.move(1000.5 + i * 312 + 10);
      t.tick();
      assert.equal(t.current(), i);
      assert.equal(t.api.pinned, true);
      assert.equal(t.owners(), 1);
    }
    assert.deepEqual(t.changes, [0, 1, 2, 3, 4]);
    t.move(1000.5 + 1561);
    t.tick();
    assert.equal(t.api.pinned, false);
    assert.equal(t.owners(), 1);
    t.move(1000.5 + 3 * 312);
    t.tick();
    assert.equal(t.current(), 3);
    t.move(999.5);
    t.tick();
    assert.equal(t.current(), 0);
    assert.equal(t.owners(), 1);
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

test('menus clear on wheel entry and return only after its final edge leaves, including reverse', () => {
  const t = setup();
  try {
    const otherRelease = t.w.TDBSiteChrome.acquire();
    t.move(177); // First pixel of the wheel has entered the 844px viewport.
    t.tick();
    assert.equal(t.api.pinned, false);
    assert.equal(t.owners(), 2);
    assert.equal(t.root.classList.contains('is-guide-chrome-away'), true);
    t.move(2561); // Pinning has finished, but the wheel is still visible.
    t.tick();
    assert.equal(t.api.pinned, false);
    assert.equal(t.owners(), 2);
    t.move(2934);
    t.tick();
    assert.equal(t.owners(), 2);
    t.move(2936);
    t.tick();
    assert.equal(t.owners(), 1);
    assert.equal(t.root.classList.contains('is-guide-chrome-away'), false);
    t.move(2900);
    t.tick();
    assert.equal(t.owners(), 2);
    t.move(175);
    t.tick();
    assert.equal(t.owners(), 1);
    t.move(1100);
    t.tick();
    t.api.destroy();
    assert.equal(t.owners(), 1, 'teardown leaves the other chrome owner intact');
    assert.equal(t.root.classList.contains('is-guide-chrome-away'), false);
    otherRelease();
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
    assert.ok(Math.abs(t.w.scrollY - (1000.5 + 3.15 * 312)) < 0.01);
    assert.equal(
      t.root.querySelector('.tdb-guide-scroll-progress circle').style.strokeDashoffset,
      '37.000',
    );
    assert.equal(t.owners(), 1);
    t.w.TDBScrollLock.active = true;
    t.move(1000.5 + 312);
    t.tick();
    assert.equal(t.current(), 3, 'a modal owns reading while open');
    t.w.TDBScrollLock.active = false;
    t.move(1000.5 + 312);
    t.tick();
    assert.equal(t.current(), 1);
  } finally {
    t.close();
  }
});

test('rim fills continuously across the entire scroll journey and unwinds on reverse travel', () => {
  const t = setup();
  try {
    const arc = t.root.querySelector('.tdb-guide-scroll-progress circle');
    assert.equal(arc.getAttribute('r'), '175');
    assert.equal(arc.getAttribute('stroke-width'), '5');
    assert.equal(arc.style.strokeDashoffset, '100.000');
    for (const fraction of [0, 0.125, 0.2, 0.5, 0.8, 0.999, 1, 1.2, 0.45, -0.1]) {
      t.move(1000.5 + fraction * 1560);
      t.tick();
      assert.ok(
        Math.abs(
          Number(arc.style.strokeDashoffset) - 100 * (1 - Math.max(0, Math.min(1, fraction))),
        ) < 0.001,
      );
      if (fraction === 0.999) assert.equal(t.api.pinned, true);
      if (fraction === 1) {
        assert.equal(t.api.pinned, false);
        assert.equal(arc.style.strokeDashoffset, '0.000');
      }
    }
    t.api.destroy();
    assert.equal(t.root.querySelector('.tdb-guide-scroll-progress'), null);
    assert.ok(t.root.querySelector('.treatment-guide_rim'), 'native rim survives teardown');
  } finally {
    t.close();
  }
});

test('wheel pins at 5vw and keeps progress when the viewport gap changes', () => {
  for (const width of [320, 390, 768, 1440]) {
    const t = setup({ width, height: 1200 });
    try {
      const gap = width * 0.05;
      const start = 1020 - gap;
      const distance = Math.max(240, Math.min(480, width * 0.8));
      const art = t.root.querySelector('.treatment-guide_dial-art');
      const arc = t.root.querySelector('.tdb-guide-scroll-progress circle');
      t.move(start + distance * 2.5);
      t.tick();
      assert.equal(art.getBoundingClientRect().top, gap);
      assert.equal(arc.style.strokeDashoffset, '50.000');
      t.w.innerWidth = width + 40;
      t.w.dispatchEvent(new t.w.Event('resize'));
      t.tick();
      assert.equal(art.getBoundingClientRect().top, (width + 40) * 0.05);
      assert.equal(arc.style.strokeDashoffset, '50.000');
      assert.equal(t.api.pinned, true);
    } finally {
      t.close();
    }
  }
});

test('the full 5vw gap must fit above the controls before pinning', () => {
  const t = setup({ height: 665 });
  try {
    // Content spans 640px. The old 5px gap fit; 19.5px plus 12px below does not.
    assert.equal(t.api.enabled, false);
  } finally {
    t.close();
  }
});

test('progress paints in the native or Lenis scroll event at any speed without a trailing frame', () => {
  for (const lenis of [false, true]) {
    const t = setup({ lenis });
    try {
      const arc = t.root.querySelector('.tdb-guide-scroll-progress circle');
      for (const pixels of [1, 2, 15, 249, 1200, 600, 599, 1560, 0]) {
        if (lenis) {
          // Lenis has rendered the position, before the next native scroll event.
          t.w.scrollY = 1000.5 + pixels;
          t.w.lenis.paintScroll();
        } else t.move(1000.5 + pixels);
        const expected = 100 * (1 - pixels / 1560);
        assert.ok(Math.abs(Number(arc.style.strokeDashoffset) - expected) < 0.001);
        t.tick();
        assert.ok(Math.abs(Number(arc.style.strokeDashoffset) - expected) < 0.001);
      }
      t.api.destroy();
      if (lenis) assert.equal(t.w.lenis.paintScroll, null);
    } finally {
      t.close();
    }
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
      assert.equal(t.owners(), 1, 'the visible fallback wheel also keeps menus clear');
      assert.deepEqual(t.changes, []);
    } finally {
      t.close();
    }
  }
});

test('finger rotation scrubs the same travel, can finish the section, and stops on release', () => {
  const t = setup({ lenis: true });
  try {
    assert.equal(t.api.beginRotation(), false);
    t.move(1000.5 + 156);
    t.tick();
    assert.equal(t.api.beginRotation(), true);
    t.api.rotate(0.25);
    assert.equal(t.w.scrollY, 1000.5 + 156 + 78);
    assert.equal(t.root.querySelector('circle').style.strokeDashoffset, '85.000');
    t.api.rotate(-0.1);
    t.tick();
    assert.equal(t.root.querySelector('circle').style.strokeDashoffset, '87.000');
    t.api.rotate(10);
    t.tick();
    assert.equal(t.w.scrollY, 1000.5 + 1560);
    assert.equal(t.api.pinned, false);
    assert.equal(t.current(), 4);
    assert.equal(t.root.querySelector('circle').style.strokeDashoffset, '0.000');
    t.api.rotate(-0.25);
    t.tick();
    assert.equal(t.api.pinned, true);
    t.api.endRotation();
    const y = t.w.scrollY;
    t.api.rotate(1);
    t.tick();
    assert.equal(t.w.scrollY, y);
  } finally {
    t.close();
  }
});

test('rotation and teardown remove consumed travel without throwing the reader past the card', () => {
  for (const destroy of [false, true]) {
    const t = setup();
    try {
      t.move(1000.5 + 2 * 312);
      t.tick();
      if (destroy) t.api.destroy();
      else {
        t.w.innerHeight = 390;
        t.w.dispatchEvent(new t.w.Event('resize'));
        t.tick();
      }
      assert.equal(t.w.scrollY, 1000.5);
      assert.equal(t.owners(), destroy ? 0 : 1);
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
    assert.equal(t.owners(), 1);
    t.move(1600);
    t.tick();
    assert.equal(t.owners(), 0);
  } finally {
    t.close();
  }
});
