const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

for (const kind of ['services', 'native-treatment', 'legacy-treatment']) {
  test(`${kind} progress preserves its layout owner and follows the visible slide`, () => {
    const native = kind !== 'legacy-treatment';
    const dom = new JSDOM(
      `<div id="All-treatments"><section
      class="parallax-swiper_component ${kind === 'services' ? 'tdb-service-parallax' : 'tdb-banner-parallax'}"
      ${kind === 'native-treatment' ? 'data-tdb-treatment' : ''}>
      <div class="swiper"><div class="swiper-wrapper">
        <div class="swiper-slide" data-swiper-slide-index="0"></div>
        <div class="swiper-slide" data-swiper-slide-index="1"></div>
      </div></div>
      ${native ? '<div class="swiper-pagination tdb-service-pagination" data-tdb-native-progress><span></span><span></span></div>' : ''}
      </section></div>`,
      { runScripts: 'outside-only' },
    );
    try {
      const w = dom.window,
        root = w.document.querySelector('section');
      if (kind === 'services') root.parentElement.removeAttribute('id');
      const viewport = root.querySelector('.swiper');
      root.getBoundingClientRect = () => ({ top: 100, left: 20 });
      viewport.getBoundingClientRect = () => ({
        top: 100,
        left: 20,
        right: 820,
        bottom: 700,
        width: 800,
      });
      Object.defineProperty(w.document.documentElement, 'clientWidth', { value: 1000 });
      let active = 0,
        paint;
      [...root.querySelectorAll('.swiper-slide')].forEach((slide, index) => {
        slide.getBoundingClientRect = () => ({ left: 20 + (index - active) * 800, width: 800 });
      });
      w.IntersectionObserver = class {
        observe() {}
        disconnect() {}
      };
      w.ResizeObserver = class {
        observe() {}
        disconnect() {}
      };
      w.TDBRenderedProgress = {
        observe(options) {
          paint = options.paint;
          return { schedule() {}, pause() {}, destroy() {} };
        },
      };
      w.eval(fs.readFileSync('src/sliders/parallax-progress.js', 'utf8'));
      w.TDBParallaxProgress.refresh();
      const track = root.querySelector('[data-tdb-native-progress],.tdb-service-progress');
      track.getBoundingClientRect = () => ({ width: 800 });
      paint();
      if (native) {
        for (const property of ['top', 'left', 'width']) assert.equal(track.style[property], '');
      } else {
        assert.equal(track.style.top, '600px');
        assert.equal(track.style.left, '-20px');
        assert.equal(track.style.width, '1000px');
      }
      const width = native ? 400 : 500;
      assert.equal(track.firstElementChild.style.width, `${width}px`);
      assert.equal(track.firstElementChild.style.transform, 'translateX(0px)');
      active = 1;
      paint();
      assert.equal(track.firstElementChild.style.transform, `translateX(${width}px)`);
      assert.equal(track.children[1].style.transform, `translateX(${-width}px)`);
    } finally {
      dom.window.close();
    }
  });
}

test('stamp width changes refresh the progress geometry even when the image frame stays fixed', () => {
  const dom = new JSDOM(
    `<div id="All-treatments" data-tdb-treatment-layout>
    <section data-tdb-treatment data-tdb-treatment-postage>
      <div class="swiper"><div class="swiper-wrapper"><div class="swiper-slide" data-swiper-slide-index="0"></div></div></div>
      <div data-tdb-native-progress><span></span><span></span></div>
    </section>
    <div data-tdb-treatment-stamps><div class="tdb-treatment-controls"><div class="tdb-treatment-wrapper"><div class="tdb-treatment-card"></div></div></div></div>
    </div>`,
    { runScripts: 'outside-only' },
  );
  try {
    const w = dom.window,
      d = w.document,
      observed = new Set();
    let paint,
      resized,
      stampWidth = 100;
    w.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    };
    w.ResizeObserver = class {
      constructor(fn) {
        resized = fn;
      }
      observe(node) {
        observed.add(node);
      }
      disconnect() {}
    };
    w.TDBRenderedProgress = {
      observe(options) {
        paint = options.paint;
        return { schedule() {}, pause() {}, destroy() {} };
      },
    };
    w.TDBTreatmentStamps = {
      prepare() {
        return { measure: () => stampWidth, paint() {} };
      },
    };
    d.querySelector('.swiper').getBoundingClientRect = () => ({ left: 0, width: 350 });
    d.querySelector('.swiper-slide').getBoundingClientRect = () => ({ left: 0, width: 350 });
    const progress = d.querySelector('[data-tdb-native-progress]');
    progress.getBoundingClientRect = () => ({ width: 350 });
    w.eval(fs.readFileSync('src/sliders/parallax-progress.js', 'utf8'));
    w.TDBParallaxProgress.refresh();
    paint();
    assert.equal(progress.firstElementChild.style.width, '100px');
    const card = d.querySelector('.tdb-treatment-card');
    assert.ok(observed.has(card), 'the stamp geometry can wake the sampler independently');
    stampWidth = 120;
    resized([{ target: card }]);
    paint();
    assert.equal(progress.firstElementChild.style.width, '120px');
  } finally {
    dom.window.close();
  }
});
