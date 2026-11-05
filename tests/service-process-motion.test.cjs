const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

for (const file of ['src/shared/motion.js', 'dist/tdb-motion.js']) {
  test(`${file}: service journey follows current step, centres mobile rail once and cleans up`, () => {
    const dom = new JSDOM(
      `<section data-tdb-service-process><nav class="service-process_sticky">${[1, 2, 3].map((i) => `<a class="service-process_item" href="#step-${i}">${i}</a>`).join('')}<div class="service-process_timeline"></div></nav>${[1, 2, 3].map((i) => `<article id="step-${i}"></article>`).join('')}</section>`,
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
    Object.defineProperties(rail, { clientWidth: { value: 400 }, scrollWidth: { value: 900 } });
    rail.scrollTo = (value) => centres.push(value.left);
    [...rail.querySelectorAll('a')].forEach((link, i) => {
      link.getBoundingClientRect = () => ({
        left: i * 300,
        width: 300,
        height: 30,
        top: 0,
        bottom: 30,
      });
    });
    [...root.querySelectorAll('article')].forEach((step, i) => {
      step.getBoundingClientRect = () => ({
        top: 200 + i * 1000 - w.scrollY,
        bottom: 1200 + i * 1000 - w.scrollY,
        height: 1000,
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
    assert.ok(width > 40 && width < 43);
    const calls = centres.length;
    w.scrollY = 1201;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
    assert.equal(centres.length, calls, 'no repeated horizontal scroll for the same step');
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
