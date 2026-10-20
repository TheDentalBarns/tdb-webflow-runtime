const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/components/hold-audio.js', 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ empty = false, fail = false } = {}) {
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
    context: 0,
    resume: 0,
    decode: 0,
    close: 0,
    voices: [],
    animations: [],
  };
  const downloads = [];
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
    constructor() {
      calls.context++;
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
          linearRampToValueAtTime: (value, when) => ramps.push([value, when]),
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
        start() {
          this.started++;
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
  w.eval(source + '\nprepareHoldAudio();');
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
    down(i = 0, id = 1) {
      event(buttons[i], 'pointerdown', { button: 0, isPrimary: true, pointerId: id });
    },
    up(i = 0, id = 1) {
      event(buttons[i], 'pointerup', { pointerId: id });
    },
    online() {
      fail = false;
    },
    cleanup() {
      w.TDBHoldAudio?.destroy();
      w.close();
    },
  };
}

test('definition and setup fetch nothing; pages without native speakers have no owner', () => {
  const f = fixture();
  assert.equal(f.calls.fetch, 0);
  assert.equal(f.calls.context, 0);
  f.w.eval('prepareHoldAudio();');
  f.down();
  assert.equal(f.calls.fetch, 1, 'initializer is idempotent');
  assert.equal(f.calls.resume, 1, 'audio is unlocked synchronously in the gesture');
  f.cleanup();
  const empty = fixture({ empty: true });
  assert.equal(empty.w.TDBHoldAudio, undefined);
  empty.cleanup();
});

test('release during first download never starts delayed audio; next card reuses it', async () => {
  const f = fixture();
  f.down();
  assert.equal(f.buttons[0].getAttribute('aria-busy'), 'true');
  f.up();
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices.length, 0);
  assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
  assert.equal(f.buttons[0].hasAttribute('aria-busy'), false);
  f.down(1);
  await tick();
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.decode, 1);
  assert.equal(f.calls.voices[0].started, 1);
  assert.equal(f.calls.voices[0].loop, true);
  f.up(1);
  assert.deepEqual(f.calls.voices[0].gain.gain.ramps.at(-1), [0, 5.16]);
  assert.deepEqual(f.calls.voices[0].stopped, [5.18]);
  f.cleanup();
});

test('rapid card changes during download can only start the current card', async () => {
  const f = fixture();
  f.down(0);
  f.down(1, 2);
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.voices.length, 1);
  assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
  assert.equal(f.buttons[1].getAttribute('aria-pressed'), 'true');
  f.up(0, 1);
  assert.equal(f.w.TDBHoldAudio.status().playing, true, 'old release cannot stop current hold');
  f.down(2, 3);
  await tick();
  assert.deepEqual(f.calls.voices[0].stopped, [5], 'switch silences previous card');
  assert.equal(f.calls.voices[1].started, 1);
  f.cleanup();
});

test('keyboard hold works once, ignores repeats, releases on keyup and Escape', async () => {
  const f = fixture();
  f.event(f.buttons[0], 'keydown', { key: ' ', repeat: false });
  f.event(f.buttons[0], 'keydown', { key: ' ', repeat: true });
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices.length, 1);
  f.event(f.buttons[0], 'keyup', { key: ' ' });
  assert.equal(f.w.TDBHoldAudio.status().holding, false);
  f.event(f.buttons[1], 'keydown', { key: 'Enter', repeat: false });
  await tick();
  f.event(f.buttons[1], 'keydown', { key: 'Escape' });
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
  test(`${reason} cancels pending playback and restores the photo`, async () => {
    const f = fixture();
    f.down();
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
    assert.equal(f.w.document.querySelector('img').style.translate, '0 10px');
    assert.equal(f.w.document.querySelector('img').style.transform, 'rotate(0deg)');
    f.cleanup();
  });
}

test('failed fetch resets UI and retries on another deliberate hold', async () => {
  const f = fixture({ fail: true });
  f.down();
  f.downloads[0]();
  await tick();
  assert.equal(f.w.TDBHoldAudio.status().holding, false);
  assert.match(f.buttons[0].title, /unavailable/);
  f.online();
  f.down();
  f.downloads[1]();
  await tick();
  assert.equal(f.calls.fetch, 2);
  assert.equal(f.calls.voices[0].started, 1);
  f.cleanup();
});

test('destroy cancels animation/listeners and prevents late decode playback', async () => {
  const f = fixture();
  f.down();
  f.w.TDBHoldAudio.destroy();
  f.downloads[0]();
  await tick();
  f.down();
  assert.equal(f.calls.voices.length, 0);
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.close, 1);
  assert.ok(f.calls.animations.every((a) => a.cancelled));
  f.cleanup();
});
