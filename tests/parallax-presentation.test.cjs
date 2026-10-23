const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('phone landscape preserves native postage controls while Services keeps its own layout', () => {
  const controls =
    '<div class="tdb-service-controls is-phone-landscape"><div class="tdb-service-buttons is-phone-landscape"></div></div><div class="tdb-service-copy"></div>';
  const dom = new JSDOM(
    `<html class="tdb-phone-landscape"><body>
    <section id="services" class="tdb-service-parallax">${controls}</section>
    <section id="postage" data-tdb-treatment data-tdb-treatment-postage>${controls}</section>
    <section id="legacy" data-tdb-treatment>${controls}</section>
  </body></html>`,
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    d = w.document;
  let frame;
  w.requestAnimationFrame = (fn) => ((frame = fn), 1);
  let landscape = true;
  w.matchMedia = (query) => ({
    get matches() {
      return landscape && query.includes('orientation:landscape');
    },
    addEventListener() {},
  });
  Object.defineProperty(d, 'readyState', { value: 'complete' });
  try {
    w.eval(fs.readFileSync('src/sliders/parallax-presentation.js', 'utf8'));
    for (const id of ['services', 'legacy']) {
      assert(
        d.querySelector(`#${id} .tdb-service-controls`).classList.contains('is-phone-landscape'),
      );
      assert(
        d.querySelector(`#${id} .tdb-service-buttons`).classList.contains('is-phone-landscape'),
      );
    }
    for (const selector of ['.tdb-service-controls', '.tdb-service-buttons']) {
      assert(!d.querySelector(`#postage ${selector}`).classList.contains('is-phone-landscape'));
      assert.equal(d.querySelector(`#postage ${selector}`).getAttribute('style'), null);
    }
    assert(d.querySelector('#postage .tdb-service-copy').classList.contains('is-phone-landscape'));
    assert.equal(d.querySelector('#postage').dataset.tdbServiceLayout, 'phone-landscape');
    landscape = false;
    d.documentElement.classList.remove('tdb-phone-landscape');
    w.dispatchEvent(new w.Event('orientationchange'));
    frame();
    assert.equal(d.querySelectorAll('.is-phone-landscape').length, 0);
  } finally {
    w.close();
  }
});

test('resize bursts skip unchanged layouts but explicit prepare handles new native nodes', () => {
  const dom = new JSDOM(
    '<section data-tdb-treatment data-tdb-treatment-postage><div class="tdb-service-copy"></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    d = w.document,
    root = d.querySelector('section');
  let portrait = false,
    queued = [],
    scans = 0;
  Object.defineProperty(d, 'readyState', { value: 'complete' });
  w.matchMedia = (query) => ({
    get matches() {
      return query.includes('portrait') ? portrait : query.includes('min-width') && !portrait;
    },
    addEventListener() {},
  });
  w.requestAnimationFrame = (fn) => (queued.push(fn), queued.length);
  w.cancelAnimationFrame = () => {};
  const query = root.querySelectorAll.bind(root);
  root.querySelectorAll = (...args) => (scans++, query(...args));
  w.eval(fs.readFileSync('src/sliders/parallax-presentation.js', 'utf8'));
  const observer = new w.MutationObserver(() => {});
  observer.observe(root, { attributes: true, subtree: true });
  scans = 0;
  try {
    for (let i = 0; i < 100; i++) w.dispatchEvent(new w.Event('resize'));
    assert.equal(queued.length, 1);
    queued.shift()();
    assert.equal(scans, 0);
    assert.equal(observer.takeRecords().length, 0);
    portrait = true;
    w.dispatchEvent(new w.Event('resize'));
    queued.shift()();
    assert.equal(root.dataset.tdbServiceLayout, 'portrait');
    assert.equal(scans, 1);
    root.insertAdjacentHTML('beforeend', '<div class="tdb-service-copy is-phone-landscape"></div>');
    w.TDBParallaxPresentation.prepare(root);
    assert.equal(root.querySelectorAll('.is-phone-landscape').length, 0);
  } finally {
    observer.disconnect();
    w.close();
  }
});
