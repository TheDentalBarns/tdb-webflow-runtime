const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(count = 6, mobileWidth = false) {
  const dom = new JSDOM(
    `<section data-tdb-treatment-postage>
    <div class="swiper">${Array.from({ length: count }, (_, i) => `<div data-swiper-slide-index="${i}"><h3 class="tdb-treatment-title">Treatment ${i}</h3></div>`).join('')}</div><div data-tdb-native-progress></div>
    <div data-tdb-treatment-stamps><div class="tdb-treatment-controls">
    ${Array.from(
      { length: count },
      (_, i) => `<div class="tdb-treatment-card"><a
    data-tdb-treatment-stamp href="/treatments/${i}">Treatment ${i}</a></div>`,
    ).join('')}
    </div></div></section>`,
    { runScripts: 'outside-only', url: 'https://example.test' },
  );
  const w = dom.window,
    root = w.document.querySelector('section');
  const viewport = root.querySelector('.tdb-treatment-controls');
  const items = [...root.querySelectorAll('.tdb-treatment-card')];
  const links = [...root.querySelectorAll('a')],
    listeners = {};
  const media = { matches: mobileWidth };
  w.matchMedia = () => media;
  let clock = 0,
    frameId = 0;
  const frames = new Map();
  w.performance.now = () => clock;
  w.requestAnimationFrame = (fn) => {
    frames.set(++frameId, fn);
    return frameId;
  };
  w.cancelAnimationFrame = (id) => frames.delete(id);
  w.TDBMotion = { duration: () => 500, reduced: { matches: false } };
  w.HTMLElement.prototype.setPointerCapture = () => {};
  function tick(ms) {
    clock += ms;
    const running = [...frames.values()];
    frames.clear();
    running.forEach((fn) => fn(clock));
  }
  w.Element.prototype.animate = function (frames) {
    this.dataset.finalOpacity = frames.at(-1).opacity;
    this.dataset.finalColor = frames.at(-1).color;
    return { cancel() {} };
  };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      left: 50 + [...this.parentElement.children].indexOf(this) * 220 - viewport.scrollLeft,
      width: 200,
    };
  };
  root.querySelector('[data-tdb-native-progress]').getBoundingClientRect = () => ({ width: 800 });
  const swiper = (root.querySelector('.swiper').swiper = {
    slides: [...root.querySelector('.swiper').children],
    realIndex: 0,
    animating: false,
    on(events, callback) {
      for (const name of events.split(' ')) (listeners[name] ||= []).push(callback);
    },
    off(event, callback) {
      listeners[event] = listeners[event]?.filter((fn) => fn !== callback);
    },
    slideToLoop(index) {
      this.realIndex = index;
      listeners.slideChange?.forEach((fn) => fn());
    },
  });
  w.eval(fs.readFileSync('src/sliders/treatment-stamps.js', 'utf8'));
  const controller = w.TDBTreatmentStamps.prepare(root);
  return { dom, w, root, viewport, items, links, swiper, controller, media, tick, frames };
}
test('native stamps align first, intermediate and last positions with the progress marker', () => {
  const f = fixture();
  try {
    assert.equal(f.controller.measure(), 200);
    for (const i of [0, 2, 5]) {
      f.swiper.slideToLoop(i);
      const marker = (i * 600) / 5;
      f.controller.paint(i, marker, 800);
      assert.equal(f.items[i].getBoundingClientRect().left, 50 + marker);
      assert.equal(f.links[i].getAttribute('aria-current'), 'true');
      assert.equal(f.links.filter((l) => l.hasAttribute('aria-current')).length, 1);
      assert.deepEqual(
        f.swiper.slides.map((s) => s.querySelector('h3').dataset.finalColor),
        Array.from({ length: 6 }, (_, index) =>
          index === i ? '#ffffff' : 'rgba(255,255,255,0.5)',
        ),
      );
    }
  } finally {
    f.dom.window.close();
  }
});
test('manual scroll does not select an image or get pulled back by progress; click resumes alignment', () => {
  const f = fixture();
  try {
    f.controller.measure();
    f.swiper.slideToLoop(5);
    f.controller.paint(5, 600, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 100;
    f.controller.paint(5, 600, 800);
    assert.equal(f.viewport.scrollLeft, 100);
    assert.equal(f.swiper.realIndex, 5);
    f.links[0].click();
    assert.equal(f.swiper.realIndex, 0);
    assert.equal(f.viewport.scrollLeft, 0);
  } finally {
    f.dom.window.close();
  }
});
test('CMS navigation leaves modified clicks and unenhanced links usable', () => {
  const f = fixture();
  try {
    const click = new f.w.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    f.links[2].dispatchEvent(click);
    assert.equal(click.defaultPrevented, false);
    assert.equal(f.swiper.realIndex, 0);
    f.root.removeAttribute('data-tdb-treatment-postage');
    assert.equal(f.w.TDBTreatmentStamps.prepare(f.root), null);
  } finally {
    f.dom.window.close();
  }
});
test('single CMS treatment and loop seam produce finite scroll positions', () => {
  for (const count of [1, 6]) {
    const f = fixture(count);
    try {
      f.controller.measure();
      f.controller.paint(count - 0.5, 750, 800);
      assert.ok(Number.isFinite(f.viewport.scrollLeft));
      assert.ok(f.viewport.scrollLeft >= 0);
    } finally {
      f.dom.window.close();
    }
  }
});

test('mobile stamps recycle complete cycles in either direction without selecting another treatment', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    assert.equal(f.viewport.children.length, 18);
    assert.equal(f.viewport.querySelectorAll('[aria-hidden="true"]').length, 12);
    f.controller.paint(0, 0, 800);
    assert.equal(f.items[0].getBoundingClientRect().left, 50);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    const cycle = 6 * 220;
    for (const pos of [20, 2100, 10, 2200]) {
      f.viewport.scrollLeft = pos;
      f.viewport.dispatchEvent(new f.w.Event('scroll'));
      assert.ok(f.viewport.scrollLeft >= cycle / 2);
      assert.ok(f.viewport.scrollLeft < cycle * 1.5);
      assert.equal(Math.abs((f.viewport.scrollLeft - pos) % cycle), 0);
      assert.equal(f.swiper.realIndex, 0);
    }
  } finally {
    f.dom.window.close();
  }
});

