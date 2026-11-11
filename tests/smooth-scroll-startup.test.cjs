const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = ['src/shared/consent-decision.js', 'src/startup/smooth-scroll.js']
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
const vendor = fs.readFileSync('dist/tdb-lenis.min.js', 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setup({
  desktop = true,
  editor = false,
  failed = false,
  deferred = false,
  choice = { action: 'reject' },
} = {}) {
  const { window: w } = new JSDOM(
    '<body><main>Page</main><a href="/another-page">Link</a></body>',
    {
      runScripts: 'outside-only',
      url: 'https://dentalbarns.webflow.io/',
    },
  );
  let y = 400,
    now = 0,
    finish;
  const loads = [],
    frames = new Map();
  let nextFrame = 0;
  w.matchMedia = () => ({ matches: desktop });
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  w.requestAnimationFrame = (fn) => {
    frames.set(++nextFrame, fn);
    return nextFrame;
  };
  w.cancelAnimationFrame = (id) => frames.delete(id);
  w.performance.now = () => now;
  Object.defineProperty(w, 'scrollY', { get: () => y });
  Object.defineProperty(w.document.documentElement, 'scrollHeight', { value: 10000 });
  w.scrollTo = ({ top }) => {
    y = top;
  };
  if (editor) w.document.documentElement.classList.add('w-editor');
  const setChoice = (value) => {
    w.document.cookie =
      'CookieScriptConsent=' + encodeURIComponent(JSON.stringify(value)) + '; Path=/';
  };
  if (choice !== null) setChoice(choice);
  w.console.warn = () => {};
  w.TDBRelease = { asset: (name) => 'https://cdn.example/pinned/dist/' + name };
  w.TDBModules = {
    loadWithRecovery: async (url, options) => {
      loads.push({ url, options });
      if (deferred)
        await new Promise((resolve) => {
          finish = resolve;
        });
      if (failed) throw Error('offline');
      w.eval(vendor);
    },
  };
  const main = w.document.querySelector('main');
  const pointer = (button, target = main) =>
    target.dispatchEvent(
      new w.MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button,
        clientX: 100,
        clientY: 100,
      }),
    );
  const up = () => main.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true, button: 1 }));
  const wheel = (buttons = 0) => {
    const event = new w.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 300,
      buttons,
    });
    main.dispatchEvent(event);
    return event;
  };
  const scroll = (value) => {
    y = value;
    w.dispatchEvent(new w.Event('scroll'));
  };
  w.eval(source);
  return {
    w,
    loads,
    frames,
    pointer,
    up,
    wheel,
    scroll,
    setChoice,
    advance: (ms) => {
      now += ms;
    },
    finish: () => finish(),
    close() {
      w.lenis?.destroy?.();
      w.close();
    },
  };
}

for (const action of ['accept', 'reject']) {
  test(
    'saved ' + action + ' starts at entry before foundation/runtime/idle, once only',
    async () => {
      const f = setup({ choice: { action } });
      try {
        assert.equal(f.w.CookieScript, undefined);
        assert.equal(f.loads.length, 1);
        assert.match(f.loads[0].url, /pinned\/dist\/tdb-lenis.min.js$/);
        await tick();
        const instance = f.w.lenis;
        assert(instance instanceof f.w.Lenis);
        f.w.eval(source);
        for (const event of ['CookieScriptLoaded', 'CookieScriptAcceptAll', 'CookieScriptReject'])
          f.w.dispatchEvent(new f.w.Event(event));
        assert.equal(f.loads.length, 1);
        assert.equal(f.w.lenis, instance);
        assert.equal(f.frames.size, 1);
        assert.equal(f.wheel().defaultPrevented, true);
      } finally {
        f.close();
      }
    },
  );

  test(
    'first visit waits for ' + action + ' and the consent dialog to finish closing',
    async () => {
      const f = setup({ choice: null });
      try {
        assert.equal(f.loads.length, 0);
        f.w.dispatchEvent(new f.w.Event('CookieScriptAcceptAll'));
        assert.equal(f.loads.length, 0, 'an event alone cannot invent a decision');
        let open = true;
        f.setChoice({ action });
        f.w.CookieScript = {
          instance: {
            currentState: f.w.TDBConsentDecision.read,
            isOpen: () => open,
          },
        };
        f.w.dispatchEvent(new f.w.Event('CookieScriptCurrentState'));
        assert.equal(f.loads.length, 0, 'closing dialog retains the gate');
        open = false;
        f.w.dispatchEvent(
          new f.w.Event(action === 'accept' ? 'CookieScriptAcceptAll' : 'CookieScriptReject'),
        );
        assert.equal(f.loads.length, 1);
        await tick();
        assert.equal(f.wheel().defaultPrevented, true);
      } finally {
        f.close();
      }
    },
  );
}

for (const choice of [{ categories: ['strict', 'performance'] }, { action: 'invalid' }, null])
  test(
    'undecided or invalid saved state does not fetch Lenis: ' + JSON.stringify(choice),
    async () => {
      const f = setup({ choice });
      try {
        await tick();
        assert.equal(f.loads.length, 0);
        assert.equal(f.w.lenis, undefined);
      } finally {
        f.close();
      }
    },
  );

for (const choice of [{ action: 'acceptall' }, { a: 'accept', c: 'performance,targeting' }])
  test(
    'saved decision aliases share the native banner parser: ' + JSON.stringify(choice),
    async () => {
      const f = setup({ choice });
      try {
        await tick();
        assert.equal(f.loads.length, 1);
        assert.equal(f.w.TDBConsentDecision.read().action, 'accept');
      } finally {
        f.close();
      }
    },
  );

