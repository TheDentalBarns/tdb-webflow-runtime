const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (name) => fs.readFileSync(name, 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const root =
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@' + 'b'.repeat(40) + '/dist/';
function fixture(html = '') {
  const dom = new JSDOM(html, {
    url: 'https://dentalbarns.webflow.io/',
    runScripts: 'outside-only',
  });
  const w = dom.window,
    d = w.document;
  const owner = d.createElement('script');
  owner.src = root + 'tdb-calculator-loader.js';
  Object.defineProperty(d, 'currentScript', { value: owner, configurable: true });
  const finish = (n) => n.dispatchEvent(new w.Event('load'));
  return { w, d, owner, finish, close: () => w.close() };
}
test('standalone entry points share one registry request and preserve an existing foundation owner', async () => {
  for (const existing of [false, true]) {
    const f = fixture();
    try {
      if (existing) {
        f.owner.src = root + 'tdb-consent.js';
        f.d.head.append(f.owner);
      }
      f.w.eval(read('src/shared/module-bootstrap.js'));
      const a = f.w.TDBModuleBootstrap.ensure(root);
      f.w.eval(read('src/shared/module-bootstrap.js'));
      const b = f.w.TDBModuleBootstrap.ensure('https://different.test/');
      assert.equal(a, b);
      assert.equal(f.d.scripts.length, 1);
      assert.equal(f.d.scripts[0].src, root + (existing ? 'tdb-consent.js' : 'tdb-modules.js'));
      const api = { load() {} };
      f.w.TDBModules = api;
      f.finish(f.d.scripts[0]);
      assert.equal(await a, api);
      assert.equal(await b, api);
      assert.equal(await f.w.TDBModuleBootstrap.ensure(root), api);
    } finally {
      f.close();
    }
  }
});
test('registry bootstrap retries network failure but does not reinsert a late timed-out script', async () => {
  const f = fixture();
  try {
    const timer = f.w.setTimeout.bind(f.w);
    f.w.setTimeout = (fn) => timer(fn, 10);
    f.w.eval(read('src/shared/module-bootstrap.js'));
    let a = f.w.TDBModuleBootstrap.ensure(root);
    f.d.scripts[0].dispatchEvent(new f.w.Event('error'));
    await assert.rejects(a, { code: 'TDB_NETWORK' });
    a = f.w.TDBModuleBootstrap.ensure(root);
    const node = f.d.scripts[0];
    await assert.rejects(a, { code: 'TDB_TIMEOUT' });
    await assert.rejects(f.w.TDBModuleBootstrap.ensure(root), { code: 'TDB_TIMEOUT' });
    assert.equal(f.d.scripts.length, 1);
    f.w.TDBModules = { load() {} };
    f.finish(node);
    await f.w.TDBModuleBootstrap.ensure(root);
    assert.equal(f.d.scripts.length, 1);
  } finally {
    f.close();
  }
});
test('calculator first click waits for CSS, shares concurrent intent and opens once with the trigger', async () => {
  const f = fixture('<a data-tdb-calc-open href="#treatment-calculator">Calculate</a>');
  try {
    f.w.eval(read('src/shared/modules.js'));
    f.w.eval(read('dist/tdb-calculator-loader.js'));
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    const trigger = f.d.querySelector('a');
    const click = () =>
      trigger.dispatchEvent(new f.w.MouseEvent('click', { bubbles: true, cancelable: true }));
    click();
    click();
    await tick();
    assert.equal(f.d.scripts.length, 0, 'controller execution waits for CSS');
    assert.equal(trigger.getAttribute('aria-busy'), 'true');
    const css = f.d.querySelector('link');
    assert.ok(css.href.endsWith('/tdb-calculator.css'));
    f.finish(css);
    await tick();
    assert.equal(f.d.scripts.length, 1);
    assert.equal(f.d.scripts[0].src, root + 'tdb-calculator.js');
    const opens = [];
    f.w.TDBCalculator = { open: (source) => opens.push(source) };
    f.finish(f.d.scripts[0]);
    await tick();
    assert.deepEqual(opens, [trigger]);
    assert.equal(trigger.hasAttribute('aria-busy'), false);
  } finally {
    f.close();
  }
});
test('calculator keeps modified navigation native and detects a missing controller export', async () => {
  const f = fixture('<a data-tdb-calc-open href="#treatment-calculator">Calculate</a>');
  try {
    const calls = [];
    f.w.TDBModules = {
      load: async (url, options) => {
        calls.push(String(url));
        if (options.ready) assert.equal(options.ready(), false);
        if (options.ready) throw Error('missing export');
      },
    };
    f.w.eval(read('dist/tdb-calculator-loader.js'));
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    const trigger = f.d.querySelector('a');
    const modified = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    trigger.dispatchEvent(modified);
    await tick();
    assert.equal(modified.defaultPrevented, false);
    assert.equal(calls.length, 0);
    // Hover preparation fails harmlessly; the native link remains available.
    trigger.dispatchEvent(new f.w.Event('pointerover', { bubbles: true }));
    await tick();
    assert.equal(calls.length, 2);
    assert.equal(trigger.getAttribute('href'), '#treatment-calculator');
    assert.equal(trigger.hasAttribute('aria-busy'), false);
  } finally {
    f.close();
  }
});
test('VIP preload and transport share the registry pin and wait for all CSS owners', async () => {
  const f = fixture(
    '<html data-wf-page="677cf86df9952f978d94d8a9"><body><div id="tdb-vip-drawer"></div></body></html>',
  );
  try {
    const pin = 'a'.repeat(40);
    f.owner.dataset.tdbAssetPins = JSON.stringify({ 'tdb-vip-drawer.js': pin });
    f.w.eval(read('src/shared/modules.js'));
    f.w.TDBRuntimePageState = { vipScrollSeed: { lastY: 0, up: 0, down: 0, peek: false } };
    f.w.tdbUIIsReady = () => false;
    f.w.tdbStyleIsReady = () => false;
    let release;
    f.w.tdbEnsureUI = f.w.tdbEnsureVIPUI = () => Promise.resolve();
    f.w.tdbEnsureVIPChrome = () =>
      new Promise((r) => {
        release = r;
      });
    f.w.eval(
      "const TDBRuntimeModuleRoot=new URL('" + root + "');\n" + read('src/vip-drawer/loader.js'),
    );
    f.w.prepareVIPDrawerLoader();
    const promise = f.w.TDBVIPDrawerLoader.load();
    await tick();
    const expected = root + 'tdb-vip-drawer.js';
    assert.equal(f.d.querySelector('link').href, expected);
    assert.equal(f.d.scripts.length, 0);
    release();
    await tick();
    assert.equal(f.d.scripts[0].src, expected);
    f.w.TDBVIPDrawer = { open() {}, resumeScroll() {} };
    f.finish(f.d.scripts[0]);
    assert.equal(await promise, f.w.TDBVIPDrawer);
    assert.equal(f.d.querySelector('link'), null);
  } finally {
    f.close();
  }
});
test('review archive keeps first filter intent, deduplicates rapid clicks and works without IntersectionObserver', async () => {
  const f = fixture(
    '<section data-tdb-review-page><button data-tdb-filter-toggle>Filters</button><div data-tdb-review-cms></div><p data-tdb-list-status></p></section>',
  );
  try {
    f.owner.src = root + 'tdb-review-list-loader.js';
    let release,
      mounts = 0,
      toggles = 0;
    const gate = new Promise((r) => {
      release = r;
    });
    const loaded = [];
    f.w.TDBModules = {
      load: async (url) => {
        loaded.push(String(url));
        if (String(url).endsWith('/tdb-motion.js')) await gate;
      },
    };
    f.w.TDBReviewList = {
      mount(root) {
        mounts++;
        root.querySelector('button').addEventListener('click', () => toggles++);
        return {};
      },
    };
    f.w.eval(read('dist/tdb-review-list-loader.js'));
    const button = f.d.querySelector('button');
    button.click();
    button.click();
    await tick();
    assert.equal(mounts, 0);
    release();
    await tick();
    assert.equal(mounts, 1);
    assert.equal(toggles, 1);
    assert.equal(loaded.filter((url) => url.endsWith('/tdb-motion.js')).length, 1);
    button.click();
    assert.equal(toggles, 2);
  } finally {
    f.close();
  }
});
