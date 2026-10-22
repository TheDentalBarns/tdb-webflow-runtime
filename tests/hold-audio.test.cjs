const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/components/hold-audio.js', 'utf8');
const loader = fs.readFileSync('src/loaders/hold-audio-loader.js', 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fixture({
  empty = false,
  fail = false,
  cold = false,
  visual = false,
  clock = false,
  deferred = false,
  suspended = false,
  resumeNeedsGesture = false,
  resumeResolvesSuspended = false,
  startFails = false,
  delayedDecode = false,
  url = 'https://dentalbarns.webflow.io/',
  code = source,
} = {}) {
  const dom = new JSDOM(
    empty
      ? ''
      : Array.from(
          { length: 3 },
          () =>
            '<div data-tdb-audio-card data-tdb-audio-src="https://cdn.example.test/calm.mp3">' +
            '<img style="scale:1.06;translate:0 10px;transform:rotate(0deg)">' +
            '<button data-tdb-hold-audio type="button" aria-pressed="false"></button>' +
            (visual
              ? '<div data-tdb-audio-circle style="scale:0;opacity:0"></div>' +
                '<div data-tdb-audio-ripple-edge style="scale:0;opacity:0"></div>' +
                '<div data-tdb-audio-words="HOLD.|BREATHE.|RELAX.|UNWIND.|PEACEFUL.|CALM.|STILL.|REST.|EASE." style="opacity:0">HOLD.</div>'
              : '') +
            '</div>',
        ).join(''),
    { runScripts: 'outside-only', pretendToBeVisual: true, url },
  );
  const w = dom.window;
  let now = 0,
    timerId = 0;
  const timers = new Map();
  if (clock) {
    w.setTimeout = (fn, delay) => {
      timers.set(++timerId, { fn, at: now + delay });
      return timerId;
    };
    w.clearTimeout = (id) => timers.delete(id);
  }
  const calls = {
    fetch: 0,
    module: 0,
    context: 0,
    resume: 0,
    decode: 0,
    close: 0,
    voices: [],
    animations: [],
    playbackEvents: [],
  };
  const downloads = [];
  let intersect, finishModule, resumeAudio, decodeAudio;
  const audioReady = new Promise(
    (resolve) =>
      (resumeAudio = () => {
        calls.audioContext.state = 'running';
        calls.audioContext.dispatchEvent(new w.Event('statechange'));
        resolve();
      }),
  );
  const decoded = new Promise((resolve) => (decodeAudio = () => resolve({ duration: 20 })));
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
          w.eval(code);
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
  w.AudioContext = class extends w.EventTarget {
    currentTime = 5;
    destination = {};
    state = suspended || resumeNeedsGesture || resumeResolvesSuspended ? 'suspended' : 'running';
    constructor() {
      super();
      calls.context++;
      calls.audioContext = this;
    }
    resume() {
      calls.resume++;
      if (resumeNeedsGesture) {
        if (calls.resume > 1) resumeAudio();
        return audioReady;
      }
      return suspended ? audioReady : Promise.resolve();
    }
    decodeAudioData() {
      calls.decode++;
      return delayedDecode ? decoded : Promise.resolve({ duration: 20 });
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
          if (startFails) throw Error('Device failed during start');
          calls.playbackEvents.push('audio');
          this.started++;
          this.offset = offset;
        },
        stop(at) {
          if (startFails) throw new w.DOMException('Source was never started', 'InvalidStateError');
          this.stopped.push(at);
        },
      };
      calls.voices.push(v);
      return v;
    }
  };
  w.Element.prototype.animate = function (frames, options) {
    calls.playbackEvents.push('visual');
    let finish, reject;
    const animation = {
      element: this,
      frames,
      options,
      cancelled: false,
      finished: new Promise((resolve, fail) => {
        finish = resolve;
        reject = fail;
      }),
      finish() {
        finish();
      },
      cancel() {
        if (this.cancelled) return;
        this.cancelled = true;
        reject(new w.DOMException('Cancelled', 'AbortError'));
      },
    };
    calls.animations.push(animation);
    return animation;
  };
  w.eval(loader + `\nprepareHoldAudioLoader(${deferred});`);
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
    resumeAudio,
    decodeAudio,
    event,
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const next = [...timers]
          .filter(([, t]) => t.at <= until)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
      }
      now = until;
    },
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
    async play(i = 0, id = 1) {
      event(buttons[i], 'pointerdown', { button: 0, isPrimary: true, pointerId: id });
      await tick();
      downloads[0]();
      await tick();
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
  assert.equal(f.buttons[0].getAttribute('data-tdb-loading'), 'true');
  f.up();
  assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
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
  assert.equal(f.buttons[0].getAttribute('data-tdb-loading'), 'true');
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices[0].started, 1);
  assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
  f.cleanup();
});

test('a hold captured before runtime permission continues through activation and module loading', async () => {
  const f = fixture({ deferred: true, cold: true, visual: true });
  await f.down();
  assert.equal(f.calls.resume, 1, 'unlock starts in the original gesture');
  assert.equal(f.calls.module, 0, 'controller stays behind the runtime/consent gate');
  assert.equal(f.calls.fetch, 0);
  assert.equal(f.buttons[0].getAttribute('data-tdb-loading'), 'true');
  f.w.TDBHoldAudioLoader.start();
  f.w.TDBHoldAudioLoader.start();
  await tick();
  assert.equal(f.calls.module, 1);
  await f.moduleReady();
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.animations.length, 0, 'original held input waits for the sound');
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices[0].started, 1);
  assert.ok(f.calls.animations.length > 0, 'original held input starts visuals with playback');
  assert.equal(f.calls.resume, 1, 'handoff reuses the gesture resume promise');
  assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
  f.cleanup();
});

for (const ending of ['release', 'destroy']) {
  test(`a pre-runtime ${ending} cannot later start audio`, async () => {
    const f = fixture({ deferred: true, cold: true });
    await f.down();
    if (ending === 'destroy') f.w.TDBHoldAudioLoader.destroy();
    else f.up();
    f.w.TDBHoldAudioLoader.start();
    await tick();
    if (ending === 'release') await f.moduleReady();
    assert.equal(f.calls.fetch, 0);
    assert.equal(f.calls.voices.length, 0);
    assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
    f.cleanup();
  });
}

