const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function fixture({ delayed = false, reduced = false, source } = {}) {
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
  w.TDBMotion.reduced.matches = reduced;
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
  w.eval(source || fs.readFileSync('src/logo-marquee/logo-marquee.js', 'utf8'));
  w.TDBLogoMarquee.start();
  await tick();
  const track = d.querySelector('.partner-featured_component'),
    logos = [...track.querySelectorAll('.tdb-partner-logo')];
  const shell = d.querySelector('.tdb-partner-tooltip'),
    spotlight = d.querySelector('.tdb-partner-spotlight');
  const status = () => w.TDBLogoMarquee.status().instances[0];
  let writes = 0;
  const transform = Object.getOwnPropertyDescriptor(w.CSSStyleDeclaration.prototype, 'transform');
  Object.defineProperty(track.style, 'transform', {
    get() {
      return transform.get.call(this);
    },
    set(value) {
      writes++;
      transform.set.call(this, value);
    },
  });
  function pointer(type, x = 100, target = track, options = {}) {
    const e = new w.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: options.y ?? 400,
    });
    Object.defineProperties(e, {
      pointerId: { value: 1 },
      pointerType: { value: options.pointerType || 'mouse' },
      isPrimary: { value: true },
      ...(options.time === undefined ? {} : { timeStamp: { value: options.time } }),
    });
    target.dispatchEvent(e);
    return e;
  }
  function frame(now = w.performance.now() + 16) {
    const pending = [...frames.entries()];
    for (const [id, callback] of pending) {
      if (!frames.delete(id)) continue;
      callback(now);
    }
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
    frame,
    writes: () => writes,
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

test('drag bursts render once per frame and retain the latest position without idle writes', async () => {
  const f = await fixture();
  try {
    f.frame();
    f.frame();
    f.pointer('pointerdown', 100, f.logos[0]);
    const before = f.status().currentX,
      writes = f.writes();
    for (const x of [120, 150, 140, 190]) f.pointer('pointermove', x);
    assert.equal(f.writes(), writes, 'input events defer visual writes');
    assert.equal(f.status().currentX, before + 90, 'all deltas, including reversals, retained');
    f.frame();
    assert.equal(f.writes(), writes + 1);
    const rendered = f.track.style.transform;
    f.frame();
    assert.equal(f.writes(), writes + 1, 'stationary finger needs no further frame');
    assert.equal(f.track.style.transform, rendered);
  } finally {
    f.close();
  }
});

test('release between frames flushes once and preserves the sampled throw velocity', async () => {
  const f = await fixture();
  try {
    f.frame();
    f.frame();
    f.pointer('pointerdown', 100, f.logos[0], { time: 0 });
    const writes = f.writes();
    for (const [x, time] of [
      [110, 10],
      [140, 30],
      [180, 70],
    ])
      f.pointer('pointermove', x, f.track, { time });
    f.pointer('pointerup', 180, f.track, { time: 80 });
    assert.equal(f.writes(), writes + 1);
    assert.equal(f.status().momentum, (80 / 70) * 1000);
    assert.equal(f.status().coasting, true);
    f.frame();
    assert.equal(f.writes(), writes + 2, 'one coast callback, no stale drag callback');
  } finally {
    f.close();
  }
});

test('release after rendering does not repeat a drag write, including reduced motion', async () => {
  const f = await fixture({ reduced: true });
  try {
    f.frame();
    f.frame();
    f.pointer('pointerdown', 100, f.logos[0]);
    f.pointer('pointermove', 180);
    f.frame();
    const writes = f.writes();
    f.pointer('pointerup', 180);
    f.frame();
    assert.equal(f.writes(), writes);
    assert.equal(f.status().momentum, 0);
    assert.equal(f.status().coasting, false);
  } finally {
    f.close();
  }
});

test('card release measures the last rendered drag position before selecting the nearest logo', async () => {
  const f = await fixture();
  try {
    f.frame();
    f.frame();
    f.click(f.logos[0]);
    await tick();
    f.pointer('pointerdown', 100, f.logos[0]);
    const oldTransform = f.track.style.transform;
    f.pointer('pointermove', 190);
    const reads = [];
    const rect = f.w.Element.prototype.getBoundingClientRect;
    f.w.Element.prototype.getBoundingClientRect = function () {
      reads.push(f.track.style.transform);
      return rect.call(this);
    };
    f.pointer('pointerup', 190);
    assert.ok(reads.length > 0);
    assert.ok(
      reads.every((value) => value !== oldTransform),
      'selection never reads stale geometry',
    );
    assert.equal(f.shell.getAttribute('aria-hidden'), 'false');
    assert.equal(f.status().paused, true);
  } finally {
    f.close();
  }
});

test('Safari child capture handoff keeps dragging, while track cancellation flushes without a throw', async () => {
  const f = await fixture();
  try {
    f.frame();
    f.frame();
    f.pointer('pointerdown', 100, f.logos[0], { pointerType: 'touch' });
    f.pointer('pointermove', 140);
    f.pointer('lostpointercapture', 140, f.logos[0]);
    assert.equal(f.status().dragging, true);
    f.pointer('pointermove', 180);
    const position = f.status().currentX,
      writes = f.writes();
    f.pointer('pointercancel', 180);
    assert.equal(f.writes(), writes + 1);
    assert.equal(f.status().currentX, position);
    assert.equal(f.status().dragging, false);
    assert.equal(f.status().momentum, 0);
  } finally {
    f.close();
  }
});

test('vertical gestures remain native and never queue horizontal drag writes', async () => {
  const f = await fixture();
  try {
    f.frame();
    f.frame();
    f.pointer('pointerdown', 100, f.logos[0], { pointerType: 'touch' });
    const writes = f.writes();
    const event = f.pointer('pointermove', 103, f.track, { y: 440, pointerType: 'touch' });
    assert.equal(event.defaultPrevented, false);
    assert.equal(f.status().dragging, false);
    assert.equal(f.writes(), writes);
  } finally {
    f.close();
  }
});

test('destroy cancels an unrendered drag and restores the native track', async () => {
  const f = await fixture();
  try {
    f.frame();
    f.frame();
    f.pointer('pointerdown', 100, f.logos[0]);
    f.pointer('pointermove', 180);
    f.w.TDBLogoMarquee.destroy();
    const writes = f.writes();
    f.frame();
    assert.equal(f.writes(), writes);
    assert.equal(f.track.style.transform, '');
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
