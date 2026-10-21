const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(file, 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fixture(html = '<button id="trigger">Open</button>', consent = true) {
  const dom = new JSDOM(html, { url: 'https://dentalbarns.webflow.io/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document, observers = [], subscribers = new Set();
  w.TDBConsent = { allows: () => consent, subscribe(fn) { subscribers.add(fn); fn(); return () => subscribers.delete(fn); } };
  w.IntersectionObserver = class {
    constructor(fn, options) { Object.assign(this, { fn, options, nodes: new Set() }); observers.push(this); }
    observe(node) { this.nodes.add(node); }
    unobserve(node) { this.nodes.delete(node); }
    disconnect() { this.nodes.clear(); }
    fire(node, isIntersecting = true) { this.fn([{ target: node, isIntersecting }]); }
  };
  w.eval(read('src/shared/feature-loading.js'));
  return { w, d, observers, permit(value) { consent = value; subscribers.forEach((fn) => fn()); }, close() { w.close(); } };
}

test('shared panel intent waits for consent and visible settled scrolling, then prepares once', async () => {
  const f = fixture(undefined, false); let calls = 0;
  const watch = f.w.TDBFeatureLoading.watchIntent({ selector: 'button', prepare: () => { calls++; } });
  try {
    const button = f.d.querySelector('button'), io = f.observers[0];
    assert.equal(f.w.TDBFeatureLoading.embedMargin, '700px 0px');
    assert.equal(io.options.rootMargin, '0px');
    io.fire(button); button.dispatchEvent(new f.w.Event('pointerdown', { bubbles: true }));
    await wait(230); assert.equal(calls, 0);
    f.permit(true);
    for (let i = 0; i < 3; i++) { f.w.dispatchEvent(new f.w.Event('scroll')); await wait(90); assert.equal(calls, 0); }
    await wait(230); assert.equal(calls, 1);
    button.dispatchEvent(new f.w.Event('focusin', { bubbles: true }));
    io.fire(button); await wait(230); assert.equal(calls, 1);
  } finally { watch.destroy(); f.close(); }
});

test('passing through, hidden triggers and disposed watches never warm a panel', async () => {
  const f = fixture(); let calls = 0;
  const controller = new f.w.AbortController();
  const watch = f.w.TDBFeatureLoading.watchIntent({ selector: 'button', signal: controller.signal, prepare: () => { calls++; } });
  try {
    const button = f.d.querySelector('button'), io = f.observers[0];
    io.fire(button); io.fire(button, false); await wait(230); assert.equal(calls, 0);
    button.hidden = true; io.fire(button); await wait(230); assert.equal(calls, 0);
    button.hidden = false; controller.abort();
    button.dispatchEvent(new f.w.Event('pointerdown', { bubbles: true }));
    await tick(); assert.equal(calls, 0); assert.equal(io.nodes.size, 0);
  } finally { watch.destroy(); f.close(); }
});

for (const type of ['pointerover', 'focusin', 'pointerdown']) test(type + ' prepares immediately without opening or duplicate requests', async () => {
  const f = fixture(); let calls = 0, release;
  const watch = f.w.TDBFeatureLoading.watchIntent({ selector: 'button', prepare: () => { calls++; return new Promise((resolve) => { release = resolve; }); } });
  try {
    const button = f.d.querySelector('button');
    button.dispatchEvent(new f.w.Event(type, { bubbles: true })); await tick();
    assert.equal(calls, 1);
    button.dispatchEvent(new f.w.Event(type, { bubbles: true })); await tick(); assert.equal(calls, 1);
    release(); await tick();
    button.click(); await tick(); assert.equal(calls, 1);
  } finally { watch.destroy(); f.close(); }
});

test('newly mounted triggers are observed and a failed warmup does not loop', async () => {
  const f = fixture('<main></main>'); let calls = 0;
  const watch = f.w.TDBFeatureLoading.watchIntent({ selector: 'button', prepare: () => { calls++; throw Error('offline'); } });
  try {
    const button = f.d.createElement('button'); f.d.body.append(button); await tick();
    assert(f.observers[0].nodes.has(button));
    button.dispatchEvent(new f.w.Event('pointerdown', { bubbles: true })); await tick();
    f.observers[0].fire(button); await wait(230); assert.equal(calls, 1);
    f.w.dispatchEvent(new f.w.Event('online')); await wait(230); assert.equal(calls, 2);
  } finally { watch.destroy(); f.close(); }
});

test('visible aria-hidden marquee repeats can prepare the same tooltip', async () => {
  const f = fixture('<div aria-hidden="true"><button>Repeated logo</button></div>'); let calls = 0;
  const watch = f.w.TDBFeatureLoading.watchIntent({ selector: 'button', prepare: () => { calls++; } });
  try {
    f.observers[0].fire(f.d.querySelector('button')); await wait(230); assert.equal(calls, 1);
  } finally { watch.destroy(); f.close(); }
});

function vipFixture(consent = true) {
  const f = fixture('<a id="trigger" href="#VIP">Join VIP</a><div data-tdb-announcement data-tdb-announcement-pending aria-hidden="true"></div><div id="tdb-vip-drawer" data-tdb-vip-lazy></div>', consent);
  const requests = [], w = f.w; let opens = 0, mounts = 0, announcementLoads = 0;
  w.TDBRuntimePageState = { vipScrollSeed: { lastY: 0, up: 0, down: 0, peek: false } };
  w.tdbUIIsReady = w.tdbStyleIsReady = () => true;
  w.tdbEnsureUI = w.tdbEnsureVIPUI = w.tdbEnsureVIPChrome = async () => {};
  w.TDBFormsLoader = { load: async () => { requests.push('forms'); } };
  w.TDBAnnouncementLoader = { load: async () => { announcementLoads++; return { mount() {} }; } };
  w.TDBModules = { resolve: String, load: async (url) => {
    const file = String(url).split('/').pop(); requests.push(file);
    if (file === 'tdb-vip-drawer.js') w.TDBVIPDrawer = { open() { opens++; }, resumeScroll() {} };
    if (file === 'tdb-vip-content.js') w.TDBVIPContent = { mount() { mounts++; } };
  }};
  w.eval("const TDBRuntimeModuleRoot = new URL('https://cdn.example/dist/');" + read('src/vip-drawer/loader.js'));
  w.prepareVIPDrawerLoader();
  return { ...f, requests, stats: () => ({ opens, mounts, announcementLoads }), ready(visible = true) {
    const shell = f.d.querySelector('[data-tdb-announcement]');
    shell.removeAttribute('data-tdb-announcement-pending'); shell.setAttribute('data-tdb-announcement-ready', '');
    shell.setAttribute('aria-hidden', String(!visible));
    w.dispatchEvent(new w.CustomEvent('tdb:announcement-state', { detail: { shell, ready: true, visible } }));
  }};
}

test('VIP waits for cookie decision, announcement readiness and a present calling banner', async () => {
  const f = vipFixture(false);
  try {
    f.ready(); await tick(); assert.equal(f.requests.length, 0);
    f.permit(true);
    const shell = f.d.querySelector('[data-tdb-announcement]'); shell.removeAttribute('data-tdb-announcement-ready');
    f.w.scrollY = 1000; f.w.dispatchEvent(new f.w.Event('scroll'));
    f.d.querySelector('a').dispatchEvent(new f.w.Event('pointerover', { bubbles: true }));
    await tick(); assert.equal(f.requests.length, 0);
    f.ready(false); await tick(); assert.equal(f.requests.length, 0);
    f.ready(true); await tick(); await tick();
    assert(f.requests.includes('tdb-vip-drawer.js')); assert(f.requests.includes('tdb-vip-content.js'));
    assert.equal(f.stats().mounts, 1); assert.equal(f.stats().opens, 0);
    f.ready(true); await tick(); assert.equal(f.requests.filter((name) => name === 'tdb-vip-content.js').length, 1);
  } finally { f.close(); }
});

test('direct VIP activation awaits announcement readiness and opens once', async () => {
  const f = vipFixture();
  try {
    const opening = f.w.TDBVIPDrawerLoader.open(f.d.querySelector('a'));
    assert.equal(opening, f.w.TDBVIPDrawerLoader.open(f.d.querySelector('a')));
    await tick(); assert.equal(f.requests.length, 0); assert.equal(f.stats().announcementLoads, 1);
    f.ready(false); await opening;
    assert.equal(f.stats().opens, 1);
  } finally { f.close(); }
});
