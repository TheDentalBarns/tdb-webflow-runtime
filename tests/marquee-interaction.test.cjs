const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function fixture({ delayed = false } = {}) {
  const dom = new JSDOM(
    `<!doctype html><body>
    <section class="section_logo-features"><div class="logo-slider">
    <div class="partner-featured_component">
      ${[0, 1]
        .map(
          (
            i,
          ) => `<div class="tdb-partner-logo"><img class="logo_image" src="https://example.test/${i}.svg">
      <div class="tdb-partner-source"><div class="tooltip2_card-wrapper"><div class="tooltip2_image-wrapper"><img class="tooltip2_image"></div><div class="tdb-partner-copy">Partner ${i}</div></div><a data-tdb-partner-link href="https://example.test"></a></div></div>`,
        )
        .join('')}
    </div></div><div class="tdb-partner-stage">
    <div class="tdb-partner-overlay"></div><img class="tdb-partner-spotlight">
    <div class="tdb-partner-tooltip"><div class="tdb-partner-backdrop"></div><div class="tdb-partner-tint"></div><div class="tdb-partner-content"><div class="tdb-partner-swiper"><div class="tdb-partner-slides"></div></div></div>
    <button class="tdb-partner-close">Close</button><button class="tdb-partner-prev">Previous</button><button class="tdb-partner-next">Next</button></div></div></section><button id="outside">Close</button></body>`,
    { url: 'https://dentalbarns.webflow.io/', runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    d = w.document;
  const animations = [],
    frames = new Map();
  let frameId = 0,
    decode;
  w.requestAnimationFrame = (fn) => {
    frames.set(++frameId, fn);
    return frameId;
  };
  w.cancelAnimationFrame = (id) => frames.delete(id);
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.TDBMotion = { reduced: w.matchMedia(), duration: () => 500, ddText: () => ({ destroy() {} }) };
  w.TDBNavScroll = { focus() {}, release() {} };
  w.TDBFeatureLoading = { watchIntent() {} };
  w.KeyframeEffect = class {
    getComputedTiming() {
      return { progress: 0 };
    }
    updateTiming() {}
  };
  w.Animation = class {
    constructor(effect) {
      this.effect = effect;
    }
    play() {
      this.playState = 'running';
    }
    cancel() {
      this.playState = 'idle';
    }
  };
  w.Element.prototype.animate = function () {
    let finish;
    const a = {
      element: this,
      finished: new Promise((r) => {
        finish = r;
      }),
      cancel() {
        this.cancelled = true;
      },
      finish: () => finish(),
    };
    animations.push(a);
    return a;
  };
  Object.defineProperty(w.HTMLElement.prototype, 'offsetLeft', {
    get() {
      return this.matches('.tdb-partner-logo')
        ? [...this.parentElement.children].indexOf(this) * 160
        : 0;
    },
  });
  Object.defineProperty(w.HTMLElement.prototype, 'offsetWidth', { get: () => 240 });
  Object.defineProperty(w.HTMLElement.prototype, 'offsetHeight', { get: () => 160 });
  w.Element.prototype.getBoundingClientRect = function () {
    const x = this.matches('.tdb-partner-logo') ? this.offsetLeft : 0;
    return {
      x,
      y: 400,
      left: x,
      top: 400,
      right: x + 160,
      bottom: 560,
      width: this.matches('.logo-slider') ? 640 : 160,
      height: 160,
    };
  };
  if (delayed)
    d.querySelector('.tooltip2_image').decode = () =>
      new Promise((resolve) => {
        decode = resolve;
      });
  w.TDBSwiper = {
    create(el, params) {
      const sw = {
        params,
        slides: [...el.querySelectorAll('.tooltip2_card-wrapper')],
        activeIndex: 0,
        realIndex: 0,
        update() {},
        destroy() {},
        loopFix() {},
        slideToLoop(i) {
          this.activeIndex = this.realIndex = i;
          params.on.slideChange();
        },
        slideTo(i) {
          this.slideToLoop(i);
        },
      };
      sw.slides.forEach((slide, i) => {
        slide.dataset.swiperSlideIndex = i;
      });
      return sw;
    },
  };
  Object.defineProperty(d, 'currentScript', {
    value: { src: 'https://example.test/tdb-logo-marquee.js' },
  });
  w.eval(fs.readFileSync('src/logo-marquee/logo-marquee.js', 'utf8'));
  w.TDBLogoMarquee.start();
  await tick();
  const track = d.querySelector('.partner-featured_component'),
    logos = [...track.querySelectorAll('.tdb-partner-logo')];
  const shell = d.querySelector('.tdb-partner-tooltip'),
    spotlight = d.querySelector('.tdb-partner-spotlight');
  const status = () => w.TDBLogoMarquee.status().instances[0];
  function pointer(type, x = 100, target = track) {
    const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 400 });
    Object.defineProperties(e, {
      pointerId: { value: 1 },
      pointerType: { value: 'mouse' },
      isPrimary: { value: true },
    });
    target.dispatchEvent(e);
  }
  return {
    w,
    d,
    track,
    logos,
    shell,
    spotlight,
    animations,
    status,
    pointer,
    decode: () => decode?.(),
    click: (node) =>
      node.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })),
    close() {
      w.TDBLogoMarquee.destroy();
      w.close();
    },
  };
}

test('close then immediate drag restores the moving logo before the track moves', async () => {
  const f = await fixture();
  try {
    f.click(f.logos[0]);
    await tick();
    assert.equal(f.spotlight.style.display, 'block');
    f.click(f.d.querySelector('#outside'));
    assert.equal(f.shell.getAttribute('aria-hidden'), 'true');
    f.pointer('pointerdown', 100, f.logos[0]);
    f.pointer('pointermove', 150);
    assert.equal(f.spotlight.style.display, '', 'no stationary spotlight during close-and-drag');
    assert.equal(f.logos[0].querySelector('img').style.visibility, '', 'original logo restored');
    f.pointer('pointerup', 150);
    for (const animation of f.animations) animation.finish();
    await tick();
    assert.equal(f.shell.style.display, '');
    assert.equal(f.status().selected, null);
  } finally {
    f.close();
  }
});

test('rapid close then another selection remains paused after stale transitions finish', async () => {
  const f = await fixture();
  try {
    f.click(f.logos[0]);
    await tick();
    f.click(f.d.querySelector('#outside'));
    f.click(f.logos[1]);
    await tick();
    for (const animation of f.animations) animation.finish();
    await tick();
    assert.equal(f.shell.getAttribute('aria-hidden'), 'false');
    assert.equal(f.status().paused, true, 'old close callback cannot restart a newly opened card');
    assert.equal(f.status().selected, '1');
  } finally {
    f.close();
  }
});

test('a delayed card request cannot open after the user grabs and drags the marquee', async () => {
  const f = await fixture({ delayed: true });
  try {
    f.click(f.logos[0]);
    await tick();
    assert.equal(f.logos[0].getAttribute('aria-busy'), 'true');
    f.pointer('pointerdown', 100, f.logos[1]);
    f.pointer('pointermove', 160);
    f.pointer('pointerup', 160);
    f.decode();
    await tick();
    await tick();
    assert.notEqual(f.shell.getAttribute('aria-hidden'), 'false');
    assert.equal(f.spotlight.style.display, '');
    assert.equal(f.logos[0].hasAttribute('aria-busy'), false);
  } finally {
    f.close();
  }
});
