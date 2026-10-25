const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const markup = `<section data-tdb-review-introduction>
  <div data-tdb-review-summary data-tdb-review-trigger role="button" tabindex="0" aria-label="Read 85 patient reviews. Combined rating 4.94 out of 5.">
    <span data-tdb-review-rating="4.94" aria-label="Rating 4.94 out of 5"><span class="review-number_value" aria-hidden="true">4.94</span></span>
    <span data-tdb-review-count="85" aria-label="85 reviews"><span class="review-number_value" aria-hidden="true">(85)</span></span>
    <span data-tdb-review-count="85" data-tdb-count-format="plain" aria-label="85"><span class="review-number_value" aria-hidden="true">85</span></span>
  </div>
  <button data-tdb-review-trigger aria-label="Read the full review">Review quote</button>
</section>`;

function setup({ summary = { total: 90, average: 4.97 }, reduced = false, dataGate } = {}) {
  const dom = new JSDOM(markup, {
    url: 'https://dentalbarns.webflow.io/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const w = dom.window,
    root = w.document.querySelector('section'),
    observers = [];
  Object.defineProperty(w.document, 'readyState', { value: 'complete' });
  w.IntersectionObserver = class {
    constructor(callback, options) {
      Object.assign(this, { callback, options });
      observers.push(this);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.TDBConsent = {
    allows: () => true,
    subscribe(fn) {
      fn();
      return () => {};
    },
  };
  w.TDBModules = { load: async () => {} };
  w.TDBMotion = {
    reduced: { matches: reduced, addEventListener() {}, removeEventListener() {} },
    defaults: { ticker: 400 },
    ddText: () => ({ destroy() {} }),
  };
  w.TDBReviewCMS = {
    load: async () => {
      await dataGate;
      return { records: [], ...summary };
    },
  };
  for (const file of [
    'src/shared/native-ticker.js',
    'src/reviews/native/introduction.js',
    'src/reviews/native/loader.js',
  ])
    w.eval(fs.readFileSync(file, 'utf8'));
  return {
    w,
    root,
    observers,
    near() {
      observers
        .find((observer) => observer.options.rootMargin)
        .callback([{ target: root, isIntersecting: true }]);
    },
    show() {
      observers
        .find((observer) => observer.options.threshold === 0.25)
        .callback([{ isIntersecting: true, intersectionRatio: 1 }]);
    },
    close() {
      w.TDBReviewLoader.destroy();
      w.close();
    },
  };
}

test('loader and introduction hydrate visible and accessible summary from the same live data', async () => {
  let release;
  const dataGate = new Promise((resolve) => {
    release = resolve;
  });
  const f = setup({ dataGate });
  try {
    f.near();
    await tick();
    assert.equal(
      f.root.querySelector('[data-tdb-review-count]').getAttribute('aria-label'),
      '85 reviews',
    );
    release();
    await tick();
    f.show();
    await tick();
    const count = f.root.querySelector('[data-tdb-review-count]'),
      plain = f.root.querySelector('[data-tdb-count-format]'),
      rating = f.root.querySelector('[data-tdb-review-rating]');
    assert.equal(count.querySelector('.review-number_value').textContent, '(90)');
    assert.equal(count.getAttribute('aria-label'), '90 reviews');
    assert.equal(plain.querySelector('.review-number_value').textContent, '90');
    assert.equal(plain.getAttribute('aria-label'), '90');
    assert.equal(rating.querySelector('.review-number_value').textContent, '4.97');
    assert.equal(rating.getAttribute('aria-label'), 'Rating 4.97 out of 5');
    assert.equal(
      f.root.querySelector('[data-tdb-review-summary]').getAttribute('aria-label'),
      'Read 90 patient reviews. Combined rating 4.97 out of 5.',
    );
    assert.equal(f.root.querySelector('button').getAttribute('aria-label'), 'Read the full review');
    assert(
      [...f.root.querySelectorAll('.review-number_value')].every(
        (node) => node.getAttribute('aria-hidden') === 'true',
      ),
    );
    f.w.TDBReviewLoader.refresh();
    await tick();
    assert.equal(count.querySelector('.review-number_value').textContent, '(90)');
  } finally {
    f.close();
  }
});

test('zero and singular totals have matching labels with reduced motion; malformed summaries preserve the fallback', async () => {
  for (const summary of [
    { total: 0, average: 0 },
    { total: 1, average: 5 },
    { total: -1, average: 4.9 },
    { total: 90, average: NaN },
  ]) {
    const f = setup({ summary, reduced: true });
    try {
      f.near();
      await tick();
      f.show();
      await tick();
      const valid = summary.total >= 0 && Number.isFinite(summary.average),
        total = valid ? summary.total : 85,
        rating = valid ? summary.average.toFixed(2) : '4.94';
      const count = f.root.querySelector('[data-tdb-review-count]');
      assert.equal(count.querySelector('.review-number_value').textContent, `(${total})`);
      assert.equal(count.dataset.tdbReviewCount, String(total));
      assert.equal(
        count.getAttribute('aria-label'),
        `${total} ${total === 1 ? 'review' : 'reviews'}`,
      );
      assert.equal(
        f.root.querySelector('[data-tdb-review-summary]').getAttribute('aria-label'),
        `Read ${total} patient ${total === 1 ? 'review' : 'reviews'}. Combined rating ${rating} out of 5.`,
      );
    } finally {
      f.close();
    }
  }
});
