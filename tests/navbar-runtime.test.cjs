const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
const dropdown = id => `<div class="navbar10_menu-dropdown"><button id="${id}" class="navbar10_dropdown-toggle w-dropdown-toggle" aria-expanded="false">${id}</button><nav class="w-dropdown-list navbar10_dropdown-list"><div class="navbar10_container"><div class="navbar10_dropdown-content-left"><a href="/about-us">About</a></div><div class="navbar10_dropdown-content-right"><img class="navbar10_blog-item-image" loading="lazy" src="https://example.test/${id}.webp" sizes="100vw"></div></div></nav></div>`;
function fixture(width = 448, consent = true, registry = true) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body style="overflow:clip"><main>Page</main><div class="navbar10_component w-nav" transparent-nav="true" data-tdb-navbar-native data-duration="500" fs-scrolldisable-element="smart-nav"><div class="tdb-nav-bar-glass"></div><a class="navbar10_logo-link"></a><div class="navbar_line"></div><button class="w-nav-button navbar10_menu-button" aria-expanded="false">Menu</button><div class="w-nav-overlay"><nav class="w-nav-menu navbar10_menu"><div class="navbar10_menu-left">${dropdown('services')}${dropdown('discover')}</div><div class="navbar10_menu-right">First visit</div></nav></div><div class="tdb-desktop-nav-backdrop"></div></div></body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://dentalbarns.webflow.io/' });
  const w = dom.window, d = w.document, queries = new Map(), animations = [];
  w.innerWidth = width; w.innerHeight = 874;
  Object.defineProperty(d.documentElement, 'clientWidth', { get: () => w.innerWidth });
  const matches = query => {
    const min = /min-width:\s*(\d+)/.exec(query), max = /max-width:\s*(\d+)/.exec(query);
    return (!min || w.innerWidth >= +min[1]) && (!max || w.innerWidth <= +max[1]);
  };
  w.matchMedia = query => {
    if (!queries.has(query)) queries.set(query, { matches: matches(query), listeners: new Set(),
      addEventListener(type, fn) { this.listeners.add(fn); }, removeEventListener(type, fn) { this.listeners.delete(fn); },
      addListener(fn) { this.listeners.add(fn); }, removeListener(fn) { this.listeners.delete(fn); }
    });
    return queries.get(query);
  };
  w.Element.prototype.animate = function(frames, options) {
    let finish;
    const animation = { element: this, frames, options, cancelled: false,
      finished: new Promise(resolve => { finish = resolve; }), finish() { finish(); }, cancel() { this.cancelled = true; finish(); }
    };
    animations.push(animation); return animation;
  };
  w.HTMLImageElement.prototype.decode = () => Promise.resolve();
  Object.defineProperty(d, 'currentScript', { configurable: true, value: { src: 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@fixture/dist/tdb-navbar-loader.js', dataset: { tdbRuntimeBase: 'https://example.test/runtime/' } } });
  if (consent) d.cookie = 'CookieScriptConsent=' + encodeURIComponent(JSON.stringify({ action: 'reject' }));
  if (registry) w.eval(read('dist/tdb-modules.js'));
  w.eval(read('dist/tdb-navbar-loader.js'));
  const nav = d.querySelector('.w-nav'), menu = d.querySelector('.w-nav-menu'), button = d.querySelector('.w-nav-button');
  return { dom, w, d, nav, menu, button, animations,
    enhance() {
      w.eval(read('dist/tdb-navbar.min.js'));
      d.querySelector('[data-tdb-navbar-enhancement]')?.dispatchEvent(new w.Event('load'));
    },
    async resize(next) {
      w.innerWidth = next;
      for (const [q, m] of queries) { const value = matches(q); if (value !== m.matches) { m.matches = value; for (const fn of m.listeners) fn(m); } }
      w.dispatchEvent(new w.Event('resize')); await flush();
    },
    async open() { button.classList.add('w--open'); menu.setAttribute('data-nav-menu-open', ''); await flush(); },
    async closeStart() { button.classList.remove('w--open'); await flush(); },
    async closeEnd() { menu.removeAttribute('data-nav-menu-open'); button.setAttribute('aria-expanded', 'false'); await flush(); },
    async finish() { animations.forEach(a => a.finish()); await flush(); await flush(); }
  };
}

test('basic navigation locks before consent, retains lock through closing, and preserves document state', async () => {
  const f = fixture(448, false);
  try {
    f.w.scrollY = 280;
    assert.equal(f.d.querySelector('[data-tdb-navbar-enhancement]'), null);
    await f.open(); assert.equal(f.w.TDBScrollLock.active, true);
    await f.closeStart(); assert.equal(f.w.TDBScrollLock.active, true);
    await f.closeEnd(); assert.equal(f.w.TDBScrollLock.active, false);
    assert.equal(f.w.scrollY, 280); assert.equal(f.d.body.style.overflow, 'clip');
    assert.equal(f.d.body.style.position, ''); assert.equal(f.d.body.hasAttribute('data-lenis-prevent'), false);
  } finally { f.dom.window.close(); }
});

test('shared locks release independently and contain wheel/touch at nested scroll edges', async () => {
  const f = fixture();
  try {
    const scroller = f.d.createElement('div'); scroller.style.overflowY = 'auto'; f.menu.append(scroller);
    Object.defineProperties(scroller, { clientHeight: { value: 100 }, scrollHeight: { value: 500 } }); scroller.scrollTop = 100;
    const release1 = f.w.TDBScrollLock.acquire({ allow: [f.menu] });
    const release2 = f.w.TDBScrollLock.acquire({ allow: [f.menu] });
    const wheel = target => { const ev = new f.w.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 30 }); target.dispatchEvent(ev); return ev.defaultPrevented; };
    assert.equal(wheel(scroller), false); assert.equal(wheel(f.d.querySelector('main')), true);
    scroller.scrollTop = 400; assert.equal(wheel(scroller), true);
    const touch = (type, y) => { const ev = new f.w.Event(type, { bubbles: true, cancelable: true }); Object.assign(ev, { touches: [{ clientX: 30, clientY: y }] }); scroller.dispatchEvent(ev); return ev.defaultPrevented; };
    touch('touchstart', 100); assert.equal(touch('touchmove', 80), true);
    scroller.scrollTop = 100; assert.equal(touch('touchmove', 60), false);
    release1(); assert.equal(f.w.TDBScrollLock.active, true);
    release1(); release2(); assert.equal(f.w.TDBScrollLock.active, false);
    assert.equal(wheel(f.d.querySelector('main')), false);
  } finally { f.dom.window.close(); }
});

