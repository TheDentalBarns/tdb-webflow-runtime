const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(
  count = 6,
  mobileWidth = false,
  loop = mobileWidth,
  confirmLinks = false,
  options = {},
) {
  const dom = new JSDOM(
    `<section data-tdb-treatment-postage>
    <div class="swiper">${Array.from({ length: count }, (_, i) => `<div data-swiper-slide-index="${i}"><h3 class="tdb-treatment-title">Treatment ${i}</h3></div>`).join('')}</div><div data-tdb-native-progress></div>
    <div data-tdb-treatment-stamps><div class="tdb-treatment-controls"><div class="tdb-treatment-wrapper">
    ${Array.from(
      { length: count },
      (_, i) => `<div class="tdb-treatment-card"><a
    data-tdb-treatment-stamp href="/treatments/${i}">Treatment ${i}</a></div>`,
    ).join('')}
    </div></div></div></section>`,
    { runScripts: 'outside-only', url: 'https://example.test' },
  );
  const w = dom.window,
    root = w.document.querySelector('section');
  const viewport = root.querySelector('.tdb-treatment-controls');
  const track = viewport.firstElementChild;
  if (confirmLinks) {
    root
      .querySelector('[data-tdb-treatment-stamps]')
      .setAttribute('data-tdb-stamp-link-mode', 'confirm');
    root.querySelectorAll('[data-tdb-treatment-stamp]').forEach((link) => {
      const imageWrap = w.document.createElement('div');
      imageWrap.className = 'tdb-treatment-image-wrap tdb-stamp-confirmation';
      imageWrap.append(w.document.createElement('img'));
      link.prepend(imageWrap);
    });
  }
  root.setAttribute('data-tdb-treatment-loop', String(loop));
  Object.defineProperty(viewport, 'clientWidth', { get: () => 800 });
  Object.defineProperty(viewport, 'scrollWidth', {
    get: () => Math.max(800, track.children.length * 220 - 20),
    configurable: true,
  });
  const items = [...root.querySelectorAll('.tdb-treatment-card')];
  const links = [...root.querySelectorAll('a')],
    listeners = {};
  const media = { matches: mobileWidth };
  w.matchMedia = () => media;
  let clock = 0,
    frameId = 0;
  const frames = new Map();
  w.performance.now = () => clock;
  Object.defineProperty(w.Event.prototype, 'timeStamp', { get: () => clock, configurable: true });
  w.requestAnimationFrame = (fn) => {
    frames.set(++frameId, fn);
    return frameId;
  };
  w.cancelAnimationFrame = (id) => frames.delete(id);
  w.TDBMotion = { duration: () => 500, reduced: { matches: false } };
  w.HTMLElement.prototype.setPointerCapture = () => {};
  function tick(ms) {
    clock += ms;
    const running = [...frames.values()];
    frames.clear();
    running.forEach((fn) => fn(clock));
  }
  // Behaviour checks observe the rendered frame following each movement.
  // Burst/lifecycle checks opt out to exercise multiple events before a frame.
  if (options.autoFrame !== false) {
    const dispatch = w.EventTarget.prototype.dispatchEvent;
    w.EventTarget.prototype.dispatchEvent = function (event) {
      const result = dispatch.call(this, event);
      if (event.type === 'pointermove' || event.type === 'touchmove') tick(0);
      return result;
    };
  }
  w.Element.prototype.animate = function (frames) {
    this.dataset.finalOpacity = frames.at(-1).opacity;
    this.dataset.finalColor = frames.at(-1).color;
    return { cancel() {} };
  };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      left: 50 + [...this.parentElement.children].indexOf(this) * 220 - viewport.scrollLeft,
      width: 200,
    };
  };
  root.querySelector('[data-tdb-native-progress]').getBoundingClientRect = () => ({ width: 800 });
  const swiper = (root.querySelector('.swiper').swiper = {
    slides: [...root.querySelector('.swiper').children],
    realIndex: 0,
    animating: false,
    params: { loop },
    on(events, callback) {
      for (const name of events.split(' ')) (listeners[name] ||= []).push(callback);
    },
    off(event, callback) {
      listeners[event] = listeners[event]?.filter((fn) => fn !== callback);
    },
    slideToLoop(index) {
      this.realIndex = index;
      listeners.slideChange?.forEach((fn) => fn());
    },
    slideTo(index) {
      this.slideToLoop(index);
    },
  });
  w.eval(fs.readFileSync(options.source || 'src/sliders/treatment-stamps.js', 'utf8'));
  const controller = w.TDBTreatmentStamps.prepare(root);
  return {
    dom,
    w,
    root,
    viewport,
    track,
    items,
    links,
    swiper,
    controller,
    media,
    tick,
    frames,
    elapse: (ms) => {
      clock += ms;
    },
  };
}

