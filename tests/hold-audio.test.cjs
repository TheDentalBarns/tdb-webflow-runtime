const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/components/hold-audio.js', 'utf8');
const loader = fs.readFileSync('src/loaders/hold-audio-loader.js', 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fixture({ empty = false, fail = false, cold = false } = {}) {
  const dom = new JSDOM(
    empty
      ? ''
      : Array.from(
          { length: 3 },
          () =>
            '<div data-tdb-audio-card data-tdb-audio-src="https://cdn.example.test/calm.mp3">' +
            '<img style="scale:1.06;translate:0 10px;transform:rotate(0deg)">' +
            '<button data-tdb-hold-audio type="button" aria-pressed="false"></button></div>',
        ).join(''),
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window;
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
    const animation = {
      frames,
      options,
      cancelled: false,
      finished: new Promise(() => {}),
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
