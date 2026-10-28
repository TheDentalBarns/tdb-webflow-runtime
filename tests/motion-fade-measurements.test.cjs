const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(bundle = false, count = 49, options = {}) {
  const dom = new JSDOM('<main></main>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window,
    queue = new Map(),
    boxes = [],
    reads = { rect: 0, fragments: 0, styles: 0 };
  let next = 0;
  const reduced = { matches: false, addEventListener() {}, removeEventListener() {} };
  w.matchMedia = () => reduced;
  w.TDBMotionPolicy = { reduced };
  w.requestAnimationFrame = (fn) => {
    queue.set(++next, fn);
    return next;
  };
  w.cancelAnimationFrame = (id) => queue.delete(id);
  w.innerHeight = 720;
  Object.defineProperty(w.document.documentElement, 'scrollHeight', { value: 50000 });
  const style = w.getComputedStyle.bind(w);
  w.getComputedStyle = (node) => {
    reads.styles++;
    return style(node);
  };
  for (let i = 0; i < count; i++) {
    const node = w.document.createElement('p');
    node.textContent = 'Patient care';
    node.style.opacity = '0.8';
    w.document.querySelector('main').append(node);
    const box = { node, top: 200 + i * 900, width: 300, height: 40, exists: true };
    boxes.push(box);
    node.getBoundingClientRect = () => {
      reads.rect++;
      const top = box.exists ? box.top - w.scrollY : 0;
      const width = box.exists ? box.width : 0,
        height = box.exists ? box.height : 0;
      return { top, bottom: top + height, left: 0, right: width, width, height };
    };
    node.getClientRects = () => {
      reads.fragments++;
      return box.exists ? [{}] : [];
    };
  }
  w.eval(fs.readFileSync(bundle ? 'dist/tdb-motion.js' : 'src/shared/motion.js', 'utf8'));
  const owner = w.TDBMotion.ddText(
    boxes.map((b) => b.node),
    options,
  );
  const flush = () => {
    const batch = [...queue.values()];
    queue.clear();
    batch.forEach((fn) => fn());
  };
  const scroll = (y, user = true) => {
    if (user) w.dispatchEvent(new w.Event('wheel'));
    else w.dispatchEvent(new w.Event('scrollend'));
    w.scrollY = y;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
  };
  const settle = () => {
    for (let i = 0; i < 50 && queue.size; i++) flush();
    assert.equal(queue.size, 0);
  };
  return {
    w,
    boxes,
    reads,
    queue,
    owner,
    reduced,
    flush,
    scroll,
    settle,
    close: () => dom.window.close(),
  };
}

for (const bundle of [false, true]) {
  const label = bundle ? 'bundle' : 'source';
  test(`${label}: Vimeo scroll fade matches native keyframes in both directions without moving the poster`, () => {
    const e = fixture(bundle, 1, { mode: 'native', preset: 'vimeo' });
    try {
      const box = e.boxes[0];
      box.top = 1200;
      box.height = 720;
      box.node.style.opacity = '1';
      const poster = e.w.document.createElement('img');
      poster.style.transform = 'translateY(8px)';
      box.node.append(poster);
      e.flush();
      assert.equal(box.node.style.opacity, '0', 'stage only while offscreen');
      const points = [
        [0, 0],
        [0.15, 0.5],
        [0.3, 1],
        [0.75, 1],
        [0.85, 0.9],
        [0.95, 0.8],
        [1, 0.8],
      ];
      for (const [progress, opacity] of [...points, ...points.slice().reverse()]) {
        e.scroll(box.top - 720 + progress * (720 + box.height));
        e.settle();
        assert.ok(
          Math.abs(Number(box.node.style.opacity) - opacity) < 0.0004,
          `${progress}: ${box.node.style.opacity}`,
        );
        assert.equal(poster.style.transform, 'translateY(8px)');
        assert.equal(box.node.style.transform, '');
      }
      e.owner.destroy();
      assert.equal(box.node.style.opacity, '0.8', 'restore the original inline fallback');
      assert.equal(e.queue.size, 0);
    } finally {
      e.close();
    }
  });

  test(`${label}: Vimeo late mount, restoration, resize and reduced motion preserve readable fallback`, () => {
    const e = fixture(bundle, 1, { mode: 'native', preset: 'vimeo' });
    try {
      const box = e.boxes[0];
      box.height = 720;
      box.node.style.opacity = '1';
      e.flush();
      assert.equal(box.node.style.opacity, '1', 'already visible content must not blink on mount');
      e.scroll(100, false);
      e.settle();
      assert.equal(box.node.style.opacity, '1');
      box.height = 640;
      e.w.dispatchEvent(new e.w.Event('resize'));
      e.flush();
      assert.equal(box.node.style.opacity, '1');
      e.reduced.matches = true;
      e.owner.refresh();
      e.flush();
      assert.equal(box.node.style.opacity, '0.8', 'reduced motion returns native styling');
      e.w.dispatchEvent(new e.w.Event('pagehide'));
      e.scroll(120);
      assert.equal(e.queue.size, 0);
      e.owner.destroy();
    } finally {
      e.close();
    }
  });
  test(`${label}: non-empty bounds avoid a second geometry query for visible and offscreen fades`, () => {
    const e = fixture(bundle);
    try {
      e.flush();
      e.reads.rect = e.reads.fragments = e.reads.styles = 0;
      for (let i = 1; i <= 120; i++) e.scroll(i * 20);
      assert.equal(e.reads.rect, 49 * 120, 'positions remain fresh every frame');
      assert.equal(e.reads.styles, 49 * 120, 'visibility checks remain fresh');
      assert.equal(e.reads.fragments, 0, 'positive bounds already prove a CSS box exists');
      e.settle();
      e.owner.destroy();
      assert.equal(e.queue.size, 0);
      assert.ok(e.boxes.every((b) => b.node.style.opacity === '0.8'));
    } finally {
      e.close();
    }
  });

  test(`${label}: zero-area boxes retain fragment checks and display-none content stays untouched`, () => {
    const e = fixture(bundle, 4);
    try {
      e.boxes[0].width = e.boxes[0].height = 0;
      e.boxes[0].top = 1800;
      e.boxes[1].exists = false;
      e.boxes[2].width = 0;
      e.boxes[3].height = 0;
      e.flush();
      assert.equal(e.reads.fragments, 2, 'only completely empty bounds need the fallback');
      assert.equal(e.boxes[0].node.style.opacity, '0', 'zero-area CSS box is still a fade target');
      assert.equal(e.boxes[1].node.style.opacity, '0.8', 'no CSS box means no fade write');
      e.boxes[1].exists = true;
      e.scroll(900);
      assert.ok(Number.isFinite(Number(e.boxes[1].node.style.opacity)));
      e.settle();
    } finally {
      e.close();
    }
  });

  test(`${label}: visibility changes, restoration, resize and explicit entrance retain their behaviour`, () => {
    const e = fixture(bundle, 1);
    try {
      const box = e.boxes[0];
      box.node.style.visibility = 'hidden';
      e.flush();
      e.scroll(40);
      assert.equal(box.node.style.opacity, '0.8');
      box.node.style.visibility = 'visible';
      e.scroll(80);
      assert.equal(box.node.style.opacity, '0.8', 'newly visible target retains its painted start');
      e.scroll(120);
      e.settle();
      const painted = box.node.style.opacity;
      e.scroll(160, false);
      e.settle();
      assert.equal(
        box.node.style.opacity,
        painted,
        'programmatic restoration does not consume correction',
      );
      box.top += 30;
      e.w.dispatchEvent(new e.w.Event('resize'));
      e.flush();
      assert.equal(box.node.style.opacity, painted, 'layout change rebases without a fade jump');
      e.owner.enter();
      e.flush();
      assert.equal(box.node.style.opacity, '1');
      e.w.dispatchEvent(new e.w.Event('pagehide'));
      e.scroll(200);
      assert.equal(e.queue.size, 0, 'suspended owner does not queue work');
      e.owner.destroy();
      e.scroll(220);
      assert.equal(e.queue.size, 0, 'disposed owner does not queue work');
    } finally {
      e.close();
    }
  });
}