test('Home locks the viewport without turning body into a competing sticky scroll container', async () => {
  for (const page of ['677cf86df9952f978d94d8a9', 'another-page']) {
    const f = fixture(448, false);
    try {
      f.d.documentElement.setAttribute('data-wf-page', page);
      f.d.body.style.removeProperty('overflow');
      const native = f.d.createElement('style');
      native.textContent = 'body{overflow:visible}'; f.d.head.append(native);
      f.w.scrollY = 1200;
      await f.open();
      assert.equal(f.w.getComputedStyle(f.d.documentElement).overflow, 'hidden');
      assert.equal(f.w.getComputedStyle(f.d.body).overflow,
        page === '677cf86df9952f978d94d8a9' ? 'visible' : 'hidden');
      assert.equal(f.w.scrollY, 1200);
      const wheel = new f.w.WheelEvent('wheel', {bubbles:true,cancelable:true,deltaY:100});
      f.d.querySelector('main').dispatchEvent(wheel); assert.equal(wheel.defaultPrevented, true);
      await f.closeStart(); await f.closeEnd();
      assert.equal(f.w.TDBScrollLock.active, false);
      assert.equal(f.w.getComputedStyle(f.d.body).overflow, 'visible');
      assert.equal(f.w.scrollY, 1200);
    } finally { f.dom.window.close(); }
  }
});