test('inactive stamps select only; settled active stamps preview then follow the CMS link', () => {
  const f = fixture(6, false, false, true);
  const clicks = [];
  f.root.addEventListener('click', (e) => {
    clicks.push(e.defaultPrevented);
    e.preventDefault();
  });
  try {
    f.controller.measure();
    f.links[0].click();
    assert.equal(clicks.at(-1), true, 'initially active stamp still requires a preview press');
    assert.equal(f.links[0].hasAttribute('data-tdb-stamp-link-ready'), true);
    assert.equal(f.links[0].getAttribute('aria-label'), 'Open Treatment 0 treatment');
    assert.equal(f.links[0].getAttribute('href'), '/treatments/0');
    f.links[0].click();
    assert.equal(clicks.at(-1), false, 'second press follows the original link');
    f.links[2].click();
    assert.equal(clicks.at(-1), true);
    assert.equal(f.swiper.realIndex, 2);
    assert.equal(f.links[0].hasAttribute('data-tdb-stamp-link-ready'), false);
    assert.equal(f.links[0].hasAttribute('aria-label'), false);
    assert.equal(
      f.links[2].hasAttribute('data-tdb-stamp-link-ready'),
      false,
      'selection stays highlighted',
    );
    f.links[2].click();
    assert.equal(
      f.links[2].hasAttribute('data-tdb-stamp-link-ready'),
      true,
      'next press previews the active link',
    );
    f.swiper.slideTo(3);
    assert.equal(
      f.links[2].hasAttribute('data-tdb-stamp-link-ready'),
      false,
      'main arrow clears link state',
    );
    f.links[3].click();
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    assert.equal(f.links[3].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.links[3].click();
    assert.equal(clicks.at(-1), true, 'scrolling requires a fresh preview');
    const modified = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    f.links[1].dispatchEvent(modified);
    assert.equal(clicks.at(-1), false, 'modified clicks retain browser behavior');
  } finally {
    f.dom.window.close();
  }
});

function edgePointer(f, type, x, y = 100, target = f.viewport) {
  const event = new f.w.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(event);
}

function finger(f, type, x, y = 100, options = {}) {
  const target = options.target || f.links[0];
  const point = { identifier: options.id ?? 0, clientX: x, clientY: y, target };
  const event = new f.w.Event(type, { bubbles: true, cancelable: options.cancelable ?? true });
  Object.assign(event, {
    changedTouches: [point],
    touches:
      type === 'touchend' || type === 'touchcancel'
        ? []
        : options.multi
          ? [point, { identifier: 7 }]
          : [point],
  });
  target.dispatchEvent(event);
  return event;
}

test('native stamp dragging shares page locking and releases it before coasting or disposal', () => {
  const f = fixture(6, true, false);
  try {
    f.w.eval(
      fs
        .readFileSync('src/shared/scroll-lock.js', 'utf8')
        .replace(
          '__TDB_SCROLL_LOCK_CSS__',
          JSON.stringify(fs.readFileSync('src/styles/tdb-scroll-lock.css', 'utf8')),
        ),
    );
    f.w.eval(fs.readFileSync('dist/tdb-swiper-8.4.7.min.js', 'utf8'));
    f.controller.measure();
    finger(f, 'touchstart', 300);
    finger(f, 'touchmove', 299, 130);
    assert.equal(f.w.TDBScrollLock.active, false);
    finger(f, 'touchend', 299, 130);
    finger(f, 'touchstart', 300);
    f.tick(16);
    finger(f, 'touchmove', 250);
    assert.equal(f.w.TDBScrollLock.active, true);
    edgePointer(f, 'pointercancel', 250);
    assert.equal(
      f.w.TDBScrollLock.active,
      true,
      'native touch continues after its duplicate pointer stream is cancelled',
    );
    finger(f, 'touchend', 250);
    assert.equal(
      f.w.TDBScrollLock.active,
      false,
      'horizontal coast must not prevent the next vertical gesture',
    );
    finger(f, 'touchstart', 250);
    finger(f, 'touchmove', 200);
    assert.equal(f.w.TDBScrollLock.active, true);
    f.controller.dispose();
    assert.equal(f.w.TDBScrollLock.active, false);
  } finally {
    f.dom.window.close();
  }
});

test('a burst of finger samples commits one visual update and retains the final release position', () => {
  const f = fixture(6, true, false, false, { autoFrame: false });
  try {
    f.controller.measure();
    let position = 100,
      reads = 0,
      writes = 0;
    Object.defineProperty(f.viewport, 'scrollLeft', {
      get() {
        reads++;
        return position;
      },
      set(v) {
        writes++;
        position = v;
      },
    });
    finger(f, 'touchstart', 300);
    reads = writes = 0;
    for (let i = 1; i <= 80; i++) {
      f.elapse(0.2);
      finger(f, 'touchmove', 300 - i);
    }
    assert.equal(reads, 0, 'no native scroll read in the high-frequency input path');
    assert.equal(writes, 0, 'visual changes wait for the display frame');
    assert.equal(f.frames.size, 1);
    f.tick(0);
    assert.equal(reads, 1);
    assert.equal(writes, 1);
    assert.equal(position, 180);
    f.elapse(2);
    finger(f, 'touchmove', 210);
    finger(f, 'touchend', 210);
    assert.equal(position, 190, 'release flushes the final queued position');
    assert.equal(f.frames.size, 1, 'only the coast frame remains');
    f.tick(16);
    assert.ok(position > 190, 'all input timestamps still inform momentum');
  } finally {
    f.dom.window.close();
  }
});

test('batched resistance and loop recycling match rendering every sample, including reversals', () => {
  for (const loop of [false, true]) {
    const live = fixture(6, true, loop);
    const batched = fixture(6, true, loop, false, { autoFrame: false });
    try {
      for (const f of [live, batched]) {
        f.controller.measure();
        f.viewport.scrollLeft = loop ? 1400 : 0;
        finger(f, 'touchstart', 300);
        for (const x of [350, 900, 850, 700, 280, -700, -650, -400, 200, 350]) {
          f.elapse(2);
          finger(f, 'touchmove', x);
        }
      }
      batched.tick(0);
      assert.equal(batched.viewport.scrollLeft, live.viewport.scrollLeft);
      assert.equal(batched.track.style.translate, live.track.style.translate);
      for (const f of [live, batched]) finger(f, 'touchend', 350);
      for (let i = 0; i < 140; i++) {
        live.tick(16);
        batched.tick(16);
        assert.equal(batched.viewport.scrollLeft, live.viewport.scrollLeft);
        assert.equal(batched.track.style.translate, live.track.style.translate);
      }
      assert.equal(batched.frames.size, 0);
    } finally {
      live.dom.window.close();
      batched.dom.window.close();
    }
  }
});

test('re-grab, measuring, cancellation, wheel and disposal leave no stale drag-frame write', () => {
  for (const finish of ['regrab', 'measure', 'cancel', 'wheel', 'dispose']) {
    const f = fixture(6, true, false, false, { autoFrame: false });
    try {
      f.controller.measure();
      finger(f, 'touchstart', 300);
      finger(f, 'touchmove', 250);
      if (finish === 'regrab') {
        finger(f, 'touchend', 250);
        finger(f, 'touchstart', 200);
        finger(f, 'touchmove', 190);
        finger(f, 'touchend', 190);
      } else if (finish === 'measure') {
        f.controller.measure();
        finger(f, 'touchcancel', 250);
      } else if (finish === 'cancel') finger(f, 'touchcancel', 250);
      else if (finish === 'wheel') f.viewport.dispatchEvent(new f.w.Event('wheel'));
      else f.controller.dispose();
      assert.equal(f.viewport.scrollLeft, finish === 'regrab' ? 60 : 50);
      assert.equal(f.frames.size, 0);
      f.tick(32);
      assert.equal(f.viewport.scrollLeft, finish === 'regrab' ? 60 : 50);
    } finally {
      f.dom.window.close();
    }
  }
});

test('native finger stream continues past pointer cancellation and cancels horizontal browser scrolling early', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    let captures = 0;
    let holdsFocus;
    f.w.TDBSliderFocus = {
      focus: (target, hold) => {
        holdsFocus = hold;
      },
    };
    f.viewport.setPointerCapture = () => captures++;
    edgePointer(f, 'pointerdown', 300);
    finger(f, 'touchstart', 300);
    f.tick(16);
    assert.equal(
      finger(f, 'touchmove', 295).defaultPrevented,
      true,
      'first small horizontal move owns scrolling',
    );
    edgePointer(f, 'pointercancel', 295);
    edgePointer(f, 'lostpointercapture', 295);
    f.tick(16);
    finger(f, 'touchmove', 270);
    assert.equal(
      f.viewport.scrollLeft,
      30,
      'pointer cancellation does not terminate the touch sequence',
    );
    edgePointer(f, 'pointermove', 220);
    assert.equal(f.viewport.scrollLeft, 30, 'parallel pointer stream cannot double-write motion');
    f.tick(16);
    finger(f, 'touchmove', 250);
    assert.equal(f.viewport.scrollLeft, 50);
    assert.equal(captures, 0, 'touch drag never transfers pointer capture');
    assert.equal(holdsFocus(), true, 'shared slider focus stays held during the native drag');
    finger(f, 'touchend', 250);
    assert.equal(holdsFocus(), false, 'release also releases the shared focus hold');
    f.tick(16);
    assert.ok(f.viewport.scrollLeft > 50, 'release retains the existing throw');
    const compatibility = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1,
    });
    Object.defineProperty(compatibility, 'pointerId', { value: 123 });
    f.links[2].dispatchEvent(compatibility);
    assert.equal(compatibility.defaultPrevented, true);
    assert.equal(f.swiper.realIndex, 0, 'drag click cannot select');
    f.links[2].click();
    assert.equal(f.swiper.realIndex, 2, 'keyboard activation is never suppressed');
  } finally {
    f.dom.window.close();
  }
});

