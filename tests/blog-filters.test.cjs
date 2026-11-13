const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
async function setup() {
  const dom = new JSDOM(fs.readFileSync('src/blog/filter.html', 'utf8'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://dentalbarns.webflow.io/blog',
  });
  const w = dom.window,
    d = w.document;
  w.TDBConsent = { allows: () => true };
  d.querySelector('[data-blog-filter-options]').innerHTML =
    '<form data-blog-category-form>' +
    ['Behind the Scenes', 'In the Press', 'Insights']
      .map(
        (text) =>
          `<label class="tdb-blog-filter"><input type="radio" name="category"><span class="tdb-blog-filter-label">${text}</span></label>`,
      )
      .join('') +
    '</form>';
  const data = [
    ['A', 'Behind the Scenes', 'David Drew', 'Internal', 'The Dental Barns', 'Camera A'],
    ['B', 'Behind the Scenes', 'David Drew', 'Internal', 'The Dental Barns', 'Camera B'],
    ['C', 'In the Press', 'Dr Keely Thorne', 'External', 'Newsweek', ''],
    ['D', 'In the Press', 'David Drew', 'External', 'Dentistry', 'Scanner'],
    ['E', 'Insights', 'The Dental Barns', 'Internal', 'The Dental Barns', 'Camera A | Camera B'],
  ];
  const fields = ['category', 'author', 'source', 'publication', 'product'];
  d.querySelector('[data-blog-posts]').innerHTML =
    '<div data-blog-post-list>' +
    data
      .map(
        ([name, ...values]) =>
          `<article class="w-dyn-item" data-name="${name}"><h2>${name}</h2>` +
          values.map((value, i) => `<span data-blog-meta="${fields[i]}">${value}</span>`).join('') +
          '</article>',
      )
      .join('') +
    '</div>';
  Object.defineProperty(d, 'currentScript', {
    value: { src: 'https://cdn.example/dist/tdb-blog.js' },
  });
  const reduced = new w.EventTarget();
  reduced.matches = true;
  w.TDBMotion = { reduced, filterToggle: () => ({ set() {}, destroy() {} }) };
  let locked = false;
  w.TDBScrollLock = {
    acquire() {
      locked = true;
      return () => {
        locked = false;
      };
    },
  };
  w.TDBSiteChrome = { acquire: () => () => {}, settleBackground() {} };
  w.TDBModuleBootstrap = { ensure: async () => ({ load: async () => {} }) };
  w.TDBNativeTicker = {
    mount: (slot) => ({
      update: (value) => {
        slot.textContent = value;
      },
      destroy() {},
    }),
  };
  const form = d.querySelector('form'),
    originalInput = form.querySelector('input');
  for (const path of ['src/shared/filters.js', 'src/shared/drawer.js', 'src/blog/filters.js'])
    w.eval(fs.readFileSync(path, 'utf8'));
  await w.TDBBlogFilters.mount();
  const input = (key, value) =>
    d.querySelector(`[data-blog-filter-field="${key}"][value="${value.toLowerCase()}"]`);
  return {
    w,
    d,
    form,
    originalInput,
    input,
    locked: () => locked,
    visible: () =>
      [...d.querySelectorAll('[data-blog-post-list]>.w-dyn-item:not([hidden])')].map(
        (el) => el.dataset.name,
      ),
    choose(key, value, checked = true) {
      const el = input(key, value);
      assert.ok(el, `Missing ${key}: ${value}`);
      assert.equal(el.disabled, false, `${key}: ${value} must be available`);
      el.checked = checked;
      el.dispatchEvent(new w.Event('change', { bubbles: true }));
    },
    close() {
      w.TDBBlogFilters.destroy();
      w.close();
    },
  };
}
test('native CMS cards use the locked shared drawer and return to the bottom home', async () => {
  const x = await setup();
  try {
    const { d } = x,
      toggle = d.querySelector('[data-blog-filter-toggle]'),
      dock = d.querySelector('[data-blog-filter-dock]'),
      apply = d.querySelector('[data-blog-filter-apply]');
    assert.equal(d.querySelector('form'), x.form);
    assert.equal(x.originalInput.type, 'checkbox');
    assert.equal(apply.getAttribute('aria-label'), 'View 5 posts');
    toggle.click();
    await tick();
    assert.equal(x.locked(), true);
    assert.equal(dock.parentElement.hasAttribute('data-tdb-drawer-panel'), true);
    x.choose('category', 'Behind the Scenes');
    assert.deepEqual(x.visible(), ['A', 'B']);
    assert.equal(apply.getAttribute('aria-label'), 'View 2 posts');
    apply.click();
    await tick();
    assert.equal(x.locked(), false);
    assert.equal(dock.parentElement.className, 'tdb-filter-sticky-anchor');
    x.w.TDBBlogFilters.destroy();
    assert.equal(d.querySelector('.tdb-filter-sticky-rail'), null);
    assert.ok(dock.closest('[data-blog-filter-landing]'));
    assert.equal(x.originalInput.type, 'radio');
    assert.equal(d.querySelectorAll('[data-blog-filter-group]').length, 1);
    assert.deepEqual(x.visible(), ['A', 'B', 'C', 'D', 'E']);
  } finally {
    x.close();
  }
});
test('multi-select choices use OR within groups and AND across groups', async () => {
  const x = await setup();
  try {
    x.choose('product', 'Camera A');
    assert.deepEqual(x.visible(), ['A', 'E']);
    x.choose('product', 'Camera B');
    assert.deepEqual(x.visible(), ['A', 'B', 'E']);
    x.choose('author', 'David Drew');
    assert.deepEqual(x.visible(), ['A', 'B']);
    x.choose('author', 'The Dental Barns');
    assert.deepEqual(x.visible(), ['A', 'B', 'E']);
    x.choose('product', 'Camera A', false);
    assert.deepEqual(x.visible(), ['B', 'E']);
    x.choose('category', 'Insights');
    assert.deepEqual(x.visible(), ['E']);
    assert.equal(
      x.d.querySelector('[data-blog-filter-apply]').getAttribute('aria-label'),
      'View 1 post',
    );
  } finally {
    x.close();
  }
});
test('zero-result options grey out, selected options remain removable, and reset restores availability', async () => {
  const x = await setup();
  try {
    x.choose('author', 'David Drew');
    x.choose('publication', 'Dentistry');
    assert.deepEqual(x.visible(), ['D']);
    for (const [key, value] of [
      ['source', 'Internal'],
      ['author', 'Dr Keely Thorne'],
      ['product', 'Camera A'],
      ['category', 'Behind the Scenes'],
    ]) {
      const el = x.input(key, value);
      assert.equal(el.disabled, true);
      assert.equal(el.getAttribute('aria-disabled'), 'true');
      assert.ok(el.closest('label').classList.contains('is-disabled'));
    }
    assert.equal(x.input('product', 'Scanner').disabled, false);
    assert.equal(x.input('publication', 'Dentistry').disabled, false);
    x.choose('publication', 'The Dental Barns');
    assert.deepEqual(x.visible(), ['A', 'B', 'D']);
    x.d.querySelector('[data-blog-filter-reset]').click();
    assert.deepEqual(x.visible(), ['A', 'B', 'C', 'D', 'E']);
    assert.equal(x.d.querySelectorAll('[data-blog-filter-field]:checked').length, 0);
    assert.equal(x.d.querySelectorAll('[data-blog-filter-field]:disabled').length, 0);
    assert.equal(x.d.querySelector('[data-blog-filter-reset]').disabled, true);
  } finally {
    x.close();
  }
});
test('the button is bounded by the section and its only cream landing bar', async () => {
  const x = await setup();
  try {
    const root = x.d.querySelector('[data-tdb-blog-page]'),
      landing = x.d.querySelector('[data-blog-filter-landing]'),
      anchor = root.querySelector('.tdb-filter-sticky-anchor');
    root.getBoundingClientRect = () => ({ top: 600 });
    landing.getBoundingClientRect = () => ({ top: 2000, height: 96 });
    anchor.getBoundingClientRect = () => ({ height: 48 });
    x.w.dispatchEvent(new x.w.Event('resize'));
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(anchor.parentElement.style.top, '0px');
    assert.equal(anchor.parentElement.style.height, '1472px');
    assert.equal(anchor.parentElement.style.clipPath, '');
    assert.equal(x.d.querySelectorAll('.tdb-blog-filter-bar').length, 1);
  } finally {
    x.close();
  }
});
