const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

for (const file of ['src/shared/motion.js', 'dist/tdb-motion.js']) {
  test(`${file}: a fast non-gesture return to the top restores the hero's start opacity`, () => {
    const dom = new JSDOM(
      '<header data-tdb-page-break="service-hero" data-tdb-parallax-reset-top data-tdb-parallax-progress="image" data-tdb-parallax-fade-start=".6" data-tdb-parallax-fade-end=".8"><img data-tdb-parallax-fade="0" style="opacity:1"></header>',
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    try {
      const w = dom.window,
        queue = new Map();
      let seq = 0;
      w.innerHeight = 900;
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      w.DOMMatrixReadOnly = class {
        constructor() {
          this.m42 = 0;
        }
      };
      w.requestAnimationFrame = (cb) => {
        queue.set(++seq, cb);
        return seq;
      };
      w.cancelAnimationFrame = (id) => queue.delete(id);
      const header = w.document.querySelector('header'),
        image = header.querySelector('img');
      const rect = (h) => ({
        top: -w.scrollY,
        bottom: h - w.scrollY,
        height: h,
        left: 0,
        right: 1400,
        width: 1400,
      });
      header.getBoundingClientRect = () => rect(1800);
      image.getBoundingClientRect = () => rect(900);
      const flush = () => {
        const pending = [...queue.values()];
        queue.clear();
        pending.forEach((fn) => fn());
      };
      w.eval(fs.readFileSync(file, 'utf8'));
      const owner = w.TDBMotion.pageBreaks([header]);
      flush();
      assert.equal(image.style.opacity, '1');
      w.dispatchEvent(new w.Event('wheel'));
      w.scrollY = 2000;
      w.dispatchEvent(new w.Event('scroll'));
      flush();
      assert.equal(image.style.opacity, '0');
      w.dispatchEvent(new w.Event('scrollend'));
      w.scrollY = 0;
      w.dispatchEvent(new w.Event('scroll'));
      flush();
      assert.equal(image.style.opacity, '1', 'top must not retain an offscreen exit fade');
      assert.equal(queue.size, 0, 'reset needs no perpetual animation loop');
      owner.destroy();
    } finally {
      dom.window.close();
    }
  });
}
