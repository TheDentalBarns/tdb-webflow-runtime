const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const page = fs.readFileSync('src/smile-gallery/page.html', 'utf8');
const source = fs.readFileSync('src/smile-gallery/standalone.js', 'utf8');
const feed = fs.readFileSync('src/smile-gallery/feed.js', 'utf8').replace(
  '__TDB_SMILE_TEMPLATE__', JSON.stringify(fs.readFileSync('src/smile-gallery/template.html', 'utf8')),
);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function setup({ display = '', allowed = true, fail = false } = {}) {
  const records = [
    ['A', 'From £3,000', 'Aligners', 'Dr A'],
    ['B', 'From £1,000', 'Bonding', 'Dr B'],
    ['C', 'From £2,000', 'Whitening', 'Dr A'],
  ];
  const cms = '<div data-smile-page-source>' + records.map(([title, price, treatment, doctor]) =>
    `<div data-tdb-sg-case><img data-tdb-sg-image src="https://cdn.prod.website-files.com/smile-${title}.webp" alt="Smile ${title}"><span data-tdb-sg-title>${title}</span><span data-tdb-sg-description>Details ${title}</span><span data-tdb-sg-price-value>${price}</span><span data-tdb-sg-duration-value>6 months</span><span data-tdb-sg-clinician-value>${doctor}</span><span data-tdb-sg-treatment-name>${treatment}</span></div>`,
  ).join('') + '</div>';
  const dom = new JSDOM(page + cms, { url: 'https://dentalbarns.webflow.io/smile-gallery' + display, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const w = dom.window, d = w.document, subscriptions = new Set();
  for (const original of d.querySelectorAll('button')) {
    const native = d.createElement('div');
    for (const attr of original.attributes) native.setAttribute(attr.name, attr.value);
    native.append(...original.childNodes);
    original.replaceWith(native);
  }
  let opened = 0, destroyed = 0, loadFails = fail;
  Object.defineProperty(d, 'currentScript', { value: { src: 'https://cdn.example/dist/tdb-smile-page.js' } });
  w.TDBMotion = { reduced: { matches: false } };
  w.matchMedia = () => ({ matches: false });
  w.TDBConsent = { allows: () => allowed, subscribe(fn) { subscriptions.add(fn); return () => subscriptions.delete(fn); } };
  w.TDBModules = { async load() { if (loadFails) throw Error('offline'); } };
  w.IntersectionObserver = class { observe() {} disconnect() {} };
  w.Image = class { set src(_) { queueMicrotask(() => this.onload?.()); } decode() { return Promise.resolve(); } };
  w.TDBSliderLoader = { async prepare() {}, async load() {} };
  w.TDBNativeTicker = { mount(slot) { return { update(value) { slot.textContent = value; }, destroy() {} }; } };
  w.TDBFilters = { mount() { return { isOpen: false, setCount() {}, set(value) { this.isOpen = value; }, reset() { this.isOpen = false; }, destroy() {} }; } };
  w.TDBDrawer = { mount(root, options) {
    root.hidden = true;
    return {
      open() { opened++; root.hidden = false; options.onOpen(); },
      close() { if (!root.hidden) { root.hidden = true; options.onClose(); } return Promise.resolve(); },
      destroy() { destroyed++; this.close(); },
    };
  } };
  w.TDBSwiper = { prune() {}, mount(_, root) {
    root.querySelector('.swiper').swiper = { realIndex: 0, allowClick: true, slideToLoop(index) { this.realIndex = index; }, on() {} };
  } };
  w.eval(feed); w.eval(source);
  return { w, d, get opened() { return opened; }, get destroyed() { return destroyed; }, fix() { loadFails = false; }, permit(value) { allowed = value; subscriptions.forEach(fn => fn()); }, close() { w.TDBSmilePage.destroy(); w.close(); } };
}
test('standalone mounts all native CMS cases by price and opens the original square image', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    assert.equal(x.d.querySelectorAll('.tdb-smile-card').length, 3);
    assert.equal(x.d.querySelector('[data-smile-open-case]').tagName, 'BUTTON');
    assert.equal(x.d.querySelector('[data-smile-case-next]').tagName, 'BUTTON');
    assert.equal(x.d.querySelector('[data-smile-page-status]').textContent, '3 smiles');
    x.d.querySelector('.tdb-smile-card').click();
    assert.equal(x.opened, 1);
    assert.equal(x.d.querySelector('[data-smile-case-title]').textContent, 'B');
    assert.match(x.d.querySelector('[data-smile-case-image]').src, /smile-B/);
    x.d.querySelector('[data-smile-case-next]').click();
    assert.equal(x.d.querySelector('[data-smile-case-title]').textContent, 'C');
    assert.ok(x.d.querySelector('[data-smile-case-drawer] [data-smile-filter-dock]'));
    const submit = new x.w.Event('submit', { bubbles: true, cancelable: true });
    x.d.querySelector('[data-smile-filter-panel] form').dispatchEvent(submit);
    assert.equal(submit.defaultPrevented, true);
  } finally { x.close(); }
});
test('comparison input reveals images without opening the drawer; mode choice survives reload', async () => {
  const x = setup({ display: '?display=slider' });
  try {
    await x.w.TDBSmilePage.mount();
    const range = x.d.querySelector('.smile-page-comparison_range');
    range.value = '27'; range.dispatchEvent(new x.w.Event('input', { bubbles: true })); range.click();
    assert.equal(x.opened, 0);
    assert.equal(range.getAttribute('aria-valuetext'), '27% before, 73% after');
    assert.equal(range.parentElement.style.getPropertyValue('--smile-reveal'), '27%');
    x.d.querySelector('[data-smile-open-case]').click();
    assert.equal(x.d.querySelectorAll('[data-smile-case-drawer] input[type="range"]').length, 0);
    x.d.querySelector('[name="smile-display"][value="before-after"]').checked = true;
    x.d.querySelector('[data-smile-filter-apply]').click();
    await tick();
    assert.equal(JSON.parse(x.w.sessionStorage.getItem('tdb-smile-gallery-view')).display, 'before-after');
  } finally { x.close(); }
});
test('empty filter results recover and consent teardown permits a clean remount', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    x.d.querySelectorAll('[name="smile-treatment"]').forEach(input => input.checked = true);
    x.d.querySelector('[data-smile-filter-apply]').click(); await tick();
    assert.equal(x.d.querySelector('[data-smile-empty]').hidden, false);
    assert.equal(x.d.querySelectorAll('.tdb-smile-card').length, 0);
    x.d.querySelector('[data-smile-filter-reset]').click();
    x.d.querySelector('[data-smile-filter-apply]').click(); await tick();
    assert.equal(x.d.querySelectorAll('.tdb-smile-card').length, 3);
    x.permit(false);
    assert.equal(x.destroyed, 1);
    assert.equal(x.d.querySelectorAll('[data-tdb-smile-feed-root]').length, 0);
    x.permit(true); await x.w.TDBSmilePage.mount();
    assert.equal(x.d.querySelectorAll('[data-tdb-smile-feed-root]').length, 1);
  } finally { x.close(); }
});
test('failed startup keeps the holding photo and hides retry after recovery', async () => {
  const x = setup({ fail: true });
  try {
    await assert.rejects(x.w.TDBSmilePage.mount());
    assert.equal(x.d.querySelector('.smile-page_holding').hidden, false);
    assert.equal(x.d.querySelector('[data-smile-page-retry]').hidden, false);
    x.fix(); await x.w.TDBSmilePage.mount();
    assert.equal(x.d.querySelector('[data-smile-page-retry]').hidden, true);
    assert.equal(x.d.querySelectorAll('[data-tdb-smile-feed-root]').length, 1);
  } finally { x.close(); }
});
