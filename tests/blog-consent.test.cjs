const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const loaderSource = fs.readFileSync('src/runtime/blog-feature-loader.js', 'utf8');
const controllerSource = fs.readFileSync('src/blog/filters.js', 'utf8');

function fixture({ page = true } = {}) {
  const dom = new JSDOM(page ? '<section data-tdb-blog-page></section>' : '<main></main>', {
    url: 'https://dentalbarns.webflow.io/blog',
    runScripts: 'outside-only',
  });
  const w = dom.window,
    subscribers = new Set(),
    requests = [];
  let allowed = false,
    release,
    mounts = 0,
    destroys = 0;
  w.TDBConsent = {
    allows: () => allowed,
    subscribe(fn) {
      subscribers.add(fn);
      fn();
      return () => subscribers.delete(fn);
    },
  };
  w.TDBRuntimeModuleRoot = new w.URL('https://cdn.example/release/');
  w.TDBModules = {
    load(url) {
      requests.push(String(url));
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  };
  Object.defineProperty(w.document, 'currentScript', {
    value: { src: 'https://cdn.example/release/tdb-blog.js' },
  });
  return {
    w,
    requests,
    subscribers,
    loader() {
      w.eval(loaderSource + '\nprepareBlogFeatureLoader();');
    },
    consent(value) {
      allowed = value;
      subscribers.forEach((fn) => fn());
    },
    complete() {
      w.TDBBlogFilters = {
        mount() {
          mounts++;
        },
        destroy() {
          destroys++;
        },
      };
      release();
    },
    counts: () => ({ mounts, destroys }),
    close() {
      w.close();
    },
  };
}

test('blog controller is definition-only and cannot request dependencies before a choice', async () => {
  const f = fixture();
  try {
    f.w.TDBModuleBootstrap = {
      ensure() {
        throw Error('Pre-consent bootstrap');
      },
    };
    f.w.eval(controllerSource);
    f.w.document.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    await f.w.TDBBlogFilters.mount();
    await tick();
    assert.equal(f.requests.length, 0);
    assert.equal(f.w.document.querySelector('[data-blog-ready]'), null);
  } finally {
    f.close();
  }
});

test('shared loader waits for the cookie choice and deduplicates an in-flight blog request', async () => {
  const f = fixture();
  try {
    f.loader();
    f.w.dispatchEvent(new f.w.Event('pageshow'));
    assert.deepEqual(f.requests, []);
    f.consent(true);
    f.w.dispatchEvent(new f.w.Event('online'));
    f.w.TDBBlogFeatureLoader.refresh();
    assert.deepEqual(f.requests, ['https://cdn.example/release/tdb-blog.js']);
    f.complete();
    await tick();
    assert.equal(f.counts().mounts, 1);
    f.consent(false);
    assert.equal(f.counts().destroys, 1);
  } finally {
    f.close();
  }
});

test('other pages do not create a blog loader or request its assets', () => {
  const f = fixture({ page: false });
  try {
    f.consent(true);
    f.loader();
    assert.equal(f.w.TDBBlogFeatureLoader, undefined);
    assert.deepEqual(f.requests, []);
  } finally {
    f.close();
  }
});

test('teardown cancels late activation and releases consent/event subscriptions', async () => {
  const f = fixture();
  try {
    f.loader();
    f.consent(true);
    f.w.TDBBlogFeatureLoader.destroy();
    f.w.TDBBlogFeatureLoader.destroy();
    f.complete();
    await tick();
    f.w.dispatchEvent(new f.w.Event('pageshow'));
    f.w.dispatchEvent(new f.w.Event('online'));
    assert.equal(f.counts().mounts, 0);
    assert.equal(f.subscribers.size, 0);
    assert.equal(f.requests.length, 1);
  } finally {
    f.close();
  }
});

test('consent withdrawn during bootstrap prevents motion and filter dependency requests', async () => {
  const f = fixture();
  try {
    let release;
    f.w.TDBModuleBootstrap = {
      ensure: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    };
    f.w.eval(controllerSource);
    f.consent(true);
    const mounting = f.w.TDBBlogFilters.mount();
    f.consent(false);
    release({
      load() {
        throw Error('Dependencies must stay gated');
      },
    });
    await assert.rejects(mounting, { name: 'AbortError' });
    assert.equal(f.w.document.querySelector('[data-blog-ready]'), null);
  } finally {
    f.close();
  }
});

test('destroy during motion loading prevents later drawer/filter/ticker downloads', async () => {
  const f = fixture();
  try {
    let release;
    f.w.TDBModuleBootstrap = {
      ensure: async () => ({
        load(url) {
          f.requests.push(String(url));
          return new Promise((resolve) => {
            release = resolve;
          });
        },
      }),
    };
    f.w.eval(controllerSource);
    f.consent(true);
    const mounting = f.w.TDBBlogFilters.mount();
    await tick();
    assert.deepEqual(f.requests, ['https://cdn.example/release/tdb-motion.js']);
    f.w.TDBBlogFilters.destroy();
    release();
    await assert.rejects(mounting, { name: 'AbortError' });
    assert.equal(f.requests.length, 1);
  } finally {
    f.close();
  }
});