test('native vertical gestures leave page scrolling available and never select a stamp', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    finger(f, 'touchstart', 300);
    assert.equal(finger(f, 'touchmove', 299, 125).defaultPrevented, false);
    assert.equal(
      finger(f, 'touchmove', 200, 130).defaultPrevented,
      false,
      'vertical ownership is not stolen back',
    );
    finger(f, 'touchend', 200, 130);
    assert.equal(f.viewport.scrollLeft, 0);
    assert.equal(f.swiper.realIndex, 0);
    assert.equal(f.frames.size, 0);
  } finally {
    f.dom.window.close();
  }
});

test('a second finger or native cancellation releases the edge without throw or activation', () => {
  for (const ending of ['touchstart', 'touchmove', 'touchcancel']) {
    const f = fixture(6, true, false);
    try {
      f.controller.measure();
      finger(f, 'touchstart', 300);
      f.tick(16);
      finger(f, 'touchmove', 400);
      assert.ok(parseFloat(f.track.style.translate) > 0);
      const event = finger(f, ending, 400, 100, { multi: true });
      assert.equal(event.defaultPrevented, false, 'pinch/cancel is not prevented');
      for (let i = 0; i < 65; i++) f.tick(16);
      finger(f, 'touchmove', 200);
      finger(f, 'touchend', 200);
      assert.equal(f.track.style.translate, '');
      assert.equal(f.viewport.scrollLeft, 0);
      assert.equal(f.frames.size, 0);
      assert.equal(f.swiper.realIndex, 0);
      finger(f, 'touchstart', 200, 100, { target: f.links[2] });
      finger(f, 'touchend', 200, 100, { target: f.links[2] });
      assert.equal(f.swiper.realIndex, 2, 'next independent tap still works');
    } finally {
      f.dom.window.close();
    }
  }
});

test('native touch taps preserve selected-stamp confirmation and suppress only the compatibility click', () => {
  const f = fixture(6, true, false, true);
  try {
    f.controller.measure();
    let followed = 0;
    f.root.addEventListener('click', (e) => {
      if (!e.defaultPrevented) followed++;
      e.preventDefault();
    });
    for (let i = 0; i < 2; i++) {
      edgePointer(f, 'pointerdown', 200, 100, f.links[0]);
      finger(f, 'touchstart', 200);
      finger(f, 'touchend', 200);
      edgePointer(f, 'pointerup', 200);
      if (i === 0) assert.equal(f.links[0].hasAttribute('data-tdb-stamp-link-ready'), true);
      const compatibility = new f.w.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        detail: 1,
      });
      Object.defineProperty(compatibility, 'pointerId', { value: 123 });
      f.links[0].dispatchEvent(compatibility);
      assert.equal(compatibility.defaultPrevented, true);
    }
    assert.equal(followed, 1, 'two taps preview then follow the original CMS link exactly once');
  } finally {
    f.dom.window.close();
  }
});

test('uncancellable native scrolling and disposal never leave a second touch writer running', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    finger(f, 'touchstart', 300);
    finger(f, 'touchmove', 200, 100, { cancelable: false });
    finger(f, 'touchend', 200);
    assert.equal(f.viewport.scrollLeft, 0, 'do not fight an already committed browser gesture');
    assert.equal(f.frames.size, 0);
    finger(f, 'touchstart', 300);
    finger(f, 'touchmove', 250);
    assert.equal(f.viewport.scrollLeft, 50);
    f.controller.dispose();
    const event = finger(f, 'touchmove', 200);
    finger(f, 'touchend', 200);
    assert.equal(event.defaultPrevented, false, 'non-passive listener is removed on disposal');
    assert.equal(f.viewport.scrollLeft, 50);
    assert.equal(f.frames.size, 0);
  } finally {
    f.dom.window.close();
  }
});