test('middle-button travel and a stationary autoscroll pause retain native input until exit', async () => {
  const f = setup();
  try {
    await tick();
    f.wheel();
    assert.equal(f.w.lenis.isScrolling, 'smooth');
    f.pointer(1);
    assert.equal(f.w.lenis.isScrolling, false);
    f.up();
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, true);
    for (const y of [2000, 4000, 1500, 200]) {
      f.advance(200);
      f.scroll(y);
      assert.equal(f.wheel().defaultPrevented, false);
      assert.equal(f.w.lenis.targetScroll, y);
      assert.equal(f.w.lenis.animatedScroll, y);
      assert.equal(f.w.lenis.animate.isRunning, false);
    }
    f.w.dispatchEvent(new f.w.Event('scrollend'));
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, true);
    assert.equal(f.wheel().defaultPrevented, false);
    f.pointer(0);
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, false);
    assert.equal(f.wheel().defaultPrevented, true);
  } finally {
    f.close();
  }
});

test('a delayed scrollend from interrupted wheel inertia cannot release a new middle-click gesture', async () => {
  const f = setup();
  try {
    await tick();
    f.wheel();
    f.pointer(1);
    f.up();
    f.w.dispatchEvent(new f.w.Event('scrollend'));
    f.advance(600);
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, true);
    f.scroll(800);
    f.advance(16);
    assert.equal(f.wheel().defaultPrevented, false);
    assert.equal(f.w.lenis.animate.isRunning, false);
    assert.equal(f.w.lenis.targetScroll, 800);
    f.pointer(0);
    assert.equal(f.wheel().defaultPrevented, true);
  } finally {
    f.close();
  }
});

test('normal wheel resumes on the first event after a swallowed finish click and quiet native movement', async () => {
  const f = setup();
  try {
    await tick();
    const instance = f.w.lenis;
    f.pointer(1);
    f.up();
    f.scroll(2400);
    f.advance(181);
    assert.equal(f.wheel().defaultPrevented, true);
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, false);
    assert.equal(f.w.lenis, instance);
    assert.equal(
      instance.targetScroll,
      2700,
      'resume from the actual position, without jumping back',
    );
    assert.equal(f.frames.size, 1);
  } finally {
    f.close();
  }
});

test('second middle click and hold-and-drag release both restore smoothing', async () => {
  const f = setup();
  try {
    await tick();
    f.pointer(1);
    f.up();
    f.pointer(1);
    f.up();
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, false);
    assert.equal(f.wheel().defaultPrevented, true);
    f.pointer(1);
    f.w.document.body.dispatchEvent(
      new f.w.MouseEvent('pointermove', { bubbles: true, buttons: 4, clientX: 100, clientY: 160 }),
    );
    f.up();
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, false);
    assert.equal(f.wheel().defaultPrevented, true);
  } finally {
    f.close();
  }
});

test('a normal wheel recovers when the browser consumed pointerup as well as the finishing click', async () => {
  const f = setup();
  try {
    await tick();
    f.pointer(1);
    f.scroll(2400);
    f.advance(181);
    assert.equal(f.wheel().defaultPrevented, true);
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, false);
    assert.equal(f.w.lenis.targetScroll, 2700);
  } finally {
    f.close();
  }
});

test('held middle button, nested scrollend and a previous Lenis completion cannot release an active gesture', async () => {
  const f = setup();
  try {
    await tick();
    f.pointer(1);
    f.advance(500);
    f.w.dispatchEvent(new f.w.Event('scrollend'));
    assert.equal(f.wheel(4).defaultPrevented, false);
    f.up();
    f.w.document.querySelector('main').dispatchEvent(new f.w.Event('scrollend', { bubbles: true }));
    f.w.dispatchEvent(new f.w.CustomEvent('scrollend', { detail: { lenisScrollEnd: true } }));
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, true);
    f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, false);
    assert.equal(f.wheel().defaultPrevented, true);
  } finally {
    f.close();
  }
});

test('autoscroll started while Lenis downloads retains priority; primary click restores smoothing', async () => {
  const f = setup({ deferred: true });
  try {
    f.pointer(1);
    f.scroll(1700);
    f.finish();
    await tick();
    assert.equal(f.wheel().defaultPrevented, false);
    assert.equal(f.w.lenis.targetScroll, 1700);
    f.pointer(0);
    assert.equal(f.wheel().defaultPrevented, true);
  } finally {
    f.close();
  }
});

test('middle-click link keeps its default action and page restore rebases the existing instance', async () => {
  const f = setup();
  try {
    await tick();
    const instance = f.w.lenis;
    f.pointer(1, f.w.document.querySelector('a'));
    assert.equal(f.w.TDBSmoothScroll.nativeAutoscroll, false);
    f.wheel();
    f.w.dispatchEvent(new f.w.Event('pagehide'));
    f.scroll(2400);
    f.w.dispatchEvent(new f.w.Event('pageshow'));
    assert.equal(f.w.lenis, instance);
    assert.equal(f.w.lenis.targetScroll, 2400);
    assert.equal(f.frames.size, 1);
  } finally {
    f.close();
  }
});

for (const options of [{ desktop: false }, { editor: true }, { failed: true }])
  test(
    'unsupported desktop or failed asset leaves native scrolling usable ' + JSON.stringify(options),
    async () => {
      const f = setup(options);
      try {
        await tick();
        assert.equal(f.w.lenis, undefined);
        assert.equal(f.wheel().defaultPrevented, false);
      } finally {
        f.close();
      }
    },
  );
