const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('dist/tdb-consent.min.js', 'utf8');
const accepted = { action: 'accept', categories: ['strict', 'functionality'] };
const rejected = { action: 'reject', categories: ['strict'] };
function fixture(choice = {}) {
  const dom = new JSDOM('<div data-tdb-journey><div data-tdb-journey-map role="region" aria-label="Map to The Dental Barns"><p>Free parking on arrival.</p></div><a href="https://www.google.com/maps/">Open in Google Maps</a></div>', { url: 'https://dentalbarns.webflow.io/location', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, canvas = d.querySelector('[data-tdb-journey-map]');
  let shown = 0, decision = choice;
  Object.defineProperty(d, 'readyState', { get: () => 'interactive' });
  Object.defineProperty(d, 'currentScript', { get: () => ({ src: 'https://cdn.test/dist/tdb-consent.min.js' }) });
  w.CookieScript = { instance: { currentState: () => decision, show() { shown++; } } };
  const requests = [];
  w.TDBModules = { async load(url) { requests.push(String(url)); w.TDBRuntime = { refresh() {} }; } };
  w.eval(source);
  return { w, d, canvas, requests, shown: () => shown,
    click(node = canvas) { node.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); },
    key(key, repeat = false) { const event = new w.KeyboardEvent('keydown', { key, repeat, bubbles: true, cancelable: true }); canvas.dispatchEvent(event); return event; },
    choose(value) { decision = value; w.dispatchEvent(new w.Event('CookieScriptCurrentState')); },
    close() { w.close(); }
  };
}
for (const choice of [{}, rejected]) test('map opens shared consent with ' + (choice.action || 'no decision') + ', before the journey module exists', () => {
  const f = fixture(choice);
  assert.equal(f.w.TDBJourney, undefined);
  assert.equal(f.canvas.getAttribute('role'), 'button');
  assert.equal(f.canvas.tabIndex, 0);
  f.click(f.canvas.querySelector('p'));
  assert.equal(f.shown(), 1);
  assert.equal(f.d.activeElement, f.canvas);
  assert.equal(f.requests.some(url => /google|journey/.test(url)), false);
  assert.equal(f.d.querySelectorAll('script,iframe').length, 0);
  f.close();
});
test('Enter and Space open consent once; other/repeated keys and external directions are left alone', () => {
  const f = fixture(rejected);
  assert.equal(f.key('Enter').defaultPrevented, true);
  assert.equal(f.key(' ').defaultPrevented, true);
  assert.equal(f.key('ArrowDown').defaultPrevented, false);
  assert.equal(f.key('Enter', true).defaultPrevented, false);
  const anchor = f.d.querySelector('a');
  anchor.addEventListener('click', event => event.preventDefault());
  f.click(anchor);
  assert.equal(f.shown(), 2);
  f.close();
});
test('acceptance restores map semantics; revocation restores consent entry without new DOM', () => {
  const f = fixture(rejected), elements = f.d.querySelectorAll('*').length;
  f.choose(accepted);
  assert.equal(f.canvas.getAttribute('role'), 'region');
  assert.equal(f.canvas.getAttribute('aria-label'), 'Map to The Dental Barns');
  assert.equal(f.canvas.hasAttribute('tabindex'), false);
  assert.equal(f.canvas.hasAttribute('aria-haspopup'), false);
  f.click(); f.key('Enter');
  assert.equal(f.shown(), 0);
  f.choose(rejected); f.choose(rejected); f.click();
  assert.equal(f.shown(), 1);
  assert.equal(f.d.querySelectorAll('*').length, elements);
  f.close();
});
test('saved functional consent leaves the canvas untouched from startup', () => {
  const f = fixture(accepted);
  assert.equal(f.canvas.getAttribute('role'), 'region');
  assert.equal(f.canvas.hasAttribute('tabindex'), false);
  f.click();
  assert.equal(f.shown(), 0);
  f.close();
});
test('a click before the banner API is ready is handed off once when it arrives', () => {
  const f = fixture();
  const instance = f.w.CookieScript.instance;
  delete f.w.CookieScript.instance;
  f.click(); assert.equal(f.shown(), 0);
  f.w.CookieScript.instance = instance;
  f.w.dispatchEvent(new f.w.Event('CookieScriptLoaded'));
  f.w.dispatchEvent(new f.w.Event('CookieScriptLoaded'));
  assert.equal(f.shown(), 1);
  f.close();
});
