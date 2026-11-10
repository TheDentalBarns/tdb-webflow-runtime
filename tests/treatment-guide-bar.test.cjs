const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function setup(linked = true) {
  const dom = new JSDOM(
    `<section><div class="treatment-guide_tabs" data-duration-in="400" data-duration-out="200"></div><nav class="treatment-guide_wheel" role="tablist">${Array.from({ length: 5 }, (_, i) => `<a href="#" data-tdb-guide-choice="${i}" class="${i === 0 ? 'w--current' : ''}">${i + 1}</a>`).join('')}</nav><span class="treatment-guide_pagination-total">05</span></section>`,
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    root = w.document.querySelector('section'),
    menu = root.querySelector('nav'),
    choices = [...root.querySelectorAll('a')];
  menu.getBoundingClientRect = () => ({ left: 10, top: 20, width: 400, height: 96 });
  const updates = [],
    manual = [],
    moves = [];
  let frames = new Map(),
    next = 0,
    time = 0,
    ends = 0,
    claim = 0;
  w.requestAnimationFrame = (fn) => (frames.set(++next, fn), next);
  w.cancelAnimationFrame = (id) => frames.delete(id);
  Object.defineProperty(w.performance, 'now', { value: () => time });
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  w.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  root.setPointerCapture = () => claim++;
  w.TDBMotion = { reduced: { matches: false } };
  w.TDBScrollLock = { active: false };
  const config = { intro: 400, outro: 200, immediate: false };
  w.jQuery = { data: () => ({ config }) };
  w.TDBTreatmentGuideCard = { mount: () => ({ update: (i) => updates.push(i), destroy() {} }) };
  let controls;
  w.TDBTreatmentGuideScroll = {
    mount: (r, c) => {
      controls = c;
      return {
        enabled: linked,
        manual: (i) => manual.push(i),
        beginRotation: () => linked,
        rotate: (n) => moves.push(n),
        endRotation: () => ends++,
        destroy() {},
      };
    },
  };
  choices.forEach((choice) =>
    choice.addEventListener('click', (e) => {
      e.preventDefault();
      choices.forEach((c) => c.classList.toggle('w--current', c === choice));
    }),
  );
  w.eval(fs.readFileSync(__dirname + '/../src/treatment-guide/bar.js', 'utf8'));
  const api = w.TDBTreatmentGuideBar.mount(root);
  const tick = (count = 1) => {
    for (let i = 0; i < count; i++) {
      time += 16;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn(time));
    }
  };
  function pointer(type, x, y = 50, target = menu) {
    const e = new w.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    });
    Object.defineProperties(e, { pointerId: { value: 1 }, pointerType: { value: 'touch' } });
    target.dispatchEvent(e);
    return e;
  }
  tick(60);
  return {
    w,
    root,
    menu,
    choices,
    api,
    config,
    controls: () => controls,
    updates,
    manual,
    moves,
    pointer,
    tick,
    ends: () => ends,
    claims: () => claim,
    frames: () => frames.size,
    close() {
      api.destroy();
      w.close();
    },
  };
}

