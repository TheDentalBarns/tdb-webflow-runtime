const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/reviews/native/drawer-content.js', 'utf8');
const render = source.slice(
  source.indexOf('    function renderSelection('),
  source.indexOf('    function commitFilterSelection('),
);
const build = source.slice(
  source.indexOf('    function build('),
  source.indexOf('    function navigate('),
);

function fixture({ open = false, landscape = false } = {}) {
  const dom = new JSDOM('<div id="track"></div>', { runScripts: 'outside-only' });
  const w = dom.window;
  const factory = new w.Function(
    'initiallyOpen',
    'landscape',
    `
    const track = document.getElementById('track');
    const data = {records: [{id:'editorial-lead'}, {id:'named-quote'}, {id:'newest'}]};
    const records = [{id:'newest'}, {id:'editorial-lead'}, {id:'named-quote'}];
    const history = [], reveals = [], totals = [];
    let visible = initiallyOpen, phase = initiallyOpen ? 'settled' : 'closed';
    let swiper = null, knownCount = records.length, pendingAppend = false;
    let reflectedIndex = 0, settledSlide = null, filterOpen = initiallyOpen;
    const readingPane = {scrollTop: 170}, reading = {clear() {}};
    const mark = {}, fades = {to() {}}, motion = {reviews:{openDelay:30}};
    const hideQuote = () => {}, parkMark = () => {}, appendRecords = () => {};
    const updateFilterOptions = () => {}, reflect = () => {};
    const length = () => records.length;
    const updateTotal = (n, animate) => totals.push({n, animate});
    const reveal = delay => reveals.push(delay);
    function slide(record) {
      const node = document.createElement('article');
      node.dataset.id = record.id;
      node.innerHTML = '<div data-tdb-review-scroll><span data-review-render="excerpt"></span></div>';
      node.firstChild.scrollTop = 90;
      return node;
    }
    function createSwiper(index = 0) {
      history.push({visible, index});
      // Swiper cannot discover an active slide when initialized in a zero-width shell.
      swiper = {
        slides: visible ? [...track.children] : [], activeIndex:index,
        destroy() {}, slideTo(index) {this.activeIndex = index;}
      };
    }
    const readingScroll = () => landscape ? readingPane : swiper?.slides[swiper.activeIndex]?.firstChild;
    track.replaceChildren(...records.map(slide));
    if (initiallyOpen) createSwiper();
    ${render}
    ${build}
    return {
      restoreEditorial() { renderSelection(data.records.slice()); },
      replaceFiltered() { renderSelection([data.records[2], data.records[1]]); },
      open(id) { visible = true; filterOpen = false; build(id); },
      close() { visible = false; phase = 'closed'; },
      get state() { return {history, reveals, totals, active:swiper?.slides[swiper.activeIndex]?.dataset.id,
        scroll:readingScroll()?.scrollTop, phase, count:track.children.length, touch:swiper?.allowTouchMove}; }
    };
  `,
  );
  return { api: factory(open, landscape), close: () => w.close() };
}

for (const landscape of [false, true]) {
  test(`filtered drawer reopens on the requested editorial review after hidden reset (${landscape ? 'landscape' : 'portrait'})`, () => {
    const f = fixture({ landscape });
    try {
      f.api.restoreEditorial();
      assert.equal(
        f.api.state.history.length,
        0,
        'hidden resets must not initialize a zero-width slider',
      );
      f.api.open('named-quote');
      assert.equal(f.api.state.active, 'named-quote');
      assert.equal(f.api.state.scroll, 0);
      assert.equal(f.api.state.count, 3);
      assert(f.api.state.history.every((entry) => entry.visible));
      f.api.close();
      f.api.restoreEditorial();
      f.api.open('editorial-lead');
      assert.equal(f.api.state.active, 'editorial-lead');
      assert.equal(f.api.state.history.length, 2);
      assert(f.api.state.history.every((entry) => entry.visible));
    } finally {
      f.close();
    }
  });
}

test('changing filters while the drawer is open still rebuilds and reveals immediately', () => {
  const f = fixture({ open: true });
  try {
    f.api.replaceFiltered();
    assert.equal(f.api.state.active, 'newest');
    assert.equal(f.api.state.count, 2);
    assert.equal(f.api.state.touch, false, 'the open filter sheet continues to own input');
    assert.equal(f.api.state.reveals.at(-1), 0);
    assert(f.api.state.history.every((entry) => entry.visible));
  } finally {
    f.close();
  }
});
