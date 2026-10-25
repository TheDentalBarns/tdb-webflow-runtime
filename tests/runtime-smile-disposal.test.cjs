const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setup() {
  const dom = new JSDOM('<div data-tdb-smile-placeholder></div>', {
    url: 'https://dentalbarns.webflow.io/',
    runScripts: 'outside-only',
  });
  const w = dom.window,
    holder = w.document.querySelector('div'),
    subscribers = new Set();
  let observer,
    release,
    requests = 0,
    unsubscribed = 0,
    prepared = 0,
    destroyed = 0;
  Object.defineProperty(w.document, 'readyState', { value: 'loading' });
  Object.defineProperty(w.document, 'currentScript', {
    value: { src: 'https://cdn.test/tdb-runtime.js' },
  });
  w.TDBRuntimeModuleRoot = new w.URL('https://cdn.test/');
  w.TDBConsent = {
    allows: () => true,
    subscribe(fn) {
      subscribers.add(fn);
      fn();
      return () => {
        subscribers.delete(fn);
        unsubscribed++;
      };
    },
  };
  w.IntersectionObserver = class {
    constructor(callback, options) {
      observer = this;
      Object.assign(this, { callback, options, targets: new Set(), disconnected: false });
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
      this.disconnected = true;
    }
  };
  w.TDBModules = {
    load() {
      requests++;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  };
  w.eval(
    fs.readFileSync('src/runtime/smile-feature-loader.js', 'utf8') +
      '\nprepareSmileFeatureLoader();',
  );
  w.eval(fs.readFileSync('src/runtime/runtime.js', 'utf8'));
  return {
    w,
    holder,
    observer,
    subscribers,
    near() {
      observer.callback([{ target: holder, isIntersecting: true }]);
    },
    ready() {
      w.TDBSmileFeed = {
        prepare() {
          prepared++;
        },
        destroy() {
          destroyed++;
        },
      };
      release();
    },
    stats: () => ({ requests, unsubscribed, prepared, destroyed }),
    close: () => w.close(),
  };
}

test('runtime destroy disposes the Smile observer and subscription once before loading', async () => {
  const f = setup();
  try {
    assert.equal(f.observer.options.rootMargin, '1200px 0px');
    assert.equal(f.observer.targets.size, 1);
    f.w.TDBRuntime.destroy();
    f.w.TDBRuntime.destroy();
    assert.equal(f.observer.disconnected, true);
    assert.equal(f.subscribers.size, 0);
    f.near();
    f.w.dispatchEvent(new f.w.Event('pageshow'));
    f.w.dispatchEvent(new f.w.Event('online'));
    await tick();
    assert.deepEqual(f.stats(), { requests: 0, unsubscribed: 1, prepared: 0, destroyed: 0 });
  } finally {
    f.close();
  }
});

test('runtime destroy during Smile download rejects late preparation and disposes the arriving feed', async () => {
  const f = setup();
  try {
    f.near();
    assert.equal(f.stats().requests, 1);
    assert.equal(f.holder.getAttribute('aria-busy'), 'true');
    f.w.TDBRuntime.destroy();
    assert.equal(f.holder.hasAttribute('aria-busy'), false);
    f.ready();
    await tick();
    assert.equal(f.observer.disconnected, true);
    assert.deepEqual(f.stats(), { requests: 1, unsubscribed: 1, prepared: 0, destroyed: 1 });
  } finally {
    f.close();
  }
});