test('open menu survives consent handoff; enhancement begins only after the native close completes', async () => {
  const f = fixture();
  try {
    await f.open(); f.enhance();
    assert.equal(f.w.TDBNavbar, undefined); assert.equal(f.w.TDBNavbarLoader.status().waitingForClose, true);
    await f.closeStart(); assert.equal(f.w.TDBNavbar, undefined);
    await f.closeEnd(); assert.equal(f.w.TDBNavbar.version, '1.5.0'); assert.equal(f.w.TDBScrollLock.active, false);
  } finally { f.dom.window.close(); }
});

test('every native closing route triggers the same text exit once, with rapid reopen cancelling it', async () => {
  const f = fixture();
  try {
    f.enhance(); await flush();
    for (const route of ['button', 'Escape', 'outside', 'link']) {
      await f.open(); const count = f.animations.length;
      await f.closeStart();
      const text = f.animations.slice(count).filter(a => a.element.matches('.navbar10_menu-left,.navbar10_menu-right'));
      assert.equal(text.length, 2, route); assert.equal(text[0].frames.at(-1).opacity, 0);
      await f.open(); assert(text.every(a => a.cancelled), route + ' rapid reopen');
      await f.closeStart(); await f.closeEnd();
    }
  } finally { f.dom.window.close(); }
});

test('keyboard-driven native opening retains the clear-to-solid cycle at the top', async () => {
  const f = fixture();
  try {
    f.enhance(); await flush(); await f.open();
    assert.equal(f.d.documentElement.classList.contains('tdb-nav-clear-cycle'), true);
    await f.closeStart(); assert.equal(f.d.documentElement.classList.contains('tdb-nav-clear-cycle'), true);
    await f.resize(1000); assert.equal(f.d.documentElement.classList.contains('tdb-nav-clear-cycle'), false);
    assert.equal(f.w.TDBScrollLock.active, false);
  } finally { f.dom.window.close(); }
});

test('phone-to-desktop resizing enables hover treatment and returning to phone removes it', async () => {
  const f = fixture();
  try {
    f.enhance(); await flush(); await f.resize(1363);
    f.nav.dispatchEvent(new f.w.MouseEvent('mouseenter')); assert.equal(f.nav.classList.contains('is-trans'), true);
    f.nav.dispatchEvent(new f.w.MouseEvent('mouseleave')); assert.equal(f.nav.classList.contains('is-trans'), false);
    await f.resize(448); f.nav.dispatchEvent(new f.w.MouseEvent('mouseenter')); assert.equal(f.nav.classList.contains('is-trans'), false);
  } finally { f.dom.window.close(); }
});

test('images have appropriate slots before enhancement and only the intended desktop menu is warmed', async () => {
  const f = fixture(1363);
  try {
    const images = [...f.d.querySelectorAll('img')];
    assert(images.every(i => i.sizes.endsWith('22vw')));
    f.enhance(); await flush(); assert(images.every(i => i.getAttribute('loading') === 'lazy'));
    const event = new f.w.Event('pointerenter'); Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    f.d.querySelector('#services').dispatchEvent(event);
    assert.equal(images[0].loading, 'eager'); assert.equal(images[1].getAttribute('loading'), 'lazy');
    f.d.querySelector('#discover').dispatchEvent(new f.w.FocusEvent('focus'));
    assert.equal(images[1].loading, 'eager');
  } finally { f.dom.window.close(); }
});

