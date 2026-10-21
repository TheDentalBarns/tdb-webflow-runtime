const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (path) => fs.readFileSync(path, 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Model the native nested layers, including CSS scale's effect on rectangles.
// Drive the real speaker, Home discovery and motion owner together: checking
// separate scale/translate properties alone misses their geometry feedback.
async function fixture(bundle = false, mount = true) {
  const dom = new JSDOM(
    '<body data-tdb-home-photo-parallax><section class="section_3-image-layout">' +
      Array.from(
        { length: 3 },
        () =>
          '<div class="aspect-ratio-portrait" data-tdb-audio-card data-tdb-audio-src="https://example.test/calm.mp3">' +
          '<div data-tdb-audio-image-clip><div data-tdb-audio-parallax style="scale:1.06">' +
          '<img style="scale:1"></div></div><button data-tdb-hold-audio></button></div>',
      ).join('') +
      '</section></body>',
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://dentalbarns.webflow.io/' },
  );
  const w = dom.window,
    queue = new Map(),
    animations = new Map();
  const cards = [...w.document.querySelectorAll('[data-tdb-audio-card]')];
  const photos = cards.map((node) => node.querySelector('img'));
  const layers = cards.map((node) => node.querySelector('[data-tdb-audio-parallax]'));
  const clips = cards.map((node) => node.querySelector('[data-tdb-audio-image-clip]'));
  let now = 0,
    next = 0,
    cardHeight = 450;
  w.innerHeight = 800;
  w.innerWidth = 390;
  Object.defineProperty(w.performance, 'now', { value: () => now });
  w.matchMedia = (query) => ({
    matches: query === '(pointer: coarse)',
    addEventListener() {},
    removeEventListener() {},
  });
  w.requestAnimationFrame = (fn) => {
    queue.set(++next, fn);
    return next;
  };
  w.cancelAnimationFrame = (id) => queue.delete(id);
  w.setTimeout = () => ++next;
  w.clearTimeout = () => {};
  w.fetch = () => new Promise(() => {});
  const audio = { resume: () => Promise.resolve() };
  const nativeStyle = w.getComputedStyle.bind(w);
  function eased(x, easing) {
    if (easing === 'linear') return x;
    const [a, b, c, d] = easing.match(/[\d.]+/g).map(Number);
    const cubic = (t, p, q) => 3 * (1 - t) ** 2 * t * p + 3 * (1 - t) * t * t * q + t ** 3;
    let low = 0,
      high = 1;
    for (let i = 0; i < 35; i++) {
      const t = (low + high) / 2;
      if (cubic(t, a, c) < x) low = t;
      else high = t;
    }
    return cubic((low + high) / 2, b, d);
  }
  function scale(node) {
    const animation = animations.get(node);
    if (!animation) return parseFloat(node.style.scale) || 1;
    const progress = Math.min(1, (now - animation.start) / animation.options.duration);
    const from = Number(animation.frames[0].scale),
      to = Number(animation.frames[1].scale);
    return from + (to - from) * eased(progress, animation.options.easing);
  }
  w.getComputedStyle = (node) => {
    const style = nativeStyle(node);
    return new Proxy(style, {
      get: (target, key) => (key === 'scale' ? String(scale(node)) : Reflect.get(target, key)),
    });
  };
  w.Element.prototype.animate = function (frames, options) {
    let finish, reject;
    const node = this;
    const animation = {
      frames,
      options,
      start: now,
      finished: new Promise((resolve, fail) => {
        finish = resolve;
        reject = fail;
      }),
      finish,
      cancel() {
        if (animations.get(node) === animation) animations.delete(node);
        reject(new w.DOMException('Cancelled', 'AbortError'));
      },
    };
    animations.set(node, animation);
    return animation;
  };
  const y = (node) => parseFloat(node.style.translate.split(' ')[1]) || 0;
  const rect = (top, height) => ({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 315,
    width: 315,
  });
  cards.forEach((card, i) => {
    const top = () => 100 + i * (cardHeight + 25) - w.scrollY;
    card.getBoundingClientRect = clips[i].getBoundingClientRect = () => rect(top(), cardHeight);
    layers[i].getBoundingClientRect = () =>
      rect(top() - cardHeight * 0.03 + y(layers[i]), cardHeight * 1.06);
    photos[i].getBoundingClientRect = () => {
      const height = cardHeight * 1.06 * scale(photos[i]);
      return rect(top() + (cardHeight - height) / 2 + y(layers[i]) + y(photos[i]) * 1.06, height);
    };
  });
  w.eval(read(bundle ? 'dist/tdb-motion.js' : 'src/shared/motion.js'));
  w.eval(read(bundle ? 'dist/tdb-hold-audio.js' : 'src/components/hold-audio.js'));
  w.TDBModules = { load: () => Promise.resolve() };
  w.eval(
    "const TDBRuntimeModuleRoot = new URL('https://example.test/dist/');\n" +
      read('src/runtime/page-break-loader.js'),
  );
  const flush = () => {
    const callbacks = [...queue.values()];
    queue.clear();
    callbacks.forEach((fn) => fn());
  };
  async function start() {
    w.eval('preparePageBreakLoader()');
    await w.TDBPageBreaks.refresh();
    flush();
  }
  if (mount) await start();
  return {
    w,
    cards,
    photos,
    layers,
    clips,
    queue,
    animations,
    start,
    press(index = 0) {
      w.TDBHoldAudio.press(cards[index].querySelector('button'), { pointer: index + 1 }, audio);
    },
    release() {
      w.TDBHoldAudio.release();
    },
    async advance(ms) {
      now += ms;
      for (const animation of animations.values())
        if (now - animation.start >= animation.options.duration) animation.finish();
      await tick();
    },
    scroll(position, user = true) {
      if (user) w.dispatchEvent(new w.Event('touchmove'));
      w.scrollY = position;
      w.dispatchEvent(new w.Event('scroll'));
      flush();
      return [...w.TDBPageBreaks.status()].map((state) => state.y);
    },
    async refresh() {
      await w.TDBPageBreaks.refresh();
      flush();
    },
    resize(height, width, view) {
      cardHeight = height;
      w.innerWidth = width;
      w.innerHeight = view;
      w.dispatchEvent(new w.Event('resize'));
      flush();
    },
    event(name) {
      w.dispatchEvent(new w.Event(name));
      flush();
    },
    covered() {
      photos.forEach((photo, i) => {
        const image = photo.getBoundingClientRect(),
          crop = clips[i].getBoundingClientRect();
        assert.ok(
          image.top <= crop.top + 0.0002 && image.bottom >= crop.bottom - 0.0002,
          'photo covers its crop',
        );
      });
    },
    close() {
      w.TDBHoldAudio.destroy();
      w.TDBPageBreaks?.destroy();
      dom.window.close();
    },
  };
}

for (const bundle of [false, true]) {
  const label = bundle ? 'bundle' : 'source';
  test(`${label}: scrolling through speaker release matches a non-zooming trio at 30fps and 60fps`, async () => {
    for (const hz of [30, 60]) {
      const active = await fixture(bundle),
        control = await fixture(bundle);
      try {
        for (const f of [active, control]) for (let y = 20; y <= 100; y += 20) f.scroll(y);
        active.press();
        await active.advance(5000);
        active.release();
        for (let i = 0; i <= 1.2 * hz; i++) {
          await active.advance(1000 / hz);
          assert.deepEqual(
            active.scroll(104 + i * 4),
            control.scroll(104 + i * 4),
            'zoom cannot interrupt scroll progress',
          );
          active.covered();
        }
        assert.ok(active.layers.some((node) => node.style.translate));
        assert.ok(
          active.photos.every((node) => node.style.translate === ''),
          'parallax never writes to a zooming photo',
        );
        assert.equal(active.queue.size, 0);
      } finally {
        active.close();
        control.close();
      }
    }
  });

  test(`${label}: finishing an offscreen zoom leaves a safe crop without an extra frame`, async () => {
    const f = await fixture(bundle);
    try {
      const relativeScale = () =>
        f.photos[0].getBoundingClientRect().height / f.clips[0].getBoundingClientRect().height;
      assert.ok(Math.abs(relativeScale() - 1.06) < 0.00001, 'same native resting crop');
      f.press();
      await f.advance(10000);
      assert.ok(Math.abs(relativeScale() - 1.1236) < 0.00001, 'same full held zoom');
      f.scroll(700);
      f.release();
      const before = f.layers[0].style.translate;
      await f.advance(1200);
      assert.ok(Math.abs(relativeScale() - 1.06) < 0.00001, 'same completed return');
      assert.equal(f.queue.size, 0, 'no trailing frame loop');
      assert.equal(f.layers[0].style.translate, before);
      f.covered();
      f.scroll(100);
      f.covered();
    } finally {
      f.close();
    }
  });

  test(`${label}: refresh, orientation and re-press preserve position while detecting real geometry changes`, async () => {
    const f = await fixture(bundle),
      control = await fixture(bundle);
    try {
      for (const e of [f, control]) {
        e.scroll(50);
        e.scroll(100);
      }
      f.press();
      await f.advance(5000);
      f.release();
      await f.advance(200);
      f.press();
      const before = f.layers.map((node) => node.style.translate);
      await f.refresh();
      await control.refresh();
      assert.deepEqual(
        f.layers.map((node) => node.style.translate),
        before,
      );
      for (const e of [f, control]) e.resize(300, 844, 390);
      assert.deepEqual(f.scroll(140), control.scroll(140));
      f.covered();
      // BFCache/pageshow and browser scroll restoration still use the same owner.
      for (const e of [f, control]) {
        e.event('pagehide');
        e.event('pageshow');
      }
      assert.deepEqual(f.scroll(200, false), control.scroll(200, false));
      assert.deepEqual(f.scroll(220), control.scroll(220));
      f.covered();
      f.w.TDBPageBreaks.destroy();
      assert.ok(f.layers.every((node) => node.style.translate === ''));
      assert.ok(f.photos.every((node) => node.style.translate === ''));
      assert.equal(f.queue.size, 0);
    } finally {
      f.close();
      control.close();
    }
  });

  test(`${label}: parallax can mount during an already-held speaker without adopting its zoom`, async () => {
    const f = await fixture(bundle, false),
      control = await fixture(bundle, false);
    try {
      f.press();
      await f.advance(5000);
      await f.start();
      await control.start();
      assert.deepEqual(f.scroll(100), control.scroll(100));
      f.release();
      await f.advance(100);
      assert.deepEqual(f.scroll(140), control.scroll(140));
      f.covered();
    } finally {
      f.close();
      control.close();
    }
  });
}
