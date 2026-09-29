const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../src/reviews/review-drawer.js'), 'utf8');
const section = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));

function navigation(index = 0) {
  const context = vm.createContext({
    window: {}, document: { activeElement: null },
    position: {}, prev: {}, next: {}, closeBtn: { focus() {} },
    list: Array.from({ length: 5 }, () => ({})), index, transition: null, drag: null,
    closing: false, current: null,
  });
  vm.runInContext(`
    function slide() {
      return { contains: () => false, animate() {
        let resolve;
        const finished = new Promise(done => resolve = done);
        return { finished, finish: resolve, cancel: resolve };
      }};
    }
    current = slide();
    function setCurrent(value) { current = value; updatePosition(); }
    function beginSlide(direction) {
      if (transition || !list[index + direction]) return null;
      return transition = { from: current, to: slide(), direction,
        width: 390, offset: 0, animations: [], settling: false };
    }
    ${section('  function updatePosition', '  function cancelSlide')}
    ${section('  async function settle', '  function refresh')}
    updatePosition();
  `, context);
  return context;
}

async function finish(context) {
  const pending = context.transition;
  pending?.animations.forEach(animation => animation.finish());
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test('rapid forward presses update the fallback counter immediately and each advances once', async () => {
  const n = navigation();
  n.step(1);
  assert.equal(n.position.textContent, '2 / 5');
  assert.equal(n.prev.disabled, false);
  n.step(1);
  n.step(1);
  assert.equal(n.position.textContent, '4 / 5');
  await finish(n);
  assert.equal(n.index, 3);
  assert.equal(n.transition, null);
});

test('the first forward transition can be reversed immediately', async () => {
  const n = navigation();
  n.step(1);
  assert.equal(n.prev.disabled, false);
  n.step(-1);
  assert.equal(n.position.textContent, '1 / 5');
  assert.equal(n.prev.disabled, true);
  await finish(n);
  assert.equal(n.index, 0);
});

test('a rapid tap during a cancelled swipe does not commit that swipe', async () => {
  const n = navigation(1);
  n.beginSlide(1);
  n.settle(false);
  n.step(1);
  assert.equal(n.position.textContent, '3 / 5');
  await finish(n);
  assert.equal(n.index, 2);
});

test('last-review controls change at transition start and allow an immediate reverse', async () => {
  const n = navigation(3);
  n.step(1);
  assert.equal(n.next.disabled, true);
  n.step(-1);
  assert.equal(n.next.disabled, false);
  await finish(n);
  assert.equal(n.index, 3);
});
