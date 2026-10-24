const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

for (const native of ['services', 'treatment']) {
  test(`${native} image movement does not wake horizontal progress; layout and lifecycle still do`, async () => {
    const dom = new JSDOM(
      `<section ${native === 'services' ? 'class="tdb-service-parallax"' : 'data-tdb-treatment'}>
    <div class="swiper"><div class="swiper-wrapper"><div class="swiper-slide" data-swiper-slide-index="0"><img class="showcase_image"></div></div></div>
    <div data-tdb-native-progress><span></span><span></span></div></section>`,
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    try {
      const w = dom.window,
        d = w.document,
        queue = new Map(),
        observers = [];
      let id = 0,
        paints = 0,
        records = 0,
        options,
        running = false;
      w.requestAnimationFrame = (fn) => {
        queue.set(++id, fn);
        return id;
      };
      w.cancelAnimationFrame = (id) => queue.delete(id);
      for (const kind of ['IntersectionObserver', 'ResizeObserver'])
        w[kind] = class {
          constructor(fn) {
            this.fn = fn;
            observers.push(this);
          }
          observe() {}
          disconnect() {}
        };
      const track = d.querySelector('.swiper-wrapper'),
        image = d.querySelector('img');
      track.getAnimations = () => (running ? [{ playState: 'running' }] : []);
      w.TDBRenderedProgress = {
        observe(value) {
          options = value;
          return { schedule() {}, pause() {}, destroy() {} };
        },
      };
      w.eval(fs.readFileSync('src/sliders/parallax-progress.js', 'utf8'));
      w.TDBParallaxProgress.refresh();
      delete w.TDBRenderedProgress;
      w.eval(fs.readFileSync('dist/tdb-rendered-progress.js', 'utf8'));
      const sampler = w.TDBRenderedProgress.observe({
        track,
        relevantMutation: options.relevantMutation,
        paint() {
          paints++;
        },
        onMutation(value) {
          records += value.length;
        },
      });
      const flush = async () => {
        await Promise.resolve();
        const pending = [...queue.values()];
        queue.clear();
        pending.forEach((fn) => fn());
        await Promise.resolve();
      };
      for (let n = 0; n < 120; n++) {
        image.style.translate = `0px ${n}px`;
        await flush();
      }
      assert.equal(paints, 0);
      assert.equal(records, 120, 'structural callback still receives the complete mutation batch');
      track.style.transform = 'translateX(-100px)';
      await flush();
      assert.equal(paints, 1);
      track.firstElementChild.style.width = '390px';
      await flush();
      assert.equal(paints, 2);
      const clone = track.firstElementChild.cloneNode(true);
      track.append(clone);
      await flush();
      assert.equal(paints, 3);
      clone.setAttribute('data-swiper-slide-index', '1');
      await flush();
      assert.equal(paints, 4);
      image.classList.add('changed');
      await flush();
      assert.equal(paints, 5);
      const copy = d.createElement('span');
      track.firstElementChild.append(copy);
      await flush();
      copy.classList.add('is-visible');
      await flush();
      assert.equal(paints, 7, 'copy reveal and descendants still refresh details');
      paints -= 2;
      running = true;
      track.dispatchEvent(new w.Event('transitionstart'));
      await flush();
      assert.equal(paints, 6);
      image.style.translate = '0px 200px';
      await flush();
      assert.equal(paints, 7, 'active track transitions keep sampling');
      running = false;
      await flush();
      assert.equal(queue.size, 0);
      sampler.schedule();
      sampler.pause();
      assert.equal(queue.size, 0);
      sampler.destroy();
      track.style.transform = 'translateX(-200px)';
      await flush();
      assert.equal(paints, 8);
      const ordinary = w.TDBRenderedProgress.observe({
        track,
        paint() {
          paints++;
        },
      });
      image.style.translate = '0px 210px';
      await flush();
      assert.equal(paints, 9, 'other callers retain default mutation behaviour');
      ordinary.destroy();
      d.querySelector('section').classList.remove('tdb-service-parallax');
      d.querySelector('section').removeAttribute('data-tdb-treatment');
      assert.equal(
        options.relevantMutation({ type: 'attributes', attributeName: 'style', target: image }),
        true,
        'non-native legacy image changes are not filtered',
      );
    } finally {
      dom.window.close();
    }
  });
}

test('built Swiper skips identical parallax writes and restores externally frozen loop images', async () => {
  const dom = new JSDOM(
    '<div class="swiper"><div class="swiper-wrapper"><div class="swiper-slide"><img data-swiper-parallax-x="30%"></div><div class="swiper-slide"><img data-swiper-parallax-x="30%"></div></div></div>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  try {
    const w = dom.window;
    w.eval(fs.readFileSync('dist/tdb-swiper-8.4.7.min.js', 'utf8'));
    const swiper = new w.Swiper('.swiper', { width: 390, height: 400, parallax: true, init: true });
    const images = [...w.document.images];
    swiper.slides[0].progress = 1;
    swiper.slides[1].progress = -1;
    swiper.emit('setTranslate');
    assert.deepEqual(
      images.map((image) => image.style.transform),
      ['translate3d(30%, 0px, 0px)', 'translate3d(-30%, 0px, 0px)'],
    );
    let writes = 0;
    const transformProperty = Object.getOwnPropertyDescriptor(
      w.CSSStyleDeclaration.prototype,
      'transform',
    );
    for (const image of images) {
      const style = image.style;
      Object.defineProperty(style, 'transform', {
        configurable: true,
        get() {
          return transformProperty.get.call(style);
        },
        set(value) {
          writes++;
          transformProperty.set.call(style, value);
        },
      });
    }
    for (let n = 0; n < 120; n++) swiper.emit('setTranslate');
    await Promise.resolve();
    assert.equal(writes, 0);
    swiper.setTransition(400);
    for (let n = 0; n < 120; n++) swiper.emit('setTranslate');
    assert.equal(
      writes,
      240,
      'timed arrow/release transitions retain the established image writes',
    );
    swiper.setTransition(0);
    writes = 0;
    for (let n = 0; n < 120; n++) swiper.emit('setTranslate');
    assert.equal(writes, 0, 'direct dragging returns to skipping unchanged values');
    images[1].style.transform = 'matrix(1,0,0,1,13,0)';
    swiper.emit('setTranslate');
    await Promise.resolve();
    assert.equal(images[1].style.transform, 'translate3d(-30%, 0px, 0px)');
    swiper.slides[0].progress = 0.5;
    swiper.emit('setTranslate');
    assert.equal(images[0].style.transform, 'translate3d(15%, 0px, 0px)');
    swiper.destroy(true, true);
  } finally {
    dom.window.close();
  }
});
