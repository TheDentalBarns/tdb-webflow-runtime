const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, process.env.TDB_USP_TEST_ARTIFACT === 'dist' ? '../dist/tdb-usp-loader.js' : '../src/usp/loader.js'), 'utf8');

function setup({present = false, ready = false, reject = false} = {}) {
  const calls = [], observations = [], errors = [];
  let callback, disconnected = 0, queries = 0;
  const window = {TDBUSPDrawer: ready ? {} : undefined, TDBModules: {
    load(url, options) { calls.push({url, options}); return reject ? Promise.reject(new Error('offline')) : Promise.resolve(); }
  }};
  const document = {documentElement: {}, querySelector(selector) { queries++; assert.equal(selector, '[data-tdb-usp]'); return present ? {} : null; }};
  class MutationObserver {
    constructor(fn) { callback = fn; }
    observe(root, options) { observations.push({root, options}); }
    disconnect() { disconnected++; }
  }
  vm.runInNewContext(source, {window, document, MutationObserver, console: {error: (...args) => errors.push(args)}});
  return {calls, observations, errors, window, mutation: records => callback(records), get disconnected() { return disconnected; }, get queries() { return queries; }};
}
const element = (direct, nested = false) => ({nodeType: 1, matches: () => direct, querySelector: () => nested ? {} : null});

test('a present native USP retains immediate loading and the existing registry URL', () => {
  const h = setup({present: true});
  assert.equal(h.calls.length, 1); assert.equal(h.observations.length, 0);
  assert.equal(h.calls[0].url, 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@3217122904abee907bac1af3c23c28320e421219/dist/tdb-usp-drawer.js');
  assert.equal(h.calls[0].options.ready(), false);
  h.window.TDBUSPDrawer = {}; assert.equal(h.calls[0].options.ready(), true);
});
test('feature-free pages request no adapter or dependencies', () => {
  const h = setup(); assert.equal(h.calls.length, 0); assert.equal(h.observations.length, 1);
  assert.equal(h.observations[0].options.childList, true); assert.equal(h.observations[0].options.subtree, true);
  h.mutation([{addedNodes: [{nodeType: 3}, element(false)]}]);
  assert.equal(h.calls.length, 0); assert.equal(h.queries, 1);
});
for (const nested of [false, true]) test('late native insertion works: ' + (nested ? 'nested subtree' : 'direct root'), () => {
  const h = setup(); h.mutation([{addedNodes: [element(!nested, nested)]}]);
  assert.equal(h.calls.length, 1); assert.equal(h.disconnected, 1);
  h.mutation([{addedNodes: [element(true)]}]); assert.equal(h.calls.length, 1);
});
test('an already initialized adapter is not requested again', () => {
  const h = setup({present: true, ready: true}); assert.equal(h.calls.length, 0);
});
test('failed loading preserves the error path without an observer retry loop', async () => {
  const h = setup({reject: true}); h.mutation([{addedNodes: [element(true)]}]);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(h.errors.length, 1); assert.equal(h.errors[0][0], 'Practice highlights could not load');
  assert.equal(h.disconnected, 1);
});