test('a pending audio resume allows downloading but delays all playback visuals', async () => {
  const f = fixture({ suspended: true, visual: true });
  await f.down();
  assert.equal(f.calls.fetch, 1);
  assert.equal(f.calls.animations.length, 0);
  f.downloads[0]();
  await tick();
  assert.equal(f.calls.voices.length, 0, 'audio still waits for browser permission');
  assert.equal(f.calls.animations.length, 0, 'visuals also wait for permission');
  assert.equal(f.buttons[0].getAttribute('data-tdb-loading'), 'true');
  f.resumeAudio();
  await tick();
  assert.equal(f.calls.voices[0].started, 1, 'the same held press continues');
  assert.ok(f.calls.animations.length > 0);
  assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
  f.cleanup();
});

test('release while audio resume is pending prevents delayed playback', async () => {
  const f = fixture({ suspended: true, visual: true });
  await f.down();
  f.downloads[0]();
  f.up();
  f.resumeAudio();
  await tick();
  assert.equal(f.calls.voices.length, 0);
  assert.equal(f.calls.animations.length, 0, 'release creates no animation for a pending hold');
  assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
  f.cleanup();
});

test('a native activation retries the suspended context and continues the same held input', async () => {
  const f = fixture({ cold: true, visual: true, resumeNeedsGesture: true });
  try {
    await f.down();
    await f.moduleReady();
    f.downloads[0]();
    await tick();
    assert.equal(f.calls.animations.length, 0);
    f.event(f.w, 'mousedown');
    await tick();
    assert.equal(f.calls.resume, 2);
    assert.equal(f.calls.voices[0].started, 1);
    assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
  } finally {
    f.cleanup();
  }
});

test('touch release unlocks silently; the next hold uses the prepared sound', async () => {
  const f = fixture({ visual: true, resumeNeedsGesture: true });
  try {
    await f.down();
    f.downloads[0]();
    await tick();
    f.up();
    await tick();
    assert.equal(f.calls.voices.length, 0, 'unlock does not turn release into playback');
    assert.equal(f.calls.animations.length, 0);
    await f.down();
    assert.equal(f.calls.voices[0].started, 1);
    assert.equal(f.calls.fetch, 1);
  } finally {
    f.cleanup();
  }
});

test('a stalled pre-runtime hold stops loading and cannot play after a late module arrival', async () => {
  const f = fixture({ cold: true, deferred: true, clock: true, visual: true });
  try {
    await f.down();
    f.advance(30000);
    assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
    assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
    assert.match(f.buttons[0].getAttribute('aria-description'), /try again/);
    f.w.TDBHoldAudioLoader.start();
    await tick();
    await f.moduleReady();
    assert.equal(f.calls.fetch, 0);
    assert.equal(f.calls.animations.length, 0);
  } finally {
    f.cleanup();
  }
});

test('successful playback clears its loading deadline instead of stopping a long hold', async () => {
  const f = fixture({ clock: true });
  try {
    await f.play();
    f.advance(31000);
    assert.equal(f.w.TDBHoldAudio.status().playing, true);
    assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'true');
  } finally {
    f.cleanup();
  }
});

