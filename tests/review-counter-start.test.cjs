const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs');
const { JSDOM } = require('jsdom');
function setup({
  top = 1500,
  scroll = 0,
  reduced = false,
  early = true,
  io = true,
  count = 90,
  average = 4.94,
} = {}) {
  const dom = new JSDOM(
    `<section data-tdb-review-introduction><div data-tdb-review-summary>
    <span data-tdb-review-rating="${average}"><span class="review-number_value">${average.toFixed(2)}</span></span>
    <span data-tdb-review-count="${count}"><span class="review-number_value">(${count})</span></span>
    <span data-tdb-review-count="${count}" data-tdb-count-format="plain"><span class="review-number_value">${count}</span></span>
  </div></section>`,
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    root = w.document.querySelector('section'),
    card = root.firstElementChild;
  let y = top,
    now = 0,
    id = 0;
  const timers = new Map(),
    observers = [],
    animations = [],
    motionListeners = new Set();
  Object.defineProperty(w.document, 'readyState', { value: 'complete' });
  Object.defineProperty(w, 'scrollY', { value: scroll });
  card.getBoundingClientRect = () => ({
    top: y,
    bottom: y + 140,
    left: 0,
    right: 400,
    width: 400,
    height: 140,
  });
  if (io)
    w.IntersectionObserver = class {
      constructor(callback, options) {
        Object.assign(this, { callback, options, queued: [], disconnected: false });
        observers.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {
        this.disconnected = true;
      }
      takeRecords() {
        return this.queued.splice(0);
      }
    };
  w.setTimeout = (fn, delay) => {
    timers.set(++id, { fn, at: now + delay });
    return id;
  };
  w.clearTimeout = (id) => timers.delete(id);
  const advance = (ms) => {
    now += ms;
    for (const [key, timer] of [...timers])
      if (timer.at <= now) {
        timers.delete(key);
        timer.fn();
      }
  };
  w.TDBMotion = {
    reduced: {
      matches: reduced,
      addEventListener: (_, fn) => motionListeners.add(fn),
      removeEventListener: (_, fn) => motionListeners.delete(fn),
    },
    defaults: { ticker: 400 },
    reviews: { summaryHold: 600 },
    ddText: () => ({ destroy() {} }),
  };
  w.Element.prototype.animate = function (_, timing) {
    animations.push({ text: this.textContent, duration: timing.duration });
    return { cancel() {} };
  };
  for (const file of [
    ...(early ? ['src/reviews/native/summary-visibility.js'] : []),
    'src/shared/native-ticker.js',
    'src/reviews/native/introduction.js',
  ])
    w.eval(fs.readFileSync(file, 'utf8'));
  return {
    w,
    root,
    card,
    observers,
    timers,
    animations,
    advance,
    values: () => Array.from(root.querySelectorAll('.review-number_value'), (n) => n.textContent),
    move: (top) => {
      y = top;
    },
    seen: () =>
      observers
        .find((o) => o.options.threshold === 0)
        ?.callback([{ target: card, isIntersecting: true, intersectionRatio: 0.01 }]),
    show: (ratio = 1) =>
      observers
        .find((o) => o.options.threshold === 0.5)
        ?.callback([{ target: card, isIntersecting: ratio > 0, intersectionRatio: ratio }]),
    hidden: (value) => {
      Object.defineProperty(w.document, 'hidden', { configurable: true, value });
      w.document.dispatchEvent(new w.Event('visibilitychange'));
    },
    reduce: () => {
      w.TDBMotion.reduced.matches = true;
      for (const fn of motionListeners) fn();
    },
    close: () => w.close(),
  };
}
test('native values stay real until unseen preparation; both counters hold in view then tick once', async () => {
  const e = setup();
  try {
    assert.deepEqual(e.values(), ['4.94', '(90)', '90']);
    let ready;
    const gate = new Promise((r) => (ready = r));
    let mounted = e.w.TDBReviewIntroduction.mount(e.root, {
      summary: { total: 90, average: 4.94 },
      prepare: () => gate,
    });
    assert.deepEqual(e.values(), ['4.93', '(89)', '89']);
    assert.equal(
      e.root.querySelector('[data-tdb-review-rating]').getAttribute('aria-label'),
      'Rating 4.94 out of 5',
    );
    e.show();
    e.advance(1000);
    assert.equal(e.animations.length, 0);
    ready();
    await Promise.resolve();
    e.advance(599);
    assert.equal(e.animations.length, 0);
    e.advance(1);
    assert.deepEqual(
      e.animations.map((a) => a.text),
      ['4.93', '4.94', '(89)', '(90)', '89', '90'],
    );
    assert(e.animations.every((a) => a.duration === 400));
    mounted.destroy();
    assert.deepEqual(e.values(), ['4.94', '(90)', '90']);
    mounted = e.w.TDBReviewIntroduction.mount(e.root);
    e.show();
    e.advance(1000);
    assert.equal(e.animations.length, 6);
    assert.deepEqual(e.values(), ['4.94', '(90)', '90']);
    mounted.destroy();
  } finally {
    e.close();
  }
});
test('already seen, currently visible, restored, untracked and no-observer summaries never drop', () => {
  for (const mode of [
    'seen',
    'visible',
    'late',
    'restored',
    'untracked',
    'no-observer',
    'queued',
  ]) {
    const e = setup({
      top: mode === 'visible' ? 200 : 1500,
      scroll: mode === 'restored' ? 900 : 0,
      early: mode !== 'untracked',
      io: mode !== 'no-observer',
    });
    try {
      if (mode === 'seen') e.seen();
      if (mode === 'late') e.move(200);
      if (mode === 'queued') e.observers[0].queued.push({ target: e.card, isIntersecting: true });
      const mounted = e.w.TDBReviewIntroduction.mount(e.root, {
        summary: { total: 91, average: 4.95 },
      });
      assert.deepEqual(e.values(), ['4.95', '(91)', '91'], mode);
      e.show();
      e.advance(1000);
      assert.equal(e.animations.length, 0, mode);
      mounted.destroy();
    } finally {
      e.close();
    }
  }
});
test('hold requires continuous foreground visibility and restarts on return', () => {
  const e = setup();
  try {
    const mounted = e.w.TDBReviewIntroduction.mount(e.root);
    e.show(0.25);
    e.advance(1000);
    assert.equal(e.timers.size, 0);
    e.show();
    e.advance(400);
    e.show(0);
    e.advance(1000);
    assert.equal(e.animations.length, 0);
    e.show();
    e.advance(400);
    e.hidden(true);
    e.advance(1000);
    assert.equal(e.animations.length, 0);
    e.hidden(false);
    e.advance(599);
    assert.equal(e.animations.length, 0);
    e.advance(1);
    assert.equal(e.animations.length, 6);
    mounted.destroy();
  } finally {
    e.close();
  }
});
test('failure, destruction, motion change, zero and reduced motion settle to actual totals', async () => {
  for (const mode of ['failure', 'destroy', 'change', 'reduced', 'zero']) {
    const e = setup({
      reduced: mode === 'reduced',
      count: mode === 'zero' ? 0 : 90,
      average: mode === 'zero' ? 0 : 4.94,
    });
    try {
      const mounted = e.w.TDBReviewIntroduction.mount(
        e.root,
        mode === 'failure'
          ? {
              prepare: async () => {
                throw Error('unavailable');
              },
            }
          : {},
      );
      e.show();
      if (mode === 'failure') {
        await Promise.resolve();
        await Promise.resolve();
      }
      if (mode === 'change') e.reduce();
      mounted.destroy();
      e.advance(1000);
      assert.deepEqual(e.values(), mode === 'zero' ? ['0.00', '(0)', '0'] : ['4.94', '(90)', '90']);
      assert.equal(e.animations.length, 0);
    } finally {
      e.close();
    }
  }
});
