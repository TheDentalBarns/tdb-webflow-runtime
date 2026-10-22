const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const entry = fs.readFileSync('dist/tdb-start.min.js', 'utf8');
const base =
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@' + 'c'.repeat(40) + '/dist/';
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture({ fonts = true, raf = true, readyState = 'loading', speaker = false } = {}) {
  const dom = new JSDOM(
    '<html><head></head><body>' +
      (speaker ? '<div data-tdb-audio-card><button data-tdb-hold-audio></button></div>' : '') +
      '</body></html>',
    {
      url: 'https://dentalbarns.webflow.io/any-page',
      runScripts: 'outside-only',
    },
  );
  const w = dom.window,
    d = w.document,
    timers = [],
    frames = [];
  const script = d.createElement('script');
  script.src = base + 'tdb-start.min.js';
  script.dataset.tdbAssetPins = JSON.stringify({ 'tdb-motion.js': 'a'.repeat(40) });
  Object.defineProperty(d, 'currentScript', { value: script });
  Object.defineProperty(d, 'readyState', { value: readyState, configurable: true });
  let settle, reject;
  if (fonts)
    Object.defineProperty(d, 'fonts', {
      value: {
        ready: new Promise((a, b) => {
          settle = a;
          reject = b;
        }),
      },
    });
  w.setTimeout = (fn, ms) => {
    timers.push({ fn, ms });
    return timers.length;
  };
  w.clearTimeout = () => {};
  if (raf) w.requestAnimationFrame = (fn) => frames.push(fn);
  w.eval(entry);
  return { w, d, timers, frames, settle, reject, close: () => w.close(), run: () => w.eval(entry) };
}
test('single entry fetches one foundation at DOM ready while font readiness remains pending', async () => {
  const f = fixture();
  try {
    assert.equal(f.d.scripts.length, 0);
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    assert.equal(f.d.scripts.length, 1);
    assert.equal(f.frames.length, 0);
    assert.equal(
      f.timers.some((timer) => timer.ms === 50),
      false,
    );
    assert.equal(f.d.scripts[0].src, base + 'tdb-foundation.js');
    assert.equal(f.w.TDBRelease.commit, 'c'.repeat(40));
    assert.equal(
      f.w.TDBModules.resolve(base.replace('c'.repeat(40), 'old') + 'tdb-motion.js'),
      base + 'tdb-motion.js',
    );
    f.run();
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    await tick();
    assert.equal(f.d.scripts.length, 1);
    f.w.TDBConsent = {};
    f.w.TDBNavbarState = {};
    f.d.scripts[0].dispatchEvent(new f.w.Event('load'));
    assert.equal(await f.w.TDBStart.ready, true);
    assert.equal(f.w.TDBStart.status().state, 'ready');
    assert.equal(f.d.body.getAttribute('data-wf-scroll-motion'), 'none');
    assert.equal(f.w.TDBMotionPolicy.reduced.matches, false);
  } finally {
    f.close();
  }
});
for (const readyState of ['interactive', 'complete'])
  test('already parsed DOM starts foundation immediately: ' + readyState, async () => {
    const f = fixture({ readyState });
    try {
      assert.equal(f.d.scripts.length, 1);
      assert.equal(f.frames.length, 0);
      f.settle();
      await tick();
      f.run();
      f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
      assert.equal(f.d.scripts.length, 1);
      assert.equal(
        f.timers.some((timer) => timer.ms === 50),
        false,
      );
    } finally {
      f.close();
    }
  });
test('missing font and frame APIs do not delay foundation', () => {
  const f = fixture({ fonts: false, raf: false, readyState: 'interactive' });
  try {
    assert.equal(f.d.scripts.length, 1);
  } finally {
    f.close();
  }
});

test('entry captures the original held press while foundation and runtime are pending', async () => {
  const f = fixture({ speaker: true });
  Object.defineProperty(f.d, 'hidden', { value: false });
  let resumes = 0;
  f.w.AudioContext = class {
    state = 'running';
    resume() {
      resumes++;
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
  };
  try {
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    const button = f.d.querySelector('button');
    const press = new f.w.Event('pointerdown', { bubbles: true });
    Object.assign(press, { button: 0, isPrimary: true, pointerId: 1 });
    button.dispatchEvent(press);
    await tick();
    assert.equal(resumes, 1);
    assert.equal(button.getAttribute('data-tdb-loading'), 'true');
    assert.equal(f.d.scripts.length, 1, 'no controller before runtime activation');
    assert.equal(f.d.scripts[0].src, base + 'tdb-foundation.js');
    f.w.TDBHoldAudioLoader.start();
    await tick();
    const controller = [...f.d.scripts].find((script) => script.src === base + 'tdb-hold-audio.js');
    assert.ok(controller);
    let received;
    f.w.TDBHoldAudio = {
      press(...args) {
        received = args;
      },
      release() {},
      destroy() {},
    };
    controller.dispatchEvent(new f.w.Event('load'));
    await tick();
    assert.equal(received[0], button);
    assert.equal(received[1].pointer, 1);
    assert.equal(await received[3], undefined, 'same successful gesture resume is handed over');
  } finally {
    f.w.TDBHoldAudioLoader?.destroy();
    f.close();
  }
});

test('built entry retries audio unlock on touch release and bounds a blocked runtime wait', async () => {
  const f = fixture({ speaker: true });
  let resumes = 0;
  f.w.AudioContext = class {
    state = 'suspended';
    resume() {
      resumes++;
      return new Promise(() => {});
    }
    close() {
      return Promise.resolve();
    }
  };
  try {
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    const button = f.d.querySelector('button');
    const event = (type) => {
      const e = new f.w.Event(type, { bubbles: true });
      Object.assign(e, { button: 0, isPrimary: true, pointerId: 1, pointerType: 'touch' });
      button.dispatchEvent(e);
    };
    event('pointerdown');
    await tick();
    assert.equal(resumes, 1);
    const deadline = f.timers.find((timer) => timer.ms === 30000);
    assert.ok(deadline);
    deadline.fn();
    assert.equal(button.hasAttribute('data-tdb-loading'), false);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    event('pointerup');
    assert.equal(resumes, 2, 'the release is a valid unlock opportunity even after a timeout');
    assert.equal(f.d.scripts.length, 1, 'unlock makes no extra module or audio request');
  } finally {
    f.w.TDBHoldAudioLoader?.destroy();
    f.close();
  }
});
