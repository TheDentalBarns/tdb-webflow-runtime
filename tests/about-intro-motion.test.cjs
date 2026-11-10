const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
for (const file of ['src/shared/motion.js', 'dist/tdb-motion.js']) {
  test(`${file}: introduction visits four chapters, reverses and releases boundaries`, () => {
    const dom = new JSDOM(`<section data-tdb-stepped-intro><div><img data-tdb-intro-photo><img data-tdb-intro-doors><div data-tdb-intro-copy>Story</div>${[1,2,3].map(i=>`<a href="#${i}"><span data-tdb-intro-progress></span></a>`).join('')}<a data-tdb-intro-next href="#1">Scroll</a></div></section>`, {runScripts:'outside-only', pretendToBeVisual:true});
    const w = dom.window, root = w.document.querySelector('section'), frames = new Map();
    let id=0, now=0;
    w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
    w.performance.now=()=>now;
    w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
    w.cancelAnimationFrame=id=>frames.delete(id);
    w.innerHeight=800;
    root.getBoundingClientRect=()=>({top:-w.scrollY,height:3200});
    root.firstElementChild.getBoundingClientRect=()=>({height:800});
    w.scrollTo=({top})=>{w.scrollY=top;w.dispatchEvent(new w.Event('scroll'));};
    w.eval(fs.readFileSync(file,'utf8'));
    const owner=w.TDBMotion.steppedIntro(root);
    const flush=()=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn());};
    const wheel=delta=>{const e=new w.WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true});root.dispatchEvent(e);flush();return e;};
    flush();
    assert.equal(owner.status().state,1);
    assert.equal(wheel(-100).defaultPrevented,false);
    assert.equal(wheel(3).defaultPrevented,true);
    now+=10;wheel(5);now+=10;wheel(5);
    assert.equal(owner.status().state,2,'small trackpad deltas accumulate');
    now+=20;wheel(100);
    assert.equal(owner.status().state,2,'momentum cannot skip a chapter');
    for(const state of [3,4]){now+=1000;wheel(100);assert.equal(owner.status().state,state);}
    assert.equal(root.querySelector('[data-tdb-intro-photo]').style.opacity,'0');
    assert.equal(root.querySelector('[data-tdb-intro-copy]').style.opacity,'1');
    now+=1000;assert.equal(wheel(100).defaultPrevented,false,'last chapter permits normal page scrolling');
    now+=1000;wheel(-100);assert.equal(owner.status().state,3);
    assert.equal(root.querySelector('[data-tdb-intro-doors]').style.opacity,'0.78');
    now+=1000;w.scrollY=4000;owner.refresh();flush();
    assert.equal(wheel(-100).defaultPrevented,false,'outside section is never captured');
    owner.destroy();
    assert.equal(root.hasAttribute('data-tdb-intro-state'),false);
    assert.equal(root.querySelector('[data-tdb-intro-photo]').hasAttribute('style'),false);
    assert.equal(frames.size,0);
    dom.window.close();
  });
}
