const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const core = require('../src/calculator/core.js');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const entry = `<section id="treatment-calculator" data-tdb-calculator="inline" data-tdb-calc-load="interaction" data-tdb-calc-price-guide="false">
  <div class="tdbc-shell" data-node="shell"><header class="tdbc-header" data-node="header" data-tdb-calc-static><h2>Authored heading</h2></header>
  <div class="tdbc-main" data-node="main"><section data-node="step-1" data-tdb-calc-static data-tdb-calc-native-entry>
  <h3>Authored opening question</h3><form>${['cosmetic', 'restorative'].map((key) => `<label class="tdbc-category"><input type="checkbox" data-category="${key}" data-control="category-${key}"><span class="form_checkbox-icon"></span><span>${key}</span></label>`).join('')}</form>
  <p data-tdb-calc-status role="status"></p></section></div></div>
  <footer data-node="section-footer" data-tdb-calc-static>Authored footer</footer></section>
  <section id="headphones">Native page break</section><a id="jump" href="#treatment-calculator">Calculator</a><button id="drawer" data-tdb-calc-open>Open drawer</button>`;
const feed = Object.entries(core.IDS)
  .map(
    ([key, id]) =>
      `<div data-tdb-calc-record="${id}" data-name="${key}" data-label="${key}" data-price="100" data-min="100" data-max="100"></div>`,
  )
  .join('');
function setup() {
  const dom = new JSDOM(entry, {
    url: 'https://dentalbarns.webflow.io/dental-cost-lichfield',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const w = dom.window,
    observers = [],
    requests = [],
    mounts = [];
  Object.defineProperty(w.document, 'readyState', { value: 'complete' });
  Object.defineProperty(w.document, 'currentScript', {
    get: () => ({ src: 'https://cdn.example.test/release/dist/tdb-calculator-loader.js' }),
  });
  w.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.targets = [];
      this.options = options;
      observers.push(this);
    }
    observe(node) {
      this.targets.push(node);
    }
    disconnect() {}
  };
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event('close'));
  };
  w.TDBAvailability = {
    seed() {},
    subscribe() {},
    read: async () => {},
    snapshot: () => ({ state: 'unavailable' }),
    assessmentSlot: () => null,
  };
  w.TDBModules = { load: async () => {} };
  const root = w.document.querySelector('section');
  const change = (key, checked = true) => {
    const input = root.querySelector(`[data-category=${key}]`);
    input.checked = checked;
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
    return input;
  };
  const run = (file) => w.eval(fs.readFileSync(file, 'utf8'));
  return { dom, w, root, observers, requests, mounts, change, run };
}
test('native embed does not request a controller on proximity or local anchor focus', async () => {
  const h = setup();
  try {
    h.w.TDBModuleBootstrap = {
      ensure: async () => {
        h.requests.push('bootstrap');
        return { load: async () => {} };
      },
    };
    h.run('src/calculator/loader.js');
    for (const observer of h.observers)
      if (observer.targets.length) observer.callback([{ isIntersecting: true }]);
    h.w.document.getElementById('jump').dispatchEvent(new h.w.Event('focusin', { bubbles: true }));
    await tick();
    assert.deepEqual(h.requests, []);
    assert.equal(h.root.querySelector('h2').textContent, 'Authored heading');
  } finally {
    h.dom.window.close();
  }
});
test('rapid choices share one load and a failed request can be retried', async () => {
  const h = setup();
  try {
    let release,
      attempts = 0;
    h.w.TDBModuleBootstrap = {
      ensure: () => {
        attempts++;
        return new Promise((resolve, reject) => {
          release = () => reject(Error('offline'));
        });
      },
    };
    h.run('src/calculator/loader.js');
    h.change('cosmetic');
    h.change('restorative');
    assert.equal(attempts, 1);
    release();
    await tick();
    assert.match(h.root.textContent, /Choose again to retry/);
    h.w.TDBModuleBootstrap.ensure = async () => {
      attempts++;
      return {
        load: async (url) => {
          if (url.endsWith('.js'))
            h.w.TDBCalculator = {
              open() {},
              mount: async (root) =>
                h.mounts.push(
                  [...root.querySelectorAll('input:checked')].map((n) => n.dataset.category),
                ),
            };
        },
      };
    };
    h.change('cosmetic', false);
    await tick();
    await tick();
    assert.equal(attempts, 2);
    assert.deepEqual(h.mounts, [['restorative']]);
    assert.equal(h.root.hasAttribute('aria-busy'), false);
  } finally {
    h.dom.window.close();
  }
});
test('controller preserves native nodes, adopts changes during fetch, and resets both cards', async () => {
  const h = setup();
  try {
    let resolveFeed;
    h.w.fetch = () =>
      new Promise((resolve) => {
        resolveFeed = () => resolve({ ok: true, text: async () => feed });
      });
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    assert.equal(h.root.hasAttribute('data-tdb-calc-ready'), false);
    const header = h.root.querySelector('header'),
      first = h.root.querySelector('[data-node=step-1]'),
      checkbox = h.change('cosmetic');
    checkbox.focus();
    const promise = h.w.TDBCalculator.mount(h.root);
    assert.equal(h.w.TDBCalculator.mount(h.root), promise);
    h.change('restorative');
    resolveFeed();
    await promise;
    await tick();
    assert.equal(h.root.querySelector('header'), header);
    assert.equal(h.root.querySelector('[data-node=step-1]'), first);
    assert.equal(h.w.document.activeElement, checkbox);
    assert.equal(h.root.querySelectorAll('[data-node=step-1]').length, 1);
    assert.equal(h.root.querySelectorAll('input[data-category]:checked').length, 2);
    assert.equal(h.root.querySelectorAll('[data-node=step-2]').length, 1);
    assert.equal(h.root.querySelector('[data-node=price-guide-intro]'), null);
    assert.equal(h.root.nextElementSibling.id, 'headphones');
    h.root.querySelector('[data-action=reset]').click();
    assert.equal(h.root.querySelectorAll('input[data-category]:checked').length, 0);
    assert.equal(h.root.querySelectorAll('.tdbc-category.is-selected').length, 0);
    h.change('cosmetic');
    assert.equal(h.root.querySelectorAll('input[data-category]:checked').length, 1);
  } finally {
    h.dom.window.close();
  }
});
test('failed price fetch keeps native entry and mount retries without duplicate controls', async () => {
  const h = setup();
  try {
    h.w.fetch = async () => {
      throw Error('offline');
    };
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await assert.rejects(h.w.TDBCalculator.mount(h.root));
    assert.equal(h.root.querySelectorAll('input[data-category]').length, 2);
    assert.equal(h.root.hasAttribute('data-tdb-calc-ready'), false);
    h.w.fetch = async () => ({ ok: true, text: async () => feed });
    await h.w.TDBCalculator.mount(h.root);
    assert.equal(h.root.querySelectorAll('[data-node=step-2]').length, 1);
    assert.equal(h.root.querySelector('[data-category=cosmetic]').checked, true);
  } finally {
    h.dom.window.close();
  }
});
test('drawer opening remains independent of an untouched native inline entry', async () => {
  const h = setup();
  try {
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    await h.w.TDBCalculator.open(h.w.document.getElementById('drawer'));
    assert.equal(h.w.document.querySelector('dialog').open, true);
    assert.equal(h.root.hasAttribute('data-tdb-calc-ready'), false);
    assert.equal(h.root.querySelector('h2').textContent, 'Authored heading');
    h.w.TDBCalculator.close();
  } finally {
    h.dom.window.close();
  }
});

