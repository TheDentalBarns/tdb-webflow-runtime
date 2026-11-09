const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(__dirname + '/../' + file, 'utf8');

test('native chapter disclosure remains available when enhancement is not permitted', () => {
  const dom = new JSDOM(
    '<section data-tdb-guide><details><summary data-tdb-guide-open>Learn more</summary><p>CMS chapter</p></details></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window;
  w.TDBConsent = { allows: () => false };
  w.TDBFeatureLoading = { watchIntent() {} };
  w.eval(read('src/runtime/treatment-guide-loader.js'));
  w.prepareTreatmentGuideLoader();
  const click = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  w.document.querySelector('summary').dispatchEvent(click);
  assert.equal(click.defaultPrevented, false);
  w.TDBTreatmentGuideLoader.destroy();
  w.close();
});
test('rounded wedge masks reproduce from their colour-free source', () => {
  require('node:child_process').execFileSync(process.execPath, [
    __dirname + '/../tools/runtime-build/build-guide-pressure.cjs',
    '--check',
  ]);
});
test('scroll guide warms only its adjacent exit image after consent and restores loading ownership', () => {
  for (const allowed of [true, false]) {
    const dom = new JSDOM(
      '<img id="before" loading="lazy"><section data-tdb-guide data-tdb-guide-scroll></section><section><div data-tdb-page-break><img id="exit" loading="lazy"></div></section><section data-tdb-page-break><img id="later" loading="lazy"></section>',
      { runScripts: 'outside-only' },
    );
    const w = dom.window;
    w.TDBConsent = { allows: () => allowed };
    w.TDBFeatureLoading = { watchIntent() {} };
    w.eval(read('src/runtime/treatment-guide-loader.js'));
    w.prepareTreatmentGuideLoader();
    assert.equal(
      w.document.querySelector('#exit').getAttribute('loading'),
      allowed ? 'eager' : 'lazy',
    );
    assert.equal(w.document.querySelector('#before').getAttribute('loading'), 'lazy');
    assert.equal(w.document.querySelector('#later').getAttribute('loading'), 'lazy');
    w.TDBTreatmentGuideLoader.destroy();
    assert.equal(w.document.querySelector('#exit').getAttribute('loading'), 'lazy');
    w.close();
  }
});
function wheel(withNativeTabs = false, scrollTrial = false) {
  const dom = new JSDOM(
    `<section data-tdb-guide><nav>${Array.from({ length: 5 }, (_, i) => `<a href="#" data-tdb-guide-choice="${i}" class="${i === 0 ? 'w--current' : ''}">Chapter ${i + 1}</a>`).join('')}</nav><div class="treatment-guide_dial-art">${read('tests/fixtures/treatment-guide-native.svg')}</div></section>`,
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    root = w.document.querySelector('section'),
    artwork = root.querySelector('.treatment-guide_finger-pad'),
    choices = [...root.querySelectorAll('[data-tdb-guide-choice]')],
    menu = root.querySelector('nav');
  menu.className = 'treatment-guide_wheel';
  root.querySelector('.treatment-guide_dial-art').getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 400,
    height: 400,
  });
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  let observeVisibility;
  w.IntersectionObserver = class {
    constructor(callback) {
      observeVisibility = callback;
    }
    observe() {}
    disconnect() {}
  };
  w.TDBMotionPolicy = { reduced: { matches: false } };
  const scrollRotation = { moves: [], ends: 0 };
  if (scrollTrial)
    w.TDBTreatmentGuideScroll = {
      mount: () => ({
        enabled: true,
        pinned: true,
        manual() {},
        destroy() {},
        beginRotation: () => true,
        rotate: (chapters) => scrollRotation.moves.push(chapters),
        endRotation: () => scrollRotation.ends++,
      }),
    };
  const cardChanges = [];
  w.TDBTreatmentGuideCard = {
    mount: () => ({ update: (index) => cardChanges.push(index), destroy() {} }),
  };
  w.matchMedia = () => ({ matches: true });
  let time = 0,
    id = 0;
  const frames = new Map();
  const timers = new Map();
  w.setTimeout = (fn, delay) => (timers.set(++id, { fn, due: time + delay }), id);
  w.clearTimeout = (id) => timers.delete(id);
  w.requestAnimationFrame = (fn) => (frames.set(++id, fn), id);
  w.cancelAnimationFrame = (id) => frames.delete(id);
  Object.defineProperty(w.performance, 'now', { value: () => time });
  for (const choice of choices)
    choice.addEventListener('click', (e) => {
      e.preventDefault();
      choices.forEach((c) => c.classList.toggle('w--current', c === choice));
      choice.focus();
    });
  if (withNativeTabs) {
    const tabs = w.document.createElement('div');
    tabs.className = 'treatment-guide_tabs';
    tabs.setAttribute('data-duration-in', '400');
    tabs.setAttribute('data-duration-out', '200');
    root.append(tabs);
    const state = { config: { intro: 400, outro: 200, immediate: false, easing: 'ease' } };
    w.jQuery = { data: (element, key) => (element === tabs && key === '.w-tabs' ? state : null) };
  }
  w.eval(read('src/treatment-guide/pressure-masks.js'));
  w.eval(read('src/treatment-guide/pressure.js'));
  w.eval(read('src/treatment-guide/wheel.js'));
  const api = w.TDBTreatmentGuideWheel.mount(root),
    pressure = root.querySelector('.treatment-guide_pressure'),
    segments = [...root.querySelectorAll('[data-guide-segment]')];
  function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      time += 16;
      for (const [key, timer] of timers) {
        if (timer.due > time) continue;
        timers.delete(key);
        timer.fn();
      }
      const list = [...frames.values()];
      frames.clear();
      list.forEach((fn) => fn(time));
    }
  }
  function pointer(type, x, y, target = menu) {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { pointerId: 1, clientX: x, clientY: y, button: 0 });
    target.dispatchEvent(e);
    return e;
  }
  const position = () =>
    pressure
      .getAttribute('transform')
      .match(/-?[\d.]+/g)
      .map((n) => (Number(n) - 500) * 0.4);
  const point = (degrees) => [
    200 + Math.sin((degrees * Math.PI) / 180) * 128,
    200 - Math.cos((degrees * Math.PI) / 180) * 128,
  ];
  return {
    w,
    root,
    artwork,
    menu,
    choices,
    cardChanges,
    scrollRotation,
    api,
    pressure,
    segments,
    tick,
    pointer,
    position,
    point,
    view(ratio = 1) {
      observeVisibility([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    },
    pendingWork: () => frames.size + timers.size,
    dispose() {
      api.destroy();
      w.close();
    },
  };
}
test('touch rotation overrides scroll progress and releases without a second chapter jump', () => {
  const t = wheel(false, true);
  try {
    const touch = (type, degrees) => {
      const [clientX, clientY] = t.point(degrees);
      const event = new t.w.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { pointerId: 7, pointerType: 'touch', button: 0, clientX, clientY });
      t.menu.dispatchEvent(event);
      return event;
    };
    assert.equal(touch('pointerdown', 72).defaultPrevented, true);
    assert.equal(t.root.classList.contains('is-wheel-dragging'), true);
    touch('pointermove', 108);
    touch('pointermove', 90);
    assert.ok(Math.abs(t.scrollRotation.moves[0] - 0.5) < 0.001);
    assert.ok(Math.abs(t.scrollRotation.moves[1] + 0.25) < 0.001);
    touch('pointerup', 72);
    assert.equal(
      t.menu.getAttribute('aria-valuenow'),
      '1',
      'touch down does not jump to the touched sector',
    );
    assert.equal(t.scrollRotation.ends, 1);
    assert.equal(t.root.classList.contains('is-wheel-dragging'), false);
    touch('pointerdown', 144);
    touch('pointercancel', 160);
    touch('pointerup', 144);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1', 'cancellation does not jump chapters');
    assert.equal(t.scrollRotation.ends, 2);
  } finally {
    t.dispose();
  }
});

