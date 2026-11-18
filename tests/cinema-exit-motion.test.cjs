const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

for (const file of ['src/shared/motion.js', 'dist/tdb-motion.js']) {
  for (const width of [390, 1600]) {
    test(`${file}: sticky photo exit and chapter return at ${width}px`, () => {
      const dom = new JSDOM(
        `<section data-tdb-parallax-mode="opacity" data-tdb-parallax-progress="exit"
          data-tdb-parallax-exit-start="1" data-tdb-parallax-exit-end="0"
          data-tdb-parallax-fade-start="0" data-tdb-parallax-fade-end="1"
          data-tdb-parallax-reset-start>
          <div data-tdb-parallax-fade="0" style="transform:translateY(12px)"><img></div>
          <div data-tdb-parallax-frame></div>
        </section>`,
        { runScripts: 'outside-only', pretendToBeVisual: true },
      );
      try {
        const w = dom.window,
          queue = new Map(),
          reduced = { matches: false, addEventListener() {} };
        let sequence = 0,
          photoHeight = width < 992 ? 340 : 600;
        w.innerWidth = width;
        w.innerHeight = 1000;
        w.scrollY = 1000;
        w.TDBMotionPolicy = { reduced };
        w.matchMedia = (query) =>
          query.includes('prefers-reduced')
            ? reduced
            : { matches: width < 992, addEventListener() {} };
        w.requestAnimationFrame = (fn) => {
          queue.set(++sequence, fn);
          return sequence;
        };
        w.cancelAnimationFrame = (id) => queue.delete(id);
        const media = w.document.querySelector('section'),
          inner = media.querySelector('[data-tdb-parallax-fade]'),
          frame = media.querySelector('[data-tdb-parallax-frame]');
        const rect = () => {
          const top = w.scrollY < 1000 ? 1000 - w.scrollY : Math.min(0, 5000 - w.scrollY);
          return {
            top,
            bottom: top + photoHeight,
            height: photoHeight,
            width,
            left: 0,
            right: width,
          };
        };
        media.getBoundingClientRect = rect;
        frame.getBoundingClientRect = rect;
        const flush = () => {
          const pending = [...queue.values()];
          queue.clear();
          pending.forEach((fn) => fn());
        };
        const scroll = (y, gesture = true) => {
          w.dispatchEvent(new w.Event(gesture ? 'wheel' : 'scrollend'));
          w.scrollY = y;
          w.dispatchEvent(new w.Event('scroll'));
          flush();
        };
        w.eval(fs.readFileSync(file, 'utf8'));
        const owner = w.TDBMotion.pageBreaks([media]);
        flush();
        for (const y of [1000, 2000, 3000, 4000, 5000]) {
          scroll(y);
          assert.equal(inner.style.opacity, '1', 'all pinned chapters retain the full photograph');
        }
        scroll(5000 + photoHeight / 4);
        assert.equal(Number(inner.style.opacity), 0.75);
        scroll(5000 + photoHeight / 2);
        assert.equal(Number(inner.style.opacity), 0.5);
        scroll(5000 + photoHeight / 4);
        assert.equal(
          Number(inner.style.opacity),
          0.75,
          'reverse scroll restores the image gradually',
        );
        scroll(2000, false);
        assert.equal(
          inner.style.opacity,
          '1',
          'chapter navigation must clear the retained exit fade',
        );
        scroll(5000);
        scroll(5000 + photoHeight + 1);
        assert.equal(inner.style.opacity, '0', 'the departed image reaches the fade endpoint');
        scroll(3000, false);
        photoHeight *= 0.8;
        w.dispatchEvent(new w.Event('resize'));
        flush();
        assert.equal(inner.style.opacity, '1', 'responsive geometry does not dim a pinned image');
        reduced.matches = true;
        scroll(5000);
        scroll(5000 + photoHeight / 2);
        assert.equal(inner.style.opacity, '1', 'reduced motion keeps the photo visible');
        assert.equal(
          inner.style.transform,
          'translateY(12px)',
          'Cinema retains its vertical transform',
        );
        assert.equal(queue.size, 0, 'the fade schedules no idle frames');
        owner.destroy();
        assert.equal(inner.style.opacity, '', 'cleanup restores native opacity');
      } finally {
        dom.window.close();
      }
    });
  }
}