for (const retainChrome of [false, true])
  test(
    'inline viewport and interaction respect chrome policy; drawers keep modal focus: ' +
      retainChrome,
    async () => {
      const h = setup();
      try {
        if (retainChrome) h.w.document.body.dataset.tdbChromeFocus = 'off';
        h.w.document.body.insertAdjacentHTML('beforeend', feed);
        let focusCalls = 0;
        h.w.TDBNavScroll = {
          focus() {
            focusCalls++;
          },
          release() {},
        };
        h.run('src/calculator/core.js');
        h.run('src/calculator/ui.js');
        h.change('cosmetic');
        await h.w.TDBCalculator.mount(h.root);
        const observer = h.observers.find((o) => o.targets.includes(h.root));
        observer.callback([{ isIntersecting: true }]);
        h.root.dispatchEvent(new h.w.Event('pointerdown', { bubbles: true }));
        h.root.querySelector('input').focus();
        assert.equal(
          h.w.document.documentElement.classList.contains('tdbc-chrome-away'),
          !retainChrome,
        );
        assert.equal(
          h.root.classList.contains('is-focused'),
          !retainChrome,
          'inline sticky estimate cannot cover a retained navbar',
        );
        assert.equal(focusCalls > 0, !retainChrome);
        assert(
          h.root.querySelector('[data-node=step-2]'),
          'the calculator still renders the selected category',
        );
        await h.w.TDBCalculator.open(h.w.document.getElementById('drawer'));
        assert.equal(h.w.document.querySelector('dialog').open, true);
        assert(h.w.document.documentElement.classList.contains('tdbc-chrome-away'));
        h.w.TDBCalculator.close();
        assert.equal(
          h.w.document.documentElement.classList.contains('tdbc-chrome-away'),
          !retainChrome,
        );
      } finally {
        h.dom.window.close();
      }
    },
  );
