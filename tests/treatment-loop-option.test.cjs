const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('Home treatments stay finite unless explicitly opted into a loop; other sliders keep their loop', () => {
  for (const [attrs, expected] of [
    ['data-tdb-treatment-postage', false],
    ['data-tdb-treatment-postage data-tdb-treatment-loop="false"', false],
    ['data-tdb-treatment-postage data-tdb-treatment-loop="true"', true],
    ['', true],
  ]) {
    const dom = new JSDOM(
      `<section class="parallax-swiper_component" data-tdb-treatment data-tdb-banner-parallax ${attrs}><div class="swiper"><div class="swiper-wrapper"><div class="swiper-slide"></div><div class="swiper-slide"></div></div></div></section>`,
      { runScripts: 'outside-only' },
    );
    const w = dom.window,
      stop = new Error('captured create options');
    let options;
    w.matchMedia = () => ({ matches: false });
    w.Swiper = function () {};
    w.TDBMotion = { duration: () => 500, reduced: { matches: false } };
    w.TDBSwiper = {
      register() {},
      nativeGap: (_, fallback) => fallback,
      create(_, value) {
        options = value;
        throw stop;
      },
    };
    w.eval(fs.readFileSync('src/sliders/parallax-plugin.js', 'utf8'));
    try {
      assert.throws(
        () => w.TDBParallaxPlugin.mount(w.document.querySelector('section')),
        (error) => error === stop,
      );
      assert.equal(options.loop, expected);
    } finally {
      dom.window.close();
    }
  }
});
