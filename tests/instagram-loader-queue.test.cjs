const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  test = require('node:test');
const source = fs.readFileSync(
  path.join(__dirname, '../src/runtime/instagram-feature-loader.js'),
  'utf8',
);
const turn = () => new Promise(setImmediate),
  gate = () => {
    let resolve, reject;
    const promise = new Promise((a, b) => {
      resolve = a;
      reject = b;
    });
    return { promise, resolve, reject };
  };
function fixture(source, { failPrepare = false, failModule = false, holdModule = false } = {}) {
  const make = (id) => ({
    id,
    isConnected: true,
    attrs: {},
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    removeAttribute(k) {
      delete this.attrs[k];
    },
  });
  const holders = [make('first'), make('second'), make('third')],
    first = gate(),
    second = gate(),
    moduleGate = gate(),
    calls = [],
    unobserved = [];
  let observer,
    allowed = true,
    loads = 0,
    holdSecond = false;
  const window = {
    addEventListener() {},
    TDBConsent: { allows: () => allowed, subscribe: () => () => {} },
    TDBModules: {
      load() {
        loads++;
        return failModule
          ? Promise.reject(Error('controlled module failure'))
          : holdModule && loads === 1
            ? moduleGate.promise
            : Promise.resolve();
      },
    },
    TDBInstagramDeferred: {
      destroy() {},
      prepare(h) {
        if (h.attrs['data-ig-state'] === 'ready') return Promise.resolve();
        calls.push(h.id);
        return (
          h === holders[0]
            ? first.promise
            : h === holders[1] && holdSecond
              ? second.promise
              : Promise.resolve()
        ).then(() => {
          if (failPrepare && h === holders[0]) throw Error('controlled preparation failure');
          h.attrs['data-ig-state'] = 'ready';
        });
      },
    },
  };
  const document = {
    querySelector: () => null,
    querySelectorAll: () => holders,
    addEventListener() {},
  };
  class IO {
    constructor(cb) {
      observer = cb;
    }
    observe() {}
    unobserve(h) {
      unobserved.push(h.id);
    }
    disconnect() {}
  }
  window.IntersectionObserver = IO;
  vm.runInNewContext(source + '\nprepareInstagramFeatureLoader();', {
    window,
    document,
    IntersectionObserver: IO,
    AbortController,
    Promise,
    URL,
    TDBRuntimeModuleRoot: 'https://example.invalid/',
    console: { warn() {} },
  });
  window.TDBInstagramFeatureLoader.refresh();
  return {
    holders,
    first,
    second,
    moduleGate,
    calls,
    unobserved,
    enter(i) {
      observer([{ target: holders[i], isIntersecting: true }]);
    },
    refresh() {
      window.TDBInstagramFeatureLoader.refresh();
    },
    destroy() {
      window.TDBInstagramFeatureLoader.destroy();
    },
    allow(v) {
      allowed = v;
    },
    holdSecond() {
      holdSecond = true;
    },
    get loads() {
      return loads;
    },
  };
}
test('drains a gallery queued during preparation', async () => {
  const f = fixture(source);
  f.enter(0);
  await turn();
  f.enter(1);
  f.first.resolve();
  await turn();
  assert.deepEqual(f.calls, ['first', 'second']);
  assert.equal(f.holders[1].attrs['data-ig-state'], 'ready');
  assert.equal(f.loads, 2);
});
test('handles a new gallery during module loading', async () => {
  const f = fixture(source, { holdModule: true });
  f.enter(0);
  await turn();
  f.enter(1);
  f.moduleGate.resolve();
  f.first.resolve();
  await turn();
  assert.deepEqual(f.calls, ['first', 'second']);
});
test('Duplicate proximity callbacks do not start extra batches', async () => {
  const f = fixture(source);
  f.enter(0);
  await turn();
  f.enter(0);
  f.first.resolve();
  await turn();
  assert.deepEqual(f.calls, ['first']);
  assert.equal(f.loads, 1);
});
test('Disconnected queued holders are not prepared', async () => {
  const f = fixture(source);
  f.enter(0);
  await turn();
  f.enter(1);
  f.holders[1].isConnected = false;
  f.first.resolve();
  await turn();
  assert.deepEqual(f.calls, ['first']);
});
test('Consent revocation stops queue draining until restored', async () => {
  const f = fixture(source);
  f.enter(0);
  await turn();
  f.enter(1);
  f.allow(false);
  f.first.resolve();
  await turn();
  assert.deepEqual(f.calls, ['first']);
  f.allow(true);
  f.refresh();
  await turn();
  assert.equal(f.holders[1].attrs['data-ig-state'], 'ready');
});
test('Destroy stops queued work', async () => {
  const f = fixture(source);
  f.enter(0);
  await turn();
  f.enter(1);
  f.destroy();
  f.first.resolve();
  await turn();
  assert.deepEqual(f.calls, ['first']);
});
test('Preparation failure does not create an endless retry loop', async () => {
  const f = fixture(source, { failPrepare: true });
  f.enter(0);
  await turn();
  f.enter(1);
  f.first.resolve();
  await turn();
  await turn();
  assert.ok(f.calls.filter((x) => x === 'first').length <= 2);
  assert.equal(f.calls.filter((x) => x === 'second').length, 1);
  assert.equal(f.loads, 2);
});
test('Module failure stops after queued arrivals are attempted', async () => {
  const f = fixture(source, { failModule: true });
  f.enter(0);
  f.enter(1);
  await turn();
  await turn();
  assert.ok(f.loads <= 2);
  assert.deepEqual(f.calls, []);
});
test('A third gallery queued in the second batch is drained', async () => {
  const f = fixture(source);
  f.holdSecond();
  f.enter(0);
  await turn();
  f.enter(1);
  f.first.resolve();
  await turn();
  f.enter(2);
  f.second.resolve();
  await turn();
  assert.deepEqual(f.calls, ['first', 'second', 'third']);
});
