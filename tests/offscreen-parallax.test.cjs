const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture(
  code,
  { offscreen, mobile = false, frame = false, allowEdges = false, changing = false } = {},
) {
  const dom = new JSDOM(
    '<section><div class="crop"><img class="photo" style="transform:translateX(30%)"></div></section>',
    {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    },
  );
  const w = dom.window,
    queue = new Map(),
    observers = [],
    reads = { image: 0, wrapper: 0 };
  const metrics = { top: 500, height: 600, imageHeight: 660, inset: -30 };
  let sequence = 0,
    time = 0,
    hidden = false,
    fontsReady;
  w.innerHeight = 900;
  w.innerWidth = mobile ? 390 : 1280;
  w.performance.now = () => time;
  w.matchMedia = () => ({ matches: mobile, addEventListener() {}, removeEventListener() {} });
  Object.defineProperty(w.document, 'hidden', { get: () => hidden });
  Object.defineProperty(w.document, 'fonts', {
    value: {
      ready: new Promise((resolve) => {
        fontsReady = resolve;
      }),
    },
  });
  w.requestAnimationFrame = (callback) => {
    queue.set(++sequence, callback);
    return sequence;
  };
  w.cancelAnimationFrame = (id) => queue.delete(id);
  w.ResizeObserver = class {
    constructor(callback) {
      observers.push(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const wrapper = w.document.querySelector('section'),
    image = wrapper.querySelector('img');
  if (changing) image.setAttribute('data-tdb-bounds-changing', '');
  const rect = (top, height) => ({
    top,
    bottom: top + height,
    height,
    width: 400,
    left: 0,
    right: 400,
  });
  wrapper.getBoundingClientRect = () => {
    reads.wrapper++;
    return rect(metrics.top - w.scrollY, metrics.height);
  };
  wrapper.querySelector('.crop').getBoundingClientRect = () =>
    rect(metrics.top - w.scrollY, metrics.height);
  const prepare = (node) => {
    node.getBoundingClientRect = () => {
      reads.image++;
      return rect(
        metrics.top -
          w.scrollY +
          metrics.inset +
          (parseFloat(node.style.translate.split(' ')[1]) || 0),
        metrics.imageHeight,
      );
    };
  };
  prepare(image);
  const input = {
    wrapper,
    selector: '.photo',
    offscreen,
    frame: frame ? '.crop' : null,
    allowEdges,
  };
  w.eval(code);
  const owner = w.TDBMotion.pageBreaks([input]);
  const flush = () => {
    const jobs = [...queue.values()];
    queue.clear();
    jobs.forEach((job) => job(time));
  };
  const event = (name) => {
    w.dispatchEvent(new w.Event(name));
    flush();
  };
  return {
    w,
    wrapper,
    image,
    owner,
    input,
    metrics,
    reads,
    queue,
    prepare,
    flush,
    scroll(y, user = true) {
      time += user ? 16 : 3000;
      if (user) w.dispatchEvent(new w.Event('wheel'));
      w.scrollY = y;
      event('scroll');
    },
    event,
    refresh() {
      owner.refresh();
      flush();
    },
    resizeObserved() {
      observers.forEach((callback) => callback([]));
      flush();
    },
    async fonts() {
      fontsReady();
      await tick();
      flush();
    },
    bounds(active) {
      image.toggleAttribute('data-tdb-bounds-changing', active);
      image.dispatchEvent(new w.CustomEvent('tdb:boundschange', { bubbles: true }));
    },
    visibility(value) {
      hidden = value;
      w.document.dispatchEvent(new w.Event('visibilitychange'));
      flush();
    },
    capture() {
      return JSON.parse(
        JSON.stringify({
          status: owner.status(),
          styles: [...wrapper.querySelectorAll('.photo')].map((node) => node.style.cssText),
        }),
      );
    },
    close() {
      owner.destroy();
      w.close();
    },
  };
}

for (const [label, code] of [
  ['source', fs.readFileSync('src/shared/motion.js', 'utf8')],
  ['bundle', fs.readFileSync('dist/tdb-motion.js', 'utf8')],
]) {
  test(`${label}: settled offscreen photos skip image reads but retain status and immediately catch fast jumps`, async () => {
    const full = fixture(code, { offscreen: false }),
      gated = fixture(code, { offscreen: true });
    await tick();
    full.flush();
    gated.flush();
    for (const y of [700, 4000, 4200, 700, 0, 6000, 700]) {
      full.reads.image = gated.reads.image = 0;
      full.scroll(y);
      gated.scroll(y);
      assert.deepEqual(gated.capture(), full.capture());
      if (y === 4200) {
        assert.equal(full.reads.image, 1);
        assert.equal(gated.reads.image, 0);
      }
      assert.equal(gated.queue.size, 0, 'no trailing or perpetual frame');
    }
    full.close();
    gated.close();
  });

  for (const mobile of [false, true]) {
    test(`${label}: lifecycle and notified layout changes preserve full measurement (${mobile ? 'coarse' : 'fine'} pointer)`, async () => {
      const traces = [];
      for (const offscreen of [false, true]) {
        const e = fixture(code, { offscreen, mobile }),
          trace = [];
        await tick();
        e.flush();
        const capture = () => trace.push(e.capture());
        for (let y = 0; y <= 4500; y += 50) {
          e.scroll(y);
          capture();
        }
        for (let y = 4450; y >= 0; y -= 50) {
          e.scroll(y);
          capture();
        }
        e.scroll(4000);
        e.scroll(4200);
        e.metrics.inset = -5;
        e.bounds(false);
        assert.equal(e.queue.size, 0, 'a notification alone adds no idle work');
        e.scroll(4400);
        capture();
        e.scroll(700);
        capture();
        e.scroll(4000);
        e.metrics.imageHeight = 690;
        e.resizeObserved();
        capture();
        e.metrics.top += 37;
        e.scroll(4200);
        capture();
        e.scroll(700);
        capture();
        e.scroll(4000);
        e.w.innerHeight = 700;
        e.event('resize');
        capture();
        e.scroll(700);
        capture();
        e.event('pagehide');
        e.w.scrollY = 4000;
        e.event('pageshow');
        capture();
        e.scroll(700, false);
        capture();
        e.scroll(720);
        capture();
        e.scroll(4000);
        e.visibility(true);
        e.metrics.inset = -15;
        e.scroll(4200);
        e.visibility(false);
        capture();
        e.scroll(700);
        capture();
        e.scroll(4000);
        e.metrics.imageHeight = 650;
        e.event('load');
        capture();
        e.metrics.top += 80;
        await e.fonts();
        capture();
        const clone = e.image.cloneNode(),
          originalTranslation = clone.style.translate;
        e.prepare(clone);
        e.image.parentElement.append(clone);
        e.refresh();
        capture();
        e.scroll(700);
        capture();
        e.image.remove();
        e.refresh();
        capture();
        assert.equal(e.image.style.translate, '', 'detached target is restored');
        e.close();
        assert.equal(
          clone.style.translate,
          originalTranslation,
          'ordinary cloned target restores its incoming inline translation',
        );
        traces.push(trace);
      }
      assert.deepEqual(traces[1], traces[0]);
    });
  }

  test(`${label}: changing bounds are protected even when animation started before motion loaded`, async () => {
    const e = fixture(code, { offscreen: true, changing: true });
    await tick();
    e.flush();
    e.scroll(4000);
    e.reads.image = 0;
    e.metrics.imageHeight = 700;
    e.scroll(4200);
    assert.equal(e.reads.image, 1, 'active bounds are remeasured');
    e.bounds(false);
    e.reads.image = 0;
    e.scroll(4400);
    assert.equal(e.reads.image, 1, 'completion gets one final measurement');
    e.reads.image = 0;
    e.scroll(4600);
    assert.equal(e.reads.image, 0, 'stable offscreen bounds can sleep again');
    e.close();
  });

  test(`${label}: shared owners retain protection until final teardown`, async () => {
    const e = fixture(code, { offscreen: true });
    await tick();
    e.flush();
    const shared = e.w.TDBMotion.pageBreaks([e.input]);
    e.scroll(4000);
    e.scroll(4200);
    e.owner.destroy();
    e.bounds(true);
    e.metrics.imageHeight = 690;
    e.reads.image = 0;
    e.scroll(4400);
    assert.equal(e.reads.image, 1);
    shared.refresh();
    e.flush();
    shared.destroy();
    shared.destroy();
    assert.equal(e.image.style.translate, '');
    e.bounds(false);
    e.scroll(4600);
    assert.equal(e.queue.size, 0);
    assert.equal(e.image.style.translate, '');
    e.close();
  });

  test(`${label}: sticky crop frames and overflow remain on the full measurement path`, async () => {
    for (const options of [{ frame: true }, { allowEdges: true }]) {
      const e = fixture(code, { offscreen: true, ...options });
      await tick();
      e.flush();
      e.scroll(4000);
      e.reads.image = 0;
      e.scroll(4200);
      assert.equal(e.reads.image, 1);
      e.close();
    }
  });
}
