const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function setup(pace) {
  const dom = new JSDOM(
    `<section data-vimeo-hero-shell><div data-vimeo-controls-layer><button data-vimeo-control="pause">Pause</button></div>
    <div data-vimeo-player-init data-vimeo-hero-init data-vimeo-video-id="123" data-vimeo-autoplay="false"><iframe></iframe><img class="vimeo-bg__placeholder" alt=""></div>
  </section>`,
    { url: 'https://dentalbarns.webflow.io/', runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    root = w.document.querySelector('[data-vimeo-player-init]'),
    shell = w.document.querySelector('section');
  const timers = new Map(),
    players = [],
    observers = [];
  let now = 0,
    id = 0;
  w.setTimeout = (fn, delay = 0) => {
    timers.set(++id, { fn, at: now + delay });
    return id;
  };
  w.clearTimeout = (id) => timers.delete(id);
  w.requestAnimationFrame = (fn) => w.setTimeout(fn, 1);
  w.cancelAnimationFrame = w.clearTimeout;
  w.Element.prototype.getBoundingClientRect = () => ({
    width: 500,
    height: 300,
    top: 0,
    bottom: 300,
    left: 0,
    right: 500,
  });
  w.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.TDBConsent = { allows: () => true, subscribe: () => () => {} };
  w.Vimeo = {
    Player: class {
      constructor() {
        this.events = {};
        players.push(this);
      }
      ready() {
        return Promise.resolve();
      }
      setMuted() {
        return Promise.resolve();
      }
      on(type, fn) {
        this.events[type] = fn;
      }
      off() {}
      play() {
        this.events.play?.();
        return Promise.resolve();
      }
      pause() {
        this.events.pause?.();
        return Promise.resolve();
      }
    },
  };
  if (pace !== undefined) {
    const config = JSON.parse(fs.readFileSync('config/motion.json', 'utf8'));
    config.pace = pace;
    w.eval(
      fs
        .readFileSync('src/shared/motion-profile.js', 'utf8')
        .replace('__TDB_MOTION_PROFILE__', JSON.stringify(config)),
    );
  }
  w.eval(fs.readFileSync('src/components/vimeo.js', 'utf8'));
  const api = w.TDBVimeo.init();
  observers[0].callback([{ target: shell, isIntersecting: true }]);
  return {
    w,
    root,
    shell,
    api,
    players,
    timers,
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const next = [...timers]
          .filter(([, timer]) => timer.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].fn();
      }
      now = end;
    },
    close: () => w.close(),
  };
}

for (const pace of [undefined, 1, 1.25, 0.8])
  test(`poster removal waits for the profile fade plus the existing settle allowance at pace ${pace ?? 'fallback'}`, async () => {
    const f = setup(pace);
    try {
      await f.api.play(f.root);
      f.players[0].events.playing();
      f.advance(161);
      assert.equal(f.root.dataset.vimeoStarted, 'true');
      const wait = Math.round(450 * (pace ?? 1)) + 70;
      f.advance(wait - 1);
      assert.equal(f.root.dataset.placeholderHidden, 'false');
      f.advance(1);
      assert.equal(f.root.dataset.placeholderHidden, 'true');
      assert.equal(f.root._placeholderHideTimer, null);
    } finally {
      f.close();
    }
  });

test('pause before reveal keeps the poster and a detached player cannot be hidden by late cleanup', async () => {
  const f = setup(1.25);
  try {
    await f.api.play(f.root);
    f.players[0].events.playing();
    f.shell.querySelector('button').click();
    await Promise.resolve();
    f.advance(1000);
    assert.equal(f.root.dataset.vimeoStarted, 'false');
    assert.equal(f.root.dataset.placeholderHidden, 'false');
    await f.api.play(f.root);
    f.players[0].events.playing();
    f.advance(161);
    assert.equal(f.root.dataset.vimeoStarted, 'true');
    f.root.remove();
    f.advance(1000);
    assert.equal(f.root.dataset.placeholderHidden, 'false');
    assert.equal(f.root._placeholderHideTimer, null);
  } finally {
    f.close();
  }
});
