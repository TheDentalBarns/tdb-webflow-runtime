const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../src/navbar/native-foundation.js'), 'utf8');

test('same-page category anchors open their target and hold chrome before native scrolling', () => {
  const dom = new JSDOM('<a href="#General-Dentistry">General</a><section id="General-Dentistry" data-tdb-price-section><button data-tdb-disclosure-trigger aria-expanded="false">General Dentistry</button><div data-tdb-disclosure-panel>Prices</div></section>', {runScripts:'outside-only',url:'https://dentalbarns.webflow.io/dental-cost-lichfield'});
  const w=dom.window, trigger=w.document.querySelector('button');
  w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.document.querySelector('a').addEventListener('click', e=>{assert.equal(trigger.getAttribute('aria-expanded'),'true');e.preventDefault();});
  w.document.querySelector('a').click();
  assert(w.document.documentElement.classList.contains('tdb-slider-focus'));
  w.TDBDisclosure.mount(trigger).set(false);
  w.history.replaceState(null,'','#General-Dentistry');w.dispatchEvent(new w.Event('hashchange'));
  assert.equal(trigger.getAttribute('aria-expanded'),'true');
  dom.window.close();
});

test('closing a treatment or category waits for shared scroll release; leaving an open section releases it', () => {
  const dom = new JSDOM(
    '<section data-tdb-price-section data-tdb-disclosure-item><button data-tdb-disclosure-trigger aria-expanded="true">Category</button><div data-tdb-disclosure-panel><div data-tdb-disclosure-item><button data-tdb-disclosure-trigger data-tdb-price-trigger aria-expanded="false">Treatment</button><div data-tdb-disclosure-panel>Price details</div></div></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    section = w.document.querySelector('section');
  let visible = true,
    callback,
    holds = 0,
    releases = 0,
    hold,
    scrollRelease;
  section.getBoundingClientRect = () => ({
    top: visible ? 100 : -1000,
    bottom: visible ? 600 : -400,
    height: 500,
  });
  w.IntersectionObserver = class {
    constructor(cb) {
      callback = cb;
    }
    observe() {}
  };
  w.TDBNavScroll = {
    focus(_release, held) {
      holds++;
      hold = held;
      scrollRelease = _release;
    },
    release(options) {
      assert(options.respectDirection);
      releases++;
    },
  };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  callback();
  assert.equal(holds, 0);
  w.document.querySelector('[data-tdb-price-trigger]').click();
  assert.equal(holds, 1);
  assert(hold());
  w.document.querySelector('button').click();
  assert.equal(releases, 0, 'collapse is not scroll intent');
  assert.equal(hold(), false, 'normal navigation distance counters resume');
  callback();
  assert.equal(releases, 0, 'collapse geometry cannot unpark chrome');
  scrollRelease();
  assert.equal(releases, 1);
  w.document.querySelector('button').click();
  assert.equal(holds, 3);
  visible = false;
  callback();
  assert.equal(releases, 2);
  visible = true;
  callback();
  assert.equal(holds, 4);
  w.document.querySelector('[data-tdb-price-trigger]').click();
  assert.equal(releases, 2);
  callback();
  assert.equal(releases, 2);
  scrollRelease();
  assert.equal(releases, 3);
  dom.window.close();
});
test('treatment focus preserves the VIP handle pose through repeated open and close cycles', () => {
  const dom = new JSDOM(
    '<div id="tdb-vip-drawer" class="is-peeking"></div><section data-tdb-price-section><div data-tdb-disclosure-item><button data-tdb-disclosure-trigger data-tdb-price-trigger aria-expanded="false">Treatment</button><div data-tdb-disclosure-panel>Details</div></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window;
  const drawer = w.document.getElementById('tdb-vip-drawer');
  const trigger = w.document.querySelector('button');
  w.document.querySelector('section').getBoundingClientRect = () => ({ top: 100, bottom: 600, height: 500 });
  let closes = 0;
  w.TDBVIPDrawer = { close() { closes++; drawer.classList.remove('is-peeking', 'is-open'); } };
  let scrollRelease;
  w.TDBNavScroll = { focus(release) { scrollRelease = release; }, release() {} };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  for (let cycle = 0; cycle < 3; cycle++) {
    trigger.click();
    assert(w.document.documentElement.classList.contains('tdb-slider-focus'));
    assert(drawer.classList.contains('is-peeking'), 'focus hides the handle without resetting its scroll state');
    trigger.click();
    assert(w.document.documentElement.classList.contains('tdb-slider-focus'), 'closing alone keeps chrome parked');
    scrollRelease();
    assert(!w.document.documentElement.classList.contains('tdb-slider-focus'));
    assert(drawer.classList.contains('is-peeking'), 'releasing focus restores the existing handle pose');
  }
  assert.equal(closes, 0);
  drawer.classList.remove('is-peeking');
  trigger.click();
  trigger.click();
  assert(!drawer.classList.contains('is-peeking'), 'a previously hidden handle stays under normal scroll control');
  drawer.classList.add('is-open');
  trigger.click();
  assert.equal(closes, 1, 'an open form is still dismissed');
  dom.window.close();
});
test('expanded prices reacquire focus after entering from either exact viewport edge', () => {
  const dom = new JSDOM(
    '<section data-tdb-price-section><div data-tdb-disclosure-item><button data-tdb-disclosure-trigger data-tdb-price-trigger aria-expanded="false">Treatment</button><div data-tdb-disclosure-panel>Details</div></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window;
  const html = w.document.documentElement;
  const section = w.document.querySelector('section');
  let top = 100, bottom = 600, observer, queued, holds = 0;
  section.getBoundingClientRect = () => ({ top, bottom, height: bottom - top });
  w.IntersectionObserver = class { constructor(fn) { observer = fn; } observe() {} };
  w.requestAnimationFrame = fn => { queued = fn; return 1; };
  w.cancelAnimationFrame = () => { queued = null; };
  w.TDBNavScroll = { focus() { holds++; }, release() {} };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.document.querySelector('button').click();
  assert(html.classList.contains('tdb-slider-focus'));
  for (const edge of ['above', 'below']) {
    if (edge === 'above') { top = -501; bottom = -1; }
    else { top = w.innerHeight + 1; bottom = top + 500; }
    observer();
    assert(!html.classList.contains('tdb-slider-focus'));
    if (edge === 'above') { top = -500; bottom = 0; }
    else { top = w.innerHeight; bottom = top + 500; }
    observer();
    assert(!html.classList.contains('tdb-slider-focus'), 'zero-area entry does not yet hold chrome');
    if (edge === 'above') { top++; bottom++; }
    else { top--; bottom--; }
    w.dispatchEvent(new w.Event('scroll'));
    const flush = queued; queued = null; flush();
    assert(html.classList.contains('tdb-slider-focus'), 'scroll restores focus even without another observer event');
  }
  assert.equal(holds, 3);
  html.classList.remove('tdb-slider-focus');
  w.dispatchEvent(new w.Event('scroll'));
  queued();
  assert(html.classList.contains('tdb-slider-focus'), 'another controller release cannot leave a visible expanded section unprotected');
  dom.window.close();
});
function fixture(open) {
  const dom = new JSDOM(
    `<!doctype html><div data-tdb-disclosure-item class="faq3_accordion is-disclosure${open ? ' is-open' : ''}"><div role="button" tabindex="0" data-tdb-disclosure-trigger aria-expanded="${open}"><span data-tdb-chevron class="tdb-disclosure-chevron${open ? ' is-open' : ''}"></span></div><div data-tdb-disclosure-panel class="tdb-disclosure-panel${open ? ' is-open' : ''}"><a href="#">Answer</a></div></div>`,
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    d = w.document;
  w.eval(source);
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.TDBDisclosure.refresh();
  return {
    dom,
    w,
    item: d.querySelector('[data-tdb-disclosure-item]'),
    trigger: d.querySelector('[data-tdb-disclosure-trigger]'),
    panel: d.querySelector('[data-tdb-disclosure-panel]'),
    chevron: d.querySelector('[data-tdb-chevron]'),
  };
}
test('mount preserves authored open and closed states without enabling animation', () => {
  for (const open of [false, true]) {
    const { dom, w, item, trigger, panel, chevron } = fixture(open);
    assert.equal(trigger.getAttribute('aria-expanded'), String(open));
    assert.equal(panel.hidden, !open);
    assert.equal(panel.inert, !open);
    for (const node of [item, trigger, panel, chevron])
      assert.equal(node.classList.contains('is-open'), open);
    assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
    w.TDBDisclosure.refresh();
    assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
    dom.window.close();
  }
});
test('click and keyboard toggles enable animation and keep native state and accessibility aligned', () => {
  const { dom, w, item, trigger, panel, chevron } = fixture(true);
  panel.querySelector('a').focus();
  trigger.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), true);
  assert.equal(panel.hidden, true);
  assert.equal(w.document.activeElement, trigger);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  for (const node of [item, trigger, panel, chevron])
    assert.equal(node.classList.contains('is-open'), false);
  trigger.dispatchEvent(
    new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
  assert.equal(panel.hidden, false);
  assert.equal(panel.getAttribute('aria-hidden'), 'false');
  for (const node of [item, trigger, panel, chevron])
    assert.equal(node.classList.contains('is-open'), true);
  dom.window.close();
});
test('programmatic setup and disabled controls cannot enable startup motion', () => {
  const { dom, w, item, trigger, panel } = fixture(false);
  w.TDBDisclosure.mount(trigger).set(true);
  assert.equal(panel.hidden, false);
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
  trigger.setAttribute('aria-disabled', 'true');
  trigger.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(panel.hidden, false);
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'), false);
  dom.window.close();
});

test('nested category anchors hold through arrival, release on departure and cancel interrupted journeys', () => {
  const dom = new JSDOM('<a href="#Cosmetic-Dentistry">Cosmetic</a><section data-tdb-price-section><button data-tdb-disclosure-trigger aria-expanded="false"><span id="Cosmetic-Dentistry">Cosmetic</span></button><div data-tdb-disclosure-panel>Prices</div></section>', {runScripts:'outside-only',url:'https://dentalbarns.webflow.io/dental-cost-lichfield'});
  const w=dom.window, d=w.document, section=d.querySelector('section'), trigger=d.querySelector('button');
  let top=5000, observe, hold, releases=0;
  section.getBoundingClientRect=()=>({top,bottom:top+1500,height:1500});
  w.IntersectionObserver=class {constructor(fn){observe=fn}observe(){}};
  w.TDBNavScroll={focus(_,held){hold=held},release(){releases++}};
  w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));
  d.querySelector('a').addEventListener('click',e=>e.preventDefault());
  d.querySelector('a').click();assert.equal(trigger.getAttribute('aria-expanded'),'true');assert(hold());
  observe();assert(d.documentElement.classList.contains('tdb-slider-focus'),'offscreen native journey remains held');
  top=0;observe();assert(hold());
  top=-1600;observe();assert(!d.documentElement.classList.contains('tdb-slider-focus'));assert.equal(releases,1);
  top=5000;d.querySelector('a').click();assert(hold());
  d.dispatchEvent(new w.WheelEvent('wheel',{deltaY:-20,bubbles:true}));
  assert(!d.documentElement.classList.contains('tdb-slider-focus'));assert.equal(releases,2);
  dom.window.close();
});

test('sticky collapse preserves the clicked header with native scrolling and Lenis', () => {
  for(const lenis of [false,true]){
    const f=fixture(true), {w,trigger,panel,dom}=f;
    w.scrollY=4600;let moves=0;
    trigger.getBoundingClientRect=()=>({top:panel.hidden ? 4263-w.scrollY : 0,height:100});
    const move=top=>{moves++;w.scrollY=top};
    w.scrollTo=options=>{assert.equal(options.behavior,'instant');move(options.top)};
    if(lenis)w.lenis={scrollTo(top,options){assert(options.immediate&&options.force);move(top)}};
    trigger.click();assert.equal(moves,1);assert.equal(w.scrollY,4263);assert.equal(trigger.getBoundingClientRect().top,0);
    assert.equal(panel.hidden,true);
    // A geometry-neutral open does not manufacture another scroll.
    trigger.click();assert.equal(moves,1);
    dom.window.close();
  }
});

test('initial hash arrival hides chrome even when disclosure mounting ran first',()=>{
  const dom=new JSDOM('<section id="General-Dentistry" data-tdb-price-section><button data-tdb-disclosure-trigger aria-expanded="false">General</button><div data-tdb-disclosure-panel>Prices</div></section>',{runScripts:'outside-only',url:'https://dentalbarns.webflow.io/dental-cost-lichfield#General-Dentistry'});
  const w=dom.window;w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  assert.equal(w.document.querySelector('button').getAttribute('aria-expanded'),'true');
  assert(w.document.documentElement.classList.contains('tdb-slider-focus'));dom.window.close();
});
