const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (path) => fs.readFileSync(path, 'utf8');

test('lazy review filter and its floating close keep loading artwork hidden until busy', () => {
  const dom = new JSDOM('<div id="host"></div>', { runScripts: 'outside-only' });
  const w = dom.window;
  try {
    // The initial page no longer contains an embedded spinner, so it cannot
    // supply that class through Webflow's optimized page stylesheet.
    const style = w.document.createElement('style');
    style.textContent = read('dist/tdb-drawer.css') + read('src/styles/tdb-control-effects.css');
    w.document.head.append(style);
    w.eval(read('src/templates/review-drawer.js'));
    w.TDBReviewDrawerTemplate.mount(w.document.querySelector('#host'));
    w.document.querySelector('.tdb-drawer_root').classList.remove('is-hidden');
    const filter = w.document.querySelector('[data-tdb-filter-toggle]');
    const floating = filter.cloneNode(true);
    floating.classList.add('is-filter-floating', 'is-filter-open');
    filter.parentElement.append(floating);
    for (const button of [filter, floating]) {
      const spinner = button.querySelector('[data-tdb-loading-indicator]');
      const icon = button.querySelector('[data-tdb-loading-content]');
      assert.equal(w.getComputedStyle(spinner).opacity, '0');
      assert.equal(w.getComputedStyle(spinner).visibility, 'hidden');
      assert.equal(w.getComputedStyle(spinner).position, 'absolute');
      button.setAttribute('data-tdb-loading', 'true');
      assert.equal(w.getComputedStyle(spinner).opacity, '1');
      assert.equal(w.getComputedStyle(spinner).visibility, 'visible');
      assert.equal(w.getComputedStyle(icon).visibility, 'hidden');
      button.removeAttribute('data-tdb-loading');
      assert.equal(w.getComputedStyle(spinner).visibility, 'hidden');
      assert.notEqual(w.getComputedStyle(icon).visibility, 'hidden');
    }
  } finally {
    w.close();
  }
});