test('HTML touch surface reserves only a one-finger annulus drag, leaving the centre and pinch native', () => {
  const t = wheel(false, true);
  try {
    const surface = t.root.querySelector('.tdb-guide-touch-surface');
    assert.ok(surface);
    const touch = (count = 1) => {
      const e = new t.w.Event('touchmove', { bubbles: true, cancelable: true });
      Object.assign(e, { touches: Array(count).fill({}) });
      surface.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const down = (x, y) => {
      const e = new t.w.Event('pointerdown', { bubbles: true, cancelable: true });
      Object.assign(e, { pointerId: 1, pointerType: 'touch', button: 0, clientX: x, clientY: y });
      surface.dispatchEvent(e);
      return e.defaultPrevented;
    };
    assert.equal(down(200, 200), false);
    assert.equal(touch(), false);
    assert.equal(down(...t.point(72)), true);
    assert.equal(touch(), true);
    assert.equal(touch(2), false);
    t.pointer('pointerup', ...t.point(72), surface);
    assert.equal(touch(), false);
    t.api.destroy();
    assert.equal(t.root.querySelector('.tdb-guide-touch-surface'), null);
  } finally {
    t.dispose();
  }
});

test('first touch survives deferred wheel loading with its pointer type and latest position', async () => {
  const dom = new JSDOM(
    '<section data-tdb-guide data-tdb-guide-scroll><div data-tdb-guide-pad></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    pad = w.document.querySelector('[data-tdb-guide-pad]');
  let loaded, seed;
  const wait = new Promise((resolve) => {
    loaded = resolve;
  });
  w.TDBFeatureLoading = { watchIntent() {} };
  w.TDBRuntimeModuleRoot = 'https://example.org/dist/';
  w.TDBModules = { load: () => wait };
  w.TDBTreatmentGuideWheel = {
    mount: () => ({
      resume: (value) => {
        seed = value;
      },
      destroy() {},
    }),
  };
  w.eval(read('src/runtime/treatment-guide-loader.js'));
  w.prepareTreatmentGuideLoader();
  try {
    for (const [type, x] of [
      ['pointerdown', 10],
      ['pointermove', 30],
    ]) {
      const event = new w.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        button: 0,
        pointerId: 7,
        pointerType: 'touch',
        clientX: x,
        clientY: 20,
      });
      pad.dispatchEvent(event);
    }
    const touch = new w.Event('touchmove', { bubbles: true, cancelable: true });
    Object.assign(touch, { touches: [{}] });
    pad.dispatchEvent(touch);
    assert.equal(touch.defaultPrevented, true);
    loaded();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(seed.pointerType, 'touch');
    assert.equal(seed.startX, 10);
    assert.equal(seed.clientX, 30);
    assert.equal(seed.down, true);
  } finally {
    w.TDBTreatmentGuideLoader.destroy();
    w.close();
  }
});

