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
const feedPayload = () => ({ version: 1, feed: 'first-impressions', checkedAt: Date.now(), cards: [
  { id: 'jh', initials: 'JH', words: ['Calm', 'Relaxing', 'Great'], verified: true,
    date: '', month: '2026-07', image: { src: 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/jh.webp', alt: 'Handwritten JH card' } },
  { id: 'ec', initials: 'EC', words: ['Calming', 'Refreshments', 'Kindness'], verified: false,
    date: '2026-07-14', month: '2026-07', image: { src: 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/ec.webp', alt: 'Handwritten EC card' } },
] });
function useJSON(s, fetcher = async () => Response.json(feedPayload())) {
  s.root.setAttribute('data-tdb-fi-feed', '/tdb-content/v1/first-impressions.json');
  s.w.document.querySelector('[data-tdb-first-impressions-feed]').remove();
  s.w.fetch = fetcher;
}

test('JSON cards load without any source Collection List, after consent, once per preparation', async () => {
  const s = setup(), requests = [];
  useJSON(s, async (url, options) => { requests.push({ url: String(url), options }); return Response.json(feedPayload()); });
  s.permission(false); await s.api.prepare(s.root); assert.equal(requests.length, 0);
  s.permission(true); await Promise.all([s.api.prepare(s.root), s.api.prepare(s.root)]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://tdb-public-availability.david-070.workers.dev/tdb-content/v1/first-impressions.json');
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(s.mounts(), 1);
  assert.equal(s.root.querySelectorAll('.tdb-fi-card').length, 2);
  assert.equal(s.root.querySelector('.tdb-fi-words').textContent, 'Calm · Relaxing · Great');
  assert.equal(s.root.querySelector('.tdb-fi-date').dateTime, '2026-07');
  assert.equal(s.root.querySelector('.tdb-fi-date-value').textContent, 'July 2026');
  assert.equal(s.root.querySelector('.tdb-fi-verified').hidden, false);
  assert.equal(s.root.querySelector('.tdb-fi-photo').alt, 'Handwritten EC card');
  s.close();
});

test('Invalid JSON leaves the holding frame intact and can retry without rendering stale or unsafe records', async () => {
  const s = setup(); let payload;
  useJSON(s, async () => Response.json(payload));
  for (const change of [p => { p.checkedAt -= 3600001; }, p => { p.cards[0].image.src = 'https://other.example/x.webp'; },
    p => { p.cards[0].month = '2026-13'; }, p => { p.cards[0].date = '2026-02-30'; },
    p => { p.cards[0].words = []; }, p => { p.cards[0].verified = 'true'; },
    p => { p.cards[1].id = p.cards[0].id; }]) {
    payload = feedPayload(); change(payload);
    await assert.rejects(s.api.prepare(s.root));
    assert.equal(s.mounts(), 0);
    assert.equal(s.root.querySelector('[data-tdb-native-holder]').hidden, false);
  }
  payload = feedPayload(); await s.api.prepare(s.root); assert.equal(s.mounts(), 1); s.close();
});

test('Consent withdrawal aborts an in-flight feed and a new grant can retry immediately', async () => {
  const s = setup(); let signal;
  useJSON(s, (_url, options) => new Promise((_resolve, reject) => {
    signal = options.signal; signal.addEventListener('abort', () => reject(new s.w.DOMException('Cancelled', 'AbortError')));
  }));
  const flight = s.api.prepare(s.root), rejected = assert.rejects(flight, { name: 'AbortError' });
  s.permission(false); assert.equal(signal.aborted, true);
  s.w.fetch = async () => Response.json(feedPayload()); s.permission(true);
  await s.api.prepare(s.root); await rejected; assert.equal(s.mounts(), 1); s.close();
});

test('A revoked image preparation cannot mount after consent has been granted again', async () => {
  const s = setup(); useJSON(s); let release;
  s.decode(() => new Promise(resolve => { release = resolve; }));
  const first = s.api.prepare(s.root); await new Promise(setImmediate);
  s.permission(false); s.permission(true); s.decode(() => Promise.resolve());
  await s.api.prepare(s.root); release(); await first;
  assert.equal(s.mounts(), 1); s.close();
});
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
