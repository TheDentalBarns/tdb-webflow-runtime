const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(count = 6, mobileWidth = false, loop = mobileWidth, confirmLinks = false) {
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
  if (confirmLinks) {
    root
      .querySelector('[data-tdb-treatment-stamps]')
      .setAttribute('data-tdb-stamp-link-mode', 'confirm');
    root.querySelectorAll('[data-tdb-treatment-stamp]').forEach((link) => {
      const overlay = w.document.createElement('span');
      overlay.setAttribute('data-tdb-stamp-link-overlay', '');
      link.append(overlay);
    });
  }
  root.setAttribute('data-tdb-treatment-loop', String(loop));
  Object.defineProperty(viewport, 'clientWidth', { get: () => 800 });
  Object.defineProperty(viewport, 'scrollWidth', {
    get: () => Math.max(800, viewport.children.length * 220 - 20),
  });
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
    params: { loop },
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
    slideTo(index) {
      this.slideToLoop(index);
    },
  });
  w.eval(fs.readFileSync('src/sliders/treatment-stamps.js', 'utf8'));
  const controller = w.TDBTreatmentStamps.prepare(root);
  return { dom, w, root, viewport, items, links, swiper, controller, media, tick, frames };
}

test('inactive stamps select only; settled active stamps preview then follow the CMS link', () => {
  const f = fixture(6, false, false, true);
  const clicks = [];
  f.root.addEventListener('click', (e) => {
    clicks.push(e.defaultPrevented);
    e.preventDefault();
  });
  try {
    f.controller.measure();
    f.links[0].click();
    assert.equal(clicks.at(-1), true, 'initially active stamp still requires a preview press');
    assert.equal(f.links[0].hasAttribute('data-tdb-stamp-link-ready'), true);
    assert.equal(f.links[0].querySelector('[data-tdb-stamp-link-overlay]').style.opacity, '1');
    f.links[0].click();
    assert.equal(clicks.at(-1), false, 'second press follows the original link');
    f.links[2].click();
    assert.equal(clicks.at(-1), true);
    assert.equal(f.swiper.realIndex, 2);
    assert.equal(f.links[0].hasAttribute('data-tdb-stamp-link-ready'), false);
    assert.equal(
      f.links[2].hasAttribute('data-tdb-stamp-link-ready'),
      false,
      'selection stays highlighted',
    );
    f.links[2].click();
    assert.equal(
      f.links[2].hasAttribute('data-tdb-stamp-link-ready'),
      true,
      'next press previews the active link',
    );
    f.swiper.slideTo(3);
    assert.equal(
      f.links[2].hasAttribute('data-tdb-stamp-link-ready'),
      false,
      'main arrow clears link state',
    );
    f.links[3].click();
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    assert.equal(f.links[3].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.links[3].click();
    assert.equal(clicks.at(-1), true, 'scrolling requires a fresh preview');
    const modified = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    f.links[1].dispatchEvent(modified);
    assert.equal(clicks.at(-1), false, 'modified clicks retain browser behavior');
  } finally {
    f.dom.window.close();
  }
});

test('a moving focus card cannot arm or follow a stamp link', () => {
  const f = fixture(6, false, false, true);
  f.root.addEventListener('click', (e) => e.preventDefault());
  try {
    f.controller.measure();
    f.links[2].click();
    f.swiper.animating = true;
    f.links[2].click();
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.swiper.animating = false;
    f.links[2].click();
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), true);
  } finally {
    f.dom.window.close();
  }
});

