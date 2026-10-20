const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/components/hold-audio.js', 'utf8');
const loader = fs.readFileSync('src/loaders/hold-audio-loader.js', 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const words = 'HOLD.|BREATHE.|RELAX.|UNWIND.|PEACEFUL.|CALM.|STILL.|REST.|EASE.'.split('|');

function fixture({ empty = false, fail = false, cold = false } = {}) {
  const dom = new JSDOM(
    empty
      ? ''
      : `<main data-tdb-audio-word-sequence="${words.join('|')}">` +
        Array.from(
          { length: 3 },
          () =>
            '<div data-tdb-audio-card data-tdb-audio-src="https://cdn.example.test/calm.mp3">' +
            '<img style="scale:1.06;translate:0 10px;transform:rotate(0deg)">' +
            '<div data-tdb-audio-words style="opacity:0">HOLD.</div>' +
            '<button data-tdb-hold-audio type="button" aria-pressed="false"></button></div>',
        ).join('') +
        '</main>',
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window;
  let now = 0;
  w.performance.now = () => now;
  const calls = {
    fetch: 0,
    module: 0,
    context: 0,
    resume: 0,
    decode: 0,
    close: 0,
    voices: [],
    animations: [],
  };
  const downloads = [];
  let intersect, finishModule;
  w.IntersectionObserver = class {
    constructor(cb, options) {
      intersect = cb;
      calls.margin = options.rootMargin;
    }
    observe() {}
    disconnect() {}
  };
  w.TDBRuntimeModuleRoot = 'https://cdn.example.test/dist/';
  w.TDBModules = {
    load(url) {
      calls.module++;
      calls.moduleUrl = url;
      return new Promise((resolve) => {
        finishModule = () => {
          w.eval(source);
          resolve();
        };
        if (!cold) finishModule();
      });
    },
  };
  w.fetch = () => {
    calls.fetch++;
    return new Promise((resolve, reject) =>
      downloads.push(() =>
        fail
          ? reject(Error('offline'))
          : resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
      ),
    );
  };
  w.AudioContext = class {
    currentTime = 5;
    destination = {};
    state = 'running';
    constructor() {
      calls.context++;
      calls.audioContext = this;
    }
    resume() {
      calls.resume++;
      return Promise.resolve();
    }
    decodeAudioData() {
      calls.decode++;
      return Promise.resolve({ duration: 20 });
    }
    close() {
      calls.close++;
      this.state = 'closed';
      return Promise.resolve();
    }
    createGain() {
      const ramps = [];
      return {
        connect() {},
        disconnect() {},
        gain: {
          value: 0.85,
          ramps,
          setValueAtTime() {},
          cancelAndHoldAtTime() {},
          setTargetAtTime: (value, when, timeConstant) => ramps.push([value, when, timeConstant]),
        },
      };
    }
    createBufferSource() {
      const v = {
        started: 0,
        stopped: [],
        connect(gain) {
          this.gain = gain;
        },
        disconnect() {},
        start(when, offset) {
          this.started++;
          this.offset = offset;
        },
        stop(at) {
          this.stopped.push(at);
        },
      };
      calls.voices.push(v);
      return v;
    }
  };
  w.Element.prototype.animate = function (frames, options) {
    let finish;
    const animation = {
      element: this,
      frames,
      options,
      cancelled: false,
      finished: new Promise((resolve) => {
        finish = resolve;
      }),
      finish() {
        finish();
      },
      cancel() {
        this.cancelled = true;
      },
    };
    calls.animations.push(animation);
    return animation;
  };
  w.eval(loader + '\nprepareHoldAudioLoader();');
  const buttons = [...w.document.querySelectorAll('button')];
  const event = (target, type, extra = {}) => {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, extra);
    target.dispatchEvent(e);
  };
  return {
    w,
    calls,
    buttons,
    wordElements: [...w.document.querySelectorAll('[data-tdb-audio-words]')],
    advance(ms) {
      now += ms;
    },
    downloads,
    event,
    near() {
      intersect([{ isIntersecting: true }]);
      return tick();
    },
    moduleReady() {
      finishModule();
      return tick();
    },
    down(i = 0, id = 1) {
      event(buttons[i], 'pointerdown', { button: 0, isPrimary: true, pointerId: id });
      return tick();
    },
    up(i = 0, id = 1) {
      event(buttons[i], 'pointerup', { pointerId: id });
    },
    online() {
      fail = false;
    },
    cleanup() {
      w.TDBHoldAudioLoader?.destroy();
      w.close();
    },
  };
}

test('proximity primes controller only; setup fetches neither code nor audio', async () => {
  const f = fixture();
  assert.equal(f.calls.fetch, 0);
  assert.equal(f.calls.module, 0);
  assert.equal(f.calls.context, 0);
  assert.equal(f.calls.margin, '600px 0px');
  f.w.eval('prepareHoldAudioLoader();');
  await f.near();
  await f.near();
  assert.equal(f.calls.module, 1);
  assert.equal(f.calls.fetch, 0);
  assert.equal(f.calls.context, 0);
  await f.down();
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.context, 1);
  f.cleanup();
  const empty = fixture({ empty: true });
  assert.equal(empty.w.TDBHoldAudioLoader, undefined);
  empty.cleanup();
});

