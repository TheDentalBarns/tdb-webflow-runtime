const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(__dirname + '/../' + file, 'utf8');
function wheel() {
  const dom = new JSDOM(
    `<section data-tdb-guide><nav>${Array.from({ length: 5 }, (_, i) => `<a href="#" data-tdb-guide-choice="${i}" class="${i === 0 ? 'w--current' : ''}">Chapter ${i + 1}</a>`).join('')}</nav><div class="art"><div class="treatment-guide_orbit"></div><span data-tdb-guide-number>01</span><a data-tdb-guide-ball tabindex="-1" aria-hidden="true"><span></span></a></div></section>`,
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    root = w.document.querySelector('section'),
    ball = root.querySelector('[data-tdb-guide-ball]'),
    choices = [...root.querySelectorAll('[data-tdb-guide-choice]')],
    menu = root.querySelector('nav');
  menu.className = 'treatment-guide_wheel';
  root.querySelector('.art').getBoundingClientRect = () => ({
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
    ball,
    menu,
    choices,
    cardChanges,
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
test('the pressure circle reaches both pad edges and stays contained beyond the finger guards', () => {
  const t = wheel();
  try {
    t.pointer('pointerdown', ...t.point(90));
    t.pointer('pointermove', 800, 200);
    t.tick(80);
    const outer = Math.hypot(...t.position());
    assert.ok(Math.abs(outer + 40 - 200) < 0.01);
    t.pointer('pointermove', 250, 200);
    const travel = [];
    for (let i = 0; i < 80; i++) {
      t.tick();
      const distance = Math.hypot(...t.position());
      travel.push(distance);
      assert.ok(distance >= 96 - 0.001 && distance <= 160 + 0.001);
    }
    assert.ok(travel[0] > 96 && travel[0] < 160, 'the edge-to-edge move must ease');
    assert.ok(new Set(travel.map((n) => n.toFixed(2))).size > 3);
    assert.ok(Math.abs(travel.at(-1) - 40 - 56) < 0.01);
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
    t.tick(80);
    const far = t.position();
    assert.ok(far[0] > 60 && far[1] > 60);
    assert.ok(far[1] > start[1]);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1');
    assert.deepEqual(t.cardChanges, []);
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
    const lines = [...t.root.querySelectorAll('.treatment-guide_finger-pad>line')];
    assert.equal(lines.length, 5);
    lines.forEach((line, i) => {
      const a = ((i + 0.5) * Math.PI * 2) / 5;
      assert.ok(Math.abs(Number(line.getAttribute('x2')) - (500 + Math.sin(a) * 500)) < 0.001);
      assert.ok(Math.abs(Number(line.getAttribute('y2')) - (500 - Math.cos(a) * 500)) < 0.001);
      assert.ok(
        Math.abs(
          Math.hypot(Number(line.getAttribute('x1')) - 500, Number(line.getAttribute('y1')) - 500) -
            140,
        ) < 0.001,
      );
    });
  } finally {
    t.dispose();
  }
});
test('teardown restores authored wheel semantics and removes its injected artwork', () => {
  const t = wheel();
  t.api.destroy();
  assert.equal(t.ball.getAttribute('tabindex'), '-1');
  assert.equal(t.ball.getAttribute('aria-hidden'), 'true');
  assert.equal(t.menu.getAttribute('role'), null);
  assert.equal(t.menu.getAttribute('tabindex'), null);
  assert.equal(t.root.querySelector('.treatment-guide_finger-pad'), null);
  t.w.close();
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