test('a tap released before the wheel loads can replay without capturing an inactive pointer', () => {
  const t = wheel();
  try {
    t.root.setPointerCapture = () => {
      throw new Error('pointer is no longer active');
    };
    const [clientX, clientY] = t.point(144);
    t.api.resume({
      pointerId: 2,
      pointerType: 'touch',
      startX: clientX,
      startY: clientY,
      clientX,
      clientY,
      down: false,
    });
    assert.equal(t.menu.getAttribute('aria-valuenow'), '3');
    assert.equal(t.root.classList.contains('is-wheel-dragging'), false);
  } finally {
    t.dispose();
  }
});

test('segment wheel keeps radial elasticity and eases back without teleporting', () => {
  const t = wheel();
  try {
    t.pointer('pointerdown', 200, 80);
    t.pointer('pointermove', 380, 180);
    t.tick(30);
    assert.ok(t.position()[0] > 128);
    const before = t.position();
    t.pointer('pointerup', 380, 180);
    assert.deepEqual(t.position(), before);
    const frames = [];
    for (let i = 0; i < 10; i++) {
      t.tick(5);
      frames.push(t.position().join(','));
    }
    assert.ok(new Set(frames).size > 5);
    t.tick(180);
    assert.ok(Math.abs(Math.hypot(...t.position()) - 128) < 0.05);
  } finally {
    t.dispose();
  }
});
test('the pressure centre reaches both ring boundaries and eases between them', () => {
  const t = wheel();
  try {
    t.pointer('pointerdown', ...t.point(90));
    t.pointer('pointermove', 800, 200);
    t.tick(80);
    const outer = Math.hypot(...t.position());
    assert.ok(Math.abs(outer - 200) < 0.01);
    t.pointer('pointermove', 250, 200);
    const travel = [];
    for (let i = 0; i < 80; i++) {
      t.tick();
      const distance = Math.hypot(...t.position());
      travel.push(distance);
      assert.ok(distance >= 56 - 0.001 && distance <= 200 + 0.001);
    }
    assert.ok(travel[0] > 56 && travel[0] < 200, 'the edge-to-edge move must ease');
    assert.ok(new Set(travel.map((n) => n.toFixed(2))).size > 3);
    assert.ok(Math.abs(travel.at(-1) - 56) < 0.01);
    t.pointer('pointerup', 250, 200);
    t.tick(160);
    assert.ok(Math.abs(Math.hypot(...t.position()) - 128) < 0.01);
  } finally {
    t.dispose();
  }
});
test('the entrance hint sweeps down-right and back once without changing the reader chapter', () => {
  const t = wheel();
  try {
    t.view(0.3);
    t.tick(45);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), false);
    t.view();
    t.tick(40);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), true);
    const start = t.position();
    t.tick(16);
    assert.ok(Number(t.segments[1].style.opacity) > 0.8);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1');
    t.tick(39);
    const far = t.position();
    assert.ok(far[0] > 60 && far[1] > 60);
    assert.ok(far[1] > start[1]);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1');
    assert.deepEqual(t.cardChanges, []);
    assert.ok(Number(t.segments[2].style.opacity) > 0.9);
    t.tick(160);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), false);
    assert.ok(Math.abs(t.position()[0]) < 0.01);
    assert.ok(Math.abs(t.position()[1] + 128) < 0.01);
    assert.equal(Number(t.pressure.style.opacity), 0);
    t.view(0);
    t.view();
    t.tick(200);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), false);
    assert.equal(t.pendingWork(), 0);
  } finally {
    t.dispose();
  }
});
test('touch and keyboard focus take over the hint immediately', () => {
  const t = wheel();
  try {
    t.view();
    t.tick(80);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), true);
    t.pointer('pointerdown', ...t.point(72));
    assert.equal(t.root.classList.contains('is-wheel-previewing'), false);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '2');
    t.pointer('pointerup', ...t.point(72));
    t.tick(200);
    t.view(0);
    t.view();
    t.tick(80);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), false);
  } finally {
    t.dispose();
  }
  const keyboard = wheel();
  try {
    keyboard.view();
    keyboard.tick(10);
    keyboard.menu.focus();
    keyboard.tick(200);
    assert.equal(keyboard.root.classList.contains('is-wheel-previewing'), false);
    assert.equal(Number(keyboard.pressure.style.opacity), 0);
  } finally {
    keyboard.dispose();
  }
});
test('the hint cancels offscreen, respects reduced motion and leaves no work after teardown', () => {
  const t = wheel();
  try {
    t.w.TDBMotionPolicy.reduced.matches = true;
    t.view();
    t.tick(250);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), false);
    assert.equal(Number(t.pressure.style.opacity), 0);
    t.w.TDBMotionPolicy.reduced.matches = false;
    t.view();
    t.tick(80);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), true);
    t.view(0);
    t.tick(100);
    assert.equal(t.root.classList.contains('is-wheel-previewing'), false);
    assert.equal(Number(t.pressure.style.opacity), 0);
    assert.equal(t.pendingWork(), 0);
  } finally {
    t.dispose();
  }
  const pending = wheel();
  pending.view();
  pending.tick(10);
  pending.api.destroy();
  pending.tick(100);
  assert.equal(pending.pendingWork(), 0);
  pending.w.close();
});
test('pad gestures select chapters while the centre remains available to scroll', () => {
  const t = wheel();
  try {
    assert.equal(t.pointer('pointerdown', 200, 200).defaultPrevented, false);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1');
    t.pointer('pointerdown', ...t.point(72));
    assert.equal(t.menu.getAttribute('aria-valuenow'), '2');
    t.tick(30);
    t.pointer('pointerup', ...t.point(72));
    t.tick(180);
    assert.ok(Math.abs(Math.hypot(...t.position()) - 128) < 0.05);
  } finally {
    t.dispose();
  }
});
test('crossing twelve o clock continues along the short arc', () => {
  const t = wheel();
  try {
    t.pointer('pointerdown', ...t.point(350));
    t.tick(30);
    t.pointer('pointermove', ...t.point(370));
    t.tick(30);
    const [x, y] = t.position();
    assert.ok(x > 0 && Math.abs(y + 128) < 8);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1');
  } finally {
    t.dispose();
  }
});
test('wheel keyboard retains focus and native chapter changes stay synchronised', async () => {
  const t = wheel();
  try {
    t.menu.focus();
    t.menu.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(t.menu.getAttribute('aria-valuenow'), '2');
    assert.equal(t.w.document.activeElement, t.menu);
    t.choices.forEach((c, i) => c.classList.toggle('w--current', i === 4));
    await Promise.resolve();
    assert.equal(t.menu.getAttribute('aria-valuenow'), '5');
  } finally {
    t.dispose();
  }
});
test('whole-segment highlight passes through intermediate shades', () => {
  const t = wheel();
  try {
    const before = Number(t.segments[1].style.opacity);
    t.choices[1].click();
    t.tick(2);
    const during = Number(t.segments[1].style.opacity);
    t.tick(150);
    const after = Number(t.segments[1].style.opacity);
    assert.ok(during > before && during < after);
    assert.ok(after > 0.99);
  } finally {
    t.dispose();
  }
});
test('re-grabbing lightens the selected sector and releases its pressure shading smoothly', () => {
  const t = wheel();
  try {
    t.tick(100);
    assert.equal(Number(t.segments[0].style.opacity), 1);
    t.pointer('pointerdown', ...t.point(0));
    assert.equal(Number(t.segments[0].style.opacity), 1, 'pointerdown must not snap the shade');
    t.tick(2);
    assert.ok(
      Number(t.segments[0].style.opacity) < 1 && Number(t.segments[0].style.opacity) > 0.72,
    );
    t.tick(30);
    assert.ok(Math.abs(Number(t.segments[0].style.opacity) - 0.72) < 0.02);
    assert.ok(Number(t.pressure.style.opacity) > 0.99);
    t.pointer('pointerup', ...t.point(0));
    t.tick(2);
    assert.ok(Number(t.pressure.style.opacity) > 0 && Number(t.pressure.style.opacity) < 1);
    t.tick(160);
    assert.ok(Number(t.segments[0].style.opacity) > 0.99);
    assert.ok(Number(t.pressure.style.opacity) < 0.001);
  } finally {
    t.dispose();
  }
});
test('dragging fades the filled sector with its card before release', () => {
  const t = wheel();
  try {
    t.tick(100);
    t.pointer('pointerdown', ...t.point(72));
    assert.equal(t.menu.getAttribute('aria-valuenow'), '2');
    assert.equal(t.cardChanges.at(-1), 1);
    assert.equal(Number(t.segments[1].style.opacity), 0, 'selection must ease into its fill');
    t.tick(2);
    assert.ok(Number(t.segments[0].style.opacity) > 0);
    assert.ok(Number(t.segments[1].style.opacity) > 0);
    t.tick(50);
    assert.ok(Number(t.segments[1].style.opacity) >= 0.71);
    assert.ok(Number(t.segments[0].style.opacity) < 0.01);
    t.pointer('pointermove', ...t.point(144));
    assert.equal(t.menu.getAttribute('aria-valuenow'), '3');
    assert.equal(t.cardChanges.at(-1), 2);
    t.tick(15);
    assert.ok(Number(t.segments[2].style.opacity) > Number(t.segments[1].style.opacity));
    assert.equal(t.root.classList.contains('is-wheel-dragging'), true);
    t.pointer('pointerup', ...t.point(144));
  } finally {
    t.dispose();
  }
});
test('five equal sectors start with a complete segment centred at twelve', () => {
  const t = wheel();
  try {
    assert.equal(t.segments.length, 5);
    const lines = [...t.root.querySelectorAll('.treatment-guide_divider')];
    assert.equal(lines.length, 5);
    lines.forEach((line, i) => {
      const a = ((i + 0.5) * Math.PI * 2) / 5;
      const [x1, y1, x2, y2] = line
        .getAttribute('d')
        .match(/[\d.]+/g)
        .map(Number);
      assert.ok(Math.abs(x2 - (500 + Math.sin(a) * 500)) < 0.001);
      assert.ok(Math.abs(y2 - (500 - Math.cos(a) * 500)) < 0.001);
      assert.ok(Math.abs(Math.hypot(x1 - 500, y1 - 500) - 140) < 0.001);
    });
  } finally {
    t.dispose();
  }
});
test('teardown preserves native wheel artwork and removes only transient pressure layers', () => {
  const t = wheel();
  t.api.destroy();
  assert.equal(t.menu.getAttribute('role'), null);
  assert.equal(t.menu.getAttribute('tabindex'), null);
  assert.equal(t.root.querySelector('.treatment-guide_finger-pad'), t.artwork);
  assert.equal(t.root.querySelector('.treatment-guide_pressure'), null);
  assert.equal(t.root.querySelector('.treatment-guide_pressure-contact'), null);
  assert.equal(t.artwork.querySelector('defs'), null);
  assert.equal(t.artwork.querySelectorAll('.treatment-guide_divider').length, 5);
  t.w.close();
});