test('cold module unlocks audio in the gesture; early release stays silent', async () => {
  const f = fixture({ cold: true });
  const pending = f.down();
  assert.equal(f.calls.resume, 1);
  await pending;
  f.up();
  await f.moduleReady();
  assert.equal(f.calls.fetch, 0);
  assert.equal(f.calls.voices.length, 0);
  assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
  await f.down();
  assert.equal(f.calls.fetch, 1);
  f.cleanup();
});

test('cold module plays when original press is held through its arrival', async () => {
  const f = fixture({ cold: true });
  await f.down();
  await f.moduleReady();
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices[0].started, 1);
  f.cleanup();
});

test('release during audio download stays silent; other cards reuse the buffer', async () => {
  const f = fixture();
  await f.down();
  f.up();
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices.length, 0);
  await f.down(1);
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.decode, 1);
  assert.equal(f.calls.voices[0].started, 1);
  f.up(1);
  assert.deepEqual(f.calls.voices[0].gain.gain.ramps.at(-1), [0, 5, 0.08]);
  assert.equal(f.calls.voices[0].stopped.length, 0, 'fade is not clipped on release');
  f.cleanup();
});

test('shared playhead includes fade tail and resumes on a different card', async () => {
  const f = fixture();
  await f.down();
  f.downloads[0]();
  await tick();
  f.calls.audioContext.currentTime = 8;
  f.up();
  f.calls.audioContext.currentTime = 8.6;
  await sleep(640);
  assert.equal(f.calls.voices[0].stopped.length, 1);
  assert.ok(Math.abs(f.w.TDBHoldAudio.status().positionSeconds - 3.6) < 0.001);
  f.calls.audioContext.currentTime = 40;
  await f.down(2);
  assert.ok(Math.abs(f.calls.voices[1].offset - 3.6) < 0.001);
  assert.equal(f.calls.fetch, 1);
  f.cleanup();
});

test('repress during fade continues same source and cancels pending stop', async () => {
  const f = fixture();
  await f.down();
  f.downloads[0]();
  await tick();
  f.calls.audioContext.currentTime = 8;
  f.up();
  f.calls.audioContext.currentTime = 8.2;
  await f.down(1);
  await sleep(640);
  assert.equal(f.calls.voices.length, 1);
  assert.equal(f.calls.voices[0].stopped.length, 0);
  assert.equal(f.w.TDBHoldAudio.status().playing, true);
  f.cleanup();
});

test('zoom advances linearly for ten seconds, independent of parallax', async () => {
  const f = fixture();
  await f.down();
  const animation = f.calls.animations.at(-1);
  assert.equal(animation.options.duration, 10000);
  assert.equal(animation.options.easing, 'linear');
  assert.ok(Math.abs(Number(animation.frames.at(-1).scale) - 1.1236) < 0.00001);
  f.up();
  assert.equal(f.calls.animations.at(-1).options.duration, 1200);
  assert.equal(f.calls.animations.at(-1).frames.at(-1).scale, '1.06');
  assert.equal(f.w.document.querySelector('img').style.translate, '0 10px');
  f.cleanup();
});

test('nine words continue across three cards, three per hold, then wrap', async () => {
  const f = fixture();
  const seen = [];
  for (let card = 0; card < 3; card++) {
    await f.down(card);
    for (let step = 0; step < 3; step++) {
      const animation = f.calls.animations.findLast((a) => a.element === f.wordElements[card]);
      seen.push(animation.element.textContent);
      assert.ok(Math.abs(animation.options.duration - 10000 / 3) < 0.001);
      assert.deepEqual(
        Array.from(animation.frames, (k) => k.opacity),
        [0, 1, 1, 0],
      );
      f.advance(10000 / 3);
      animation.finish();
      await tick();
      assert.equal(animation.cancelled, true, 'restores native hidden state after each word');
    }
    const count = f.calls.animations.length;
    f.advance(5000);
    await tick();
    assert.equal(f.calls.animations.length, count, 'holding longer does not start a fourth word');
    assert.equal(f.w.TDBHoldAudio.status().holding, true, 'audio/zoom hold remains active');
    f.up(card);
  }
  assert.deepEqual(seen, words);
  await f.down(1);
  assert.equal(f.wordElements[1].textContent, 'HOLD.');
  f.cleanup();
});

