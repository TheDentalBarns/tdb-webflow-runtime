const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const entry = fs.readFileSync('dist/tdb-start.min.js', 'utf8');
const base = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@' + 'c'.repeat(40) + '/dist/';
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({ fonts = true, raf = true, readyState = 'loading' } = {}) {
  const dom = new JSDOM('<html><head></head><body></body></html>', {
    url: 'https://dentalbarns.webflow.io/any-page', runScripts: 'outside-only',
  });
  const w = dom.window, d = w.document, timers = [], frames = [];
  const script = d.createElement('script'); script.src = base + 'tdb-start.min.js';
  script.dataset.tdbAssetPins = JSON.stringify({ 'tdb-motion.js': 'a'.repeat(40) });
  Object.defineProperty(d, 'currentScript', { value: script });
  Object.defineProperty(d, 'readyState', { value: readyState, configurable: true });
  let settle, reject;
  if (fonts) Object.defineProperty(d, 'fonts', { value: { ready: new Promise((a, b) => { settle = a; reject = b; }) } });
  w.setTimeout = (fn, ms) => { timers.push({fn, ms}); return timers.length; };
  w.clearTimeout = () => {};
  if (raf) w.requestAnimationFrame = fn => frames.push(fn);
  w.eval(entry);
  return { w, d, timers, frames, settle, reject, close: () => w.close(), run: () => w.eval(entry) };
}
test('single entry fetches one foundation at DOM ready while font readiness remains pending', async () => {
  const f = fixture();
  try {
    assert.equal(f.d.scripts.length, 0);
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    assert.equal(f.d.scripts.length, 1);
    assert.equal(f.frames.length, 0);
    assert.equal(f.timers.some(timer => timer.ms === 50), false);
    assert.equal(f.d.scripts[0].src, base + 'tdb-foundation.js');
    assert.equal(f.w.TDBRelease.commit, 'c'.repeat(40));
    assert.equal(f.w.TDBModules.resolve(base.replace('c'.repeat(40), 'old') + 'tdb-motion.js'), base + 'tdb-motion.js');
    f.run(); f.d.dispatchEvent(new f.w.Event('DOMContentLoaded')); await tick();
    assert.equal(f.d.scripts.length, 1);
    f.w.TDBConsent = {}; f.w.TDBNavbarState = {};
    f.d.scripts[0].dispatchEvent(new f.w.Event('load'));
    assert.equal(await f.w.TDBStart.ready, true);
    assert.equal(f.w.TDBStart.status().state, 'ready');
    assert.equal(f.d.body.getAttribute('data-wf-scroll-motion'), 'none');
    assert.equal(f.w.TDBMotionPolicy.reduced.matches, false);
  } finally { f.close(); }
});
for (const readyState of ['interactive', 'complete']) test('already parsed DOM starts foundation immediately: ' + readyState, async () => {
  const f = fixture({ readyState });
  try {
    assert.equal(f.d.scripts.length, 1);
    assert.equal(f.frames.length, 0);
    f.settle(); await tick();
    f.run();
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    assert.equal(f.d.scripts.length, 1);
    assert.equal(f.timers.some(timer => timer.ms === 50), false);
  } finally { f.close(); }
});
test('missing font and frame APIs do not delay foundation', () => {
  const f = fixture({ fonts: false, raf: false, readyState: 'interactive' });
  try { assert.equal(f.d.scripts.length, 1); }
  finally { f.close(); }
});