test('both finite edges resist pulls and settle without selecting, oscillating or retaining a frame', () => {
  for (const end of [0, 500]) {
    for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      const f = fixture(6, true, false);
      try {
        f.controller.measure();
        f.viewport.scrollLeft = end;
        const direction = end ? -1 : 1;
        edgePointer(f, 'pointerdown', 300);
        f.tick(16);
        edgePointer(f, 'pointermove', 300 + direction * 200);
        const offset = parseFloat(f.track.style.translate);
        assert.ok(offset * direction > 0 && Math.abs(offset) < 80);
        assert.equal(f.viewport.style.translate, '', 'only the inner track moves');
        assert.equal(f.viewport.scrollLeft, end);
        edgePointer(f, ending, 300 + direction * 200);
        let previous = Math.abs(offset);
        for (let i = 0; i < 60; i++) {
          f.tick(16);
          const next = parseFloat(f.track.style.translate) || 0;
          assert.ok(next * direction >= 0 && Math.abs(next) <= previous);
          assert.equal(f.viewport.scrollLeft, end);
          assert.ok(f.frames.size <= 1, 'one animation writer');
          previous = Math.abs(next);
        }
        assert.equal(f.track.style.translate, '');
        assert.equal(f.frames.size, 0);
        assert.equal(f.swiper.realIndex, 0);
      } finally {
        f.dom.window.close();
      }
    }
  }
});

test('edge resistance is independent of pointer sampling and reverses without a dead zone', () => {
  const offsets = [];
  for (const steps of [1, 10, 40]) {
    const f = fixture(6, true, false);
    try {
      f.controller.measure();
      edgePointer(f, 'pointerdown', 300);
      for (let i = 1; i <= steps; i++) edgePointer(f, 'pointermove', 300 + (i * 400) / steps);
      const offset = parseFloat(f.track.style.translate);
      offsets.push(offset);
      edgePointer(f, 'pointermove', 680);
      assert.ok(Math.abs(parseFloat(f.track.style.translate) - offset + 20) < 0.001);
      edgePointer(f, 'pointermove', 600);
      assert.equal(f.track.style.translate, '');
      assert.ok(Math.abs(f.viewport.scrollLeft - (100 - offset)) < 0.001);
    } finally {
      f.dom.window.close();
    }
  }
  assert.ok(Math.max(...offsets) - Math.min(...offsets) < 0.001);
});

test('a throw enters the same small edge spring at different refresh rates', () => {
  const offsets = [];
  for (const interval of [8, 16, 32]) {
    const f = fixture(6, true, false);
    try {
      f.controller.measure();
      f.viewport.scrollLeft = 420;
      edgePointer(f, 'pointerdown', 300);
      f.tick(20);
      edgePointer(f, 'pointermove', 290);
      f.tick(20);
      edgePointer(f, 'pointermove', 280);
      edgePointer(f, 'pointerup', 280);
      for (let elapsed = 0; elapsed < 256; elapsed += interval) f.tick(interval);
      assert.equal(f.viewport.scrollLeft, 500);
      const offset = parseFloat(f.track.style.translate);
      assert.ok(offset < 0 && offset > -30);
      offsets.push(offset);
      f.tick(1000);
      assert.equal(f.track.style.translate, '');
      assert.equal(f.frames.size, 0);
    } finally {
      f.dom.window.close();
    }
  }
  assert.ok(Math.max(...offsets) - Math.min(...offsets) < 0.001);
});

test('re-grabbing a returning edge holds its pose and vertical scrolling releases it', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    edgePointer(f, 'pointerdown', 300);
    edgePointer(f, 'pointermove', 500);
    edgePointer(f, 'pointerup', 500);
    f.tick(64);
    const offset = parseFloat(f.track.style.translate);
    edgePointer(f, 'pointerdown', 300);
    f.tick(64);
    assert.equal(parseFloat(f.track.style.translate), offset);
    edgePointer(f, 'pointermove', 290);
    assert.ok(Math.abs(parseFloat(f.track.style.translate) - offset + 10) < 0.001);
    edgePointer(f, 'pointerup', 290);
    edgePointer(f, 'pointerdown', 300);
    edgePointer(f, 'pointermove', 301, 130);
    f.tick(1000);
    assert.equal(f.track.style.translate, '');
    assert.equal(f.frames.size, 0);
  } finally {
    f.dom.window.close();
  }
});

test('resizing while stretched measures the resting track and keeps the correct scroll limit', () => {
  const f = fixture(6, true, false);
  try {
    let measuredWithOffset = false;
    Object.defineProperty(f.viewport, 'scrollWidth', {
      get() {
        const edge = parseFloat(f.track.style.translate) || 0;
        measuredWithOffset ||= Boolean(edge);
        return 1300 + Math.max(0, edge);
      },
    });
    f.controller.measure();
    edgePointer(f, 'pointerdown', 300);
    edgePointer(f, 'pointermove', 500);
    const edge = f.track.style.translate;
    f.controller.measure();
    assert.equal(f.track.style.translate, edge, 'measurement preserves the visible pose');
    assert.equal(measuredWithOffset, false);
    edgePointer(f, 'pointermove', -500);
    assert.equal(f.viewport.scrollLeft, 500, 'transformed overflow did not enlarge the limit');
  } finally {
    f.dom.window.close();
  }
});

test('selection, reduced motion, non-overflowing strips and disposal clear edge motion correctly', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.dispose();
    f.track.style.setProperty('translate', '0px 0px', 'important');
    f.controller = f.w.TDBTreatmentStamps.prepare(f.root);
    f.controller.measure();
    edgePointer(f, 'pointerdown', 300);
    edgePointer(f, 'pointermove', 500);
    edgePointer(f, 'pointerup', 500);
    const edge = parseFloat(f.track.style.translate);
    f.links[2].click();
    f.tick(250);
    assert.ok(
      parseFloat(f.track.style.translate) > 0 && parseFloat(f.track.style.translate) < edge,
    );
    assert.ok(f.viewport.scrollLeft > 0 && f.viewport.scrollLeft < 200);
    f.tick(250);
    assert.equal(f.viewport.scrollLeft, 200);
    assert.equal(f.track.style.translate, '0px 0px');
    assert.equal(f.track.style.getPropertyPriority('translate'), 'important');
    f.viewport.scrollLeft = 0;
    f.w.TDBMotion.reduced.matches = true;
    edgePointer(f, 'pointerdown', 300);
    edgePointer(f, 'pointermove', 500);
    edgePointer(f, 'pointerup', 500);
    assert.equal(f.track.style.translate, '0px 0px');
    assert.equal(f.frames.size, 0);
    f.w.TDBMotion.reduced.matches = false;
    edgePointer(f, 'pointerdown', 300);
    edgePointer(f, 'pointermove', 500);
    edgePointer(f, 'pointerup', 500);
    f.controller.dispose();
    assert.equal(f.track.style.translate, '0px 0px');
    assert.equal(f.track.style.getPropertyPriority('translate'), 'important');
    assert.equal(f.frames.size, 0);
  } finally {
    f.dom.window.close();
  }
  const single = fixture(1, true, false);
  try {
    single.controller.measure();
    edgePointer(single, 'pointerdown', 300);
    edgePointer(single, 'pointermove', 500);
    edgePointer(single, 'pointerup', 500);
    single.tick(1000);
    assert.equal(single.viewport.scrollLeft, 0);
    assert.equal(single.track.style.translate, '');
    assert.equal(single.frames.size, 0);
  } finally {
    single.dom.window.close();
  }
});

