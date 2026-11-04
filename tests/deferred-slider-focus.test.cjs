const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture() {
  const dom = new JSDOM('<div data-tdb-ig-placeholder="happy-patients"></div>', {
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  w.document.body.dataset.tdbChromeFocus = 'off';
  w.TDBNavScroll = { focus() {}, release() {} };
  const loads = [];
  let allowCSS;
  w.tdbEnsureUI = () => new Promise((resolve) => { allowCSS = resolve; });
  w.tdbEnsureSliderUI = () => Promise.resolve();
  w.TDBModules = { load: async (url) => {
    loads.push(String(url));
    w.eval(fs.readFileSync('src/shared/slider-focus.js', 'utf8'));
  } };
  w.eval("const TDBRuntimeModuleRoot=new URL('https://cdn.example/release/dist/');\n" +
    fs.readFileSync('src/runtime/deferred-ui.js', 'utf8') + '\nprepareSliderFocusLoader();');
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const holder = w.document.querySelector('[data-tdb-ig-placeholder]');
  // The actual feed arrives after runtime startup and consent/proximity release.
  holder.innerHTML = '<div data-tdb-ig-native="happy-patients" class="highlight-swiper_component"><div class="swiper"><div class="swiper-slide">Patient</div></div><button class="swiper-btn-next">Next</button></div>';
  const button = holder.querySelector('button');
  const slide = holder.querySelector('.swiper-slide');
  const focused = () => w.document.documentElement.classList.contains('tdb-slider-focus');
  const pointer = (type, x, y) => {
    const event = new w.Event(type, { bubbles: true });
    Object.assign(event, { button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y });
    slide.dispatchEvent(event);
  };
  return { w, loads, button, slide, focused, pointer, allow: () => allowCSS(), close: () => w.close() };
}

test('first deferred carousel click loads shared focus and replays only focus intent', async () => {
  const f = fixture();
  try {
    assert.deepEqual(f.loads, [], 'a holding image alone does not load focus');
    let clicks = 0;
    f.button.addEventListener('click', () => clicks++);
    f.button.click();
    assert.equal(f.focused(), false, 'wait for shared styles');
    f.allow();
    await tick();
    assert.equal(f.loads.length, 1);
    assert.match(f.loads[0], /tdb-slider-focus\.js$/);
    assert.equal(f.focused(), true, 'explicit interaction overrides automatic-focus opt-out');
    assert.equal(clicks, 1, 'loading focus must not advance the carousel twice');
    f.button.dispatchEvent(new f.w.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    assert.equal(f.focused(), false);
    f.w.TDBSliderFocus.focus(f.slide);
    assert.equal(f.focused(), false, 'automatic section focus stays opted out');
    f.button.dispatchEvent(new f.w.KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    assert.equal(f.focused(), true, 'keyboard interaction uses the same focus owner');
  } finally { f.close(); }
});

test('deferred feed distinguishes vertical browsing from a horizontal swipe', async () => {
  const f = fixture();
  try {
    f.pointer('pointerdown', 100, 100);
    f.pointer('pointermove', 101, 150);
    f.pointer('pointerup', 101, 150);
    f.allow();
    await tick();
    assert.equal(f.focused(), false);
    f.pointer('pointerdown', 100, 100);
    f.pointer('pointermove', 60, 102);
    assert.equal(f.focused(), true);
    f.pointer('pointerup', 60, 102);
    assert.equal(f.focused(), true);
  } finally { f.close(); }
});