test('desktop reversals settle the latest menu and restore locks on close and breakpoint exit', async () => {
  const f = fixture(1363);
  try {
    f.enhance(); await flush();
    const services = f.d.querySelector('#services'), discover = f.d.querySelector('#discover');
    services.setAttribute('aria-expanded', 'true'); await flush();
    services.setAttribute('aria-expanded', 'false'); discover.setAttribute('aria-expanded', 'true'); await flush();
    discover.setAttribute('aria-expanded', 'false'); services.setAttribute('aria-expanded', 'true'); await flush(); await f.finish();
    assert.equal(services.nextElementSibling.dataset.tdbDesktopPanel, 'open');
    assert.equal(discover.nextElementSibling.hasAttribute('data-tdb-desktop-panel'), false);
    assert.equal(f.d.documentElement.classList.contains('tdb-desktop-nav-locked'), true);
    services.setAttribute('aria-expanded', 'false'); await flush(); await f.finish();
    assert.equal(f.d.documentElement.classList.contains('tdb-desktop-nav-locked'), false);
    services.setAttribute('aria-expanded', 'true'); await flush(); await f.resize(448);
    assert.equal(services.nextElementSibling.hasAttribute('data-tdb-desktop-panel'), false);
    assert.equal(f.d.documentElement.classList.contains('tdb-desktop-nav-locked'), false);
  } finally { f.dom.window.close(); }
});

test('Finsweet is skipped for a claimed native navbar and retained for a separate legacy consumer', () => {
  for (const legacy of [false, true]) {
    const f = fixture();
    try {
      if (legacy) f.d.querySelector('main').setAttribute('fs-scrolldisable-element', 'toggle');
      f.w.eval(read('dist/tdb-immediate-runtime-batch.min.js'));
      assert.equal(!!f.d.querySelector('script[data-scrolldisable-js]'), legacy);
      assert(f.d.querySelector('[data-tdb-footer-runtime-js]').src.startsWith('https://example.test/runtime/'));
    } finally { f.dom.window.close(); }
  }
});

test('pagehide releases the mobile lock and pageshow restores an open native menu', async () => {
  const f = fixture();
  try {
    await f.open(); f.w.dispatchEvent(new f.w.Event('pagehide'));
    assert.equal(f.w.TDBScrollLock.active, false);
    f.w.dispatchEvent(new f.w.Event('pageshow')); assert.equal(f.w.TDBScrollLock.active, true);
    await f.closeStart(); await f.closeEnd(); assert.equal(f.w.TDBScrollLock.active, false);
  } finally { f.dom.window.close(); }
});

test('shared loader accepts a registered installer while the native menu remains open',async()=>{
 const f=fixture();try{
  await f.open();const pending=f.w.TDBNavbarLoader.prepare();
  assert.equal(f.w.TDBNavbarLoader.prepare(),pending);
  assert.equal(f.d.querySelectorAll('[data-tdb-navbar-enhancement]').length,1);
  f.enhance();assert.equal(await pending,true);
  assert.equal(f.w.TDBNavbar,undefined);assert.equal(f.w.TDBNavbarLoader.status().waitingForClose,true);
  await f.closeStart();assert.equal(f.w.TDBNavbar,undefined);
  await f.closeEnd();assert.equal(f.w.TDBNavbarLoader.status().ready,true);
 }finally{f.dom.window.close();}
});
test('shared navbar loading retries transport or missing-registration failures without duplicate tags',async()=>{
 const f=fixture();try{
  const failed=f.w.TDBNavbarLoader.prepare();f.d.querySelector('[data-tdb-navbar-enhancement]').dispatchEvent(new f.w.Event('error'));assert.equal(await failed,false);
  const missing=f.w.TDBNavbarLoader.prepare();assert.equal(f.d.querySelectorAll('[data-tdb-navbar-enhancement]').length,1);f.d.querySelector('[data-tdb-navbar-enhancement]').dispatchEvent(new f.w.Event('load'));assert.equal(await missing,false);
  const success=f.w.TDBNavbarLoader.prepare();f.enhance();assert.equal(await success,true);assert.equal(f.w.TDBNavbarLoader.status().ready,true);
 }finally{f.dom.window.close();}
});
test('native enhancement remains available if the optional registry failed to load',async()=>{
 const f=fixture(448,true,false);try{
  const pending=f.w.TDBNavbarLoader.prepare();f.enhance();assert.equal(await pending,true);assert.equal(f.w.TDBNavbarLoader.status().ready,true);
 }finally{f.dom.window.close();}
});