test('a moving focus card cannot arm or follow a stamp link', () => {
  const f = fixture(6, false, false, true);
  f.root.addEventListener('click', (e) => e.preventDefault());
  try {
    f.controller.measure();
    f.links[2].click();
    f.swiper.animating = true;
    f.links[2].click();
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.swiper.animating = false;
    f.links[2].click();
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), true);
  } finally {
    f.dom.window.close();
  }
});

test('touch selects, then previews and follows without needing compatibility clicks', () => {
  const f = fixture(6, true, false, true);
  let navigations = 0;
  f.root.addEventListener('click', (e) => {
    if (!e.defaultPrevented) navigations++;
    e.preventDefault();
  });
  const pointer = (name, id, x = 200) => {
    const e = new f.w.Event(name, { bubbles: true, cancelable: true });
    Object.assign(e, {
      button: 0,
      isPrimary: true,
      pointerId: id,
      pointerType: 'touch',
      clientX: x,
      clientY: 50,
    });
    f.links[2].dispatchEvent(e);
  };
  try {
    f.controller.measure();
    pointer('pointerdown', 1);
    pointer('pointerup', 1);
    assert.equal(navigations, 0);
    assert.equal(f.swiper.realIndex, 2);
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.tick(500);
    pointer('pointerdown', 2);
    pointer('pointerup', 2);
    assert.equal(navigations, 0, 'active stamp previews before following');
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), true);
    pointer('pointerdown', 3);
    pointer('pointerup', 3);
    assert.equal(navigations, 1);
    const compatibility = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1,
    });
    Object.defineProperty(compatibility, 'pointerId', { value: 3 });
    f.links[2].dispatchEvent(compatibility);
    assert.equal(navigations, 1, 'browser compatibility click cannot navigate twice');
    pointer('pointerdown', 4);
    f.tick(20);
    pointer('pointermove', 4, 180);
    pointer('pointerup', 4, 180);
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false, 'drag disarms');
    pointer('pointerdown', 5);
    pointer('pointerup', 5);
    assert.equal(navigations, 1, 'first tap after dragging only returns to selection');
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), false);
    f.tick(500);
    pointer('pointerdown', 6);
    pointer('pointerup', 6);
    assert.equal(f.links[2].hasAttribute('data-tdb-stamp-link-ready'), true);
  } finally {
    f.dom.window.close();
  }
});

test('mouse and tablet touch have the same frame-rate-independent coast and immediate re-grab', () => {
  const distances = [];
  for (const type of ['mouse', 'touch'])
    for (const step of [8, 16, 32]) {
      const f = fixture(6, false, false);
      const pointer = (name, x) => {
        const e = new f.w.Event(name, { bubbles: true, cancelable: true });
        Object.assign(e, {
          button: 0,
          isPrimary: true,
          pointerId: 1,
          pointerType: type,
          clientX: x,
          clientY: 50,
        });
        f.viewport.dispatchEvent(e);
      };
      try {
        f.controller.measure();
        pointer('pointerdown', 300);
        f.tick(20);
        pointer('pointermove', 290);
        f.tick(20);
        pointer('pointermove', 280);
        pointer('pointerup', 280);
        const released = f.viewport.scrollLeft;
        for (let t = 0; t < 320; t += step) f.tick(step);
        assert.ok(
          f.viewport.scrollLeft > released + 70,
          'release glides instead of stopping abruptly',
        );
        distances.push(f.viewport.scrollLeft);
        const caught = f.viewport.scrollLeft;
        pointer('pointerdown', 200);
        f.tick(100);
        assert.equal(
          f.viewport.scrollLeft,
          caught,
          'grabbing stops the coast at its current position',
        );
        pointer('pointermove', 190);
        assert.equal(
          f.viewport.scrollLeft,
          caught + 10,
          'pointer follows one-to-one without jumping',
        );
        assert.equal(f.swiper.realIndex, 0, 'browsing never auto-selects');
      } finally {
        f.dom.window.close();
      }
    }
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.001);
});

test('queued mobile release uses gesture timestamps rather than handler delivery time', () => {
  const f = fixture(6, true, false);
  const pointer = (type, x, timeStamp) => {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
      clientX: x,
      clientY: 50,
    });
    Object.defineProperty(event, 'timeStamp', { value: timeStamp });
    f.viewport.dispatchEvent(event);
  };
  try {
    f.controller.measure();
    pointer('pointerdown', 300, 0);
    f.tick(20);
    pointer('pointermove', 290, 20);
    f.tick(20);
    pointer('pointermove', 280, 40);
    f.tick(120);
    pointer('pointerup', 280, 45);
    const released = f.viewport.scrollLeft;
    f.tick(160);
    f.tick(160);
    assert.ok(
      f.viewport.scrollLeft > released + 70,
      'a queued release must retain the real finger velocity',
    );
  } finally {
    f.dom.window.close();
  }
});

test('integer scroll positions retain the marquee decay tail at different refresh rates', () => {
  for (const step of [8, 20, 40]) {
    const f = fixture(6, true, false);
    let position = 0;
    Object.defineProperty(f.viewport, 'scrollLeft', {
      get: () => position,
      set: (value) => {
        position = Math.round(value);
      },
    });
    const pointer = (type, x) => {
      const event = new f.w.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        button: 0,
        pointerId: 1,
        pointerType: 'touch',
        clientX: x,
        clientY: 50,
      });
      f.viewport.dispatchEvent(event);
    };
    try {
      f.controller.measure();
      pointer('pointerdown', 300);
      f.tick(20);
      pointer('pointermove', 290);
      f.tick(20);
      pointer('pointermove', 280);
      pointer('pointerup', 280);
      for (let t = 0; t < 1000; t += step) f.tick(step);
      const expected = Math.round(20 + (0.5 * (1 - Math.exp(-4.2))) / 0.0042);
      assert.ok(
        Math.abs(position - expected) <= 1,
        `${step}ms frames preserve fractional travel: ${position} vs ${expected}`,
      );
    } finally {
      f.dom.window.close();
    }
  }
});

