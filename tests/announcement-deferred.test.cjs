const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const tick = () => new Promise((resolve) => setTimeout(resolve, 25));
const data = {
  deadline: null,
  nextSlot: '2099-11-04T14:30:00.000Z',
  title: 'Smile Design · Appointments released in',
  rest: 'Join The Dental Barns VIP',
  bookedTitle: 'Smile Design · Fully Booked',
  signature: 'Signature Assessment ✦ Next opportunity',
  action: 'Enquire about appointments',
};
function setup({ consent = true, native = false, signature = false, load } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="tdb-elfsight-timer-shell" data-tdb-announcement-pending></div></body></html>', {
    url: 'https://dentalbarns.webflow.io/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window, shell = w.document.querySelector('div');
  if (native) shell.innerHTML = read('src/banner/template.html');
  else shell.setAttribute('data-tdb-announcement-lazy', '');
  if (signature) shell.dataset.announcementMode = 'signature';
  w.document.documentElement.style.setProperty('--tdb-ui-ready', '1');
  w.requestAnimationFrame = (callback) => w.setTimeout(() => callback(0), 0);
  let factory, subscriber, reads = 0, creates = 0, opened = null, swiperOptions;
  w.fetch = () => { throw Error('No live network requests allowed'); };
  w.TDBConsent = { status: () => ({ elfsight: consent }) };
  w.TDBMotion = { reduced: { matches: false }, defaults: { base: 420 } };
  w.TDBFeatureCSS = { ui: () => Promise.resolve() };
  w.TDBAvailability = {
    seed: () => ({ state: 'idle', data: null }),
    read: () => { reads++; return (load ? load() : Promise.resolve({ state: 'ready', data })).catch((error) => { subscriber?.({ state: 'unavailable', data: null }); throw error; }); },
    subscribe(fn) { subscriber = fn; return () => {}; },
  };
  w.TDBVIPDrawerLoader = { open: (button) => { opened = button; } };
  w.TDBNativeTicker = { mount: (node) => ({ update: (value) => { node.textContent = value; }, settle() {} }) };
  w.TDBSwiper = {
    register: (_name, value) => { factory = value.mount; },
    mount: (_name, target) => factory(target),
    create(viewport, options) {
      creates++; swiperOptions = options;
      const instance = {
        slides: [...viewport.querySelectorAll('[data-message]')], activeIndex: 0, realIndex: 0,
        allowClick: true, snapGrid: [0, 1], snapIndex: 0,
        on() {}, setTransition() {}, setTranslate() {}, transitionEnd() {},
        slideNext() { this.move(1); }, slidePrev() { this.move(-1); },
        move(direction) {
          options.on.beforeTransitionStart();
          this.activeIndex = this.realIndex = (this.realIndex + direction + this.slides.length) % this.slides.length;
          options.on.slideChange(this); options.on.transitionEnd();
        },
      };
      return instance;
    },
  };
  w.eval(read('dist/tdb-announcement.js'));
  return { w, shell, close: () => w.close(), get reads() { return reads; }, get creates() { return creates; },
    get opened() { return opened; }, get options() { return swiperOptions; },
    update: (snapshot) => subscriber(snapshot), mount: () => w.TDBAnnouncement.mount(shell) };
}
test('announcement stays empty until consent and data are ready, then mounts once', async () => {
  let resolve;
  const h = setup({ consent: false, load: () => new Promise((r) => { resolve = r; }) });
  try {
    const api = h.mount();
    assert.equal(h.shell.childElementCount, 0); assert.equal(h.reads, 0);
    h.w.dispatchEvent(new h.w.Event('CookieScriptReject'));
    assert.equal(h.reads, 1); assert.equal(h.shell.childElementCount, 0);
    assert(h.shell.hasAttribute('data-tdb-announcement-pending'));
    resolve({ state: 'ready', data }); await tick(); await tick();
    assert.equal(h.shell.querySelectorAll('.tdb-announcement').length, 1);
    assert.equal(h.shell.querySelector('.tdb-announcement-template'), null);
    assert.equal(h.shell.querySelector('.tdb-announcement-title').textContent, data.signature);
    assert.equal(h.shell.hasAttribute('data-tdb-announcement-pending'), false);
    assert.equal(h.mount(), api); assert.equal(h.creates, 1);
    assert.equal(h.options.speed, 420);
  } finally { h.close(); }
});
test('deferred content retains rotation controls, countdown and VIP activation', async () => {
  const h = setup();
  try {
    h.mount(); await tick(); await tick();
    const button = h.shell.querySelector('.tdb-announcement');
    h.update({ state: 'ready', data: { ...data, deadline: new Date(Date.now() + 900000).toISOString() } });
    button.dispatchEvent(new h.w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    assert.equal(button.dataset.mode, 'countdown');
    assert.equal(button.dataset.rotation, 'manual');
    assert.equal(h.shell.querySelector('.tdb-announcement-countdown').hidden, false);
    assert.equal(h.shell.querySelector('[data-announcement-action]').hidden, true);
    button.click(); assert.equal(h.opened, button);
  } finally { h.close(); }
});
test('failed data uses existing generic fallback and online recovery updates safely', async () => {
  let fail = true;
  const h = setup({ load: () => fail ? Promise.reject(Error('offline')) : Promise.resolve({ state: 'ready', data }) });
  try {
    h.mount(); await tick(); await tick();
    assert(h.shell.querySelector('.tdb-announcement'));
    assert.equal(h.shell.querySelector('.tdb-announcement-slot').textContent, data.action);
    fail = false; h.w.dispatchEvent(new h.w.Event('online')); await tick();
    assert.equal(h.shell.querySelector('.tdb-announcement-title').textContent, data.signature);
    h.update({ state: 'ready', data: { ...data, signature: '<img src=x onerror=alert(1)>' } });
    assert.equal(h.shell.querySelector('.tdb-announcement-title img'), null);
    assert.match(h.shell.querySelector('.tdb-announcement-title').textContent, /<img/);
    assert.equal(h.shell.querySelectorAll('.tdb-announcement').length, 1);
  } finally { h.close(); }
});
test('native announcement keeps its original nodes and signature-only mode', async () => {
  const h = setup({ native: true, signature: true });
  try {
    const originalButton = h.shell.querySelector('.tdb-announcement');
    h.mount(); await tick();
    assert.equal(h.shell.querySelector('.tdb-announcement'), originalButton);
    assert.equal(h.shell.querySelector('[data-message="smile"]'), null);
    assert.equal(h.options.loop, false); assert.equal(h.options.allowTouchMove, false);
    assert.equal(originalButton.dataset.rotation, 'static');
  } finally { h.close(); }
});