test('early release fades visible word and next card continues without stale advances', async () => {
  const f = fixture();
  await f.down();
  const word = f.wordElements[0];
  const first = f.calls.animations.find((a) => a.element === word);
  // JSDOM has no animation compositor; model the in-flight computed opacity.
  word.style.opacity = '.75';
  f.up();
  const fade = f.calls.animations.findLast((a) => a.element === word);
  assert.equal(first.cancelled, true);
  assert.equal(fade.options.duration, 400);
  assert.equal(fade.frames[0].opacity, '0.75');
  assert.equal(fade.frames[1].opacity, 0);
  await f.down(2);
  assert.equal(f.wordElements[2].textContent, 'BREATHE.');
  first.finish();
  fade.finish();
  await tick();
  assert.equal(f.wordElements[2].textContent, 'BREATHE.');
  assert.equal(fade.cancelled, true);
  f.cleanup();
});

test('delayed animation completion cannot extend words beyond the ten-second deadline', async () => {
  const f = fixture();
  await f.down();
  const first = f.calls.animations.find((a) => a.element === f.wordElements[0]);
  f.advance(9000);
  first.finish();
  await tick();
  const last = f.calls.animations.findLast((a) => a.element === f.wordElements[0]);
  assert.equal(last.options.duration, 1000);
  f.advance(1000);
  const count = f.calls.animations.length;
  last.finish();
  await tick();
  assert.equal(last.cancelled, true);
  assert.equal(f.calls.animations.length, count);
  f.cleanup();
});

test('repress cancels a fading word; destroy clears every animation', async () => {
  const f = fixture();
  await f.down();
  const word = f.wordElements[0];
  word.style.opacity = '.5';
  f.up();
  const fade = f.calls.animations.findLast((a) => a.element === word);
  await f.down();
  assert.equal(fade.cancelled, true);
  assert.equal(word.textContent, 'BREATHE.');
  fade.finish();
  await tick();
  assert.equal(word.textContent, 'BREATHE.');
  f.cleanup();
  assert.ok(f.calls.animations.every((a) => a.cancelled));
});

test('keyboard hold ignores repeats and releases on keyup', async () => {
  const f = fixture();
  f.event(f.buttons[0], 'keydown', { key: ' ', repeat: false });
  f.event(f.buttons[0], 'keydown', { key: ' ', repeat: true });
  await tick();
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices.length, 1);
  f.event(f.buttons[0], 'keyup', { key: ' ' });
  assert.equal(f.w.TDBHoldAudio.status().holding, false);
  f.cleanup();
});

for (const reason of [
  'pointercancel',
  'lostpointercapture',
  'outside',
  'blur',
  'pagehide',
  'hidden',
]) {
  test(`${reason} cancels pending playback and restores photo`, async () => {
    const f = fixture();
    await f.down();
    if (reason === 'hidden') {
      Object.defineProperty(f.w.document, 'hidden', { value: true });
      f.event(f.w.document, 'visibilitychange');
    } else if (reason === 'outside') {
      f.event(f.w, 'pointerup', { pointerId: 1 });
    } else {
      f.event(['blur', 'pagehide'].includes(reason) ? f.w : f.buttons[0], reason, { pointerId: 1 });
    }
    f.downloads[0]();
    await tick();
    assert.equal(f.calls.voices.length, 0);
    assert.equal(f.w.TDBHoldAudio.status().holding, false);
    assert.equal(f.calls.animations.at(-1).frames.at(-1).scale, '1.06');
    f.cleanup();
  });
}

test('failed fetch resets UI and retries on next hold', async () => {
  const f = fixture({ fail: true });
  await f.down();
  f.downloads[0]();
  await tick();
  assert.equal(f.w.TDBHoldAudio.status().holding, false);
  assert.match(f.buttons[0].title, /unavailable/);
  f.up();
  f.online();
  await f.down();
  f.downloads[1]();
  await tick();
  assert.equal(f.calls.fetch, 2);
  assert.equal(f.calls.voices[0].started, 1);
  f.cleanup();
});

test('destroy prevents late playback and closes shared context once', async () => {
  const f = fixture();
  await f.down();
  f.w.TDBHoldAudioLoader.destroy();
  f.downloads[0]();
  await tick();
  await f.down();
  assert.equal(f.calls.voices.length, 0);
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.close, 1);
  assert.ok(f.calls.animations.every((a) => a.cancelled));
  f.cleanup();
});
