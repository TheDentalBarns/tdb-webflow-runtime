const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readNativeSlides } = require('../src/team-quotes/team-quotes.js');
test('native slide discovery preserves authored node identity, order and content', () => {
  const first = { textContent: 'First approved quote', matches: s => s === '[data-tdb-team-slide]' };
  const second = { textContent: 'Second approved quote', matches: s => s === '[data-tdb-team-slide]' };
  const decoration = { matches: () => false };
  const children = Object.freeze([first, decoration, second]);
  const root = { querySelector: () => ({ children }) };
  assert.deepEqual(readNativeSlides(root), [first, second]);
  assert.equal(readNativeSlides(root)[0], first);
  assert.equal(second.textContent, 'Second approved quote');
  assert.deepEqual(children, [first, decoration, second]);
});
test('an empty native collection does not invent fallback quotes', () => {
  assert.deepEqual(readNativeSlides({ querySelector: () => null }), []);
  assert.deepEqual(readNativeSlides({ querySelector: () => ({ children: [] }) }), []);
});
test('published owner plugin matches source', () => {
  assert.equal(fs.readFileSync(require.resolve('../dist/tdb-quote-carousel.js'), 'utf8'),
    fs.readFileSync(require.resolve('../src/team-quotes/team-quotes.js'), 'utf8'));
});