test('holding before release kills stale momentum, and reduced motion stops at release', () => {
  for (const reduced of [false, true]) {
    const f = fixture(6, false, false);
    const pointer = (name, x) => {
      const e = new f.w.Event(name, { bubbles: true, cancelable: true });
      Object.assign(e, { button: 0, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: 50 });
      f.viewport.dispatchEvent(e);
    };
    try {
      f.controller.measure();
      f.w.TDBMotion.reduced.matches = reduced;
      pointer('pointerdown', 300);
      f.tick(20);
      pointer('pointermove', 270);
      if (!reduced) f.tick(110);
      pointer('pointerup', 270);
      f.tick(400);
      assert.equal(f.viewport.scrollLeft, 30);
      assert.equal(f.frames.size, 0);
    } finally {
      f.dom.window.close();
    }
  }
});
test('native stamps align first, intermediate and last positions with the progress marker', () => {
  const f = fixture();
  try {
    assert.equal(f.controller.measure(), 200);
    for (const i of [0, 2, 5]) {
      f.swiper.slideToLoop(i);
      const marker = (i * 600) / 5;
      f.controller.paint(i, marker, 800);
      assert.equal(f.items[i].getBoundingClientRect().left, 50 + marker);
      assert.equal(f.links[i].getAttribute('aria-current'), 'true');
      assert.equal(f.links.filter((l) => l.hasAttribute('aria-current')).length, 1);
      assert.deepEqual(
        f.swiper.slides.map((s) => s.querySelector('h3').dataset.finalColor),
        Array.from({ length: 6 }, (_, index) =>
          index === i ? '#ffffff' : 'rgba(255,255,255,0.5)',
        ),
      );
    }
  } finally {
    f.dom.window.close();
  }
});
test('manual scroll does not select an image or get pulled back by progress; click resumes alignment', () => {
  const f = fixture();
  try {
    f.controller.measure();
    f.swiper.slideToLoop(5);
    f.controller.paint(5, 600, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 100;
    f.controller.paint(5, 600, 800);
    assert.equal(f.viewport.scrollLeft, 100);
    assert.equal(f.swiper.realIndex, 5);
    f.links[0].click();
    assert.equal(f.swiper.realIndex, 0);
    assert.equal(f.viewport.scrollLeft, 100, 'desktop return starts at the manual position');
    f.tick(250);
    assert.ok(f.viewport.scrollLeft > 0 && f.viewport.scrollLeft < 100);
    f.tick(250);
    assert.equal(f.viewport.scrollLeft, 0);
  } finally {
    f.dom.window.close();
  }
});
test('CMS navigation leaves modified clicks and unenhanced links usable', () => {
  const f = fixture();
  try {
    const click = new f.w.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    f.links[2].dispatchEvent(click);
    assert.equal(click.defaultPrevented, false);
    assert.equal(f.swiper.realIndex, 0);
    f.root.removeAttribute('data-tdb-treatment-postage');
    assert.equal(f.w.TDBTreatmentStamps.prepare(f.root), null);
  } finally {
    f.dom.window.close();
  }
});
test('single CMS treatment and loop seam produce finite scroll positions', () => {
  for (const count of [1, 6]) {
    const f = fixture(count);
    try {
      f.controller.measure();
      f.controller.paint(count - 0.5, 750, 800);
      assert.ok(Number.isFinite(f.viewport.scrollLeft));
      assert.ok(f.viewport.scrollLeft >= 0);
    } finally {
      f.dom.window.close();
    }
  }
});

test('mobile stamps recycle complete cycles in either direction without selecting another treatment', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    assert.equal(f.track.children.length, 18);
    assert.equal(f.viewport.querySelectorAll('[aria-hidden="true"]').length, 12);
    f.controller.paint(0, 0, 800);
    assert.equal(f.items[0].getBoundingClientRect().left, 50);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    const cycle = 6 * 220;
    for (const pos of [20, 2100, 10, 2200]) {
      f.viewport.scrollLeft = pos;
      f.viewport.dispatchEvent(new f.w.Event('scroll'));
      assert.ok(f.viewport.scrollLeft >= cycle / 2);
      assert.ok(f.viewport.scrollLeft < cycle * 1.5);
      assert.equal(Math.abs((f.viewport.scrollLeft - pos) % cycle), 0);
      assert.equal(f.swiper.realIndex, 0);
    }
  } finally {
    f.dom.window.close();
  }
});

test('mobile seam continues into the next set and duplicate stamps select the original CMS destination', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.controller.paint(5.99, 798, 800);
    const before = f.viewport.scrollLeft;
    f.controller.paint(0, 0, 800);
    assert.ok(Math.abs(f.viewport.scrollLeft - before) < 10, 'no visible reset at the seam');
    const repeated = f.viewport.firstElementChild.querySelector('a');
    const click = new f.w.MouseEvent('click', { bubbles: true, cancelable: true });
    repeated.dispatchEvent(click);
    assert.equal(click.defaultPrevented, true);
    assert.equal(f.swiper.realIndex, 0);
    assert.equal(repeated.tabIndex, -1);
    assert.equal(repeated.getAttribute('href'), '/treatments/0');
  } finally {
    f.dom.window.close();
  }
});

test('returning to desktop restores the original finite CMS row; disposal removes mobile copies', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.media.matches = false;
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    assert.deepEqual([...f.track.children], f.items);
    assert.equal(f.viewport.scrollLeft, 0);
    f.media.matches = true;
    f.controller.measure();
    f.controller.dispose();
    assert.deepEqual([...f.track.children], f.items);
    assert.equal(f.links[0].hasAttribute('data-tdb-stamp-index'), false);
  } finally {
    f.dom.window.close();
  }
});

test('mobile selection eases back from a manually scrolled position instead of snapping', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 1100;
    f.links[0].click();
    assert.equal(f.viewport.scrollLeft, 1100, 'first frame preserves the manual pose');
    f.tick(250);
    assert.ok(f.viewport.scrollLeft > 1100 && f.viewport.scrollLeft < 1320);
    f.tick(250);
    assert.equal(f.viewport.scrollLeft, 1320);
    assert.equal(f.frames.size, 0);
  } finally {
    f.dom.window.close();
  }
});