for (const host of ['dentalbarns.webflow.io', 'www.thedentalbarns.com']) {
  test(`blur diagnostic is staging-only: ${host}`, async () => {
    const f = fixture({ visual: true, url: `https://${host}/?tdb-speaker-test=no-blur` });
    await f.play();
    const circle = f.w.document.querySelector('[data-tdb-audio-circle]');
    const edge = f.w.document.querySelector('[data-tdb-audio-ripple-edge]');
    assert.equal(
      f.calls.animations.some((a) => a.element === circle),
      host !== 'dentalbarns.webflow.io',
    );
    assert.ok(
      f.calls.animations.some((a) => a.element === edge),
      'outline remains in both modes',
    );
    assert.ok(
      f.calls.animations.some((a) => a.element.tagName === 'IMG'),
      'zoom remains',
    );
    if (host === 'dentalbarns.webflow.io') {
      edge.style.scale = '0.4';
      edge.style.opacity = '0.5';
      f.up();
      const returning = f.calls.animations.filter((a) => a.element === edge).at(-1);
      assert.equal(returning.frames[0].scale, '0.4', 'outline returns from its actual size');
      assert.equal(returning.frames[0].opacity, '0.5');
    }
    f.cleanup();
  });
}

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
  await f.play();
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
  test(`${reason} cancels pending playback without starting a photo animation`, async () => {
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
    assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
    if (['pagehide', 'hidden'].includes(reason)) {
      assert.ok(f.calls.animations.every((a) => a.cancelled));
      assert.equal(f.w.document.querySelector('img').style.scale, '1.06');
    }
    assert.equal(f.calls.animations.length, 0, 'pending holds have no return animation');
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
  assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
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

test('nine native words continue across cards, three per ten-second hold', async () => {
  const f = fixture({ visual: true, clock: true });
  const words = [...f.w.document.querySelectorAll('[data-tdb-audio-words]')];
  const seen = [];
  for (let card = 0; card < 3; card++) {
    await f.play(card);
    for (let step = 0; step < 3; step++) {
      seen.push(words[card].textContent);
      f.advance(step === 2 ? 3334 : 3333.4);
    }
    f.advance(3000);
    assert.equal(words[card].textContent, seen.at(-1), 'no further words after ten seconds');
    assert.equal(
      f.w.TDBHoldAudio.status().holding,
      true,
      'music and circle remain held until release',
    );
    f.up(card);
  }
  assert.deepEqual(seen, [
    'HOLD.',
    'BREATHE.',
    'RELAX.',
    'UNWIND.',
    'PEACEFUL.',
    'CALM.',
    'STILL.',
    'REST.',
    'EASE.',
  ]);
  await f.play();
  assert.equal(words[0].textContent, 'HOLD.');
  f.cleanup();
});

test('release cancels unseen words and preserves the audio fade after a long hold', async () => {
  const f = fixture({ visual: true, clock: true });
  await f.play();
  f.downloads[0]();
  await tick();
  f.advance(1000);
  f.up();
  f.advance(12000);
  await f.play(1);
  assert.equal(f.w.document.querySelectorAll('[data-tdb-audio-words]')[1].textContent, 'BREATHE.');
  f.advance(10000);
  const voice = f.calls.voices.at(-1);
  assert.equal(voice.gain.gain.ramps.at(-1)[0], 0.85, 'word deadline does not clip music');
  f.up(1);
  assert.equal(voice.stopped.length, 0, 'release starts a fade, not an abrupt stop');
  assert.equal(voice.gain.gain.ramps.at(-1)[0], 0);
  f.advance(600);
  assert.equal(voice.stopped.length, 1);
  f.cleanup();
});

test('blur reverses from current geometry without altering native layout or parallax', async () => {
  const f = fixture({ visual: true, clock: true });
  const circle = f.w.document.querySelector('[data-tdb-audio-circle]');
  await f.play();
  let animation = f.calls.animations.find((a) => a.element === circle);
  assert.equal(animation.options.duration, 10000);
  assert.equal(animation.frames.at(-1).scale, '1');
  assert.equal(animation.frames.at(-1).opacity, 0, 'outgoing ripple dissolves at its outer limit');
  assert.equal(animation.frames[1].opacity, 1, 'visible feedback begins at the speaker');
  assert.equal(
    animation.frames[1].offset * animation.options.duration,
    150,
    'ripple clears the finger promptly',
  );
  const edge = f.w.document.querySelector('[data-tdb-audio-ripple-edge]');
  const edgeAnimation = f.calls.animations.find((a) => a.element === edge);
  assert.deepEqual(
    edgeAnimation.frames,
    animation.frames,
    'edge follows the blur without a second timer',
  );
  // JSDOM does not interpolate WAAPI; supply the visible mid-animation value.
  circle.style.scale = '0.6';
  circle.style.opacity = '0.6';
  f.up();
  animation = f.calls.animations.filter((a) => a.element === circle).at(-1);
  assert.equal(animation.frames[0].scale, '0.6');
  assert.equal(animation.frames.at(-1).scale, '0');
  assert.equal(animation.options.duration, 1200);
  assert.equal(
    animation.frames[0].opacity,
    '0.6',
    'return starts at its currently visible brightness',
  );
  assert.equal(animation.frames.at(-1).opacity, 0, 'return fades without a brightness rebound');
  circle.style.scale = '0.3';
  await f.play();
  animation = f.calls.animations.filter((a) => a.element === circle).at(-1);
  assert.equal(animation.frames[0].scale, '0.3');
  assert.equal(f.w.document.querySelector('img').style.translate, '0 10px');
  assert.equal(f.w.document.querySelectorAll('style').length, 0);
  f.cleanup();
  assert.ok(f.calls.animations.every((a) => a.cancelled));
});

for (const [label, code] of [
  ['source', source],
  ['bundle', fs.readFileSync('dist/tdb-hold-audio.js', 'utf8')],
]) {
  test(`${label}: interruption after permission but before download completion still delays visuals`, async () => {
    const f = fixture({ code, visual: true });
    try {
      await f.down();
      f.calls.audioContext.state = 'interrupted';
      f.calls.audioContext.dispatchEvent(new f.w.Event('statechange'));
      f.downloads[0]();
      await tick();
      assert.equal(f.calls.voices.length, 0);
      assert.equal(f.calls.animations.length, 0);
      f.resumeAudio();
      await tick();
      assert.equal(f.calls.voices[0].started, 1);
      assert.ok(f.calls.animations.length > 0);
    } finally {
      f.cleanup();
    }
  });

  test(`${label}: device interruption stops current effects and requires a deliberate new hold`, async () => {
    const f = fixture({ code, visual: true });
    try {
      await f.play();
      f.calls.audioContext.state = 'interrupted';
      f.calls.audioContext.dispatchEvent(new f.w.Event('statechange'));
      assert.equal(f.w.TDBHoldAudio.status().holding, false);
      assert.ok(f.calls.animations.every((a) => a.cancelled));
      assert.equal(f.calls.voices[0].stopped.length, 1);
      f.resumeAudio();
      await tick();
      assert.equal(f.calls.voices.length, 1);
      f.up();
      await f.down();
      assert.equal(f.calls.voices[1].started, 1);
    } finally {
      f.cleanup();
    }
  });

  test(`${label}: start and release snapshot effect geometry before animation writes`, async () => {
    const f = fixture({ code, visual: true });
    const events = [];
    const computed = f.w.getComputedStyle.bind(f.w);
    const animate = f.w.Element.prototype.animate;
    f.w.getComputedStyle = (node) => {
      events.push('read');
      return computed(node);
    };
    f.w.Element.prototype.animate = function (...args) {
      events.push('write');
      return animate.apply(this, args);
    };
    function check() {
      assert.ok(events.includes('read'));
      assert.ok(events.includes('write'));
      assert.equal(events.slice(events.indexOf('write')).includes('read'), false);
    }
    try {
      await f.play();
      check();
      events.length = 0;
      f.up();
      check();
    } finally {
      f.cleanup();
    }
  });

  for (const mode of ['no-backdrop', 'no-zoom', 'no-visuals']) {
    test(`${label}: ${mode} isolates only its specified effects and never affects production`, async () => {
      for (const host of ['dentalbarns.webflow.io', 'www.thedentalbarns.com']) {
        const f = fixture({ code, visual: true, url: `https://${host}/?tdb-speaker-test=${mode}` });
        try {
          await f.play();
          const staging = host === 'dentalbarns.webflow.io';
          const targets = f.calls.animations.map((a) => a.element);
          const has = (selector) => targets.includes(f.w.document.querySelector(selector));
          assert.equal(has('img'), !staging || mode === 'no-backdrop');
          assert.equal(has('[data-tdb-audio-circle]'), !staging || mode === 'no-zoom');
          assert.equal(has('[data-tdb-audio-ripple-edge]'), !staging || mode !== 'no-visuals');
          assert.equal(has('[data-tdb-audio-words]'), !staging || mode !== 'no-visuals');
          assert.equal(f.buttons[0].style.backdropFilter === 'none', staging && mode !== 'no-zoom');
          assert.equal(f.calls.voices[0].started, 1);
          f.up();
          assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
        } finally {
          f.cleanup();
        }
      }
    });
  }

  test(`${label}: combined no-blur,no-zoom removes only zoom from the no-blur comparison`, async () => {
    for (const host of ['dentalbarns.webflow.io', 'www.thedentalbarns.com']) {
      const baseline = fixture({ code, visual: true, clock: true,
        url: `https://${host}/?tdb-speaker-test=no-blur` });
      const candidate = fixture({ code, visual: true, clock: true,
        url: `https://${host}/?tdb-speaker-test=no-blur,no-zoom` });
      const signature = (f) => f.calls.animations.map((a) => ({
        target: a.element.tagName === 'IMG' ? 'image' : a.element.getAttributeNames().find((n) => n.startsWith('data-tdb-')),
        frames: JSON.parse(JSON.stringify(a.frames)),
        options: JSON.parse(JSON.stringify(a.options)),
      }));
      try {
        for (const f of [baseline, candidate]) {
          f.buttons[0].style.backdropFilter = 'blur(20px)';
          await f.play();
          f.advance(3400);
          const edge = f.w.document.querySelector('[data-tdb-audio-ripple-edge]');
          edge.style.scale = '0.5';
          edge.style.opacity = '0.4';
          f.up();
          f.advance(600);
          assert.equal(f.calls.voices[0].stopped.length, 1, 'audio fade still completes');
          assert.equal(f.calls.fetch, 1);
          assert.equal(f.calls.decode, 1);
          assert.equal(f.buttons[0].style.backdropFilter, 'blur(20px)');
          assert.equal(f.w.document.querySelector('img').style.translate, '0 10px');
          assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
          assert.equal(f.w.document.querySelector('[data-tdb-audio-words]').textContent, 'BREATHE.');
          assert.equal(f.w.document.head.children.length, 0, 'no head additions');
        }
        assert.deepEqual(signature(candidate), host === 'dentalbarns.webflow.io'
          ? signature(baseline).filter((a) => a.target !== 'image')
          : signature(baseline));
      } finally {
        baseline.cleanup();
        candidate.cleanup();
      }
    }
  });

  test(`${label}: retain-zoom changes only settled image cleanup and only on staging`, async () => {
    const signature = (f) => f.calls.animations.map((a) => ({
      target: a.element.tagName === 'IMG' ? 'image' : a.element.getAttributeNames().find((n) => n.startsWith('data-tdb-')),
      frames: JSON.parse(JSON.stringify(a.frames)),
      options: JSON.parse(JSON.stringify(a.options)),
    }));
    let baseline;
    for (const url of [
      'https://dentalbarns.webflow.io/',
      'https://dentalbarns.webflow.io/?tdb-speaker-test=retain-zoom',
      'https://www.thedentalbarns.com/?tdb-speaker-test=retain-zoom',
    ]) {
      const f = fixture({ code, visual: true, clock: true, url });
      try {
        const cards = [...f.w.document.querySelectorAll('[data-tdb-audio-card]')];
        const untouched = cards.slice(1).map((card) => card.outerHTML);
        await f.play();
        f.advance(3400);
        cards[0].querySelector('img').style.scale = '1.1';
        cards[0].querySelector('[data-tdb-audio-circle]').style.opacity = '0.4';
        f.up();
        const latest = new Map(f.calls.animations.map((a) => [a.element, a]));
        latest.forEach((a) => a.finish());
        await tick();
        f.advance(12000);
        const retained = f.calls.animations.filter((a) => !a.cancelled);
        const enabled = url.includes('webflow.io/?');
        assert.equal(retained.length, enabled ? 1 : 0);
        if (enabled) {
          assert.equal(retained[0].element, cards[0].querySelector('img'));
          assert.equal(retained[0].frames.at(-1).scale, '1.06');
          assert.equal(retained[0].options.duration, 1200);
        }
        baseline ||= signature(f);
        assert.deepEqual(signature(f), baseline, 'all visible keyframes and timings are identical');
        assert.deepEqual(cards.slice(1).map((card) => card.outerHTML), untouched);
        assert.equal(f.calls.voices[0].stopped.length, 1, 'audio fade still completes');
        assert.equal(f.calls.fetch, 1);
        assert.equal(f.calls.decode, 1);
        assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
        assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
        assert.equal(f.w.document.head.children.length, 0, 'no CSS or head additions');
      } finally {
        f.cleanup();
      }
    }
  });

  test(`${label}: retain-zoom replaces completed and interrupted returns without compounding the base crop`, async () => {
    const f = fixture({ code, clock: true,
      url: 'https://dentalbarns.webflow.io/?tdb-speaker-test=retain-zoom' });
    try {
      await f.play();
      const image = f.w.document.querySelector('img');
      for (const complete of [true, false, true]) {
        f.up();
        const previous = f.calls.animations.at(-1);
        assert.equal(previous.frames.at(-1).scale, '1.06');
        if (complete) {
          previous.finish();
          await tick();
          assert.equal(previous.cancelled, false);
        }
        image.style.scale = complete ? '1.06' : '1.08';
        await f.down();
        const current = f.calls.animations.at(-1);
        assert.equal(previous.cancelled, true);
        assert.equal(current.frames[0].scale, image.style.scale);
        assert.ok(Math.abs(Number(current.frames.at(-1).scale) - 1.1236) < 1e-12);
        assert.equal(f.calls.animations.filter((a) => !a.cancelled).length, 1);
        assert.equal(image.style.translate, '0 10px');
        assert.equal(image.style.transform, 'rotate(0deg)');
      }
    } finally {
      f.cleanup();
    }
  });

  for (const ending of ['pagehide', 'hidden', 'destroy']) {
    test(`${label}: ${ending} clears retained zooms from every previously used card`, async () => {
      const f = fixture({ code, visual: true, clock: true,
        url: 'https://dentalbarns.webflow.io/?tdb-speaker-test=retain-zoom' });
      try {
        for (let i = 0; i < f.buttons.length; i++) {
          await f.play(i);
          f.up(i);
          new Map(f.calls.animations.map((a) => [a.element, a])).forEach((a) => a.finish());
          await tick();
          assert.equal(f.calls.animations.filter((a) => !a.cancelled).length, i + 1);
        }
        const count = f.calls.animations.length;
        if (ending === 'hidden') {
          Object.defineProperty(f.w.document, 'hidden', { value: true, configurable: true });
          f.event(f.w.document, 'visibilitychange');
        } else if (ending === 'destroy') f.w.TDBHoldAudioLoader.destroy();
        else f.event(f.w, 'pagehide');
        await tick();
        assert.ok(f.calls.animations.every((a) => a.cancelled));
        assert.equal(f.calls.voices[0].stopped.length, 1);
        f.advance(12000);
        assert.equal(f.calls.animations.length, count, 'cleanup creates no replacement animations');
      } finally {
        f.cleanup();
      }
    });
  }

  test(`${label}: resolved resume is not treated as running while the device is suspended`, async () => {
    const f = fixture({ code, resumeResolvesSuspended: true, visual: true });
    try {
      await f.down();
      f.downloads[0]();
      await tick();
      assert.equal(f.calls.voices.length, 0);
      assert.equal(f.calls.animations.length, 0);
      f.resumeAudio();
      await tick();
      assert.equal(f.calls.voices[0].started, 1);
      assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
    } finally {
      f.cleanup();
    }
  });

  test(`${label}: a timed-out download is evicted and the next hold can start a fresh request`, async () => {
    const f = fixture({ code, clock: true, visual: true });
    try {
      await f.down();
      f.advance(30000);
      await tick();
      assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
      assert.equal(f.w.TDBHoldAudio.status().cachedTracks, 0);
      await f.down();
      assert.equal(f.calls.fetch, 2);
      f.downloads[0]();
      await tick();
      assert.equal(f.calls.voices.length, 0, 'expired flight cannot start the new hold');
      f.downloads[1]();
      await tick();
      assert.equal(f.calls.voices[0].started, 1);
    } finally {
      f.cleanup();
    }
  });

  test(`${label}: a device failure during source start still clears every loading state`, async () => {
    const f = fixture({ code, startFails: true, visual: true });
    try {
      await f.play();
      assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
      assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
      assert.equal(f.calls.animations.length, 0);
    } finally {
      f.cleanup();
    }
  });

  test(`${label}: download and decode delay visuals and preserve the full word sequence`, async () => {
    const f = fixture({ code, visual: true, clock: true, delayedDecode: true });
    try {
      await f.down();
      f.advance(12000);
      assert.equal(f.calls.animations.length, 0, 'slow download starts no zoom, ripple or words');
      f.downloads[0]();
      await tick();
      assert.equal(f.calls.decode, 1);
      assert.equal(f.calls.voices.length, 0);
      assert.equal(f.calls.animations.length, 0, 'downloaded bytes still require decoding');
      assert.equal(f.buttons[0].getAttribute('data-tdb-loading'), 'true');
      f.advance(12000);
      f.decodeAudio();
      await tick();
      assert.equal(f.calls.voices[0].started, 1);
      assert.equal(f.calls.playbackEvents[0], 'audio', 'playback precedes the visual sequence');
      assert.equal(f.calls.animations.length, 4, 'zoom, blur, edge and first word start together');
      const word = f.w.document.querySelector('[data-tdb-audio-words]');
      assert.equal(word.textContent, 'HOLD.', 'waiting consumes no words');
      f.advance(3333.4);
      assert.equal(word.textContent, 'BREATHE.');
      assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
    } finally {
      f.cleanup();
    }
  });

  test(`${label}: releasing before permission keeps visuals dormant and the next word unconsumed`, async () => {
    const f = fixture({ code, visual: true, clock: true, suspended: true });
    try {
      await f.down();
      f.downloads[0]();
      await tick();
      f.up();
      assert.equal(f.calls.animations.length, 0, 'no release effects for a loading-only press');
      f.resumeAudio();
      await tick();
      f.advance(12000);
      assert.equal(f.calls.voices.length, 0, 'late readiness cannot play a released hold');
      assert.equal(f.calls.animations.length, 0);
      await f.down(1);
      assert.equal(f.calls.voices[0].started, 1);
      assert.equal(f.w.document.querySelectorAll('[data-tdb-audio-words]')[1].textContent, 'HOLD.');
      assert.ok(f.calls.animations.every((a) => f.buttons[1].parentElement.contains(a.element)));
    } finally {
      f.cleanup();
    }
  });

  test(`${label}: failed audio starts no visuals and leaves loading feedback clear`, async () => {
    const f = fixture({ code, visual: true, fail: true });
    try {
      await f.down();
      f.downloads[0]();
      await tick();
      assert.equal(f.calls.animations.length, 0);
      assert.equal(f.calls.voices.length, 0);
      assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
      assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
      assert.match(f.buttons[0].title, /unavailable/);
    } finally {
      f.cleanup();
    }
  });

  function effectsFixture(options = {}) {
    const f = fixture({ code, visual: true, clock: true, ...options });
    const style = f.w.document.createElement('style');
    style.textContent =
      '[data-tdb-audio-circle],[data-tdb-audio-ripple-edge],[data-tdb-audio-words]{visibility:hidden}';
    f.w.document.head.append(style);
    const cards = [...f.w.document.querySelectorAll('[data-tdb-audio-card]')];
    return { ...f, cards, decorations: [...cards[0].querySelectorAll('div')] };
  }

  test(`${label}: stop-ripple removes the release tail and retained effects without changing the held ring`, async () => {
    const mode = 'retain-zoom,retain-ripple,no-blur,no-zoom,no-backdrop,no-words';
    const baseline = effectsFixture({ url: `https://dentalbarns.webflow.io/?tdb-speaker-test=${mode}` });
    const candidate = effectsFixture({ url: `https://dentalbarns.webflow.io/?tdb-speaker-test=${mode},stop-ripple` });
    const signature = (f) => f.calls.animations.map((a) => ({
      frames: JSON.parse(JSON.stringify(a.frames)),
      options: JSON.parse(JSON.stringify(a.options)),
    }));
    try {
      for (const f of [baseline, candidate]) {
        await f.play();
        f.advance(3400);
        f.decorations[1].style.opacity = '0.4';
        f.decorations[1].style.scale = '0.65';
      }
      assert.deepEqual(signature(candidate), signature(baseline), 'held appearance and timing match D');
      const neighbours = candidate.cards.slice(1).map((c) => c.outerHTML);
      const head = candidate.w.document.head.innerHTML;
      baseline.up();
      candidate.up();
      assert.equal(baseline.calls.animations.length, 2, 'D starts its existing shrinking return');
      assert.equal(candidate.calls.animations.length, 1, 'no return animation is created');
      assert.ok(candidate.calls.animations.every((a) => a.cancelled), 'nothing remains filled after release');
      assert.ok(candidate.decorations.every((e) => candidate.w.getComputedStyle(e).visibility === 'hidden'));
      assert.equal(candidate.buttons[0].getAttribute('aria-pressed'), 'false');
      assert.equal(candidate.buttons[0].hasAttribute('data-tdb-loading'), false);
      assert.equal(candidate.calls.voices[0].stopped.length, 0, 'audio keeps its gentle release');
      candidate.advance(600);
      assert.equal(candidate.calls.voices[0].stopped.length, 1);
      assert.equal(candidate.cards[0].querySelector('img').style.translate, '0 10px');
      assert.deepEqual(candidate.cards.slice(1).map((c) => c.outerHTML), neighbours);
      assert.equal(candidate.w.document.head.innerHTML, head);

      // Releasing and immediately re-pressing must not let the cancelled
      // predecessor hide its replacement when the promise rejection runs.
      await candidate.down();
      candidate.up();
      await candidate.down();
      await tick();
      assert.equal(candidate.calls.animations.filter((a) => !a.cancelled).length, 1);
      assert.equal(candidate.w.getComputedStyle(candidate.decorations[1]).visibility, 'visible');
      candidate.up();
      await candidate.down(1, 2);
      candidate.up(1, 2);
      candidate.advance(12000);
      await tick();
      assert.ok(candidate.calls.animations.every((a) => a.cancelled));
      assert.ok([...candidate.w.document.querySelectorAll('[data-tdb-audio-ripple-edge]')]
        .every((e) => candidate.w.getComputedStyle(e).visibility === 'hidden'));
      assert.equal(candidate.calls.fetch, 1);
      assert.equal(candidate.calls.decode, 1);
      assert.ok(candidate.calls.voices.every((v) => v.stopped.length === 1));
    } finally {
      baseline.cleanup();
      candidate.cleanup();
    }
  });

  test(`${label}: stop-ripple parks a fully faded held ring and preserves word sequencing`, async () => {
    const f = effectsFixture({ url: 'https://dentalbarns.webflow.io/?tdb-speaker-test=retain-ripple,stop-ripple,no-zoom,no-backdrop' });
    try {
      await f.play();
      const edge = f.decorations[1];
      const ring = f.calls.animations.find((a) => a.element === edge);
      f.advance(3333.4);
      assert.equal(f.decorations[2].textContent, 'BREATHE.');
      ring.finish();
      await tick();
      assert.equal(ring.cancelled, true, 'stop-ripple overrides retention even before release');
      assert.equal(f.w.getComputedStyle(edge).visibility, 'hidden');
      assert.equal(f.w.TDBHoldAudio.status().playing, true);
      f.up();
      const fade = f.calls.animations.filter((a) => a.element === f.decorations[2]).at(-1);
      assert.equal(fade.options.duration, 350, 'the existing word fade remains');
      assert.equal(f.calls.animations.filter((a) => a.element === edge).length, 1);
      assert.ok(f.calls.animations.filter((a) => f.decorations.slice(0, 2).includes(a.element)).every((a) => a.cancelled));
      f.event(f.w, 'pagehide');
      await tick();
      assert.ok(f.calls.animations.every((a) => a.cancelled));
    } finally { f.cleanup(); }
  });

  test(`${label}: stop-ripple does not alter production hold or release`, async () => {
    const f = effectsFixture({ url: 'https://www.thedentalbarns.com/?tdb-speaker-test=stop-ripple,no-words,no-zoom,no-backdrop,retain-ripple' });
    try {
      await f.play();
      assert.equal(f.calls.animations.length, 4, 'production keeps zoom, both rings and words');
      f.decorations[0].style.opacity = '0.4';
      f.decorations[0].style.scale = '0.65';
      f.up();
      const rippleReturns = f.calls.animations.filter((a) => a.options.duration === 1200 && f.decorations.slice(0, 2).includes(a.element));
      assert.equal(rippleReturns.length, 2);
      assert.ok(rippleReturns.every((a) => a.frames[0].scale === '0.65' && a.frames.at(-1).scale === '0'));
      rippleReturns.forEach((a) => a.finish());
      await tick();
      assert.ok(rippleReturns.every((a) => a.cancelled));
    } finally { f.cleanup(); }
  });

  for (const mode of ['no-words', 'no-ripple', 'no-words,no-ripple']) {
    test(`${label}: ${mode} isolates overlays through hold, release and another card without changing production`, async () => {
      const baseMode = 'retain-zoom,retain-ripple,no-blur,no-zoom,no-backdrop';
      const signature = (f) => f.calls.animations.map((a) => ({
        target: a.element.tagName === 'IMG' ? 'image' : a.element.getAttributeNames().find((n) => n.startsWith('data-tdb-')),
        frames: JSON.parse(JSON.stringify(a.frames)),
        options: JSON.parse(JSON.stringify(a.options)),
      }));
      for (const host of ['dentalbarns.webflow.io', 'www.thedentalbarns.com']) {
        const baseline = effectsFixture({ url: `https://${host}/?tdb-speaker-test=${baseMode}` });
        const candidate = effectsFixture({ url: `https://${host}/?tdb-speaker-test=${baseMode},${mode}` });
        const noWords = host === 'dentalbarns.webflow.io' && mode.includes('no-words');
        const noRipple = host === 'dentalbarns.webflow.io' && mode.includes('no-ripple');
        const wanted = (a) => !(noWords && a.target === 'data-tdb-audio-words') &&
          !(noRipple && ['data-tdb-audio-circle', 'data-tdb-audio-ripple-edge'].includes(a.target));
        try {
          for (const f of [baseline, candidate]) {
            await f.near();
            const head = f.w.document.head.innerHTML;
            const neighbours = f.cards.slice(1).map((c) => c.outerHTML);
            await f.play();
            f.advance(3400);
            // Model the live WAAPI return snapshot, which jsdom cannot render.
            for (const element of f.decorations.slice(0, 2)) {
              element.style.opacity = '0.4';
              element.style.scale = '0.65';
            }
            f.up();
            f.advance(600);
            assert.equal(f.calls.voices[0].stopped.length, 1);
            assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
            assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
            assert.equal(f.cards[0].querySelector('img').style.translate, '0 10px');
            assert.equal(f.buttons[0].style.backdropFilter || '', host === 'dentalbarns.webflow.io' ? 'none' : '');
            assert.deepEqual(f.cards.slice(1).map((c) => c.outerHTML), neighbours);
            assert.equal(f.w.document.head.innerHTML, head);
          }
          assert.deepEqual(signature(candidate), signature(baseline).filter(wanted));
          assert.equal(candidate.decorations[2].textContent, noWords ? 'HOLD.' : 'BREATHE.');
          if (noWords) assert.equal(candidate.w.getComputedStyle(candidate.decorations[2]).visibility, 'hidden');
          if (noRipple) assert.ok(candidate.decorations.slice(0, 2).every((e) => candidate.w.getComputedStyle(e).visibility === 'hidden'));

          // A second card shares the prepared sound and still excludes the same
          // targets. No disabled word timer may reveal a decoration later.
          for (const f of [baseline, candidate]) {
            await f.down(1, 2);
            f.advance(3400);
            f.up(1, 2);
            f.advance(12000);
            assert.equal(f.calls.fetch, 1);
            assert.equal(f.calls.decode, 1);
            assert.equal(f.calls.voices.length, 2);
            assert.ok(f.calls.voices.every((voice) => voice.started === 1 && voice.stopped.length === 1));
            f.event(f.w, 'pagehide');
            await tick();
            assert.ok(f.calls.animations.every((a) => a.cancelled));
            assert.ok([...f.w.document.querySelectorAll('[data-tdb-audio-words],[data-tdb-audio-circle],[data-tdb-audio-ripple-edge]')]
              .every((e) => f.w.getComputedStyle(e).visibility === 'hidden'));
          }
          assert.deepEqual(signature(candidate), signature(baseline).filter(wanted));
          if (noWords) assert.ok([...candidate.w.document.querySelectorAll('[data-tdb-audio-words]')]
            .every((e) => e.textContent === 'HOLD.'));
        } finally {
          baseline.cleanup();
          candidate.cleanup();
        }
      }
    });
  }

  test(`${label}: retain-ripple changes completion cleanup without altering visible frames or audio`, async () => {
    const signature = (f) => f.calls.animations.map((a) => ({
      target: a.element.tagName === 'IMG' ? 'image' : a.element.getAttributeNames().find((n) => n.startsWith('data-tdb-')),
      frames: JSON.parse(JSON.stringify(a.frames)),
      options: JSON.parse(JSON.stringify(a.options)),
    }));
    let baseline;
    for (const host of ['dentalbarns.webflow.io', 'www.thedentalbarns.com']) {
      for (const mode of ['retain-zoom', 'retain-zoom,retain-ripple']) {
        const f = effectsFixture({ url: `https://${host}/?tdb-speaker-test=${mode}` });
        try {
          const untouched = f.cards.slice(1).map((c) => c.outerHTML);
          const head = f.w.document.head.innerHTML;
          await f.play();
          f.advance(3400);
          for (const element of f.decorations.slice(0, 2)) {
            element.style.opacity = '0.4';
            element.style.scale = '0.65';
          }
          f.up();
          new Map(f.calls.animations.map((a) => [a.element, a])).forEach((a) => a.finish());
          await tick();
          baseline ||= signature(f);
          assert.deepEqual(signature(f), baseline);
          const staging = host === 'dentalbarns.webflow.io';
          const retainedRipple = staging && mode.includes('retain-ripple');
          const retained = f.calls.animations.filter((a) => !a.cancelled);
          assert.equal(retained.length, staging ? retainedRipple ? 3 : 1 : 0);
          for (const a of retained.filter((a) => a.element.tagName !== 'IMG')) {
            assert.equal(a.frames.at(-1).opacity, 0, 'retained decorations finish invisible');
            assert.equal(a.frames.at(-1).scale, '0');
            assert.equal(a.options.duration, 1200);
          }
          assert.equal(f.w.getComputedStyle(f.decorations[0]).visibility, retainedRipple ? 'visible' : 'hidden');
          assert.equal(f.w.getComputedStyle(f.decorations[2]).visibility, 'hidden', 'word cleanup is unchanged');
          f.advance(12000);
          assert.equal(f.calls.voices[0].stopped.length, 1);
          assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
          assert.equal(f.buttons[0].getAttribute('aria-pressed'), 'false');
          assert.deepEqual(f.cards.slice(1).map((c) => c.outerHTML), untouched);
          assert.equal(f.w.document.head.innerHTML, head);
        } finally { f.cleanup(); }
      }
    }
  });

  test(`${label}: a fully faded retained ripple stays invisible through release and is replaced on re-press`, async () => {
    const f = effectsFixture({ url: 'https://dentalbarns.webflow.io/?tdb-speaker-test=retain-zoom,retain-ripple' });
    try {
      await f.play();
      const rings = f.calls.animations.filter((a) => f.decorations.slice(0, 2).includes(a.element));
      rings.forEach((a) => a.finish());
      await tick();
      assert.ok(rings.every((a) => !a.cancelled && a.frames.at(-1).opacity === 0));
      f.up();
      await tick();
      assert.ok(rings.every((a) => !a.cancelled), 'release must not tear down an already invisible ring');
      assert.equal(f.calls.animations.filter((a) => f.decorations.slice(0, 2).includes(a.element)).length, 2);
      await f.down();
      assert.ok(rings.every((a) => a.cancelled));
      assert.ok(f.decorations.every((e) => f.w.getComputedStyle(e).visibility === 'visible'));
      for (const element of f.decorations.slice(0, 2)) element.style.opacity = '0.4';
      f.up();
      const returns = f.calls.animations.filter((a) => !a.cancelled && f.decorations.slice(0, 2).includes(a.element));
      await f.down();
      assert.ok(returns.every((a) => a.cancelled), 'quick re-press replaces both returning effects');
      assert.equal(f.calls.animations.filter((a) => !a.cancelled).length, 4, 'one live effect per target');
      assert.ok(f.decorations.every((e) => f.w.getComputedStyle(e).visibility === 'visible'));
    } finally { f.cleanup(); }
  });

  for (const ending of ['pagehide', 'hidden', 'destroy']) {
    test(`${label}: ${ending} clears retained image and ripple effects across all three cards`, async () => {
      const f = effectsFixture({ url: 'https://dentalbarns.webflow.io/?tdb-speaker-test=retain-zoom,retain-ripple' });
      try {
        for (let i = 0; i < f.buttons.length; i++) {
          await f.play(i);
          f.cards[i].querySelector('[data-tdb-audio-circle]').style.opacity = '0.4';
          f.up(i);
          new Map(f.calls.animations.map((a) => [a.element, a])).forEach((a) => a.finish());
          await tick();
          assert.equal(f.calls.animations.filter((a) => !a.cancelled).length, (i + 1) * 3);
        }
        const count = f.calls.animations.length;
        if (ending === 'hidden') {
          Object.defineProperty(f.w.document, 'hidden', { value: true, configurable: true });
          f.event(f.w.document, 'visibilitychange');
        } else if (ending === 'destroy') f.w.TDBHoldAudioLoader.destroy();
        else f.event(f.w, 'pagehide');
        await tick();
        assert.ok(f.calls.animations.every((a) => a.cancelled));
        assert.ok([...f.w.document.querySelectorAll('[data-tdb-audio-circle],[data-tdb-audio-ripple-edge]')]
          .every((e) => f.w.getComputedStyle(e).visibility === 'hidden'));
        assert.equal(f.calls.voices[0].stopped.length, 1);
        f.advance(12000);
        assert.equal(f.calls.animations.length, count);
      } finally { f.cleanup(); }
    });
  }

  test(`${label}: release only fades the ripple; an already-invisible ring stays parked`, async () => {
    for (const opacity of [0, 0.05, 0.3, 0.6, 1]) {
      const f = effectsFixture();
      try {
        await f.play();
        const circle = f.decorations[0];
        circle.style.scale = '0.8';
        circle.style.opacity = String(opacity);
        const count = f.calls.animations.length;
        f.up();
        const returning = f.calls.animations.slice(count).filter((a) => a.element === circle);
        if (opacity === 0) {
          assert.equal(returning.length, 0, 'no new blur animation after it has faded away');
          assert.equal(f.w.getComputedStyle(circle).visibility, 'hidden');
        } else {
          assert.equal(returning.length, 1);
          let previous = opacity;
          for (const frame of returning[0].frames) {
            if (frame.opacity == null) continue;
            assert.ok(Number(frame.opacity) <= previous, 'release must not brighten');
            previous = Number(frame.opacity);
          }
          assert.equal(previous, 0);
          assert.equal(returning[0].options.duration, 1200, 'return timing preserved');
        }
      } finally {
        f.cleanup();
      }
    }
  });

  test(`${label}: first speaker leaves neighbouring visuals untouched and parks completed effects`, async () => {
    const f = effectsFixture();
    const untouched = f.cards.slice(1).map((card) => card.outerHTML);
    await f.play();
    assert.ok(f.decorations.every((el) => f.w.getComputedStyle(el).visibility === 'visible'));
    assert.ok(f.calls.animations.every((a) => f.cards[0].contains(a.element)));
    f.up();
    const latest = new Map(f.calls.animations.map((a) => [a.element, a]));
    latest.forEach((animation) => animation.finish());
    await tick();
    assert.ok(f.decorations.every((el) => f.w.getComputedStyle(el).visibility === 'hidden'));
    assert.ok(f.calls.animations.every((a) => a.cancelled));
    f.advance(12000);
    assert.deepEqual(
      f.cards.slice(1).map((card) => card.outerHTML),
      untouched,
    );
    assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
    f.cleanup();
  });

  test(`${label}: rapid re-press keeps current effects visible; cancellation and destroy park them`, async () => {
    const f = effectsFixture();
    await f.play();
    f.up();
    await f.play(0, 2);
    assert.ok(f.decorations.every((el) => f.w.getComputedStyle(el).visibility === 'visible'));
    const circle = f.decorations[0];
    const held = f.calls.animations.filter((a) => a.element === circle).at(-1);
    held.finish();
    await tick();
    assert.equal(f.w.getComputedStyle(circle).visibility, 'hidden');
    assert.equal(held.cancelled, true, 'completed invisible effects are discarded');
    f.up(0, 2);
    assert.equal(
      f.w.getComputedStyle(circle).visibility,
      'hidden',
      'finished ripple does not revive',
    );
    await f.play(0, 3);
    circle.style.scale = '0.6';
    circle.style.opacity = '0.5';
    f.up(0, 3);
    assert.equal(f.w.getComputedStyle(circle).visibility, 'visible');
    const returning = f.calls.animations.filter((a) => a.element === circle).at(-1);
    returning.cancel();
    await tick();
    assert.equal(f.w.getComputedStyle(circle).visibility, 'hidden');
    f.w.TDBHoldAudioLoader.destroy();
    assert.ok(f.decorations.every((el) => f.w.getComputedStyle(el).visibility === 'hidden'));
    assert.equal(f.buttons[0].hasAttribute('data-tdb-loading'), false);
    f.cleanup();
  });

  for (const event of ['pagehide', 'hidden']) {
    test(`${label}: ${event} cancels already-returning visuals without creating new animations`, async () => {
      const f = effectsFixture();
      try {
        await f.play();
        f.downloads[0]();
        await tick();
        f.up();
        assert.ok(f.calls.animations.some((a) => !a.cancelled));
        const count = f.calls.animations.length;
        if (event === 'hidden') {
          Object.defineProperty(f.w.document, 'hidden', { value: true, configurable: true });
          f.event(f.w.document, 'visibilitychange');
        } else f.event(f.w, 'pagehide');
        assert.equal(f.calls.animations.length, count, 'hiding never starts a return animation');
        assert.ok(
          f.calls.animations.every((a) => a.cancelled),
          'also cancels tails after pointer release',
        );
        assert.ok(f.decorations.every((el) => f.w.getComputedStyle(el).visibility === 'hidden'));
        assert.equal(f.calls.voices[0].stopped.length, 1, 'no hidden audio tail');
        assert.equal(f.w.TDBHoldAudio.status().holding, false);
        f.advance(12000);
        assert.equal(f.calls.animations.length, count);
        Object.defineProperty(f.w.document, 'hidden', { value: false, configurable: true });
        await f.play(1);
        assert.equal(
          f.w.TDBHoldAudio.status().playing,
          true,
          'cached audio still resumes on deliberate hold',
        );
      } finally {
        f.cleanup();
      }
    });
  }
}
