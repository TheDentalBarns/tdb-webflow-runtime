const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../src/first-impressions/first-impressions.js'), 'utf8');
function setup() {
  const dom = new JSDOM(`<div data-tdb-first-impressions><div data-tdb-native-holder>Holding frame</div></div><div hidden data-tdb-first-impressions-feed>${['AB','CD','EF'].map((name,i)=>`<div class="w-dyn-item"><img data-fi-image src="https://images.example/${i}.webp"><span data-fi-initials>${name}</span><span data-fi-word-one>Calm</span><span data-fi-word-two>Kind</span><span data-fi-word-three>Clear</span><span data-fi-month>2026-10</span></div>`).join('')}</div>`, { url: 'https://dentalbarns.webflow.io/first-visit', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, root = w.document.querySelector('[data-tdb-first-impressions]');
  let permitted = true, callback, decode = () => Promise.resolve(), mounts = 0;
  const loads = [];
  w.TDBConsent = { allows: () => permitted, subscribe(fn) { callback = fn; return () => {}; } };
  w.TDBModules = { load(url) { loads.push(String(url)); return Promise.resolve(); } };
  w.TDBMotion = { defaults: { entryDelay: 0 } };
  w.TDBNativeTicker = { mount(slot) { return { update(value) { slot.textContent = value; }, destroy() {} }; } };
  w.Image = class { decode() { return decode(); } };
  w.TDBGallery = { beforeObserve() {}, resetFirstView() {} };
  w.TDBSwiper = { create() {}, onSettled() { return () => {}; }, mount(kind, owner) {
    assert.equal(kind, 'gallery'); mounts++;
    const callbacks = new Map();
    return { realIndex: 1, activeIndex: 1, previousIndex: 0, slides: [...owner.querySelectorAll('.swiper-slide')],
      on(name, fn) { callbacks.set(name, fn); }, off(name) { callbacks.delete(name); },
      destroy() { this.destroyed = true; callbacks.get('beforeDestroy')?.(); } };
  } };
  w.eval(source);
  return { w, root, loads, api: w.TDBFirstImpressions, mounts: () => mounts,
    permission(value) { permitted = value; callback?.(); }, decode(fn) { decode = fn; }, close() { w.TDBFirstImpressions.destroy(); dom.window.close(); } };
}
test('First Impressions waits for permission and an actual image before replacing its native holding frame', async () => {
  const s = setup();
  s.permission(false); await s.api.prepare(s.root); assert.equal(s.loads.length, 0);
  s.permission(true); let release; s.decode(() => new Promise(resolve => { release = resolve; }));
  const a = s.api.prepare(s.root), b = s.api.prepare(s.root);
  await new Promise(setImmediate);
  assert.equal(s.root.querySelector('.swiper'), null);
  assert.equal(s.root.querySelector('[data-tdb-native-holder]').hidden, false);
  release(); const [one,two] = await Promise.all([a,b]);
  assert.equal(one,two); assert.equal(s.mounts(),1); assert.equal(s.root.querySelectorAll('.tdb-fi-card').length,3);
  assert.equal(s.root.querySelector('.tdb-fi-initial-value').textContent,'AB');
  assert.equal(s.root.querySelectorAll('.tdb-fi-reflection-photo').length,6);
  s.close();
});
test('First Impressions retains a recoverable holding frame after image failure and restores it on consent withdrawal', async () => {
  const s=setup(); s.decode(() => Promise.reject(Error('Image failed')));
  await assert.rejects(s.api.prepare(s.root), /Image failed/);
  assert.equal(s.mounts(),0); assert.equal(s.root.querySelector('[data-tdb-native-holder]').hidden,false);
  s.decode(() => Promise.resolve()); await s.api.prepare(s.root); assert.equal(s.mounts(),1);
  s.permission(false); assert.equal(s.root.querySelector('.swiper'),null);
  assert.equal(s.root.querySelector('[data-tdb-native-holder]').hidden,false);
  s.permission(true); await s.api.prepare(s.root); assert.equal(s.mounts(),2); s.close();
});
test('First Impressions cannot finish mounting after the feature is disposed during image decoding', async () => {
  const s=setup(); let release; s.decode(() => new Promise(resolve=>{release=resolve}));
  const pending=s.api.prepare(s.root); await new Promise(setImmediate);
  s.api.destroy(); release(); await pending;
  assert.equal(s.mounts(),0); assert.equal(s.root.querySelector('.swiper'),null); s.close();
});