test('rounded press stays behind the dividers and fully disappears after release', () => {
  const t = wheel();
  try {
    const svg = t.root.querySelector('.treatment-guide_finger-pad');
    const edge = svg.querySelector('.treatment-guide_pressure-contact');
    const layer = edge.parentElement;
    const lines = [...svg.querySelectorAll('.treatment-guide_divider')];
    assert.ok(lines.every((line) => layer.compareDocumentPosition(line) & 4));
    assert.equal(Number(edge.style.opacity), 0);
    assert.ok(
      [...t.pressure.querySelectorAll('circle')].every(
        (circle) => !circle.hasAttribute('cx') && !circle.hasAttribute('cy'),
      ),
    );
    t.pointer('pointerdown', 320, 40);
    t.tick(45);
    assert.equal(edge.style.opacity, t.pressure.style.opacity);
    assert.equal(Number(edge.style.opacity), 1);
    t.pointer('pointerup', 320, 40);
    t.tick(180);
    assert.equal(Number(edge.style.opacity), 0);
    assert.equal(Number(t.pressure.style.opacity), 0);
    assert.equal(t.pendingWork(), 0);
  } finally {
    t.dispose();
  }
});
test('drawer can return focus to a newly selected chapter after the launch pane hides', async () => {
  const dom = new JSDOM(
    '<main><button id="old">Open old</button><button id="current">Open current</button></main><div data-tdb-drawer><div data-tdb-drawer-backdrop></div><div data-tdb-drawer-panel><button data-tdb-drawer-close>Close</button></div></div>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    doc = w.document;
  w.TDBMotion = {
    reduced: { matches: true, addEventListener() {}, removeEventListener() {} },
    duration: () => 0,
  };
  w.TDBScrollLock = { acquire: () => () => {} };
  w.matchMedia = () => ({ matches: false });
  w.eval(read('src/shared/drawer.js'));
  const api = w.TDBDrawer.mount(doc.querySelector('[data-tdb-drawer]'), {
    returnFocus: () => doc.querySelector('#current'),
  });
  try {
    await api.open(doc.querySelector('#old'));
    doc.querySelector('#old').hidden = true;
    await api.close(true);
    assert.equal(doc.activeElement.id, 'current');
  } finally {
    api.destroy();
    w.close();
  }
});

for (const centre of [true, false]) {
  test(`card keeps ${centre ? 'centre artwork' : 'legacy position'} synchronised and restores its native fallback`, () => {
    const keys = ['diamond', 'thumbprint', 'lotus', 'quotation', 'barn'];
    const native = centre
      ? '<span data-guide-artwork="diamond" class="treatment-guide_icon-art treatment-guide_centre-diamond"></span>'
      : '01';
    const dom = new JSDOM(
      `<section><div data-tdb-guide-pagination><span ${centre ? 'data-tdb-guide-centre-icon' : 'data-tdb-guide-position'}>${native}</span></div><div class="treatment-guide_content">${keys.map((key, i) => `<div data-tdb-guide-panel="${i}"><h3 data-tdb-guide-title>${key}</h3><p data-tdb-guide-summary>Summary ${i}</p><button data-tdb-guide-open><span class="treatment-guide_cta-icon"><span data-guide-artwork="${key}" class="treatment-guide_icon-art is-guide-${key}"></span></span></button></div>`).join('')}</div></section>`,
      { runScripts: 'outside-only' },
    );
    const w = dom.window;
    w.TDBMotionPolicy = {
      reduced: { matches: true, addEventListener() {}, removeEventListener() {} },
    };
    w.matchMedia = () => ({ matches: false });
    w.eval(read('src/shared/motion.js'));
    w.eval(read('src/shared/native-ticker.js'));
    w.eval(read('src/treatment-guide/card.js'));
    const root = w.document.querySelector('section');
    const slot = root.querySelector(
      centre ? '[data-tdb-guide-centre-icon]' : '[data-tdb-guide-position]',
    );
    const original = slot.innerHTML;
    const card = w.TDBTreatmentGuideCard.mount(root, 0, () => {});
    for (const i of [2, 4, 1, 3, 0]) {
      card.update(i, -1);
      assert.equal(
        root.querySelector('[data-tdb-guide-pagination]').getAttribute('aria-label'),
        `${i + 1} of 5: ${keys[i]}`,
      );
      if (centre) {
        assert.equal(slot.querySelector('[data-guide-artwork]').dataset.guideArtwork, keys[i]);
        assert.ok(
          slot.firstElementChild.firstElementChild.classList.contains(
            'treatment-guide_centre-' + keys[i],
          ),
        );
      } else assert.equal(slot.textContent, String(i + 1).padStart(2, '0'));
      assert.equal(
        root.querySelector(`[data-tdb-guide-panel="${i}"]`).getAttribute('aria-hidden'),
        'false',
      );
    }
    card.destroy();
    assert.equal(slot.innerHTML, original);
    w.close();
  });
}

test('card uses shared motion clocks and cancels stale text reveals on rapid navigation', () => {
  const dom = new JSDOM(
    `<section><div data-tdb-guide-pagination><span data-tdb-guide-position>01</span></div><div class="treatment-guide_content">${Array.from({ length: 5 }, (_, i) => `<div data-tdb-guide-panel="${i}"><h3 data-tdb-guide-title>Chapter ${i}</h3><p data-tdb-guide-summary style="opacity:.85">Summary ${i}</p><button data-tdb-guide-open><span class="treatment-guide_cta-icon"><span data-guide-artwork="diamond"></span></span></button></div>`).join('')}</div></section>`,
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    reduced = { matches: false, addEventListener() {}, removeEventListener() {} },
    animations = [],
    timers = new Map();
  let timerId = 0;
  w.matchMedia = () => ({ matches: false });
  w.TDBMotionPolicy = { reduced };
  w.TDBMotionProfile = {
    time: (value) => value * 2,
    horizontal: () => 777,
    easing: () => 'ease-in',
    forFamily: () => ({ time: (value) => value * 3, easing: () => 'linear' }),
  };
  w.setTimeout = (fn, delay) => {
    timers.set(++timerId, { fn, delay });
    return timerId;
  };
  w.clearTimeout = (id) => timers.delete(id);
  w.HTMLElement.prototype.animate = function (frames, options) {
    const animation = {
      node: this,
      frames,
      options,
      cancelled: false,
      cancel() {
        this.cancelled = true;
      },
    };
    animations.push(animation);
    return animation;
  };
  w.eval(read('src/shared/motion.js'));
  w.eval(read('src/shared/native-ticker.js'));
  w.eval(read('src/treatment-guide/card.js'));
  const root = w.document.querySelector('section'),
    summaries = [...root.querySelectorAll('[data-tdb-guide-summary]')],
    card = w.TDBTreatmentGuideCard.mount(root, 0, () => {}),
    runEntry = () => {
      assert.equal(timers.size, 1);
      const [id, timer] = [...timers][0];
      assert.equal(timer.delay, w.TDBMotion.defaults.entryDelay);
      timers.delete(id);
      timer.fn();
    };
  card.update(1);
  const titleMotion = animations.filter((a) => a.node.hasAttribute('data-tdb-guide-title'));
  assert.ok(titleMotion.every((a) => a.options.duration === 777 && a.options.easing === 'ease-in'));
  assert.equal(
    summaries[1].style.opacity,
    '0',
    'incoming text stays hidden during shared entry delay',
  );
  runEntry();
  const entry = animations.findLast((a) => a.node === summaries[1]);
  assert.equal(entry.options.duration, w.TDBMotion.defaults.fadeIn);
  assert.equal(entry.options.easing, 'linear', 'fade uses its own shared motion family');
  // Model an interrupted fade halfway through: the shared controller must
  // continue from the painted value rather than flashing the outgoing copy to 1.
  const computed = w.getComputedStyle.bind(w);
  w.getComputedStyle = (node) => (node === summaries[1] ? { opacity: '0.42' } : computed(node));
  card.update(2);
  const outgoing = animations.findLast((a) => a.node === summaries[1] && 'opacity' in a.frames[0]);
  assert.equal(outgoing.frames[0].opacity, 0.42);
  assert.equal(outgoing.options.duration, w.TDBMotion.defaults.fadeOut);
  card.update(3);
  runEntry();
  assert.equal(summaries[2].style.opacity, '0', 'cancelled chapter cannot reappear later');
  assert.equal(summaries[3].style.opacity, '1');
  reduced.matches = true;
  const count = animations.length;
  card.update(4);
  assert.equal(animations.length, count, 'reduced motion settles without animations');
  assert.equal(timers.size, 0);
  reduced.matches = false;
  card.update(0);
  card.destroy();
  assert.equal(timers.size, 0, 'teardown cancels the pending reveal');
  assert.ok(summaries.every((node) => node.style.opacity === '0.85'));
  assert.ok(animations.every((animation) => animation.cancelled));
  w.close();
});

test('enhanced guide disables only its native tab fades and restores them on teardown', () => {
  const t = wheel(true);
  const tabs = t.root.querySelector('.treatment-guide_tabs');
  const config = t.w.jQuery.data(tabs, '.w-tabs').config;
  assert.deepEqual({ ...config }, { intro: 0, outro: 0, immediate: true, easing: 'ease' });
  assert.equal(tabs.getAttribute('data-duration-in'), '0');
  assert.equal(tabs.getAttribute('data-duration-out'), '0');
  t.api.select(2);
  assert.equal(t.choices[2].classList.contains('w--current'), true);
  t.api.destroy();
  assert.deepEqual({ ...config }, { intro: 400, outro: 200, immediate: false, easing: 'ease' });
  assert.equal(tabs.getAttribute('data-duration-in'), '400');
  assert.equal(tabs.getAttribute('data-duration-out'), '200');
  t.w.close();
});
