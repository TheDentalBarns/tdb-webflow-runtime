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
    assert.equal(d.querySelectorAll('.is-phone-landscape').length, 0);
  } finally {
    w.close();
  }
});