test('touch selects, then previews and follows without needing compatibility clicks', () => {
  const f = fixture(6, true, false, true);
  let navigations = 0;
  f.root.addEventListener('click', (e) => {
    if (!e.defaultPrevented) navigations++;
    e.preventDefault();
  });
  const pointer = (name, id, x = 200) => {
    const e = new f.w.Event(name, { bubbles: true, cancelable: true });
    Object.assign(e, {
      button: 0,
      isPrimary: true,
      pointerId: id,
      pointerType: 'touch',
      clientX: x,
      clientY: 50,
    });
    f.links[2].dispatchEvent(e);
  };
  try {
    f.controller.measure();
    pointer('pointerdown', 1);
    pointer('pointerup', 1);
    assert.equal(navigations, 0);
    assert.equal(f.swiper.realIndex, 2);
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.tick(500);
    pointer('pointerdown', 2);
    pointer('pointerup', 2);
    assert.equal(navigations, 0, 'active stamp previews before following');
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), true);
    pointer('pointerdown', 3);
    pointer('pointerup', 3);
    assert.equal(navigations, 1);
    const compatibility = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1,
    });
    Object.defineProperty(compatibility, 'pointerId', { value: 3 });
    f.links[2].dispatchEvent(compatibility);
    assert.equal(navigations, 1, 'browser compatibility click cannot navigate twice');
    pointer('pointerdown', 4);
    f.tick(20);
    pointer('pointermove', 4, 180);
    pointer('pointerup', 4, 180);
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false, 'drag disarms');
    pointer('pointerdown', 5);
    pointer('pointerup', 5);
    assert.equal(navigations, 1, 'first tap after dragging only returns to selection');
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.tick(500);
    pointer('pointerdown', 6);
    pointer('pointerup', 6);
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), true);
  } finally {
    f.dom.window.close();
  }
});

test('mouse and tablet touch have the same frame-rate-independent coast and immediate re-grab', () => {
  const distances = [];
  for (const type of ['mouse', 'touch'])
    for (const step of [8, 16, 32]) {
      const f = fixture(6, false, false);
      const pointer = (name, x) => {
        const e = new f.w.Event(name, { bubbles: true, cancelable: true });
        Object.assign(e, {
          button: 0,
          isPrimary: true,
          pointerId: 1,
          pointerType: type,
          clientX: x,
          clientY: 50,
        });
        f.viewport.dispatchEvent(e);
      };
      try {
        f.controller.measure();
        pointer('pointerdown', 300);
        f.tick(20);
        pointer('pointermove', 290);
        f.tick(20);
        pointer('pointermove', 280);
        pointer('pointerup', 280);
        const released = f.viewport.scrollLeft;
        for (let t = 0; t < 320; t += step) f.tick(step);
        assert.ok(
          f.viewport.scrollLeft > released + 70,
          'release glides instead of stopping abruptly',
        );
        distances.push(f.viewport.scrollLeft);
        const caught = f.viewport.scrollLeft;
        pointer('pointerdown', 200);
        f.tick(100);
        assert.equal(
          f.viewport.scrollLeft,
          caught,
          'grabbing stops the coast at its current position',
        );
        pointer('pointermove', 190);
        assert.equal(
          f.viewport.scrollLeft,
          caught + 10,
          'pointer follows one-to-one without jumping',
        );
        assert.equal(f.swiper.realIndex, 0, 'browsing never auto-selects');
      } finally {
        f.dom.window.close();
      }
    }
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.001);
});

test('holding before release kills stale momentum, and reduced motion stops at release', () => {
  for (const reduced of [false, true]) {
    const f = fixture(6, false, false);
    const pointer = (name, x) => {
      const e = new f.w.Event(name, { bubbles: true, cancelable: true });
      Object.assign(e, { button: 0, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: 50 });
      f.viewport.dispatchEvent(e);
    };
    try {
      f.controller.measure();
      f.w.TDBMotion.reduced.matches = reduced;
      pointer('pointerdown', 300);
      f.tick(20);
      pointer('pointermove', 270);
      if (!reduced) f.tick(110);
      pointer('pointerup', 270);
      f.tick(400);
      assert.equal(f.viewport.scrollLeft, 30);
      assert.equal(f.frames.size, 0);
    } finally {
      f.dom.window.close();
    }
  }
});
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
    assert.equal(f.viewport.scrollLeft, 100, 'desktop return starts at the manual position');
    f.tick(250);
    assert.ok(f.viewport.scrollLeft > 0 && f.viewport.scrollLeft < 100);
    f.tick(250);
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
    for (let i = 0; i < 130; i++) f.tick(16);
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

