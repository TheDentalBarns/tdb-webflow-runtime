const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function tooltipFixture() {
  const dom = new JSDOM(
    '<div id="parent"><button class="tooltip2_element-wrapper">Info</button><div class="tooltip2_tooltip-wrapper" style="padding:8px"><span class="tooltip2_pointer" style="margin-bottom:4px"></span>Help</div></div><button id="other">Elsewhere</button>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    d = w.document,
    parent = d.querySelector('#parent'),
    anchor = d.querySelector('.tooltip2_element-wrapper'),
    tip = d.querySelector('.tooltip2_tooltip-wrapper');
  const frames = new Map();
  let id = 0,
    x = 200,
    y = 200;
  w.requestAnimationFrame = (fn) => {
    frames.set(++id, fn);
    return id;
  };
  w.cancelAnimationFrame = (id) => frames.delete(id);
  Object.defineProperties(d.documentElement, {
    clientWidth: { value: 500 },
    clientHeight: { value: 500 },
  });
  anchor.getBoundingClientRect = () => ({
    left: x,
    right: x + 20,
    top: y,
    bottom: y + 20,
    width: 20,
    height: 20,
  });
  tip.getBoundingClientRect = () => ({ width: 120, height: 60 });
  const observer = new w.MutationObserver(() => {});
  observer.observe(parent, { attributes: true, subtree: true, attributeFilter: ['style'] });
  w.eval(read('src/tooltips/tooltips.js'));
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  return {
    w,
    d,
    parent,
    anchor,
    tip,
    frames,
    move(a, b) {
      x = a;
      y = b;
    },
    writes() {
      return observer.takeRecords().length;
    },
    step(n = 1) {
      for (let i = 0; i < n; i++) {
        const next = [...frames.values()];
        frames.clear();
        next.forEach((fn) => fn());
      }
    },
    close() {
      observer.disconnect();
      w.close();
    },
  };
}

test('stable tooltip frames avoid writes while moving anchors still correct placement', () => {
  const f = tooltipFixture();
  try {
    f.parent.dispatchEvent(new f.w.MouseEvent('mouseenter'));
    assert(f.writes() > 0);
    f.step(120);
    assert.equal(f.writes(), 0);
    f.move(0, 200);
    f.step();
    assert.equal(f.tip.style.transform, 'translateX(50px)');
    assert(f.writes() > 0);
    f.move(0, 0);
    f.step();
    assert.equal(f.tip.style.top, '100%');
    assert.equal(f.tip.style.bottom, 'auto');
    assert(f.writes() > 0);
    f.step(60);
    assert.equal(f.writes(), 0);
    f.parent.dispatchEvent(new f.w.MouseEvent('mouseleave'));
    assert.equal(f.frames.size, 0);
  } finally {
    f.close();
  }
});

test('tooltip focus/reopening restores styles cleared by a native hide animation', async () => {
  const f = tooltipFixture();
  try {
    f.anchor.focus();
    assert.equal(f.tip.style.bottom, '100%');
    f.writes();
    f.d.querySelector('#other').focus();
    await Promise.resolve();
    assert.equal(f.frames.size, 0);
    f.tip.removeAttribute('style');
    f.anchor.focus();
    assert.equal(f.tip.style.bottom, '100%');
    assert.equal(f.tip.style.transform, 'translateX(0px)');
    f.writes();
    f.step(60);
    assert.equal(f.writes(), 0);
  } finally {
    f.close();
  }
});

function filterFixture() {
  const dom = new JSDOM(
    '<div id="footer" style="padding-right:10px"><button id="close"></button><button id="apply" style="padding-left:20px;padding-right:20px"><span class="tdb-review-filter_action-label">View <b>85</b> <span id="word">review<span id="plural">s</span></span></span></button></div>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    d = w.document,
    footer = d.querySelector('#footer'),
    close = d.querySelector('#close'),
    apply = d.querySelector('#apply'),
    word = d.querySelector('#word'),
    label = apply.firstElementChild;
  let footerWidth = 300,
    fullText = 160,
    shortText = 60;
  footer.getBoundingClientRect = () => ({ width: footerWidth, right: footerWidth });
  close.getBoundingClientRect = () => ({ right: 150 });
  label.getBoundingClientRect = () => ({ width: word.hidden ? shortText : fullText, height: 20 });
  apply.getBoundingClientRect = () => ({
    width:
      label.getBoundingClientRect().width +
      parseFloat(apply.style.paddingLeft || 20) +
      parseFloat(apply.style.paddingRight || 20),
  });
  const source = read('src/reviews/native/drawer-content.js');
  // Exercise the actual private fit routine with controlled native geometry;
  // full drawer/filter interaction is additionally checked in the browser.
  const block = source.slice(
    source.indexOf('    const filterApplyWord'),
    source.indexOf('    const applyFitResize'),
  );
  assert(block.includes('function fitFilterApply'));
  const api = new w.Function(
    'filterApplyPlural',
    'filterApply',
    'filterActions',
    'floatingFilterButton',
    'let destroyed=false,filterOpen=true;' +
      block +
      ';return {fit:fitFilterApply,restore:restoreApplyFit};',
  )(d.querySelector('#plural'), apply, footer, close);
  const observer = new w.MutationObserver(() => {});
  observer.observe(footer, { attributes: true, subtree: true });
  return {
    api,
    word,
    apply,
    resize(value) {
      footerWidth = value;
    },
    text(full, short) {
      fullText = full;
      shortText = short;
    },
    writes() {
      return observer.takeRecords().length;
    },
    close() {
      observer.disconnect();
      w.close();
    },
  };
}

test('review filter ignores its own unchanged resize deliveries, then refits wider layouts', () => {
  const f = filterFixture();
  try {
    f.api.fit();
    assert(f.word.hidden);
    f.writes();
    for (let i = 0; i < 100; i++) f.api.fit(false);
    assert.equal(
      f.writes(),
      0,
      'stable observer deliveries must not restore/hide the noun or reset padding',
    );
    f.resize(500);
    f.api.fit(false);
    assert.equal(f.word.hidden, false);
    assert.equal(f.apply.style.paddingLeft, '20px');
    assert(f.writes() > 0);
  } finally {
    f.close();
  }
});

test('review filter reconsiders changed content and fonts, and restores original padding', () => {
  const f = filterFixture();
  try {
    f.resize(250);
    f.api.fit();
    assert(f.word.hidden);
    assert(parseFloat(f.apply.style.paddingLeft) < 20);
    f.writes();
    f.api.fit(false);
    assert.equal(f.writes(), 0);
    f.text(30, 20);
    f.api.fit();
    assert.equal(f.word.hidden, false);
    assert.equal(f.apply.style.paddingLeft, '20px');
    f.text(160, 60);
    f.api.fit();
    assert(f.word.hidden);
    f.api.restore();
    assert.equal(f.word.hidden, false);
    assert.equal(f.apply.style.paddingLeft, '20px');
    assert.equal(f.apply.style.paddingRight, '20px');
    f.api.fit(false);
    assert(f.word.hidden, 'restoration invalidates the cache');
  } finally {
    f.close();
  }
});
