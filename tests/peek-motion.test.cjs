const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function fixture(value) {
  const dom = new JSDOM(`<nav class="navbar10_component"><button class="navbar10_menu-button" aria-expanded="true"></button><button class="navbar10_dropdown-toggle" aria-expanded="true"></button></nav><section class="swiper"><button class="swiper-btn-next">Next</button></section>`, {runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window, root = w.document.documentElement, timers = new Map();
  let id = 0, closes = 0;
  if (value) root.style.setProperty('--tdb-peek-duration', value);
  w.setTimeout = (fn, delay) => { timers.set(++id, {fn, delay}); return id; };
  w.clearTimeout = id => timers.delete(id);
  w.document.querySelectorAll('nav button').forEach(button => button.addEventListener('click', () => {closes++;button.setAttribute('aria-expanded','false');}));
  w.eval(read('dist/tdb-slider-focus.js'));
  return {w,root,timers,closes:()=>closes,activate:()=>w.document.querySelector('.swiper-btn-next').click(),destroy:()=>w.close()};
}

for (const [value,duration] of [['420ms',420],['0.7s',700],['',420],['invalid',420]]) {
  test('slider focus waits for shared peek travel: '+(value||'CSS not ready'), () => {
    const f = fixture(value);
    try {
      f.activate();
      assert(f.root.classList.contains('tdb-slider-focus'));
      assert.equal(f.closes(),0,'open menu stays intact during its upward travel');
      const timers = [...f.timers.values()];
      assert.deepEqual(timers.map(t=>t.delay),[duration+10,duration+260]);
      timers[0].fn();assert.equal(f.closes(),2,'menu and dropdown close after travel');
      timers[1].fn();assert.equal(f.closes(),2,'second cleanup is harmless');
      f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      assert(!f.root.classList.contains('tdb-slider-focus'));
      assert.equal(f.timers.size,0,'release cancels pending cleanup');
    } finally {f.destroy();}
  });
}

test('runtime no longer replaces native navbar control transitions', () => {
  const css=read('src/navbar/nav-state.css');
  for (const rule of css.split('}')) {
    if (rule.includes('transition:')) assert.doesNotMatch(rule,/\.navbar10_link|#nav-button-link/);
  }
  assert.match(css,/transform var\(--tdb-peek-duration,420ms\)/);
  assert.match(css,/background-color var\(--tdb-nav-detail-duration,420ms\)/,'panel/detail timing is independent');
  assert.doesNotMatch(read('src/banner/announcement.js'),/html\.tdb-slider-focus #tdb-elfsight-timer-shell/);
  const shared=read('dist/tdb-ui.css');
  assert.equal((shared.match(/--tdb-peek-duration: 420ms/g)||[]).length,1);
  assert.match(shared,/visibility 0s linear var\(--tdb-peek-duration,420ms\)/,'banner remains painted until travel finishes');
  assert.doesNotMatch(shared,/prefers-reduced-motion/);
});