test('finite mobile stamps drag freely to both ends, never overscroll, and ease back to selection', () => {
  const f = fixture(6, true, false);
  function pointer(type, x) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      button: 0,
      pointerType: 'touch',
      pointerId: 1,
      clientX: x,
      clientY: 100,
    });
    f.viewport.dispatchEvent(event);
  }
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    assert.equal(f.viewport.children.length, 6, 'no loop copies without explicit opt-in');
    pointer('pointerdown', 200);
    f.tick(16);
    pointer('pointermove', -1000);
    assert.equal(f.viewport.scrollLeft, 500, 'clamps at the last stamp');
    f.tick(16);
    pointer('pointermove', -980);
    assert.equal(f.viewport.scrollLeft, 480, 'finger can reverse immediately at an end');
    pointer('pointerup', -980);
    for (let i = 0; i < 60; i++) f.tick(16);
    assert.ok(f.viewport.scrollLeft >= 0 && f.viewport.scrollLeft <= 500);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 400;
    // Browsers may omit the drag's compatibility click. One later activation
    // must be enough; there is no stale suppression flag to consume first.
    f.links[0].click();
    assert.equal(f.viewport.scrollLeft, 400);
    f.tick(250);
    assert.ok(f.viewport.scrollLeft > 0 && f.viewport.scrollLeft < 400);
    f.tick(250);
    assert.equal(f.viewport.scrollLeft, 0);
  } finally {
    f.dom.window.close();
  }
});

test('drag click suppression belongs to that gesture, not the next tap or keyboard activation', () => {
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const f = fixture(6, true, false);
    function pointer(type, id, x) {
      const event = new f.w.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        button: 0,
        isPrimary: true,
        pointerType: 'touch',
        pointerId: id,
        clientX: x,
        clientY: 100,
      });
      f.viewport.dispatchEvent(event);
    }
    function click(id, detail = 1) {
      const event = new f.w.MouseEvent('click', { bubbles: true, cancelable: true, detail });
      Object.defineProperty(event, 'pointerId', { value: id });
      f.links[2].dispatchEvent(event);
    }
    try {
      f.controller.measure();
      pointer('pointerdown', 1, 250);
      f.tick(16);
      pointer('pointermove', 1, 150);
      pointer(ending, 1, 150);
      if (ending === 'pointerup') {
        click(1);
        assert.equal(f.swiper.realIndex, 0, 'the drag itself does not select');
      }
      click(2);
      assert.equal(f.swiper.realIndex, 2, 'a new touch activates on its first click');
      f.swiper.slideTo(0);
      pointer('pointerdown', 6, 250);
      f.tick(16);
      pointer('pointermove', 6, 150);
      pointer(ending, 6, 150);
      click(7);
      assert.equal(f.swiper.realIndex, 2, 'new touch works even when no drag click was emitted');
      pointer('pointerdown', 3, 250);
      f.tick(16);
      pointer('pointermove', 3, 150);
      pointer(ending, 3, 150);
      f.links[0].click();
      assert.equal(f.swiper.realIndex, 0, 'keyboard activation is never swallowed');
      pointer('pointerdown', 4, 250);
      f.tick(16);
      pointer('pointermove', 4, 150);
      pointer(ending, 4, 150);
      f.tick(600);
      click(4);
      assert.equal(
        f.swiper.realIndex,
        2,
        'suppression expires when no compatibility click arrives',
      );
      pointer('pointerdown', 5, 250);
      f.tick(16);
      pointer('pointermove', 5, 150);
      pointer(ending, 5, 150);
      pointer('pointerdown', 5, 200);
      pointer('pointerup', 5, 200);
      f.links[1].dispatchEvent(
        new f.w.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
      );
      assert.equal(
        f.swiper.realIndex,
        1,
        'reused pointer IDs and legacy mouse clicks activate on first tap',
      );
    } finally {
      f.dom.window.close();
    }
  }
});

test('selecting an already-aligned stamp stays still while the main image catches up', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    f.swiper.slideTo(5);
    f.controller.paint(5, 600, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 0;
    f.swiper.animating = true;
    f.links[0].click();
    // The image can move more slowly than the return easing. Its intermediate
    // positions must not pull the stamp away from its selected destination.
    for (const index of [5, 4.9, 4.8, 4, 2, 0.1]) {
      f.controller.paint(index, index * 120, 800);
      f.tick(100);
      assert.equal(f.viewport.scrollLeft, 0, 'Veneers remains at the left edge');
    }
    f.swiper.animating = false;
    f.controller.paint(0, 0, 800);
    assert.equal(f.viewport.scrollLeft, 0);
    f.swiper.slideTo(1);
    f.controller.paint(1, 120, 800);
    assert.equal(f.viewport.scrollLeft, 100, 'normal progress following resumes after handoff');
  } finally {
    f.dom.window.close();
  }
});

