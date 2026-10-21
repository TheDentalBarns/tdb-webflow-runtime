const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('finite desktop transitions animate both outgoing and incoming image widths without loop indexes', () => {
  const dom = new JSDOM(
    '<section class="parallax-swiper_component" data-tdb-treatment data-tdb-banner-parallax data-tdb-treatment-postage data-tdb-treatment-loop="false"><div class="swiper"><div class="swiper-wrapper">' +
      Array.from({ length: 6 }, () => '<article class="swiper-slide tdb-treatment-slide"></article>').join('') +
      '</div></div></section>',
    { runScripts: 'outside-only' },
  );
  const w = dom.window, root = w.document.querySelector('section'), events = {}, animations = [];
  const slides = [...root.querySelectorAll('.swiper-slide')];
  w.matchMedia = (query) => ({ matches: query.startsWith('(min-width:'), addEventListener() {}, removeEventListener() {} });
  w.TDBMotion = { duration: () => 500, reduced: { matches: false }, carousel: { nextDelay: 0 } };
  w.Swiper = function () {};
  for (const slide of slides) {
    slide.getBoundingClientRect = () => ({ width: slide.classList.contains('is-wide') ? 800 : 400 });
    slide.animate = function (frames) {
      const animation = { effect: { target: this }, frames, finished: new Promise(() => {}), cancel() {} };
      animations.push(animation);
      return animation;
    };
  }
  let swiper;
  w.TDBSwiper = {
    register() {}, nativeGap: (_, gap) => gap, bindSwiper() {}, watchDuration() {}, onSettled() {},
    create(element, params) {
      swiper = {
        params, slides, enabled: true, activeIndex: 0, realIndex: 0, animating: false,
        wrapperEl: element.firstElementChild,
        on(names, fn) { for (const name of names.split(' ')) (events[name] ||= []).push(fn); },
        off() {},
        init() { events.beforeInit.forEach(fn => fn()); this.initialized = true; },
        updateSlides() {},
        slideTo(index) { this.activeIndex = this.realIndex = index; return true; },
      };
      return swiper;
    },
  };
  w.TDBParallax = { prepare: () => ({ skipEntry: true, bind() {}, setBusy() {} }), bind() {}, setMoving() {}, setEntry() {} };
  w.TDBCarouselVisibility = { bind() {} };
  w.eval(fs.readFileSync('src/sliders/parallax-plugin.js', 'utf8'));
  try {
    w.TDBParallaxPlugin.mount(root);
    assert.ok(slides.every(slide => !slide.hasAttribute('data-swiper-slide-index')));
    for (const [from, to] of [[0, 1], [1, 5], [5, 0]]) {
      animations.length = 0;
      swiper.slideTo(to);
      assert.equal(swiper.realIndex, to);
      assert.ok(animations.some(a => a.effect.target === slides[from] && a.frames[0].width === '800px' && a.frames[1].width === '400px'), 'outgoing image shrinks continuously');
      assert.ok(animations.some(a => a.effect.target === slides[to] && a.frames[0].width === '400px' && a.frames[1].width === '800px'), 'incoming image grows continuously instead of jumping');
    }
  } finally { dom.window.close(); }
});
