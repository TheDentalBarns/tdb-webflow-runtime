const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

function fixture(file, width = 1440, initialHeight = 1200) {
  const dom = new JSDOM(`<a id="cta" href="#VIP">Join VIP</a>
    <nav class="navbar10_component"></nav><div id="tdb-vip-drawer">
    <a class="tdb-vip-drawer-handle"><span class="tdb-vip-drawer-label"></span></a>
    <div class="tdb-vip-drawer-body"><input aria-label="Name"></div></div>`,
    {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window, timers = new Map();
  let height = initialHeight, now = 0, id = 0;
  Object.defineProperties(w, {innerWidth:{value:width},innerHeight:{get:()=>height}});
  Object.defineProperty(w.document.documentElement,'clientHeight',{get:()=>height});
  w.matchMedia = query => ({matches:query.includes('prefers-reduced-motion') ||
    (query.includes('max-width') ? width <= 767 : width >= 768),addEventListener(){}});
  w.setTimeout = (fn, delay = 0) => {timers.set(++id,{fn,time:now+delay});return id;};
  w.clearTimeout = key => timers.delete(key);
  w.requestAnimationFrame = fn => w.setTimeout(fn,16);
  w.cancelAnimationFrame = w.clearTimeout;
  w.scrollTo = () => {};
  w.lenis = {start(){},stop(){},resize(){}};
  w.eval(read(file));
  const drawer = w.document.getElementById('tdb-vip-drawer');
  function tick(ms) {
    const end = now + ms;
    for (;;) {
      const next = [...timers].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];
      if (!next) break;
      now=next[1].time;timers.delete(next[0]);next[1].fn();
    }
    now=end;
  }
  return {w,drawer,tick,resize(value){height=value;w.dispatchEvent(new w.Event('resize'));},
    open(){w.document.getElementById('cta').click();},
    close(){w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));},
    finish(){const e=new w.Event('transitionend');Object.defineProperty(e,'propertyName',{value:'transform'});drawer.dispatchEvent(e);},
    destroy(){w.close();}};
}

for (const file of ['dist/tdb-vip-drawer.js','dist/tdb-vip-drawer-legacy.js']) {
  test(file+': closes for the full measured duration, independently of nav/consent/motion',()=>{
    const f=fixture(file), {w,drawer}=f;
    try {
      assert.equal(w.TDBNavMotion,undefined);assert.equal(w.TDBMotion,undefined);
      assert.equal(w.matchMedia('(prefers-reduced-motion: reduce)').matches,true);
      f.open();assert.equal(w.TDBVIPDrawer.status().state,2);
      assert.equal(drawer.style.getPropertyValue('--tdb-vip-drawer-duration'),'716ms');
      assert.equal(drawer.style.getPropertyValue('--tdb-vip-drawer-ease'),'cubic-bezier(0.165,0.84,0.44,1)');
      f.tick(1000);f.close();f.tick(540);
      assert.equal(w.TDBVIPDrawer.status().state,3,'old timeout must not cut off closing');
      assert(w.document.documentElement.classList.contains('tdb-vip-desktop-open'));
      f.tick(225);assert.equal(w.TDBVIPDrawer.status().state,3);
      f.tick(1);assert.equal(w.TDBVIPDrawer.status().state,0);
      assert(!w.document.documentElement.classList.contains('tdb-vip-desktop-open'));
      f.open();f.close();f.finish();assert.equal(w.TDBVIPDrawer.status().state,0,'transitionend remains primary cleanup');
    } finally {f.destroy();}
  });
  test(file+': keyboard resize and quick reversal preserve one cycle; next opening remeasures',()=>{
    const f=fixture(file,390,844), {w,drawer}=f;
    try {
      f.open();assert.equal(drawer.style.getPropertyValue('--tdb-vip-drawer-duration'),'600ms');
      f.resize(375);assert.equal(drawer.style.getPropertyValue('--tdb-vip-drawer-duration'),'600ms');
      f.close();f.tick(200);f.open();f.tick(500);
      assert.equal(w.TDBVIPDrawer.status().state,2,'reopening cancels closing cleanup');
      assert.equal(drawer.style.getPropertyValue('--tdb-vip-drawer-duration'),'600ms');
      f.close();f.tick(649);assert.equal(w.TDBVIPDrawer.status().state,3);
      f.tick(1);assert.equal(w.TDBVIPDrawer.status().state,0);
      f.open();assert.equal(drawer.style.getPropertyValue('--tdb-vip-drawer-duration'),'400ms');
    } finally {f.destroy();}
  });
}

test('nav and VIP share the established viewport-height curve and either bundle can load first',()=>{
  const f=fixture('dist/tdb-vip-drawer.js'), {w}=f;
  try {
    const shared=w.TDBPanelMotion;
    w.eval(read('src/shared/panel-motion.js'));
    assert.equal(w.TDBPanelMotion,shared,'second bundle reuses the singleton');
    const config={duration:500};w.jQuery={data:()=>({config})};
    w.eval(read('src/navbar/nav-motion.js'));
    for (const [height,duration] of [[320,400],[375,400],[768,572],[844,600],[900,620],[1200,716],[2400,950]]) {
      f.resize(height);f.open();
      assert.equal(w.TDBNavMotion.current.panel,duration);
      assert.equal(config.duration,duration,'native Webflow cache follows nav clock');
      assert.equal(f.drawer.style.getPropertyValue('--tdb-vip-drawer-duration'),duration+'ms');
      f.close();f.finish();
    }
  } finally {f.destroy();}
  const dom = new JSDOM('',{runScripts:'outside-only'});
  try {
    dom.window.matchMedia = () => ({matches:false});
    dom.window.eval(read('src/shared/panel-motion.js'));
    const first=dom.window.TDBPanelMotion;
    dom.window.eval(read('dist/tdb-vip-drawer-legacy.js'));
    assert.equal(dom.window.TDBPanelMotion,first);
  } finally {dom.window.close();}
});
