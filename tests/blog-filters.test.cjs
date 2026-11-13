const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
test('blog preserves CMS filter controls, locks the page, updates counts and returns to its sticky dock', async () => {
  const dom = new JSDOM(fs.readFileSync('src/blog/filter.html', 'utf8'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://dentalbarns.webflow.io/blog',
  });
  const w = dom.window,
    d = w.document;
  try {
    d.querySelector('[data-blog-filter-options]').innerHTML =
      '<form fs-list-element="filters"><a href="#" fs-list-element="clear">All</a><label><input type="radio" name="category" value="news"><span class="tdb-blog-filter-label">In the press</span></label></form>';
    d.querySelector('[data-blog-posts]').innerHTML =
      '<div fs-list-element="list"><article class="w-dyn-item">News</article><article class="w-dyn-item">Other</article></div>';
    const form = d.querySelector('form'),
      input = form.querySelector('input'),
      items = d.querySelectorAll('article');
    // Finsweet owns which native CMS items appear; the UI observes its DOM output.
    form.addEventListener('change', () => {
      items[1].hidden = input.checked;
    });
    form.querySelector('a').addEventListener('click', (event) => {
      event.preventDefault();
      input.checked = false;
      items[1].hidden = false;
    });
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
      mount: (slot) => ({ update: (value) => (slot.textContent = value), destroy() {} }),
    };
    for (const path of ['src/shared/filters.js', 'src/shared/drawer.js', 'src/blog/filters.js'])
      w.eval(fs.readFileSync(path, 'utf8'));
    await w.TDBBlogFilters.mount();
    const toggle = d.querySelector('[data-blog-filter-toggle]'),
      apply = d.querySelector('[data-blog-filter-apply]'),
      dock = d.querySelector('[data-blog-filter-dock]'),
      dialog = d.querySelector('[data-blog-filter-drawer]');
    assert.equal(d.querySelector('form'), form, 'CMS form remains the same node');
    assert.equal(apply.getAttribute('aria-label'), 'View 2 posts');
    toggle.click();
    await tick();
    assert.equal(locked, true);
    assert.equal(dialog.hidden, false);
    assert.equal(dock.parentElement.hasAttribute('data-tdb-drawer-panel'), true);
    input.checked = true;
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
    await tick();
    assert.equal(apply.getAttribute('aria-label'), 'View 1 post');
    assert.equal(d.querySelector('[data-blog-filter-summary]').textContent, 'In the press');
    d.querySelector('[data-blog-filter-reset]').click();
    await tick();
    assert.equal(apply.getAttribute('aria-label'), 'View 2 posts');
    assert.equal(input.checked, false);
    apply.click();
    await tick();
    assert.equal(locked, false);
    assert.equal(dialog.hidden, true);
    assert.equal(dock.parentElement.className, 'tdb-filter-sticky-anchor');
    w.TDBBlogFilters.destroy();
    assert.equal(d.querySelector('.tdb-filter-sticky-rail'), null);
    assert.equal(dock.parentElement.hasAttribute('data-blog-filter-home'), true);
  } finally {
    w.TDBBlogFilters?.destroy();
    w.close();
  }
});