test('mobile seam continues into the next set and duplicate stamps select the original CMS destination', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.controller.paint(5.99, 798, 800);
    const before = f.viewport.scrollLeft;
    f.controller.paint(0, 0, 800);
    assert.ok(Math.abs(f.viewport.scrollLeft - before) < 10, 'no visible reset at the seam');
    const repeated = f.viewport.firstElementChild.querySelector('a');
    const click = new f.w.MouseEvent('click', { bubbles: true, cancelable: true });
    repeated.dispatchEvent(click);
    assert.equal(click.defaultPrevented, true);
    assert.equal(f.swiper.realIndex, 0);
    assert.equal(repeated.tabIndex, -1);
    assert.equal(repeated.getAttribute('href'), '/treatments/0');
  } finally {
    f.dom.window.close();
  }
});

test('returning to desktop restores the original finite CMS row; disposal removes mobile copies', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.media.matches = false;
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    assert.deepEqual([...f.viewport.children], f.items);
    assert.equal(f.viewport.scrollLeft, 0);
    f.media.matches = true;
    f.controller.measure();
    f.controller.dispose();
    assert.deepEqual([...f.viewport.children], f.items);
    assert.equal(f.links[0].hasAttribute('data-tdb-stamp-index'), false);
  } finally {
    f.dom.window.close();
  }
});

test('mobile selection eases back from a manually scrolled position instead of snapping', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 1100;
    f.links[0].click();
    assert.equal(f.viewport.scrollLeft, 1100, 'first frame preserves the manual pose');
    f.tick(250);
    assert.ok(f.viewport.scrollLeft > 1100 && f.viewport.scrollLeft < 1320);
    f.tick(250);
    assert.equal(f.viewport.scrollLeft, 1320);
    assert.equal(f.frames.size, 0);
  } finally {
    f.dom.window.close();
  }
});

test('mobile touch drag crosses a recycled end continuously and coasts on release', () => {
  const f = fixture(6, true);
  function pointer(type, x, y = 100) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { button: 0, pointerType: 'touch', pointerId: 1, clientX: x, clientY: y });
    f.links[0].dispatchEvent(event);
  }
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    pointer('pointerdown', 100);
    f.tick(16);
    pointer('pointermove', -1000);
    const wrapped = f.viewport.scrollLeft;
    f.tick(16);
    pointer('pointermove', -1010);
    assert.equal(f.viewport.scrollLeft - wrapped, 10, 'recycling preserves the pointer origin');
    pointer('pointerup', -1010);
    const released = f.viewport.scrollLeft;
    f.tick(16);
    assert.ok(f.viewport.scrollLeft > released, 'release retains velocity');
    for (let i = 0; i < 60; i++) f.tick(16);
    assert.equal(f.frames.size, 0, 'momentum settles');
    assert.equal(f.swiper.realIndex, 0, 'manual browsing does not select a treatment');
  } finally {
    f.dom.window.close();
  }
});

test('touch capture transfer from a stamp image does not end the horizontal drag', () => {
  const f = fixture(6, true);
  function pointer(target, type, x, id = 1) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      button: 0,
      pointerType: 'touch',
      pointerId: id,
      clientX: x,
      clientY: 100,
    });
    target.dispatchEvent(event);
  }
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    pointer(f.links[0], 'pointerdown', 250);
    f.tick(16);
    pointer(f.links[0], 'pointermove', 230);
    const first = f.viewport.scrollLeft;
    // A real touch implicitly captures its image/link. Taking explicit capture
    // on the viewport releases that child and bubbles this event to the viewport.
    pointer(f.links[0], 'lostpointercapture', 230);
    f.tick(16);
    pointer(f.viewport, 'pointermove', 190);
    assert.equal(
      f.viewport.scrollLeft - first,
      40,
      'finger movement continues after capture transfer',
    );
    pointer(f.viewport, 'pointerup', 190, 2);
    f.tick(16);
    pointer(f.viewport, 'pointermove', 170);
    assert.equal(
      f.viewport.scrollLeft - first,
      60,
      'another pointer cannot cancel the active finger',
    );
    pointer(f.viewport, 'lostpointercapture', 170);
    const lost = f.viewport.scrollLeft;
    pointer(f.viewport, 'pointermove', 100);
    assert.equal(f.viewport.scrollLeft, lost, 'losing viewport capture really does end the drag');
  } finally {
    f.dom.window.close();
  }
});

test('return alignment shares one animation writer with repeated progress samples', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    let left = 1100,
      writes = 0;
    Object.defineProperty(f.viewport, 'scrollLeft', {
      get: () => left,
      set: (v) => {
        left = v;
        writes++;
      },
    });
    f.links[0].click();
    for (let i = 0; i < 10; i++) f.controller.paint(0, 0, 800);
    assert.equal(writes, 0, 'progress samples update the target without competing writes');
    assert.equal(f.frames.size, 1);
    f.tick(16);
    assert.equal(writes, 1);
  } finally {
    f.dom.window.close();
  }
});
