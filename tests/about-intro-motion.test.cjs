const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
for (const file of ['src/shared/motion.js', 'dist/tdb-motion.js']) {
  test(`${file}: introduction visits four chapters, reverses and releases boundaries`, () => {
    const dom = new JSDOM(
      `<section data-tdb-stepped-intro><div><img data-tdb-intro-photo><img data-tdb-intro-doors><div data-tdb-intro-copy>Story</div>${[0, 1, 2, 3].map((i) => `<a href="#${i}"><span data-tdb-intro-progress></span></a>`).join('')}<a data-tdb-intro-next href="#1">Scroll</a></div></section>`,
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    const w = dom.window,
      root = w.document.querySelector('section'),
      frames = new Map();
    const animations = [];
    w.Element.prototype.animate = function (keyframes, options) {
      animations.push({ node: this, keyframes, options });
      return { cancel() {} };
    };
    let id = 0,
      now = 0;
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    w.performance.now = () => now;
    w.requestAnimationFrame = (fn) => {
      frames.set(++id, fn);
      return id;
    };
    w.cancelAnimationFrame = (id) => frames.delete(id);
    w.innerHeight = 800;
    root.getBoundingClientRect = () => ({ top: -w.scrollY, height: 3200 });
    root.firstElementChild.getBoundingClientRect = () => ({ height: 800 });
    w.scrollTo = ({ top }) => {
      w.scrollY = top;
      w.dispatchEvent(new w.Event('scroll'));
    };
    w.eval(fs.readFileSync(file, 'utf8'));
    const owner = w.TDBMotion.steppedIntro(root);
    const flush = () => {
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach((fn) => fn());
    };
    const wheel = (delta) => {
      const e = new w.WheelEvent('wheel', { deltaY: delta, bubbles: true, cancelable: true });
      root.dispatchEvent(e);
      flush();
      return e;
    };
    flush();
    assert.equal(owner.status().state, 1);
    assert.equal(root.querySelector('[aria-current="step"]').getAttribute('href'), '#0');
    assert.equal(wheel(-100).defaultPrevented, false);
    assert.equal(wheel(3).defaultPrevented, true);
    now += 10;
    wheel(5);
    now += 10;
    wheel(5);
    assert.equal(owner.status().state, 2, 'small trackpad deltas accumulate');
    now += 20;
    wheel(100);
    assert.equal(owner.status().state, 2, 'momentum cannot skip a chapter');
    for (const state of [3, 4]) {
      now += 1000;
      wheel(100);
      assert.equal(owner.status().state, state);
    }
    assert.equal(root.querySelector('[data-tdb-intro-photo]').style.opacity, '0');
    assert.equal(root.querySelector('[data-tdb-intro-copy]').style.opacity, '1');
    assert.equal(root.querySelector('[aria-current="step"]').getAttribute('href'), '#3');
    const discover = root.querySelector('[data-tdb-intro-next]');
    assert.notEqual(discover.style.opacity, '0', 'scroll cue remains visible on the final chapter');
    assert(!discover.inert, 'scroll cue remains usable on the final chapter');
    assert.deepEqual(
      [...root.querySelectorAll('[data-tdb-intro-progress]')].map(
        (n) => n.parentElement.style.height,
      ),
      ['44px', '44px', '44px', '100px'],
    );
    assert(
      [...root.querySelectorAll('[data-tdb-intro-progress]')].every((n) => !n.style.transform),
      'pill lines never scale horizontally or vertically',
    );
    assert(
      animations.every(({ keyframes }) => keyframes.every((frame) => !('height' in frame))),
      'pill motion never animates layout height',
    );
    assert(
      animations.some(({ keyframes }) => keyframes.some((frame) => 'clipPath' in frame)),
      'pill lines reveal through a rounded clip',
    );
    assert(
      animations.every(({ options }) => options.fill === 'backwards'),
      'the first animation frame covers the underlying end value during startup',
    );
    assert.deepEqual(
      [...root.querySelectorAll('[data-tdb-intro-progress]')].map((n) => n.style.height),
      ['84px', '84px', '84px', '84px'],
      'line geometry stays fixed while its visible length changes',
    );
    now += 1000;
    assert.equal(wheel(100).defaultPrevented, false, 'last chapter permits normal page scrolling');
    now += 1000;
    wheel(-100);
    assert.equal(owner.status().state, 3);
    assert.equal(root.querySelector('[data-tdb-intro-doors]').style.opacity, '0.78');
    now += 1000;
    owner.refresh();
    flush();
    w.scrollY = 4000;
    w.dispatchEvent(new w.Event('scrollend'));
    assert.equal(
      w.scrollY,
      4000,
      'an immediate section jump does not snap back before the next frame',
    );
    owner.refresh();
    flush();
    assert.equal(wheel(-100).defaultPrevented, false, 'outside section is never captured');
    w.scrollY = 0;
    owner.refresh();
    flush();
    now += 1000;
    function touch(type, y) {
      const e = new w.Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'touches', {
        value: type === 'touchend' ? [] : [{ clientX: 100, clientY: y }],
      });
      root.dispatchEvent(e);
      flush();
      return e;
    }
    touch('touchstart', 400);
    assert.equal(touch('touchmove', 300).defaultPrevented, true);
    assert.equal(owner.status().state, 2, 'a short upward swipe advances a full chapter');
    touch('touchmove', 200);
    assert.equal(owner.status().state, 2, 'one swipe cannot skip chapters');
    now += 1000;
    touch('touchmove', 100);
    assert.equal(owner.status().state, 3, 'continued drag advances once the transition finishes');
    now += 1000;
    touch('touchmove', 0);
    assert.equal(
      owner.status().state,
      4,
      'continued drag can reach the text without a finger lift',
    );
    now += 1000;
    touch('touchmove', -50);
    assert.equal(w.scrollY, 2450, 'a captured drag continues scrolling beyond the final chapter');
    touch('touchend', -50);

    owner.goTo(0);
    now += 1000;
    flush();
    const visited = new Set([owner.status().state]);
    for (let tick = 0; tick < 90; tick++) {
      now += 40;
      wheel(80);
      visited.add(owner.status().state);
    }
    assert.deepEqual([...visited], [1, 2, 3, 4], 'uninterrupted wheel input visits every chapter');
    assert.equal(wheel(80).defaultPrevented, false, 'continuous wheel input releases the end');
    discover.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(w.scrollY, 3200, 'final scroll cue goes to the next section');
    now += 1000;
    flush();
    assert.equal(owner.status().inside, false);

    owner.goTo(0);
    now += 1000;
    flush();
    wheel(100);
    for (let tick = 0; tick < 28; tick++) {
      now += 40;
      wheel(0.5);
    }
    assert.equal(owner.status().state, 2, 'tiny momentum tails cannot queue another chapter');
    owner.destroy();
    assert.equal(root.hasAttribute('data-tdb-intro-state'), false);
    assert.equal(root.querySelector('[data-tdb-intro-photo]').hasAttribute('style'), false);
    assert(
      [...root.querySelectorAll('[data-tdb-intro-progress]')].every(
        (n) => !n.hasAttribute('style'),
      ),
      'pill clipping and fixed geometry are restored on cleanup',
    );
    assert.equal(frames.size, 0);
    dom.window.close();
  });
}
