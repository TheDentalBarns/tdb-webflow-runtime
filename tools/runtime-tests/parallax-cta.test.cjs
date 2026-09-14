const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.resolve(__dirname, '../../src/sliders/parallax-controls.js'), 'utf8');


function setup(t, route = '/', missing = false, options = {}) {
  const card = (href, title, extra = '') => `<div class="swiper-slide"><div class="showcase-content_btm"><div class="service-card-mobile-title">${title}</div><div class="service-card-button-wrap">${href ? `<a aria-hidden="true" class="button fade animate" href="${href}"><div>Discover service</div><svg aria-hidden="true"></svg></a>` : ''}</div>${extra}</div></div>`;
  const dom = new JSDOM(`<div class="parallax-swiper_component"><div class="swiper"><div class="swiper-wrapper" aria-hidden="true">${card('/services/one', 'One')}${card(missing ? '' : '/services/two', 'Two', '<a class="button" href="/legacy">Obsolete</a>')}</div></div><div class="swiper_functions-btm hide"><div class="swiper-buttons-wrapper"><div class="swiper-btn-prev"></div><div class="swiper-btn-next"></div></div></div></div>`, { url: 'https://dentalbarns.webflow.io' + route, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, c = w.document.querySelector('.parallax-swiper_component'), el = c.querySelector('.swiper');
  const original = el.innerHTML;
  w.matchMedia = query => ({ matches: options.mobile ? query.includes('max-width') : query.includes('min-width'), addEventListener() {}, removeEventListener() {} });
  if (options.state) w.history.replaceState(options.state, '');
  w.performance.getEntriesByType = () => [{ type: options.navigation || (options.state ? 'back_forward' : 'navigate') }];
  w.eval(source);
  const prepare = w.TDBParallaxControls.prepare;
  const controller = prepare(c, el);
  const handlers = new Map();
  const swiper = { slides: [...el.querySelectorAll('.swiper-slide')], activeIndex: controller?.initialIndex || 0,
    on(name, fn) { handlers.set(name, fn); }, off(name) { handlers.delete(name); } };
  if (options.bind !== false) controller?.bind(swiper);
  return { w, c, el, original, controller, swiper, handlers, button: c.querySelector('[data-tdb-parallax-cta]'), select(index) { swiper.activeIndex = index; handlers.get('slideChange')?.(); } };
}

test('one stationary accessible button follows CMS destinations and removes duplicate links', t => {
  const h = setup(t);
  assert.equal(h.c.querySelectorAll('a').length, 1);
  assert.equal(h.button.closest('.swiper-wrapper'), null);
  assert.equal(h.button.getAttribute('aria-hidden'), null);
  assert.equal(h.button.getAttribute('href'), '/services/one');
  h.select(1);
  assert.equal(h.c.querySelector('[data-tdb-parallax-cta]'), h.button);
  assert.equal(h.button.getAttribute('href'), '/services/two');
  assert.equal(h.button.getAttribute('aria-label'), 'Discover service: Two');
});
test('loop clones use original CMS metadata; subsequent return has no stale target or rel', t => {
  const h = setup(t);
  const clone = h.swiper.slides[1].cloneNode(true);h.el.querySelector('.swiper-wrapper').appendChild(clone);h.swiper.slides.push(clone);
  h.select(2);assert.equal(h.button.getAttribute('href'), '/services/two');
  h.button.setAttribute('target', '_blank');h.button.setAttribute('rel', 'nofollow');
  h.select(0);assert.equal(h.button.getAttribute('href'), '/services/one');
  assert.equal(h.button.hasAttribute('target'), false);assert.equal(h.button.hasAttribute('rel'), false);
});
test('transition and cancelled-drag states prevent stale navigation without replacing the focused button', t => {
  const h = setup(t);h.button.focus();h.controller.setBusy(true);h.select(1);
  const click = new h.w.MouseEvent('click', { bubbles: true, cancelable: true });
  h.button.dispatchEvent(click);assert.equal(click.defaultPrevented, true);
  assert.equal(h.button.getAttribute('aria-disabled'), 'true');assert.equal(h.w.document.activeElement, h.button);
  h.controller.setBusy(false);assert.equal(h.button.getAttribute('aria-disabled'), null);assert.equal(h.button.tabIndex, 0);
});
test('missing CMS link removes the previous href and returning to a valid slide recovers', t => {
  const h = setup(t, '/', true);h.select(1);
  assert.equal(h.button.hasAttribute('href'), false);assert.equal(h.button.getAttribute('aria-disabled'), 'true');
  h.select(0);assert.equal(h.button.getAttribute('href'), '/services/one');assert.equal(h.button.tabIndex, 0);
});
test('destroy restores original CMS markup and removes listeners; reinitialization remains single', t => {
  const h = setup(t);h.handlers.get('beforeDestroy')();assert.equal(h.el.innerHTML, h.original);assert.equal(h.handlers.has('slideChange'), false);
  h.w.TDBParallaxControls.prepare(h.c, h.el);
  assert.equal(h.c.querySelectorAll('[data-tdb-parallax-cta]').length, 1);
});
test('Location is supported and unrelated pages retain their original controls', t => {
  const h = setup(t, '/location');assert(h.button);assert(h.button.parentElement.classList.contains('is-location'));
  const other = setup(t, '/about-us');assert.equal(other.controller, null);assert.equal(other.el.innerHTML, other.original);
});

function pointer(h, target, type = 'pointerdown', pointerType = 'touch') {
  const event = new h.w.Event(type, { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
}

function touch(h, type, x, y) {
  const event = new h.w.Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: [{clientX:x,clientY:y}] });
  h.w.document.body.dispatchEvent(event);
}
function scroll(h, y) {
  Object.defineProperty(h.w, 'scrollY', { value:y, configurable:true });
  h.w.dispatchEvent(new h.w.Event('scroll'));
}
function scrollGesture(h) { touch(h,'touchstart',20,200);touch(h,'touchmove',20,160);scroll(h,h.w.scrollY+40); }
function clickWithoutNavigation(h) {
  h.button.addEventListener('click', e => e.preventDefault(), { once:true });
  h.button.dispatchEvent(new h.w.MouseEvent('click',{bubbles:true,cancelable:true}));
}

test('initial controls exist before Swiper or footer loader and mobile arrows are positioned early', t => {
  const h=setup(t,'/',false,{bind:false,mobile:true});
  assert.equal(h.w.Swiper,undefined);
  assert.equal(h.w.TDBSliderLoader,undefined);
  assert.equal(h.button.getAttribute('href'),'/services/one');
  assert.equal(h.c.querySelector('.swiper-btn-next').getAttribute('role'),'button');
  assert.equal(h.c.querySelector('.swiper-btn-next').tabIndex,0);
  assert.equal(h.c.querySelector('.swiper_functions-btm').parentElement,h.el);
  h.w.document.dispatchEvent(new h.w.Event('DOMContentLoaded'));
  assert.equal(h.c.querySelectorAll('[data-tdb-parallax-cta]').length,1);
  assert.equal(h.w.TDBParallaxControls.prepare(h.c),h.controller);
});
for (const route of ['/', '/location']) {
  test(`cached return preserves white; tap and restored scroll do not release it: ${route}`, t => {
    const h=setup(t,route);pointer(h,h.button);pointer(h,h.button,'pointerup');
    scroll(h,100);assert(h.button.classList.contains('is-touch-held'),'tap must not arm scroll reset');
    h.w.dispatchEvent(new h.w.PageTransitionEvent('pagehide',{persisted:true}));
    h.w.dispatchEvent(new h.w.PageTransitionEvent('pageshow',{persisted:true}));
    scroll(h,120);assert(h.button.classList.contains('is-touch-held'));
    scrollGesture(h);assert(!h.button.classList.contains('is-touch-held'));
  });
  test(`rebuilt return restores white and correct CMS slide, preserves unrelated history: ${route}`, t => {
    const h=setup(t,route,false,{state:{webflow:{keep:true}}});h.select(1);
    pointer(h,h.button);pointer(h,h.button,'pointerup');clickWithoutNavigation(h);
    assert.deepEqual(h.w.history.state.webflow,{keep:true});
    const rebuilt=setup(t,route,false,{state:JSON.parse(JSON.stringify(h.w.history.state)),bind:false});
    assert.equal(rebuilt.controller.initialIndex,1);assert.equal(rebuilt.controller.skipEntry,true);
    assert.equal(rebuilt.button.getAttribute('href'),'/services/two');
    assert(rebuilt.button.classList.contains('is-touch-held'));
    assert.equal(rebuilt.el.style.getPropertyValue('--tdb-parallax-initial-index'),'1');
    rebuilt.controller.bind(rebuilt.swiper);scrollGesture(rebuilt);
    rebuilt.w.dispatchEvent(new rebuilt.w.PageTransitionEvent('pagehide'));
    const again=setup(t,route,false,{state:JSON.parse(JSON.stringify(rebuilt.w.history.state))});
    assert(!again.button.classList.contains('is-touch-held'));
    assert.equal(again.button.getAttribute('href'),'/services/two');
  });
}
test('horizontal movement and post-click pointer cancellation preserve white; vertical cancellation releases it', t => {
  const h=setup(t);pointer(h,h.button);pointer(h,h.button,'pointerup');
  pointer(h,h.button,'pointercancel');assert(h.button.classList.contains('is-touch-held'));
  touch(h,'touchstart',20,200);touch(h,'touchmove',80,198);scroll(h,20);
  assert(h.button.classList.contains('is-touch-held'));
  pointer(h,h.button);touch(h,'touchstart',20,200);touch(h,'touchmove',20,150);
  pointer(h,h.button,'pointercancel');assert(!h.button.classList.contains('is-touch-held'));
});
test('wheel and keyboard release feedback; destroy removes listeners',t=>{
  const h=setup(t);pointer(h,h.button);
  h.w.dispatchEvent(new h.w.WheelEvent('wheel',{deltaY:50}));scroll(h,50);
  assert(!h.button.classList.contains('is-touch-held'));
  pointer(h,h.button);h.button.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
  assert(!h.button.classList.contains('is-touch-held'));
  h.controller.setBusy(true);pointer(h,h.button);assert(!h.button.classList.contains('is-touch-held'));
  h.controller.setBusy(false);pointer(h,h.button);h.handlers.get('beforeDestroy')();
  const classes=h.button.className;scrollGesture(h);assert.equal(h.button.className,classes);
});
test('the first arrow command waits for the loader and executes once without automatic entry motion',async t=>{
  const h=setup(t,'/',false,{bind:false});let loads=0,next=0;
  h.swiper.slideNext=()=>next++;
  h.w.TDBSliders={activate:()=>h.controller.bind(h.swiper)};
  const arrow=h.c.querySelector('.swiper-btn-next');
  arrow.dispatchEvent(new h.w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(h.controller.skipEntry,true);assert.equal(next,0);
  h.w.TDBSliderLoader={load:()=>{loads++;return Promise.resolve();}};
  h.w.dispatchEvent(new h.w.Event('tdb:slider-loader-ready'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(loads,1);assert.equal(next,1);assert.equal(h.c.hasAttribute('aria-busy'),false);
});
test('failed first-arrow load is retryable and keyboard activation is retained',async t=>{
  const h=setup(t,'/',false,{bind:false});let attempts=0,prev=0;
  h.swiper.slidePrev=()=>prev++;h.w.TDBSliders={activate:()=>h.controller.bind(h.swiper)};
  h.w.TDBSliderLoader={load:()=>++attempts===1?Promise.reject(Error('offline')):Promise.resolve()};
  const arrow=h.c.querySelector('.swiper-btn-prev');
  const press=()=>arrow.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  press();await new Promise(resolve=>setImmediate(resolve));assert.equal(prev,0);
  press();await new Promise(resolve=>setImmediate(resolve));assert.equal(prev,1);
});
test('changed CMS data does not restore a stale link or white state',t=>{
  const state={tdbParallax:{'/:0':{index:1,href:'/deleted-service',held:true}}};
  const h=setup(t,'/',false,{state});assert.equal(h.controller.initialIndex,0);
  assert(!h.button.classList.contains('is-touch-held'));assert.equal(h.button.getAttribute('href'),'/services/one');
});
test('early white and dark states share one uninterrupted fade and constant blur',()=>{
  const postcss=require('postcss');
  const css=postcss.parse(fs.readFileSync(path.resolve(__dirname,'../../src/styles/tdb-parallax-controls.css'),'utf8'));
  const selector='.has-static-parallax-cta .tdb-parallax-cta-layer [data-tdb-parallax-cta].button.is-secondary';
  let rest,held;
  css.walkRules(rule=>{
    assert(!rule.selector.includes('is-cta-reset'));
    const declarations=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
    if(rule.selector===selector)rest=declarations;
    if(rule.selector.includes('.is-touch-held'))held=declarations;
  });
  assert.equal(rest['background-color'],'rgba(0, 0, 0, 0.3)');
  assert.equal(rest['backdrop-filter'],'blur(20px)');
  assert(rest.transition.includes('background-color 300ms ease'));
  assert.equal(held['background-color'],'#fff');assert.equal(held.transition,undefined);
});
test('a deliberate reload retains the normal fresh entry behaviour',t=>{
  const state={tdbParallax:{'/:0':{index:1,href:'/services/two',held:true}}};
  const h=setup(t,'/',false,{state,navigation:'reload'});
  assert.equal(h.controller.initialIndex,0);assert.equal(h.controller.skipEntry,false);
  assert(!h.button.classList.contains('is-touch-held'));
});