test('mobile touch drag crosses a recycled end continuously and coasts on release', () => {
  const f = fixture(6, true);
  function pointer(type, x, y = 100) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { button: 0, pointerType: 'touch', pointerId: 1, clientX: x, clientY: y });
    f.links[0].dispatchEvent(event);
  }
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    pointer('pointerdown', 100);
    f.tick(16);
    pointer('pointermove', -1000);
    const wrapped = f.viewport.scrollLeft;
    f.tick(16);
    pointer('pointermove', -1010);
    assert.equal(f.viewport.scrollLeft - wrapped, 10, 'recycling preserves the pointer origin');
    pointer('pointerup', -1010);
    const released = f.viewport.scrollLeft;
    f.tick(16);
    assert.ok(f.viewport.scrollLeft > released, 'release retains velocity');
    for (let i = 0; i < 130; i++) f.tick(16);
    assert.equal(f.frames.size, 0, 'momentum settles');
    assert.equal(f.swiper.realIndex, 0, 'manual browsing does not select a treatment');
  } finally {
    f.dom.window.close();
  }
});

test('touch capture transfer from a stamp image does not end the horizontal drag', () => {
  const f = fixture(6, true);
  function pointer(target, type, x, id = 1) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      button: 0,
      pointerType: 'touch',
      pointerId: id,
      clientX: x,
      clientY: 100,
    });
    target.dispatchEvent(event);
  }
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    pointer(f.links[0], 'pointerdown', 250);
    f.tick(16);
    pointer(f.links[0], 'pointermove', 230);
    const first = f.viewport.scrollLeft;
    // A real touch implicitly captures its image/link. Taking explicit capture
    // on the viewport releases that child and bubbles this event to the viewport.
    pointer(f.links[0], 'lostpointercapture', 230);
    f.tick(16);
    pointer(f.viewport, 'pointermove', 190);
    assert.equal(
      f.viewport.scrollLeft - first,
      40,
      'finger movement continues after capture transfer',
    );
    pointer(f.viewport, 'pointerup', 190, 2);
    f.tick(16);
    pointer(f.viewport, 'pointermove', 170);
    assert.equal(
      f.viewport.scrollLeft - first,
      60,
      'another pointer cannot cancel the active finger',
    );
    pointer(f.viewport, 'lostpointercapture', 170);
    const lost = f.viewport.scrollLeft;
    pointer(f.viewport, 'pointermove', 100);
    assert.equal(f.viewport.scrollLeft, lost, 'losing viewport capture really does end the drag');
  } finally {
    f.dom.window.close();
  }
});

test('return alignment shares one animation writer with repeated progress samples', () => {
  const f = fixture(6, true);
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    let left = 1100,
      writes = 0;
    Object.defineProperty(f.viewport, 'scrollLeft', {
      get: () => left,
      set: (v) => {
        left = v;
        writes++;
      },
    });
    f.links[0].click();
    for (let i = 0; i < 10; i++) f.controller.paint(0, 0, 800);
    assert.equal(writes, 0, 'progress samples update the target without competing writes');
    assert.equal(f.frames.size, 1);
    f.tick(16);
    assert.equal(writes, 1);
  } finally {
    f.dom.window.close();
  }
});

test('finite mobile stamps resist at the ends and ease back to selection', () => {
  const f = fixture(6, true, false);
  function pointer(type, x) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      button: 0,
      pointerType: 'touch',
      pointerId: 1,
      clientX: x,
      clientY: 100,
    });
    f.viewport.dispatchEvent(event);
  }
  try {
    f.controller.measure();
    f.controller.paint(0, 0, 800);
    assert.equal(f.track.children.length, 6, 'no loop copies without explicit opt-in');
    pointer('pointerdown', 200);
    f.tick(16);
    pointer('pointermove', -1000);
    assert.equal(f.viewport.scrollLeft, 500, 'clamps at the last stamp');
    const edge = parseFloat(f.track.style.translate);
    assert.ok(edge < 0 && edge > -80, 'the inner track yields with bounded resistance');
    f.tick(16);
    pointer('pointermove', -980);
    assert.equal(f.viewport.scrollLeft, 500);
    assert.ok(
      Math.abs(parseFloat(f.track.style.translate) - edge - 20) < 0.001,
      'reversing releases the stretch immediately, with no invisible dead zone',
    );
    pointer('pointerup', -980);
    for (let i = 0; i < 60; i++) f.tick(16);
    assert.ok(f.viewport.scrollLeft >= 0 && f.viewport.scrollLeft <= 500);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 400;
    // Browsers may omit the drag's compatibility click. One later activation
    // must be enough; there is no stale suppression flag to consume first.
    f.links[0].click();
    assert.equal(f.viewport.scrollLeft, 400);
    f.tick(250);
    assert.ok(f.viewport.scrollLeft > 0 && f.viewport.scrollLeft < 400);
    f.tick(250);
    assert.equal(f.viewport.scrollLeft, 0);
  } finally {
    f.dom.window.close();
  }
});

test('drag click suppression belongs to that gesture, not the next tap or keyboard activation', () => {
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const f = fixture(6, true, false);
    function pointer(type, id, x) {
      const event = new f.w.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        button: 0,
        isPrimary: true,
        pointerType: 'touch',
        pointerId: id,
        clientX: x,
        clientY: 100,
      });
      f.viewport.dispatchEvent(event);
    }
    function click(id, detail = 1) {
      const event = new f.w.MouseEvent('click', { bubbles: true, cancelable: true, detail });
      Object.defineProperty(event, 'pointerId', { value: id });
      f.links[2].dispatchEvent(event);
    }
    try {
      f.controller.measure();
      pointer('pointerdown', 1, 250);
      f.tick(16);
      pointer('pointermove', 1, 150);
      pointer(ending, 1, 150);
      if (ending === 'pointerup') {
        click(1);
        assert.equal(f.swiper.realIndex, 0, 'the drag itself does not select');
      }
      click(2);
      assert.equal(f.swiper.realIndex, 2, 'a new touch activates on its first click');
      f.swiper.slideTo(0);
      pointer('pointerdown', 6, 250);
      f.tick(16);
      pointer('pointermove', 6, 150);
      pointer(ending, 6, 150);
      click(7);
      assert.equal(f.swiper.realIndex, 2, 'new touch works even when no drag click was emitted');
      pointer('pointerdown', 3, 250);
      f.tick(16);
      pointer('pointermove', 3, 150);
      pointer(ending, 3, 150);
      f.links[0].click();
      assert.equal(f.swiper.realIndex, 0, 'keyboard activation is never swallowed');
      pointer('pointerdown', 4, 250);
      f.tick(16);
      pointer('pointermove', 4, 150);
      pointer(ending, 4, 150);
      f.tick(600);
      click(4);
      assert.equal(
        f.swiper.realIndex,
        2,
        'suppression expires when no compatibility click arrives',
      );
      pointer('pointerdown', 5, 250);
      f.tick(16);
      pointer('pointermove', 5, 150);
      pointer(ending, 5, 150);
      pointer('pointerdown', 5, 200);
      pointer('pointerup', 5, 200);
      f.links[1].dispatchEvent(
        new f.w.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
      );
      assert.equal(
        f.swiper.realIndex,
        1,
        'reused pointer IDs and legacy mouse clicks activate on first tap',
      );
    } finally {
      f.dom.window.close();
    }
  }
});

