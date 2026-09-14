const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.resolve(__dirname, '../../src/sliders/sliders.js'), 'utf8');
const helper = source.slice(source.indexOf('  function prepareParallaxCTA('), source.indexOf('  function initParallaxSwiper('));

function setup(t, route = '/', missing = false) {
  const card = (href, title, extra = '') => `<div class="swiper-slide"><div class="showcase-content_btm"><div class="service-card-mobile-title">${title}</div><div class="service-card-button-wrap">${href ? `<a aria-hidden="true" class="button fade animate" href="${href}"><div>Discover service</div><svg aria-hidden="true"></svg></a>` : ''}</div>${extra}</div></div>`;
  const dom = new JSDOM(`<div class="parallax-swiper_component"><div class="swiper"><div class="swiper-wrapper" aria-hidden="true">${card('/services/one', 'One')}${card(missing ? '' : '/services/two', 'Two', '<a class="button" href="/legacy">Obsolete</a>')}</div></div></div>`, { url: 'https://dentalbarns.webflow.io' + route, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, c = w.document.querySelector('.parallax-swiper_component'), el = c.querySelector('.swiper');
  const original = el.innerHTML;
  const prepare = w.eval(`(${helper.trim()})`);
  const controller = prepare(c, el);
  const handlers = new Map();
  const swiper = { slides: [...el.querySelectorAll('.swiper-slide')], activeIndex: 0,
    on(name, fn) { handlers.set(name, fn); }, off(name) { handlers.delete(name); } };
  controller?.bind(swiper);
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
  const prepare = h.w.eval(`(${helper.trim()})`);prepare(h.c, h.el);
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
for (const route of ['/', '/location']) {
  test(`touch highlight holds on release and clears on page exit and cached return: ${route}`, t => {
    const h = setup(t, route);
    pointer(h, h.button.firstElementChild);
    pointer(h, h.button, 'pointerup');
    assert(h.button.classList.contains('is-touch-held'));
    h.w.dispatchEvent(new h.w.PageTransitionEvent('pagehide', { persisted: true }));
    assert(!h.button.classList.contains('is-touch-held'));
    assert(h.button.classList.contains('is-cta-reset'));
    pointer(h, h.button);
    assert(h.button.classList.contains('is-touch-held'));
    assert(!h.button.classList.contains('is-cta-reset'));
    h.w.dispatchEvent(new h.w.PageTransitionEvent('pageshow', { persisted: true }));
    assert(!h.button.classList.contains('is-touch-held'));
    assert.equal(h.button.getAttribute('href'), '/services/one');
    h.select(1);
    assert.equal(h.button.getAttribute('href'), '/services/two');
  });
}
test('cancel, outside tap and keyboard clear touch feedback; disabled and mouse presses do not latch', t => {
  const h = setup(t);
  for (const clear of [() => pointer(h, h.button, 'pointercancel'), () => pointer(h, h.w.document.body), () => h.button.dispatchEvent(new h.w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))]) {
    pointer(h, h.button);assert(h.button.classList.contains('is-touch-held'));
    clear();assert(!h.button.classList.contains('is-touch-held'));
  }
  pointer(h, h.button, 'pointerdown', 'mouse');assert(!h.button.classList.contains('is-touch-held'));
  h.controller.setBusy(true);pointer(h, h.button);assert(!h.button.classList.contains('is-touch-held'));
  h.controller.setBusy(false);h.handlers.get('beforeDestroy')();
  const classes = h.button.className;
  h.w.dispatchEvent(new h.w.PageTransitionEvent('pageshow', { persisted: true }));
  assert.equal(h.button.className, classes);
});
