/* Compare prior and current IG output using synthetic Swiper/observer controls.
 * Requires the audit-baseline Git object; no browser or network requests. */
const fs = require('fs'),
  cp = require('child_process'),
  assert = require('assert/strict'),
  crypto = require('crypto');
const { JSDOM } = require('jsdom');
process.chdir(require('node:path').resolve(__dirname, '../..'));
const base = '4d7f0abd2196e1f40831e432cf530d252366798b';
const old = (file) => cp.execFileSync('git', ['show', base + ':' + file], { encoding: 'utf8' });
const snapshot = fs.readFileSync('src/instagram/manual-snapshot.js', 'utf8');
async function render(source, width, desktop) {
  const dom = new JSDOM('<html data-wf-page="677cf86df9952f978d94d8a9"><body></body></html>', {
      url: 'https://dentalbarns.webflow.io/',
      runScripts: 'outside-only',
    }),
    w = dom.window;
  try {
    Object.defineProperty(w, 'innerWidth', { value: width });
    const callbacks = [],
      animations = [],
      timers = new Map();
    let serial = 0;
    w.setTimeout = (fn) => {
      timers.set(++serial, fn);
      return serial;
    };
    w.clearTimeout = (id) => timers.delete(id);
    w.matchMedia = (q) => ({
      matches: q.includes('min-width') ? width >= 992 : q.includes('reduced'),
    });
    w.ResizeObserver = w.MutationObserver = class {
      constructor(fn) {
        callbacks.push(fn);
      }
      observe() {}
      disconnect() {}
    };
    w.Element.prototype.animate = (frames, timing) => {
      const a = { frames, timing, cancel() {} };
      animations.push(a);
      return a;
    };
    w.eval(snapshot);
    const data = w.TDBInstagramManualData;
    for (const id of Object.keys(data.feeds)) {
      const mount = w.document.createElement('div');
      mount.dataset.tdbIgWidget = id;
      mount.setAttribute('aria-busy', 'true');
      w.document.body.append(mount);
    }
    if (desktop) {
      delete w.TDBInstagramManualData;
      w.fetch = async () => ({ ok: true, json: async () => data });
    }
    const swipers = [];
    w.TDBSliders = {
      refresh() {
        for (const viewport of w.document.querySelectorAll('.tdb-ig-viewport')) {
          if (viewport.swiper) continue;
          const handlers = new Map();
          const swiper = {
            realIndex: 0,
            activeIndex: 0,
            previousIndex: 0,
            params: { spaceBetween: 20 },
            slides: [...viewport.querySelectorAll('.swiper-slide')],
            on(k, f) {
              handlers.set(k, f);
            },
            off(k) {
              handlers.delete(k);
            },
            update() {},
          };
          viewport.swiper = swiper;
          swipers.push({ swiper, handlers });
        }
        callbacks.forEach((fn) => fn());
      },
    };
    await w.eval(source);
    await new Promise((r) => setImmediate(r));
    assert(w.TDBInstagramFeed, 'feed must be mounted before comparison');
    const settle = () => {
      for (const [id, fn] of [...timers]) {
        timers.delete(id);
        fn();
      }
      for (const a of [...animations]) a.onfinish?.();
    };
    settle();
    const initial = w.document.body.innerHTML;
    for (const { swiper, handlers } of swipers) {
      swiper.previousIndex = swiper.activeIndex;
      swiper.activeIndex = 1;
      swiper.realIndex = 1;
      handlers.get('slideChange')?.();
      handlers.get('transitionEnd')?.();
    }
    settle();
    const next = w.document.body.innerHTML;
    for (const { swiper, handlers } of swipers) {
      swiper.previousIndex = 1;
      swiper.activeIndex = 0;
      swiper.realIndex = 0;
      handlers.get('slideChange')?.();
      handlers.get('transitionEnd')?.();
    }
    settle();
    return {
      initial,
      next,
      reverse: w.document.body.innerHTML,
      animations: animations.map((a) => ({ frames: a.frames, timing: a.timing })),
    };
  } finally {
    w.close();
  }
}
(async () => {
  const results = [];
  for (const desktop of [false, true])
    for (const width of [390, 1440]) {
      const file = 'dist/' + (desktop ? 'tdb-home-desktop-instagram.js' : 'tdb-instagram-feed.js');
      const before = await render(old(file), width, desktop),
        after = await render(fs.readFileSync(file, 'utf8'), width, desktop);
      assert.deepEqual(JSON.parse(JSON.stringify(after)), JSON.parse(JSON.stringify(before)));
      results.push({
        file,
        width,
        comparison: 'initial + next + reverse markup and animation keyframes/timing identical',
        sha256: crypto.createHash('sha256').update(JSON.stringify(after)).digest('hex'),
      });
    }
  const report = { baseline: base, cases: results };
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e.message.slice(0, 2500));
  process.exitCode = 1;
});
