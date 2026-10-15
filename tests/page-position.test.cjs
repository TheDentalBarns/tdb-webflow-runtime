const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('pageshow consumers share one position without losing fresh restoration state', () => {
  let reads = 0;
  const window = {scrollY: 480};
  const document = {documentElement: {get scrollTop() { reads++; return 900; }, clientHeight: 700}};
  const context = vm.createContext({window, document, innerHeight: 800, WeakMap});
  vm.runInContext(fs.readFileSync('src/runtime/page-position.js', 'utf8') + '\nthis.readPosition = tdbReadPagePosition;', context);
  const first = {};
  const position = context.readPosition(first);
  assert.equal(position.y, 480);
  assert.equal(position.height, 800);
  window.scrollY = 0;
  assert.equal(context.readPosition(first), position, 'later consumers reuse the event snapshot');
  assert.equal(context.readPosition({}).y, 0, 'a new pageshow sees the restored zero offset');
  assert.equal(context.readPosition().y, 0, 'ordinary reads remain uncached');
  assert.equal(reads, 0, 'a valid window offset avoids a layout-dependent fallback read');
  delete window.scrollY;
  assert.equal(context.readPosition().y, 900);
  assert.equal(reads, 1);
});
