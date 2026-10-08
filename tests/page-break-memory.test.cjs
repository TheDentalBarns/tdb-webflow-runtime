const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
require('node:events').setMaxListeners(0);
const memory = readFileSync(join(__dirname, '../src/page-break/memory.js'), 'utf8');
const motion = readFileSync(join(__dirname, '../src/shared/motion.js'), 'utf8');

// A deterministic DOM/lifecycle harness: geometry is explicit so late native
// scroll restoration and a pending first paint can be exercised independently.
function environment({ navigation = 'reload', width = 1440, height = 900, data, blocked = false } = {}) {
  const window = new EventTarget(), document = new EventTarget(), wrappers = [], frames = new Map();
  let observer, frame = 0;
  const viewportReads = { width: 0, height: 0 };
  const storage = new Map(data ? [['tdb:page-break:v1:/test', JSON.stringify(data)]] : []);
  Object.assign(window, { scrollY: 0, innerWidth: width, innerHeight: height });
  Object.assign(document, { hidden: false, documentElement: {}, body: {}, querySelectorAll: () => wrappers });
  const context = vm.createContext({ window, document,
    get innerWidth() { viewportReads.width++; return width; },
    get innerHeight() { viewportReads.height++; return height; },
    location: { pathname: '/test', search: '' }, AbortController, Date, console,
    performance: { now: () => 100, getEntriesByType: () => [{ type: navigation }] },
    sessionStorage: {
      getItem(key) { if (blocked) throw Error('Storage blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (blocked) throw Error('Storage blocked'); storage.set(key, value); },
    },
    MutationObserver: class { constructor(callback) { observer = callback; } observe() {} disconnect() { observer = null; } },
    requestAnimationFrame: callback => { frames.set(++frame, callback); return frame; },
    cancelAnimationFrame: id => frames.delete(id), matchMedia: () => ({ matches: true }),
    getComputedStyle: node => ({ transform: node.style.transform || 'none' }),
    DOMMatrixReadOnly: class { constructor(value) { this.m42 = Number(/translate3d\(0,\s*([-.\d]+)px/.exec(value)?.[1] || 0); } },
  });
  function add(src = 'flower.webp', richText = false, top = 1400, attrs = {}, imageHeight = 495) {
    const image = { tagName: 'IMG', getAttribute: key => key === 'src' ? src : null };
    const node = new EventTarget();
    Object.assign(node, { tagName: richText ? 'DIV' : 'IMG', style: { transform: '' },
      matches: selector => selector === 'img' && !richText,
      getAttribute: image.getAttribute, querySelectorAll: () => [image],
      getBoundingClientRect: () => {
        const y = Number(/translate3d\(0,\s*([-.\d]+)px/.exec(node.style.transform)?.[1] || 0);
        return { top: top - window.scrollY - (imageHeight - 450) / 2 + y, bottom: top - window.scrollY + 450 + (imageHeight - 450) / 2 + y, height: imageHeight };
      },
    });
    const wrapper = { getAttribute: name => attrs[name] ?? null, querySelector: () => node,
      getBoundingClientRect: () => ({ top: top - window.scrollY, bottom: top - window.scrollY + 450, height: 450 }) };
    wrappers.push(wrapper); observer?.(); return { node, wrapper };
  }
  return { window, document, wrappers, storage, add, viewportReads,
    resize(nextWidth, nextHeight) { width = nextWidth; height = nextHeight; },
    start: () => vm.runInContext(memory, context),
    mount() { vm.runInContext(motion, context); return window.TDBMotion.pageBreaks(wrappers); },
    mutate: () => observer?.(),
    tick() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
  };
}
const snapshot = (items = [{ identity: 'IMG|flower.webp', y: 11.125 }], overrides = {}) =>
  ({ version: 1, time: Date.now(), width: 1440, height: 900, items, ...overrides });

test('reload restores parser-created imagery before controller mount, without resetting a live owner', () => {
  const env = environment({ data: snapshot() }); env.start();
  const { node } = env.add();
  assert.equal(node.style.transform, 'translate3d(0, 11.1250px, 0)');
  assert.equal(env.window.TDBPageBreakMemory.take(node).original, '');
  node.style.transform = 'translate3d(0, 12px, 0)'; env.mutate();
  assert.equal(node.style.transform, 'translate3d(0, 12px, 0)');
});

test('restores separate offsets for identical assets and the CMS rich-text panel', () => {
  const env = environment({ data: snapshot([
    { identity: 'IMG|flower.webp', y: -9 }, { identity: 'IMG|flower.webp', y: 14 },
    { identity: 'DIV|comparison.webp', y: 7 },
  ]) }); env.start();
  assert.match(env.add().node.style.transform, /-9\.0000px/);
  assert.match(env.add().node.style.transform, /14\.0000px/);
  assert.match(env.add('comparison.webp', true).node.style.transform, /7\.0000px/);
});

for (const [name, options, src] of [
  ['fresh navigation', { navigation: 'navigate', data: snapshot() }],
  ['different viewport', { width: 390, data: snapshot() }],
  ['expired snapshot', { data: snapshot(undefined, { time: Date.now() - 86400001 }) }],
  ['changed CMS image', { data: snapshot() }, 'new-image.webp'],
  ['blocked session storage', { blocked: true, data: snapshot() }],
  ['invalid saved offset', { data: snapshot([{ identity: 'IMG|flower.webp', y: 9999 }]) }],
]) test(`${name} leaves native image position intact`, () => {
  const env = environment(options); env.start();
  const { node } = env.add(src); assert.equal(node.style.transform, '');
  assert.doesNotThrow(() => env.window.TDBPageBreakMemory.save([]));
});

test('back/forward restores an image independently of document scroll restoration', () => {
  const env = environment({ navigation: 'back_forward', data: snapshot() }); env.start();
  assert.match(env.add().node.style.transform, /11\.1250px/);
});

for (const navigation of ['reload', 'back_forward']) test(`${navigation} restores parser batches without rereading viewport geometry`, () => {
  const env = environment({ navigation, data: snapshot([
    { identity: 'IMG|flower.webp', y: 11.125 },
    { identity: 'IMG|second.webp', y: -8 },
  ]) });
  env.start();
  const reads = { ...env.viewportReads };
  assert.equal(reads.height, 1, 'capture height once before parsing body nodes');
  assert.equal(env.add().node.style.transform, 'translate3d(0, 11.1250px, 0)');
  env.mutate();
  assert.equal(env.add('second.webp').node.style.transform, 'translate3d(0, -8.0000px, 0)');
  env.document.dispatchEvent(new Event('DOMContentLoaded'));
  assert.deepEqual(env.viewportReads, reads, 'restoring parser-created imagery never reads viewport geometry');
  env.resize(820, 1180);
  env.window.TDBPageBreakMemory.save([]);
  const saved = JSON.parse(env.storage.get('tdb:page-break:v1:/test'));
  assert.equal(saved.width, 820, 'saving still records the current viewport');
  assert.equal(saved.height, 1180);
});

test('fresh navigation does not read restoration geometry or apply saved imagery', () => {
  const env = environment({ navigation: 'navigate', data: snapshot() });
  env.start();
  assert.equal(env.add().node.style.transform, '');
  env.mutate();
  assert.deepEqual(env.viewportReads, { width: 0, height: 0 });
});

test('late browser restoration keeps saved translation, then scroll corrects and pagehide saves it', () => {
  const env = environment({ data: snapshot() }); env.start(); const { node } = env.add();
  const controller = env.mount();
  assert.equal(controller.status()[0].visible, false);
  assert.equal(controller.status()[0].y, 11.125, 'off-screen first mount cannot discard saved position');
  env.window.scrollY = 1220; env.window.dispatchEvent(new Event('scroll')); env.tick();
  assert.equal(controller.status()[0].visible, true);
  assert.equal(controller.status()[0].y, 11.125, 'native restored scroll has no image jump');
  env.window.dispatchEvent(new Event('wheel')); env.window.scrollY += 120;
  env.window.dispatchEvent(new Event('scroll')); env.tick();
  assert.notEqual(controller.status()[0].y, 11.125, 'actual scroll pays down correction');
  const stopped = controller.status()[0].y; env.tick();
  assert.equal(controller.status()[0].y, stopped, 'no idle animation');
  env.window.dispatchEvent(new Event('pagehide'));
  assert.equal(JSON.parse(env.storage.get('tdb:page-break:v1:/test')).items[0].y, stopped);
  controller.destroy(); assert.equal(node.style.transform, '', 'teardown restores authored position');
});

test('hidden tab saves image offset and storage failure cannot break shared motion', () => {
  for (const blocked of [false, true]) {
    const env = environment({ navigation: 'navigate', blocked }); env.start(); env.add('comparison.webp', true);
    env.window.scrollY = 1200; const controller = env.mount();
    env.document.hidden = true;
    assert.doesNotThrow(() => env.document.dispatchEvent(new Event('visibilitychange')));
    if (!blocked) assert.equal(JSON.parse(env.storage.get('tdb:page-break:v1:/test')).items[0].identity, 'DIV|comparison.webp');
    controller.destroy();
  }
});


test('footer percentage travel is independent of viewport units and remains within crop', () => {
  const env = environment({navigation: 'navigate'}); env.start();
  env.add('coffee.webp', false, 1400, {'data-tdb-parallax-from':'-10%', 'data-tdb-parallax-to':'10%'}, 562.5);
  const controller = env.mount();
  assert.equal(controller.status()[0].y, -56.25);
  env.window.dispatchEvent(new Event('wheel')); env.window.scrollY = 2000;
  env.window.dispatchEvent(new Event('scroll')); env.tick();
  assert.equal(controller.status()[0].y, 56.25);
  env.window.dispatchEvent(new Event('pagehide'));
  const data = JSON.parse(env.storage.get('tdb:page-break:v1:/test'));
  const reload = environment({data}); reload.start();
  const {node} = reload.add('coffee.webp', false, 1400, {'data-tdb-parallax-from':'-10%', 'data-tdb-parallax-to':'10%'}, 562.5);
  assert.match(node.style.transform, /56.2500px/);
  assert.equal(reload.mount().status()[0].y, 56.25);
  const changed = environment({data}); changed.start();
  assert.equal(changed.add('coffee.webp',false,1400,{'data-tdb-parallax-from':'-5%', 'data-tdb-parallax-to':'5%'},562.5).node.style.transform, '');
});

test('custom endpoints allow reverse movement, clamp excess travel, and reject invalid values', () => {
  for (const [from,to,expected] of [['10%','-10%',22.5],['bogus','2vh',-18],['0px','18px',0]]) {
    const env=environment({navigation:'navigate'});env.start();env.add('flower.webp',false,1400,{'data-tdb-parallax-from':from,'data-tdb-parallax-to':to});
    assert.equal(env.mount().status()[0].y,expected);
  }
});
