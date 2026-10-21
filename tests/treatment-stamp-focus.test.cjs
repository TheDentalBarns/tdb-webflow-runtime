const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(width) {
  const dom = new JSDOM(
    '<div data-tdb-treatment-stamps><a href="/treatment" data-tdb-treatment-stamp>Veneers</a></div>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window;
  w.innerWidth = width;
  w.TDBNavScroll = { focus() {}, release() {} };
  w.eval(fs.readFileSync('src/shared/slider-focus.js', 'utf8'));
  const link = w.document.querySelector('a');
  function pointer(type, x, y) {
    const event = new w.Event(type, { bubbles: true });
    Object.assign(event, { button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y });
    link.dispatchEvent(event);
  }
  return {
    dom,
    w,
    link,
    pointer,
    focused: () => w.document.documentElement.classList.contains('tdb-slider-focus'),
  };
}

test('magnetic focus shares the banner controller and ignores its own settling scroll', () => {
  const f = fixture(1440);
  try {
    let held = true,
      guard;
    f.w.TDBNavScroll.focus = (release, isDragging) => {
      guard = isDragging;
    };
    f.w.TDBSliderFocus.focus(f.link, () => held);
    assert.equal(f.focused(), true);
    assert.equal(guard(), true);
    held = false;
    assert.equal(guard(), false, 'normal browsing may release the bars once settling finishes');
    assert.equal(f.focused(), true, 'bars remain away while viewing the aligned section');
    f.w.document.body.dispatchEvent(
      new f.w.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    );
    assert.equal(f.focused(), false);
  } finally {
    f.dom.window.close();
  }
});

for (const width of [390, 1280])
  test('horizontal stamp drag hides banners at ' + width + '; vertical browsing does not', () => {
    const f = fixture(width);
    try {
      f.pointer('pointerdown', 100, 100);
      f.pointer('pointermove', 102, 125);
      assert.equal(f.focused(), false);
      f.pointer('pointerdown', 100, 100);
      f.pointer('pointermove', 75, 102);
      assert.equal(f.focused(), true);
      f.pointer('pointerup', 75, 102);
      assert.equal(f.focused(), true);
    } finally {
      f.dom.window.close();
    }
  });

test('stamp selection hides banners on mobile and desktop', () => {
  for (const width of [390, 1280]) {
    const f = fixture(width);
    try {
      f.link.addEventListener('click', (e) => e.preventDefault());
      f.link.click();
      assert.equal(f.focused(), true);
    } finally {
      f.dom.window.close();
    }
  }
});

test('desktop horizontal trackpad and shift-wheel hide banners without capturing vertical browsing', () => {
  for (const options of [
    { deltaX: 90, deltaY: 2 },
    { deltaY: 90, shiftKey: true },
  ]) {
    const f = fixture(1440);
    try {
      f.link.dispatchEvent(new f.w.WheelEvent('wheel', { bubbles: true, deltaY: 90 }));
      assert.equal(f.focused(), false);
      const event = new f.w.WheelEvent('wheel', { bubbles: true, cancelable: true, ...options });
      f.link.dispatchEvent(event);
      assert.equal(f.focused(), true);
      assert.equal(event.defaultPrevented, false);
    } finally {
      f.dom.window.close();
    }
  }
});
