const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const read = path => fs.readFileSync(__dirname + '/../' + path, 'utf8');
const providers = ['Google', 'Facebook', 'Yell', 'Doctify'];
function element() {
  return { attrs: {}, children: [], dataset: {}, style: {},
    setAttribute(key, value) { this.attrs[key] = value; },
    append(child) { this.children.push(child); } };
}
function setup() {
  const window = {};
  const document = { createElement: element, querySelectorAll: () => [], querySelector: () => null };
  vm.runInNewContext(read('src/reviews/native/cms.js'), { window, document });
  return { window, document, cms: window.TDBReviewCMS };
}
test('platform logos render without footer templates and preserve loading and styling', () => {
  const { cms } = setup();
  for (const provider of providers) {
    const node = cms.sourceIcon(provider, true), image = node.children[0];
    assert.equal(node.className, 'tdb-review-source-icon is-grayscale');
    assert.equal(image.src, cms.platformAsset(provider));
    assert.ok(image.src.endsWith('_tdb-review-' + provider.toLowerCase() + '.svg'));
    assert.equal(image.attrs.loading, 'lazy');
    assert.equal(image.attrs.fetchpriority, 'low');
    assert.equal(image.attrs.alt, '');
    assert.equal(image.attrs['aria-hidden'], 'true');
    assert.equal(image.attrs.width, '100%');
    assert.equal(image.attrs.height, '100%');
  }
  for (const value of ['Other', 'Direct testimonial', 'toString', '__proto__', '']) {
    assert.equal(cms.platformAsset(value), '');
    assert.equal(cms.sourceIcon(value).children.length, 0);
  }
});
for (const path of ['src/reviews/native/quotes.js', 'dist/tdb-review-quote-adapter.min.js']) {
  test(path + ' shares assets and preserves review activation without footer templates', () => {
    const { window, document, cms } = setup();
    const records = [...providers, 'Other'].map((platform, index) => ({ id: String(index), platform, name: 'Reviewer ' + index, excerpt: 'Review ' + index }));
    const cards = records.map(() => {
      const card = element(), parts = Object.fromEntries(['[data-tdb-team-text]', '[data-tdb-quotes-name]', '[data-tdb-quotes-source]', '[data-tdb-quote-action]'].map(key => [key, element()]));
      card.querySelector = key => parts[key];
      return card;
    });
    const root = { querySelector: () => ({ children: cards }), querySelectorAll: () => cards.map(card => card.querySelector('[data-tdb-quote-action]')) };
    let activate, opened, destroyed = false;
    window.TDBQuoteCarousel = { mount: (_, options) => { activate = options.onActivate; return { destroy() { destroyed = true; } }; } };
    vm.runInNewContext(read(path), { window, document });
    const api = window.TDBReviewQuotes.mount(root, { featured: records.map(r => r.id), getCached: id => records[Number(id)] }, { openReviews: args => { opened = args; } });
    records.forEach((record, index) => {
      const source = cards[index].querySelector('[data-tdb-quotes-source]');
      assert.equal(source.style.backgroundImage, cms.platformAsset(record.platform) ? 'url("' + cms.platformAsset(record.platform) + '")' : 'none');
      assert.equal(source.textContent, index < 4 ? '' : 'Other');
    });
    const trigger = cards[2].querySelector('[data-tdb-quote-action]');
    activate({ trigger, slide: cards[2], signal: 'test-signal' });
    assert.equal(opened.reviewId, '2');
    assert.equal(opened.trigger, trigger);
    assert.equal(opened.signal, 'test-signal');
    api.destroy();
    assert.equal(destroyed, true);
    assert.equal(trigger.attrs['aria-disabled'], 'true');
  });
}