test('manual stamp return takes a direct path and holds its target until the main slide settles', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    f.swiper.slideTo(5);
    f.controller.paint(5, 600, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 400;
    f.swiper.animating = true;
    f.links[1].click();
    let previous = 400;
    for (const index of [5, 4.9, 4.8, 4, 3, 2, 1.5]) {
      f.controller.paint(index, index * 120, 800);
      f.tick(100);
      assert.ok(f.viewport.scrollLeft <= previous, 'never reverses direction');
      assert.ok(f.viewport.scrollLeft >= 100, 'never overshoots its final position');
      previous = f.viewport.scrollLeft;
    }
    assert.equal(f.viewport.scrollLeft, 100);
    f.swiper.animating = false;
    f.controller.paint(1, 120, 800);
    assert.equal(f.viewport.scrollLeft, 100);
  } finally {
    f.dom.window.close();
  }
});

test('stamp opacity keeps one native transition target rather than cancelling filled animations', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    assert.equal(f.items[0].style.opacity, '1');
    f.swiper.slideTo(1);
    f.swiper.slideTo(2);
    f.swiper.slideTo(0);
    assert.equal(f.items[0].style.opacity, '1');
    assert.equal(f.items[1].style.opacity, '0.5');
    assert.equal(f.items[2].style.opacity, '0.5');
    assert.ok(
      f.items.every((item) => !item.dataset.finalOpacity),
      'stamp opacity never uses filled WAAPI animations',
    );
    f.controller.dispose();
    assert.ok(f.items.every((item) => item.style.opacity === ''));
  } finally {
    f.dom.window.close();
  }
});

test('mobile touch release selects once even when scrolling suppresses the browser click', () => {
  const f = fixture(6, true, false);
  function pointer(target, type, id, x, y = 100) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      button: 0,
      isPrimary: true,
      pointerType: 'touch',
      pointerId: id,
      clientX: x,
      clientY: y,
    });
    target.dispatchEvent(event);
  }
  try {
    f.controller.measure();
    let selections = 0,
      focuses = 0;
    const slideTo = f.swiper.slideTo.bind(f.swiper);
    f.swiper.slideTo = (index) => {
      selections++;
      slideTo(index);
    };
    f.w.TDBSliderFocus = {
      resume() {
        focuses++;
      },
    };
    pointer(f.links[0], 'pointerdown', 1, 250);
    f.tick(16);
    pointer(f.links[0], 'pointermove', 1, 150);
    pointer(f.viewport, 'pointerup', 1, 150);
    f.tick(16);
    assert.equal(selections, 0, 'swiping does not activate a stamp');
    const image = f.w.document.createElement('img');
    f.links[2].append(image);
    pointer(image, 'pointerdown', 2, 200);
    pointer(image, 'pointerup', 2, 200);
    assert.equal(
      f.swiper.realIndex,
      2,
      'first clean release selects without needing a click event',
    );
    assert.equal(selections, 1);
    assert.equal(focuses, 1, 'touch activation uses the shared banner-away behavior');
    const compatibilityClick = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1,
    });
    Object.defineProperty(compatibilityClick, 'pointerId', { value: 2 });
    image.dispatchEvent(compatibilityClick);
    assert.equal(selections, 1, 'optional browser click does not activate twice');
    assert.equal(compatibilityClick.defaultPrevented, true, 'tap does not navigate away');
    pointer(f.links[0], 'pointerdown', 3, 200);
    pointer(f.links[0], 'pointercancel', 3, 200);
    assert.equal(selections, 1, 'cancelled touches never activate');
    pointer(f.links[0], 'pointerdown', 4, 200);
    pointer(f.links[0], 'pointermove', 4, 201, 125);
    pointer(f.links[0], 'pointerup', 4, 201, 125);
    assert.equal(selections, 1, 'vertical page scrolling never activates');
    pointer(f.links[0], 'pointerdown', 5, 200);
    pointer(f.links[0], 'pointerup', 5, 200);
    assert.equal(selections, 2, 'next tap works immediately after cancelled scrolling');
    assert.equal(f.swiper.realIndex, 0);
    f.links[1].click();
    assert.equal(selections, 3, 'keyboard activation remains available');
  } finally {
    f.dom.window.close();
  }
});