test('selecting an already-aligned stamp stays still while the main image catches up', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    f.swiper.slideTo(5);
    f.controller.paint(5, 600, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 0;
    f.swiper.animating = true;
    f.links[0].click();
    // The image can move more slowly than the return easing. Its intermediate
    // positions must not pull the stamp away from its selected destination.
    for (const index of [5, 4.9, 4.8, 4, 2, 0.1]) {
      f.controller.paint(index, index * 120, 800);
      f.tick(100);
      assert.equal(f.viewport.scrollLeft, 0, 'Veneers remains at the left edge');
    }
    f.swiper.animating = false;
    f.controller.paint(0, 0, 800);
    assert.equal(f.viewport.scrollLeft, 0);
    f.swiper.slideTo(1);
    f.controller.paint(1, 120, 800);
    assert.equal(f.viewport.scrollLeft, 100, 'normal progress following resumes after handoff');
  } finally {
    f.dom.window.close();
  }
});

test('manual stamp return takes a direct path and holds its target until the main slide settles', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    f.swiper.slideTo(5);
    f.controller.paint(5, 600, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 400;
    f.swiper.animating = true;
    f.links[1].click();
    let previous = 400;
    for (const index of [5, 4.9, 4.8, 4, 3, 2, 1.5]) {
      f.controller.paint(index, index * 120, 800);
      f.tick(100);
      assert.ok(f.viewport.scrollLeft <= previous, 'never reverses direction');
      assert.ok(f.viewport.scrollLeft >= 100, 'never overshoots its final position');
      previous = f.viewport.scrollLeft;
    }
    assert.equal(f.viewport.scrollLeft, 100);
    f.swiper.animating = false;
    f.controller.paint(1, 120, 800);
    assert.equal(f.viewport.scrollLeft, 100);
  } finally {
    f.dom.window.close();
  }
});

test('stamp opacity keeps one native transition target rather than cancelling filled animations', () => {
  const f = fixture(6, true, false);
  try {
    f.controller.measure();
    assert.equal(f.items[0].style.opacity, '1');
    f.swiper.slideTo(1);
    f.swiper.slideTo(2);
    f.swiper.slideTo(0);
    assert.equal(f.items[0].style.opacity, '1');
    assert.equal(f.items[1].style.opacity, '0.5');
    assert.equal(f.items[2].style.opacity, '0.5');
    assert.ok(
      f.items.every((item) => !item.dataset.finalOpacity),
      'stamp opacity never uses filled WAAPI animations',
    );
    f.controller.dispose();
    assert.ok(f.items.every((item) => item.style.opacity === ''));
  } finally {
    f.dom.window.close();
  }
});

test('mobile touch release selects once even when scrolling suppresses the browser click', () => {
  const f = fixture(6, true, false);
  function pointer(target, type, id, x, y = 100) {
    const event = new f.w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      button: 0,
      isPrimary: true,
      pointerType: 'touch',
      pointerId: id,
      clientX: x,
      clientY: y,
    });
    target.dispatchEvent(event);
  }
  try {
    f.controller.measure();
    let selections = 0,
      focuses = 0;
    const slideTo = f.swiper.slideTo.bind(f.swiper);
    f.swiper.slideTo = (index) => {
      selections++;
      slideTo(index);
    };
    f.w.TDBSliderFocus = {
      resume() {
        focuses++;
      },
    };
    pointer(f.links[0], 'pointerdown', 1, 250);
    f.tick(16);
    pointer(f.links[0], 'pointermove', 1, 150);
    pointer(f.viewport, 'pointerup', 1, 150);
    f.tick(16);
    assert.equal(selections, 0, 'swiping does not activate a stamp');
    const image = f.w.document.createElement('img');
    f.links[2].append(image);
    pointer(image, 'pointerdown', 2, 200);
    pointer(image, 'pointerup', 2, 200);
    assert.equal(
      f.swiper.realIndex,
      2,
      'first clean release selects without needing a click event',
    );
    assert.equal(selections, 1);
    assert.equal(focuses, 1, 'touch activation uses the shared banner-away behavior');
    const compatibilityClick = new f.w.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1,
    });
    Object.defineProperty(compatibilityClick, 'pointerId', { value: 2 });
    image.dispatchEvent(compatibilityClick);
    assert.equal(selections, 1, 'optional browser click does not activate twice');
    assert.equal(compatibilityClick.defaultPrevented, true, 'tap does not navigate away');
    pointer(f.links[0], 'pointerdown', 3, 200);
    pointer(f.links[0], 'pointercancel', 3, 200);
    assert.equal(selections, 1, 'cancelled touches never activate');
    pointer(f.links[0], 'pointerdown', 4, 200);
    pointer(f.links[0], 'pointermove', 4, 201, 125);
    pointer(f.links[0], 'pointerup', 4, 201, 125);
    assert.equal(selections, 1, 'vertical page scrolling never activates');
    pointer(f.links[0], 'pointerdown', 5, 200);
    pointer(f.links[0], 'pointerup', 5, 200);
    assert.equal(selections, 2, 'next tap works immediately after cancelled scrolling');
    assert.equal(f.swiper.realIndex, 0);
    f.links[1].click();
    assert.equal(selections, 3, 'keyboard activation remains available');
  } finally {
    f.dom.window.close();
  }
});
