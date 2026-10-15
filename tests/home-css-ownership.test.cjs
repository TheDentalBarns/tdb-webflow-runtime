const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const read = file => fs.readFileSync(__dirname + '/../' + file, 'utf8');

test('bundled native foundation preserves disclosure state, keyboard access and focus return', () => {
  const dom = new JSDOM('<button data-tdb-disclosure-trigger>Closed</button><div data-tdb-disclosure-panel><input></div><a href="#" data-tdb-disclosure-trigger aria-expanded="true">Open</a><div data-tdb-disclosure-panel>Answer</div>', {runScripts:'outside-only', virtualConsole:new VirtualConsole()});
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({matches:false, addEventListener(){}});
  try {
    w.eval(read('dist/tdb-navbar-loader.js'));
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    assert.equal(w.TDBDisclosure.version, '1.2.1');
    assert.equal(w.TDBNavbarNative.version, '2.0.0');
    assert.equal(d.querySelectorAll('style[data-tdb-native-control-css]').length, 0);
    const [button, link] = d.querySelectorAll('[data-tdb-disclosure-trigger]');
    const [closed, open] = d.querySelectorAll('[data-tdb-disclosure-panel]');
    assert.equal(closed.hidden, true);
    assert.equal(closed.inert, true);
    assert.equal(open.hidden, false, 'authored expanded award stays expanded');
    button.click();
    assert.equal(closed.hidden, false);
    assert.equal(button.getAttribute('aria-controls'), closed.id);
    closed.querySelector('input').focus();
    w.TDBDisclosure.mount(button).set(false);
    assert.equal(d.activeElement, button);
    assert.equal(closed.getAttribute('aria-hidden'), 'true');
    link.dispatchEvent(new w.KeyboardEvent('keydown', {key:' ', bubbles:true, cancelable:true}));
    assert.equal(open.hidden, true);
    link.dispatchEvent(new w.KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true}));
    assert.equal(open.hidden, false);
    w.TDBDisclosure.refresh();
    button.click();
    assert.equal(closed.hidden, false, 'refresh does not attach duplicate toggles');
  } finally { w.close(); }
});

test('shared arrow feedback preserves independent pairs and never duplicates navigation', () => {
  const dom = new JSDOM('<div><button class="carousel-arrow" id="a"><span>Previous</span></button><button class="carousel-arrow" id="b">Next</button></div><div><div tabindex="0" class="carousel-arrow" id="c">Previous</div><button class="carousel-arrow" id="d" disabled>Next</button></div>', {runScripts:'outside-only'});
  const w = dom.window, d = w.document;
  try {
    w.eval(read('src/shared/carousel-arrow-feedback.js'));
    w.eval('prepareCarouselArrowFeedback()');
    const get = id => d.getElementById(id), selected = id => get(id).classList.contains('is-selected');
    let moves = 0;
    get('a').addEventListener('click', () => moves++);
    get('a').querySelector('span').click();
    assert.equal(moves, 1);
    assert.equal(selected('a'), true);
    get('c').dispatchEvent(new w.KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
    assert.equal(selected('c'), true);
    assert.equal(selected('a'), true);
    w.TDBCarouselArrowFeedback.select(get('b'));
    assert.equal(selected('b'), true);
    assert.equal(selected('a'), false);
    w.TDBCarouselArrowFeedback.select(get('d'));
    assert.equal(selected('d'), false);
    get('b').parentElement.setAttribute('inert', '');
    w.TDBCarouselArrowFeedback.select(get('a'));
    assert.equal(selected('a'), false);
    w.TDBCarouselArrowFeedback.clear(get('b'));
    assert.equal(selected('b'), false);
    assert.equal(selected('c'), true);
    assert.equal(moves, 1, 'presentation helpers do not dispatch navigation');
  } finally { w.close(); }
});
