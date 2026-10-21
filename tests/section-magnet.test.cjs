const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture({
  reduced = false,
  policy,
  height = 500,
  mode = 'treatment',
  lenis = false,
  copyHeight = 0,
} = {}) {
  const dom = new JSDOM(
    '<body><section data-tdb-magnet="' + mode + '"></section><a href="#target">Anchor</a></body>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    d = w.document,
    root = d.querySelector('section');
  let y = 800,
    now = 0,
    id = 0;
  const timers = new Map(),
    frames = new Map(),
    writes = [];
  w.innerHeight = 900;
  Object.defineProperty(w, 'scrollY', { get: () => y });
  Object.defineProperty(d.documentElement, 'scrollHeight', { value: 5000 });
  w.performance.now = () => now;
  w.matchMedia = () => ({ matches: reduced, addEventListener() {} });
  if (policy !== undefined) w.TDBMotion = { reduced: { matches: policy, addEventListener() {} } };
  const focuses = [];
  w.TDBSliderFocus = {
    focus(node, hold) {
      focuses.push({ node, hold });
    },
  };
  if (copyHeight) {
    root.setAttribute('data-tdb-treatment-layout', '');
    const copy = d.createElement('div');
    copy.setAttribute('data-tdb-treatment-details', '');
    copy.getBoundingClientRect = () => ({ bottom: 1200 + height + copyHeight - y });
    root.append(copy);
  }
  w.setTimeout = (fn, delay) => {
    timers.set(++id, { fn, time: now + delay });
    return id;
  };
  w.clearTimeout = (i) => timers.delete(i);
  w.requestAnimationFrame = (fn) => {
    frames.set(++id, fn);
    return id;
  };
  w.cancelAnimationFrame = (i) => frames.delete(i);
  const scroll = (value) => {
    y = value;
    w.dispatchEvent(new w.Event('scroll'));
  };
  w.scrollTo = ({ top }) => {
    writes.push(top);
    scroll(top);
  };
  if (lenis)
    w.lenis = {
      isScrolling: false,
      scrollTo(value) {
        writes.push(value);
        scroll(value);
      },
    };
  root.getBoundingClientRect = () => ({
    width: 800,
    top: 1200 - y,
    bottom: 1200 + height - y,
    height,
  });
  w.eval(fs.readFileSync('src/shared/section-magnet.js', 'utf8'));
  const advance = (ms) => {
    now += ms;
    const due = [...timers].filter(([, t]) => t.time <= now);
    for (const [key, t] of due) {
      timers.delete(key);
      t.fn();
    }
    const queued = [...frames];
    frames.clear();
    for (const [, fn] of queued) fn(now);
  };
  function wheel(deltaY = 100) {
    d.body.dispatchEvent(new w.WheelEvent('wheel', { bubbles: true, deltaY }));
  }
  function gesture(from, to) {
    scroll(from);
    wheel(to - from);
    scroll(to);
    advance(200);
  }
  return { dom, w, d, root, writes, focuses, advance, wheel, scroll, gesture, y: () => y };
}

test('centres from either direction with the native or Lenis scroll owner', () => {
  for (const lenis of [false, true])
    for (const [from, to] of [
      [800, 950],
      [1200, 1050],
      [980, 950],
      [1020, 1050],
      [600, 800],
      [1400, 1200],
    ]) {
      const f = fixture({ lenis });
      try {
        f.gesture(from, to);
        f.advance(250);
        assert.ok(Math.abs(f.y() - 1000) < Math.abs(to - 1000));
        assert.notEqual(f.y(), 1000, 'gentle correction takes time');
        f.advance(1000);
        assert.equal(f.y(), 1000);
      } finally {
        f.dom.window.close();
      }
    }
});
test('uses the shared site motion policy and keeps notice bars away during settling', () => {
  const f = fixture({ reduced: true, policy: false });
  try {
    f.gesture(800, 950);
    assert.equal(f.focuses.length, 1);
    assert.equal(f.focuses[0].node, f.root);
    assert.equal(f.focuses[0].hold(), true);
    f.advance(1000);
    assert.equal(f.y(), 1000);
    assert.equal(f.focuses[0].hold(), false, 'ordinary browsing resumes after the correction');
    assert.equal(f.focuses.length, 2, 'settled position rebases banner release distance');
    assert.equal(f.focuses[1].node, f.root);
  } finally {
    f.dom.window.close();
  }
  const reduced = fixture({ reduced: false, policy: true });
  try {
    reduced.gesture(800, 950);
    reduced.advance(1000);
    assert.equal(reduced.writes.length, 0, 'shared reduced motion still disables snapping');
  } finally {
    reduced.dom.window.close();
  }
});
test('tall treatment copy centres the unchanged image frame on short screens', () => {
  const f = fixture({ copyHeight: 500 });
  try {
    f.gesture(800, 950);
    f.advance(1000);
    assert.equal(f.y(), 1000);
    assert.equal(f.root.getBoundingClientRect().height, 500);
  } finally {
    f.dom.window.close();
  }
});
test('new wheel input interrupts immediately and every stop inside the field returns', () => {
  const f = fixture();
  try {
    f.gesture(800, 950);
    f.advance(120);
    f.wheel(20);
    const interrupted = f.y();
    f.scroll(interrupted + 20);
    assert.equal(f.y(), interrupted + 20, 'new input remains immediate');
    f.advance(200);
    f.advance(1000);
    assert.equal(f.y(), 1000);
    f.gesture(1000, 1030);
    f.advance(1000);
    assert.equal(f.y(), 1000, 'the same section can attract again');
    f.gesture(1000, 1300);
    f.advance(1000);
    assert.equal(f.y(), 1000, 'centred section holds beyond its initial capture range');
    f.gesture(1000, 1400);
    f.advance(1000);
    assert.equal(f.y(), 1400, 'a deliberate larger scroll breaks free');
    f.gesture(1400, 1300);
    f.advance(1000);
    assert.equal(f.y(), 1300, 'after breakaway the wider hold is no longer active');
  } finally {
    f.dom.window.close();
  }
});

test('closed consent dialogs do not disable centring; visible dialogs do', () => {
  for (const state of ['hidden-ancestor', 'invisible', 'open']) {
    const f = fixture();
    try {
      const shell = f.d.createElement('div'),
        dialog = f.d.createElement('div');
      dialog.setAttribute('aria-modal', 'true');
      dialog.getClientRects = () => [{}];
      shell.append(dialog);
      f.d.body.append(shell);
      if (state === 'hidden-ancestor') shell.setAttribute('aria-hidden', 'true');
      if (state === 'invisible') dialog.style.visibility = 'hidden';
      f.gesture(800, 950);
      f.advance(1000);
      assert.equal(f.y(), state === 'open' ? 950 : 1000);
    } finally {
      f.dom.window.close();
    }
  }
});
test('restoration without input and stops outside the initial capture range are not pulled', () => {
  for (const kind of ['restore', 'distant']) {
    const f = fixture();
    try {
      if (kind === 'restore') {
        f.scroll(950);
        f.advance(200);
      }
      if (kind === 'distant') f.gesture(500, 700);
      f.advance(1000);
      assert.equal(f.writes.length, 0);
    } finally {
      f.dom.window.close();
    }
  }
});
test('reduced motion and over-height treatment content remain ordinary scrolling', () => {
  for (const options of [{ reduced: true }, { height: 1100 }]) {
    const f = fixture(options);
    try {
      f.gesture(800, 950);
      f.advance(1000);
      assert.equal(f.writes.length, 0);
    } finally {
      f.dom.window.close();
    }
  }
});
test('held gestures, keyboard navigation and anchor clicks are never captured', () => {
  for (const kind of ['held', 'keyboard', 'anchor']) {
    const f = fixture();
    try {
      f.wheel();
      f.scroll(950);
      if (kind === 'held') f.d.body.dispatchEvent(new f.w.Event('pointerdown', { bubbles: true }));
      if (kind === 'keyboard')
        f.d.body.dispatchEvent(
          new f.w.KeyboardEvent('keydown', { bubbles: true, key: 'PageDown' }),
        );
      if (kind === 'anchor') {
        f.d.querySelector('a').addEventListener('click', (e) => e.preventDefault());
        f.d.querySelector('a').click();
      }
      f.advance(1000);
      assert.equal(f.writes.length, 0);
    } finally {
      f.dom.window.close();
    }
  }
});
test('waits for existing Lenis inertia, and disposal cancels pending work', () => {
  const f = fixture({ lenis: true });
  try {
    f.w.lenis.isScrolling = 'smooth';
    f.gesture(800, 950);
    f.advance(1000);
    assert.equal(f.writes.length, 0);
    f.w.lenis.isScrolling = false;
    f.advance(200);
    f.advance(280);
    assert.ok(f.writes.length > 0);
    f.w.TDBSectionMagnet.destroy();
    const stopped = f.y();
    f.advance(1000);
    assert.equal(f.y(), stopped);
  } finally {
    f.dom.window.close();
  }
});

test('elastic return has a small bounded overshoot and settles exactly', () => {
  const f = fixture();
  try {
    f.gesture(800, 950);
    const positions = [];
    for (let elapsed = 0; elapsed < 1000; elapsed += 20) {
      f.advance(20);
      positions.push(f.y());
    }
    assert.ok(positions[0] > 950 && positions[0] < 952, 'starts gently');
    assert.ok(Math.max(...positions) > 1000, 'a visible elastic return crosses centre');
    assert.ok(Math.max(...positions) < 1003, 'overshoot stays subtle');
    assert.equal(f.y(), 1000);
  } finally {
    f.dom.window.close();
  }
});

test('slow Lenis tail hands over promptly but fast inertia keeps its freedom', () => {
  const f = fixture({ lenis: true });
  try {
    f.w.lenis.isScrolling = 'smooth';
    f.w.lenis.velocity = 10;
    f.gesture(700, 850);
    f.advance(200);
    assert.equal(f.focuses.length, 0);
    f.w.lenis.velocity = 1;
    f.advance(100);
    assert.equal(f.focuses.length, 1, 'no extra wait for a fully stopped Lenis tail');
    f.advance(1000);
    assert.equal(f.y(), 1000);
  } finally {
    f.dom.window.close();
  }
});

test('click-induced scrolling never arms the magnet; actual vertical touch scrolling does', () => {
  for (const moves of [false, true]) {
    const f = fixture();
    const touch = (type, y) => {
      const e = new f.w.Event(type, { bubbles: true });
      Object.defineProperty(e, 'touches', { value: [{ clientX: 100, clientY: y }] });
      f.d.body.dispatchEvent(e);
    };
    try {
      touch('touchstart', 300);
      if (moves) touch('touchmove', 150);
      f.scroll(950);
      f.w.dispatchEvent(new f.w.Event('touchend'));
      if (!moves) f.d.body.click();
      f.advance(200);
      f.advance(1000);
      assert.equal(f.y(), moves ? 1000 : 950);
    } finally {
      f.dom.window.close();
    }
  }
});