test('enhanced chapter tabs have no fragment link preview and retain keyboard activation and fallback targets', async () => {
  const t = setup();
  try {
    assert.ok(t.choices.every((choice) => !choice.hasAttribute('href')));
    for (const [index, key] of [
      [3, 'Enter'],
      [1, ' '],
    ]) {
      t.choices[index].dispatchEvent(
        new t.w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
      assert.equal(t.menu.getAttribute('aria-valuenow'), String(index + 1));
      assert.equal(t.choices[index].classList.contains('w--current'), true);
    }
    t.choices[0].setAttribute('href', '#w-tabs-0-data-w-pane-0');
    await new Promise((resolve) => t.w.setTimeout(resolve, 0));
    assert.equal(
      t.choices[0].hasAttribute('href'),
      false,
      'Webflow redraw cannot restore a link preview',
    );
    t.api.destroy();
    assert.ok(t.choices.every((choice) => choice.getAttribute('href') === '#'));
  } finally {
    t.close();
  }
});

test('horizontal drag advances one interval per fifth of the strip and can reverse without a release snap', () => {
  const t = setup();
  try {
    assert.equal(t.controls().horizontal, true);
    assert.equal(t.pointer('pointerdown', 50).defaultPrevented, false);
    t.pointer('pointermove', 130);
    t.tick();
    assert.deepEqual(t.moves, [1]);
    assert.equal(t.claims(), 1);
    t.pointer('lostpointercapture', 130, 50, t.choices[0]);
    assert.equal(t.root.classList.contains('is-wheel-dragging'), true);
    t.pointer('pointermove', 90);
    t.tick();
    assert.deepEqual(t.moves, [1, -0.5]);
    assert.equal(t.root.querySelector('.tdb-guide-bar-pressure'), null);
    t.pointer('pointerup', 90);
    t.tick(180);
    assert.equal(t.ends(), 1);
    assert.deepEqual(t.manual, []);
    assert.equal(t.frames(), 0);
    assert.equal(t.root.classList.contains('is-wheel-dragging'), false);
  } finally {
    t.close();
  }
});

test('vertical swipes remain native, including movement that starts within a segment', () => {
  const t = setup();
  try {
    assert.equal(t.pointer('pointerdown', 130).defaultPrevented, false);
    t.pointer('pointermove', 132, 75);
    t.pointer('pointermove', 170, 120);
    t.pointer('pointerup', 170, 120);
    assert.deepEqual(t.moves, []);
    assert.equal(t.claims(), 0);
    assert.equal(t.ends(), 0);
    const touch = new t.w.Event('touchmove', { bubbles: true, cancelable: true });
    Object.defineProperty(touch, 'touches', { value: [{}] });
    t.menu.dispatchEvent(touch);
    assert.equal(touch.defaultPrevented, false);
  } finally {
    t.close();
  }
});

test('native chapter taps, keyboard and scroll share selection without recursive manual updates', () => {
  const t = setup();
  try {
    t.choices[3].click();
    assert.equal(t.menu.getAttribute('aria-valuenow'), '4');
    assert.deepEqual(t.manual, [3]);
    t.controls().select(1);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '2');
    assert.deepEqual(t.manual, [3]);
    const right = new t.w.KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    t.menu.dispatchEvent(right);
    assert.equal(right.defaultPrevented, true);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '3');
    const down = new t.w.KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    t.menu.dispatchEvent(down);
    assert.equal(down.defaultPrevented, false);
    assert.equal(t.menu.getAttribute('aria-orientation'), 'horizontal');
  } finally {
    t.close();
  }
});

test('unlinked drag clamps to strip ends and settles the independent progress endpoint', () => {
  const t = setup(false);
  try {
    t.pointer('pointerdown', 50);
    t.pointer('pointermove', 650);
    t.pointer('pointerup', 650);
    t.tick(100);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '5');
    assert.deepEqual(t.manual, [4]);
    t.pointer('pointerdown', 350);
    t.pointer('pointermove', -100);
    t.pointer('pointerup', -100);
    t.tick(100);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1');
    assert.deepEqual(t.manual, [4, 0]);
  } finally {
    t.close();
  }
});

test('deferred vertical cancellation is not replayed and teardown restores native tabs', () => {
  const t = setup();
  try {
    t.api.resume({
      cancelled: true,
      pointerId: 1,
      startX: 50,
      startY: 50,
      clientX: 150,
      clientY: 50,
      down: false,
    });
    assert.deepEqual(t.moves, []);
    assert.equal(t.config.immediate, true);
    assert.equal(t.w.TDBTreatmentGuideBar.mount(t.root), t.api);
    t.api.destroy();
    t.tick(100);
    assert.equal(t.root.querySelector('.tdb-guide-bar-pressure'), null);
    assert.equal(t.menu.getAttribute('role'), 'tablist');
    assert.equal(t.menu.hasAttribute('aria-valuenow'), false);
    assert.equal(t.config.intro, 400);
    assert.equal(t.config.outro, 200);
    assert.equal(t.config.immediate, false);
    assert.equal(t.frames(), 0);
  } finally {
    t.close();
  }
});

test('a deferred tap on the current first segment still fills its endpoint', () => {
  const t = setup();
  try {
    t.api.resume({ pointerId: 1, startX: 50, startY: 50, clientX: 50, clientY: 50, down: false });
    assert.deepEqual(t.manual, [0]);
    assert.equal(t.menu.getAttribute('aria-valuenow'), '1');
  } finally {
    t.close();
  }
});
