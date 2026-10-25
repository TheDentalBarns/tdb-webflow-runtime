const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setup(load = async () => {}) {
  const dom = new JSDOM(
    `<section data-tdb-team-quotes data-tdb-team-cms>
    <div data-tdb-team-viewport tabindex="0"><div data-tdb-team-track>
      <article data-tdb-team-slide><div data-tdb-team-content>First</div></article>
      <article data-tdb-team-slide><div data-tdb-team-content>Second</div></article>
    </div></div>
    <div data-tdb-team-position><span data-tdb-team-current></span><span data-tdb-team-total></span></div>
  </section>`,
    { url: 'https://dentalbarns.webflow.io/', runScripts: 'outside-only' },
  );
  const w = dom.window,
    root = w.document.querySelector('section');
  const loads = [],
    moves = [],
    observers = [],
    adapters = new Map();
  let mounts = 0;
  Object.defineProperty(w.document, 'readyState', { value: 'complete' });
  Object.defineProperty(w.document, 'currentScript', {
    value: { src: 'https://cdn.test/tdb-quote-carousel.js' },
  });
  w.IntersectionObserver = class {
    constructor(callback, options) {
      Object.assign(this, { callback, options, targets: new Set() });
      observers.push(this);
    }
    observe(root) {
      this.targets.add(root);
    }
    unobserve(root) {
      this.targets.delete(root);
    }
    disconnect() {
      this.targets.clear();
    }
  };
  w.TDBModules = {
    async load(url) {
      loads.push(url.pathname);
      await load(url);
    },
  };
  w.TDBMotion = { duration: () => 400, carousel: {}, ddText: () => ({ enter() {}, destroy() {} }) };
  w.TDBNativeTicker = { mount: () => ({ update() {}, destroy() {} }) };
  w.TDBCarouselVisibility = { bind: () => ({ update() {} }) };
  w.TDBSwiper = {
    register: (name, adapter) => adapters.set(name, adapter),
    mount(name, root) {
      mounts++;
      return adapters.get(name).mount(root);
    },
    create(viewport, params) {
      return {
        params,
        realIndex: 0,
        activeIndex: 0,
        slides: [...viewport.querySelectorAll('[data-tdb-team-slide]')],
        on() {},
        init() {},
        destroy() {},
        slideNext() {
          moves.push('next');
        },
        slidePrev() {
          moves.push('prev');
        },
      };
    },
    matchingSlides: (swiper) => [swiper.slides[0]],
    onSettled: () => () => {},
    watchDuration() {},
    firstView: () => ({ destroy() {} }),
  };
  w.eval(fs.readFileSync('src/team-quotes/team-quotes.js', 'utf8'));
  return {
    w,
    root,
    loads,
    moves,
    observers,
    mounts: () => mounts,
    near() {
      observers[0].callback([{ target: root, isIntersecting: true }]);
    },
    close() {
      w.TDBQuoteCarousel.destroy();
      w.close();
    },
  };
}

test('refresh keeps discovered offscreen quotes behind the existing 800px gate', async () => {
  const f = setup();
  try {
    f.w.TDBQuoteCarousel.refresh();
    f.w.TDBQuoteCarousel.refresh();
    await tick();
    assert.deepEqual(f.loads, []);
    assert.equal(f.observers[0].options.rootMargin, '800px');
    assert.equal(f.observers[0].targets.size, 1);
    assert.equal(f.root.querySelector('[data-tdb-team-content]').textContent, 'First');
    f.near();
    await tick();
    assert.equal(f.mounts(), 1);
    assert.equal(f.w.TDBQuoteCarousel.isMounted(f.root), true);
    f.w.TDBQuoteCarousel.refresh();
    await tick();
    assert.equal(f.mounts(), 1);
  } finally {
    f.close();
  }
});

test('first keyboard intent bypasses proximity and replays once after a shared pending mount', async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const f = setup(() => gate);
  try {
    const activated = f.w.TDBQuoteCarousel.activate(f.root, ['ArrowRight']);
    f.w.TDBQuoteCarousel.refresh();
    f.root.dispatchEvent(new f.w.Event('focusin', { bubbles: true }));
    assert.equal(f.mounts(), 0);
    release();
    await activated;
    assert.equal(f.mounts(), 1);
    assert.deepEqual(f.moves, ['next']);
    assert.equal(f.loads.filter((url) => url.endsWith('tdb-motion.js')).length, 1);
  } finally {
    f.close();
  }
});

test('an eligible failed quote load retries on refresh while a detached pending root never mounts', async () => {
  let fail = true;
  const f = setup(async () => {
    if (fail) throw Error('offline');
  });
  try {
    f.near();
    await tick();
    assert.equal(f.mounts(), 0);
    assert.equal(f.root.dataset.tdbTeamQuoteState, 'fallback');
    fail = false;
    f.w.TDBQuoteCarousel.refresh();
    await tick();
    assert.equal(f.mounts(), 1);
  } finally {
    f.close();
  }
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const detached = setup(() => gate);
  try {
    detached.near();
    detached.root.remove();
    release();
    await tick();
    assert.equal(detached.mounts(), 0);
  } finally {
    detached.close();
  }
});
