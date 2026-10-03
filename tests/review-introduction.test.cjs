const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.TDB_JSDOM_PATH || 'jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const ticker = read('src/shared/value-tickers-native.js');
const component = read('src/components/review-introduction.js');
const loader = read('src/components/review-introduction-loader.js');
const html = `<section data-tdb-review-introduction><div data-tdb-review-summary data-tdb-review-trigger role="button" tabindex="-1" aria-disabled="true"><div data-tdb-review-rating="4.94"><div>4.93</div></div><div data-tdb-review-count="85">(84)</div></div></section>`;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function setup(markup = html) {
  const dom = new JSDOM(markup, { url: 'https://dentalbarns.webflow.io', runScripts: 'outside-only' });
  const w = dom.window;
  Object.defineProperty(w.document, 'hidden', { configurable: true, value: false });
  const motion = new w.EventTarget(); motion.matches = false;
  w.matchMedia = () => motion;
  const observers = [], animations = [];
  w.IntersectionObserver = class {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); observers.push(this); }
    observe(node) { this.targets.add(node); }
    unobserve(node) { this.targets.delete(node); }
    disconnect() { this.targets.clear(); }
    enter(visible = true) { this.callback([...this.targets].map(target => ({ target, isIntersecting: visible }))); }
  };
  w.Element.prototype.animate = function() {
    const animation = { cancelled: false, cancel() { this.cancelled = true; }, finish() { this.onfinish?.(); } };
    animations.push(animation); return animation;
  };
  return { dom, w, motion, observers, animations, root: w.document.querySelector('section') };
}
test('static seed remains visible until viewport entry; repeated mount is idempotent', () => {
  const { dom, w, root, observers, animations } = setup();
  w.eval(ticker); w.eval(component);
  const api = w.TDBReviewIntroduction.mount(root);
  assert.equal(api, w.TDBReviewIntroduction.mount(root));
  assert.equal(root.querySelector('[data-tdb-review-rating]').textContent, '4.93');
  assert.equal(animations.length, 0);
  observers[0].enter();
  assert.equal(root.querySelector('.review-number_value').textContent, '4.93');
  assert.equal(root.querySelector('.review-number_incoming').textContent, '4.94');
  animations[1].finish(); animations[3].finish();
  assert.equal(root.querySelector('[data-tdb-review-rating]').textContent, '4.94');
  assert.equal(root.querySelector('[data-tdb-review-count]').textContent, '(85)');
  assert.equal(root.querySelectorAll('.review-number_incoming').length, 0);
  api.destroy();
  assert.equal(root.querySelector('[data-tdb-review-rating]').textContent, '4.94');
  dom.window.close();
});
test('reduced motion settles immediately and preference changes cancel an active roll', () => {
  const { dom, w, root, motion, observers, animations } = setup();
  w.eval(ticker); w.eval(component);
  const api = w.TDBReviewIntroduction.mount(root); observers[0].enter();
  motion.matches = true; motion.dispatchEvent(new w.Event('change'));
  assert.equal(root.querySelector('[data-tdb-review-count]').textContent, '(85)');
  assert(animations.every(animation => animation.cancelled));
  api.destroy();
  const other = w.TDBReviewIntroduction.mount(root); observers[1].enter();
  assert.equal(animations.length, 4); // Re-entry does not replay or rewind.
  other.destroy(); dom.window.close();
});
test('drawer callback is optional and a withdrawn module removes listeners', async () => {
  const { dom, w, root, observers } = setup();
  w.eval(ticker); w.eval(component);
  let calls = 0, closeCalls = 0;
  const card = root.querySelector('[data-tdb-review-summary]');
  let api = w.TDBReviewIntroduction.mount(root);
  card.click(); assert.equal(calls, 0); assert.equal(card.getAttribute('aria-disabled'), 'true');
  api.destroy();
  api = w.TDBReviewIntroduction.mount(root, { openReviews: async () => { calls++; }, closeReviews: () => closeCalls++ });
  assert.equal(card.getAttribute('tabindex'), '0');
  card.click(); card.click(); await tick(); assert.equal(calls, 1);
  observers.at(-1).enter();
  api.destroy(); card.click();
  assert.equal(calls, 1); assert.equal(closeCalls, 1);
  assert.equal(card.getAttribute('aria-disabled'), 'true');
  assert.equal(root.querySelectorAll('.review-number_incoming').length, 0);
  dom.window.close();
});
test('permission and proximity gate download; later permission withdrawal cleans up', async () => {
  const { dom, w, root, observers } = setup();
  w.eval(loader);
  let permitted = false, requests = 0, notify;
  w.document.head.append = script => { requests++; queueMicrotask(() => { w.eval(script.src.endsWith('ticker.js') ? ticker : component); script.onload(); }); };
  const api = w.TDBReviewIntroductionLoader.start({ urls: ['/ticker.js', '/component.js'], permission: () => permitted, subscribe: callback => { notify = callback; return () => { notify = null; }; } });
  observers[0].enter(); await tick(); assert.equal(requests, 0);
  permitted = true; notify(); await tick();
  assert.equal(requests, 2); assert.equal(api.status().instances, 1);
  observers[1].enter();
  permitted = false; notify(); assert.equal(api.status().instances, 0);
  assert.equal(root.querySelectorAll('.review-number_incoming').length, 0);
  permitted = true; notify(); assert.equal(api.status().instances, 1); assert.equal(requests, 2);
  api.destroy(); assert.equal(notify, null); dom.window.close();
});
test('withdrawal during download prevents the next download and initialisation', async () => {
  const { dom, w, observers } = setup(); w.eval(loader);
  let permitted = true; const scripts = [];
  w.document.head.append = script => scripts.push(script);
  const api = w.TDBReviewIntroductionLoader.start({ urls: ['/ticker.js', '/component.js'], permission: () => permitted });
  observers[0].enter(); assert.equal(scripts.length, 1);
  permitted = false; api.refresh(); w.eval(ticker); scripts[0].onload(); await tick();
  assert.equal(scripts.length, 1); assert.equal(api.status().instances, 0);
  permitted = true; api.refresh(); await tick(); assert.equal(scripts.length, 2);
  w.eval(component); scripts[1].onload(); await tick(); assert.equal(api.status().instances, 1);
  api.destroy(); dom.window.close();
});
test('no matching component means no download; rejecting cookies is still a completed decision', async () => {
  const { dom, w, observers } = setup('<main></main>'); w.eval(loader);
  w.CookieScript = { instance: { currentState: () => ({ action: 'reject' }) } };
  let requests = 0; w.document.head.append = () => { requests++; };
  const api = w.TDBReviewIntroductionLoader.start({ urls: ['/ticker.js', '/component.js'] });
  assert.equal(api.status().allowed, true); assert.equal(requests, 0);
  w.document.body.insertAdjacentHTML('beforeend', html); await tick();
  observers[0].enter(); assert.equal(requests, 1);
  api.destroy(); dom.window.close();
});
