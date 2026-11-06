const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

for (const file of ['src/shared/motion.js', 'dist/tdb-motion.js']) {
  test(`${file}: service journey continuously follows the line on mobile and cleans up`, () => {
    const dom = new JSDOM(
      `<section data-tdb-service-process><nav class="service-process_sticky"><div class="service-process-mobile-container">${[1, 2, 3].map((i) => `<a class="service-process_item" href="#step-${i}">${i}</a>`).join('')}<div class="service-process_timeline"></div></div></nav>${[1, 2, 3].map((i) => `<article id="step-${i}"></article>`).join('')}</section>`,
      {
        url: 'https://example.test/services/signature-assessment',
        runScripts: 'outside-only',
        pretendToBeVisual: true,
      },
    );
    const w = dom.window,
      root = w.document.querySelector('section'),
      rail = w.document.querySelector('nav');
    const frames = new Map();
    let serial = 0;
    const centres = [];
    const reduced = { matches: false, addEventListener() {}, removeEventListener() {} };
    w.TDBMotionPolicy = { reduced };
    w.matchMedia = (q) => ({
      matches: q.includes('max-width'),
      addEventListener() {},
      removeEventListener() {},
    });
    w.requestAnimationFrame = (fn) => {
      frames.set(++serial, fn);
      return serial;
    };
    w.cancelAnimationFrame = (id) => frames.delete(id);
    w.innerHeight = 800;
    rail.getBoundingClientRect = () => ({ top: 0, left: 0, width: 400, height: 80, bottom: 80 });
    const timeline = root.querySelector('.service-process_timeline');
    timeline.getBoundingClientRect = () => ({ left: -rail.scrollLeft, width: 0, height: 2 });
    timeline.parentElement.getBoundingClientRect = () => ({ left: -rail.scrollLeft, right: 900 - rail.scrollLeft, width: 900 });
    Object.defineProperties(rail, { clientWidth: { value: 400 }, scrollWidth: { value: 900 } });
    rail.scrollTo = (value) => {
      assert.equal(value.behavior, 'instant', 'the rail never starts a competing smooth scroll');
      centres.push(value.left);
      rail.scrollLeft = value.left;
    };
    [...rail.querySelectorAll('a')].forEach((link, i) => {
      link.getBoundingClientRect = () => ({
        left: i * 300 - rail.scrollLeft,
        width: 300,
        height: 30,
        top: 0,
        bottom: 30,
      });
    });
    const starts = [200, 1200, 2800], heights = [1000, 1600, 800];
    [...root.querySelectorAll('article')].forEach((step, i) => {
      step.getBoundingClientRect = () => ({
        top: starts[i] - w.scrollY,
        bottom: starts[i] + heights[i] - w.scrollY,
        height: heights[i],
        width: 400,
        left: 0,
      });
    });
    w.eval(fs.readFileSync(file, 'utf8'));
    const owner = w.TDBMotion.serviceJourney(root);
    const flush = () => {
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach((fn) => fn());
    };
    flush();
    assert.equal(rail.querySelector('[aria-current]').textContent, '1');
    assert.equal(w.TDBMotion.serviceJourney(root), owner, 'one owner per native component');
    w.scrollY = 1200;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
    assert.equal(rail.querySelector('[aria-current]').textContent, '2');
    assert.equal(rail.querySelectorAll('[data-tdb-process-reached]').length, 2);
    const width = parseFloat(root.querySelector('.service-process_timeline').style.width);
    assert.equal(width, 495, 'line interpolates between actual markers, using this section height');
    assert.equal(rail.scrollLeft, 295, 'the advancing line is centred in the mobile viewport');
    const calls = centres.length;
    w.scrollY = 1300;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
    assert.equal(centres.length, calls + 1, 'horizontal movement continues within the same step');
    assert.equal(rail.scrollLeft, 313.75);
    w.scrollY = 1200;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
    assert.equal(rail.scrollLeft, 295, 'reverse scrolling follows the same geometry without drift');
    reduced.matches = true;
    const reducedCalls = centres.length;
    w.scrollY = 1300;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
    assert.equal(centres.length, reducedCalls, 'reduced motion avoids continuous rail movement');
    w.scrollY = 2800;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
    assert.equal(rail.scrollLeft, 500, 'reduced motion brings the new active marker into view');
    reduced.matches = false;
    for (const [i, start] of starts.entries()) {
      w.scrollY = start - 240 - 1;
      w.dispatchEvent(new w.Event('scroll'));
      flush();
      assert.equal(rail.querySelectorAll('[data-tdb-process-reached]').length, i,
        'a marker stays grey before its section arrives');
      w.scrollY = start - 240;
      w.dispatchEvent(new w.Event('scroll'));
      flush();
      assert.equal(parseFloat(timeline.style.width), 150 + i * 300,
        'the leading edge of each section maps exactly to its marker');
      assert.equal(rail.querySelectorAll('[data-tdb-process-reached]').length, i + 1);
    }
    w.scrollY = 0;
    w.dispatchEvent(new w.Event('pageshow'));
    flush();
    assert.equal(
      rail.querySelector('[aria-current]').textContent,
      '1',
      'restored geometry is read again',
    );
    w.dispatchEvent(new w.Event('scroll'));
    owner.destroy();
    assert.equal(frames.size, 0);
    assert.equal(rail.hasAttribute('data-tdb-process-nav'), false);
    assert.equal(rail.querySelector('[aria-current]'), null);
    dom.window.close();
  });
}
