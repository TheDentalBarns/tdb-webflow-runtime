const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(deferred = false, initialFocus = false) {
  const dom = new JSDOM(
    '<div data-tdb-journey><input><div data-tdb-journey-map tabindex="0"></div></div><button>Outside</button>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    d = w.document;
  const root = d.querySelector('[data-tdb-journey]'),
    input = d.querySelector('input');
  let top = 100,
    ready;
  root.getBoundingClientRect = () => ({ top, bottom: top + 600 });
  w.TDBNavScroll = { focus() {}, release() {} };
  const install = () => w.eval(fs.readFileSync('src/shared/slider-focus.js', 'utf8'));
  if (!deferred) install();
  const flight = deferred
    ? new Promise((resolve) => {
        ready = () => {
          install();
          resolve();
        };
      })
    : Promise.resolve();
  w.tdbEnsureSliderFocus = () => flight;
  if (initialFocus) input.focus();
  w.eval(fs.readFileSync('src/runtime/journey-loader.js', 'utf8') + '\nprepareJourneyLoader();');
  return {
    w,
    d,
    root,
    input,
    ready,
    away: () => {
      top = -1000;
    },
    focused: () => d.documentElement.classList.contains('tdb-slider-focus'),
    tap(node) {
      node.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true }));
    },
    close() {
      w.TDBJourneyLoader.destroy();
      w.close();
    },
  };
}
test('map and input share chrome focus without changing input focus or intercepting gestures', () => {
  const f = fixture();
  try {
    let hold;
    f.w.TDBNavScroll.focus = (_, predicate) => {
      hold = predicate;
    };
    f.input.focus();
    assert(f.focused());
    assert.equal(f.d.activeElement, f.input);
    assert(hold());
    for (let i = 0; i < 20; i++) f.tap(f.root.querySelector('[data-tdb-journey-map]'));
    assert(f.focused());
    f.w.dispatchEvent(new f.w.Event('resize'));
    assert(f.focused(), 'keyboard/toolbar height change does not release focus');
    f.away();
    assert.equal(hold(), false, 'scroll thresholds can release an offscreen map');
    f.tap(f.d.querySelector('button'));
    assert.equal(f.focused(), false);
  } finally {
    f.close();
  }
});
test('leaving before focus code loads cancels the late hide request', async () => {
  const f = fixture(true);
  try {
    f.tap(f.input);
    f.tap(f.d.querySelector('button'));
    f.ready();
    await tick();
    assert.equal(f.focused(), false);
    f.input.focus();
    assert(f.focused());
    f.input.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(f.focused(), false);
  } finally {
    f.close();
  }
});
test('a postcode focused before runtime startup is adopted after shared focus loads', async () => {
  const f = fixture(true, true);
  try {
    assert.equal(f.d.activeElement, f.input);
    f.ready();
    await tick();
    assert(f.focused(), 'no second tap is required');
    assert.equal(f.d.activeElement, f.input);
  } finally {
    f.close();
  }
});

test('map teardown cannot release a newer carousel owner', () => {
  const f = fixture();
  try {
    f.tap(f.input);
    f.w.TDBSliderFocus.focus(f.d.querySelector('button'));
    f.w.TDBJourneyLoader.destroy();
    assert(f.focused());
    f.w.TDBSliderFocus.release(f.d.querySelector('button'));
    assert.equal(f.focused(), false);
    f.tap(f.input);
    assert.equal(f.focused(), false, 'destroy removed the delegated listeners');
  } finally {
    f.close();
  }
});
