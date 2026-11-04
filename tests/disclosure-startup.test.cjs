const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../src/navbar/native-foundation.js'), 'utf8');

test('only expanded treatments protect chrome, and category collapse or leaving the section releases it', () => {
  const dom = new JSDOM(
    '<section data-tdb-price-section data-tdb-disclosure-item><button data-tdb-disclosure-trigger aria-expanded="true">Category</button><div data-tdb-disclosure-panel><div data-tdb-disclosure-item><button data-tdb-disclosure-trigger data-tdb-price-trigger aria-expanded="false">Treatment</button><div data-tdb-disclosure-panel>Price details</div></div></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    section = w.document.querySelector('section');
  let visible = true,
    callback,
    holds = 0,
    releases = 0,
    hold;
  section.getBoundingClientRect = () => ({
    top: visible ? 100 : -1000,
    bottom: visible ? 600 : -400,
    height: 500,
  });
  w.IntersectionObserver = class {
    constructor(cb) {
      callback = cb;
    }
    observe() {}
  };
  w.TDBNavScroll = {
    focus(_release, held) {
      holds++;
      hold = held;
    },
    release(options) {
      assert(options.respectDirection);
      releases++;
    },
  };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  callback();
  assert.equal(holds, 0);
  w.document.querySelector('[data-tdb-price-trigger]').click();
  assert.equal(holds, 1);
  assert(hold());
  w.document.querySelector('button').click();
  assert.equal(releases, 1);
  w.document.querySelector('button').click();
  assert.equal(holds, 2);
  visible = false;
  callback();
  assert.equal(releases, 2);
  visible = true;
  callback();
  assert.equal(holds, 3);
  w.document.querySelector('[data-tdb-price-trigger]').click();
  assert.equal(releases, 3);
  dom.window.close();
});
test('treatment focus preserves the VIP handle pose through repeated open and close cycles', () => {
  const dom = new JSDOM(
    '<div id="tdb-vip-drawer" class="is-peeking"></div><section data-tdb-price-section><div data-tdb-disclosure-item><button data-tdb-disclosure-trigger data-tdb-price-trigger aria-expanded="false">Treatment</button><div data-tdb-disclosure-panel>Details</div></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window;
  const drawer = w.document.getElementById('tdb-vip-drawer');
  const trigger = w.document.querySelector('button');
  w.document.querySelector('section').getBoundingClientRect = () => ({ top: 100, bottom: 600, height: 500 });
  let closes = 0;
  w.TDBVIPDrawer = { close() { closes++; drawer.classList.remove('is-peeking', 'is-open'); } };
  w.TDBNavScroll = { focus() {}, release() {} };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  for (let cycle = 0; cycle < 3; cycle++) {
    trigger.click();
    assert(w.document.documentElement.classList.contains('tdb-slider-focus'));
    assert(drawer.classList.contains('is-peeking'), 'focus hides the handle without resetting its scroll state');
    trigger.click();
    assert(!w.document.documentElement.classList.contains('tdb-slider-focus'));
    assert(drawer.classList.contains('is-peeking'), 'releasing focus restores the existing handle pose');
  }
  assert.equal(closes, 0);
  drawer.classList.remove('is-peeking');
  trigger.click();
  trigger.click();
  assert(!drawer.classList.contains('is-peeking'), 'a previously hidden handle stays under normal scroll control');
  drawer.classList.add('is-open');
  trigger.click();
  assert.equal(closes, 1, 'an open form is still dismissed');
  dom.window.close();
});
function fixture(open) {
  const dom = new JSDOM(
    `<!doctype html><div data-tdb-disclosure-item class="faq3_accordion is-disclosure${open ? ' is-open' : ''}"><div role="button" tabindex="0" data-tdb-disclosure-trigger aria-expanded="${open}"><span data-tdb-chevron class="tdb-disclosure-chevron${open ? ' is-open' : ''}"></span></div><div data-tdb-disclosure-panel class="tdb-disclosure-panel${open ? ' is-open' : ''}"><a href="#">Answer</a></div></div>`,
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    d = w.document;
  w.eval(source);
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.TDBDisclosure.refresh();
  return {
    dom,
    w,
    item: d.querySelector('[data-tdb-disclosure-item]'),
    trigger: d.querySelector('[data-tdb-disclosure-trigger]'),
    panel: d.querySelector('[data-tdb-disclosure-panel]'),
    chevron: d.querySelector('[data-tdb-chevron]'),
  };
}
test('mount preserves authored open and closed states without enabling animation', () => {
  for (const open of [false, true]) {
    const { dom, w, item, trigger, panel, chevron } = fixture(open);
    assert.equal(trigger.getAttribute('aria-expanded'), String(open));
    assert.equal(panel.hidden, !open);
    assert.equal(panel.inert, !open);
    for (const node of [item, trigger, panel, chevron])
      assert.equal(node.classList.contains('is-open'), open);
    assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
    w.TDBDisclosure.refresh();
    assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
    dom.window.close();
  }
});
test('click and keyboard toggles enable animation and keep native state and accessibility aligned', () => {
  const { dom, w, item, trigger, panel, chevron } = fixture(true);
  panel.querySelector('a').focus();
  trigger.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), true);
  assert.equal(panel.hidden, true);
  assert.equal(w.document.activeElement, trigger);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  for (const node of [item, trigger, panel, chevron])
    assert.equal(node.classList.contains('is-open'), false);
  trigger.dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
  assert.equal(panel.hidden, false);
  assert.equal(panel.getAttribute('aria-hidden'), 'false');
  for (const node of [item, trigger, panel, chevron])
    assert.equal(node.classList.contains('is-open'), true);
  dom.window.close();
});
test('programmatic setup and disabled controls cannot enable startup motion', () => {
  const { dom, w, item, trigger, panel } = fixture(false);
  w.TDBDisclosure.mount(trigger).set(true);
  assert.equal(panel.hidden, false);
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
  trigger.setAttribute('aria-disabled', 'true');
  trigger.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(panel.hidden, false);
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
  dom.window.close();
});
