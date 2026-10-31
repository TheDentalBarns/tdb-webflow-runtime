const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const dom = new JSDOM('<link rel="stylesheet" data-tdb-slider-ui-css href="https://example.com/dist/tdb-slider-ui.css">', { runScripts: 'outside-only' });
  const w = dom.window, frames = new Map();let id = 0, ready = false;
  w.getComputedStyle = () => ({ getPropertyValue: () => ready ? '1' : '0' });
  w.requestAnimationFrame = callback => { frames.set(++id, callback);return id; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.eval(fs.readFileSync('src/shared/feature-css.js', 'utf8'));
  return {w, frames, setReady: () => ready = true, link: () => w.document.querySelector('link'), frame() { const callbacks = [...frames.values()];frames.clear();callbacks.forEach(callback => callback()); }, close: () => w.close()};
}
test('stylesheet load waits one frame for WebKit style application and shares the preparation flight', async () => {
  const f=fixture();try {
    const original=f.link(), first=f.w.tdbEnsureSliderUI(), second=f.w.tdbEnsureSliderUI();assert.equal(first,second);
    let done=false;first.then(()=>done=true);
    original.dispatchEvent(new f.w.Event('load'));original.dispatchEvent(new f.w.Event('load'));
    await tick();assert.equal(done,false);assert.equal(f.frames.size,1);assert.equal(f.link(),original);
    f.setReady();f.frame();await first;
    assert.equal(done,true);assert.equal(f.link(),original);assert.equal(original.dataset.tdbLoaded,'true');assert.equal(original.dataset.tdbLoadFailed,undefined);assert.equal(f.frames.size,0);
  } finally {f.close();}
});
test('a genuinely stale stylesheet still retries once then rejects after its bounded recheck', async () => {
  const f=fixture();try {
    const first=f.link(), flight=f.w.tdbEnsureSliderUI(), rejected=assert.rejects(flight,/stale or incomplete/);
    first.dispatchEvent(new f.w.Event('load'));f.frame();const replacement=f.link();assert.notEqual(replacement,first);
    replacement.dispatchEvent(new f.w.Event('load'));f.frame();await rejected;
    assert.equal(replacement.dataset.tdbLoadFailed,'true');assert.equal(f.frames.size,0);
  } finally {f.close();}
});
test('module-registry styles also await one readiness frame without duplicating the link or flight', async () => {
  const f=fixture();try {
    f.w.eval(fs.readFileSync('src/shared/modules.js','utf8'));
    const options={type:'style',ready:()=>f.w.getComputedStyle().getPropertyValue()==='1'};
    const url=f.link().href,original=f.link(),first=f.w.TDBModules.load(url,options),second=f.w.TDBModules.load(url,options);
    assert.equal(first,second);original.dispatchEvent(new f.w.Event('load'));assert.equal(f.frames.size,1);
    f.setReady();f.frame();await first;assert.equal(f.link(),original);assert.equal(original.dataset.tdbLoaded,'true');assert.equal(f.frames.size,0);
  } finally {f.close();}
});
test('module-registry style readiness remains a terminal export failure after one unsuccessful frame', async () => {
  const f=fixture();try {
    f.w.eval(fs.readFileSync('src/shared/modules.js','utf8'));
    const options={type:'style',ready:()=>false},url=f.link().href,flight=f.w.TDBModules.load(url,options);
    const rejected=assert.rejects(flight,error=>error.code==='TDB_EXPORT');f.link().dispatchEvent(new f.w.Event('load'));f.frame();await rejected;
    await assert.rejects(f.w.TDBModules.load(url,options),error=>error.code==='TDB_EXPORT');assert.equal(f.w.document.querySelectorAll('link').length,1);assert.equal(f.frames.size,0);
  } finally {f.close();}
});
