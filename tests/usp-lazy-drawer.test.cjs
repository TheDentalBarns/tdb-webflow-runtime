const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = path => fs.readFileSync(path, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup({lazy = true} = {}) {
  const triggers = Array.from({length:5}, (_, i) => `<div data-tdb-usp-trigger-zone><span data-tdb-usp-label>Highlight ${i}</span><img class="feature-item_door-image"><a href="#" data-tdb-usp-launch="${i}">Open ${i}</a></div>`).join('');
  const dom = new JSDOM(`<html><head></head><body><section data-tdb-usp ${lazy ? 'data-tdb-usp-lazy' : ''}>${triggers}<div data-tdb-usp-mount></div></section></body></html>`, {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
  const w=dom.window, doc=w.document, opens=[], observers=[];
  let mounts=0;
  const script=doc.createElement('script');
  script.src='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@experiment/dist/tdb-usp-drawer.js';
  Object.defineProperty(doc,'currentScript',{value:script});
  w.IntersectionObserver=class {constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){}};
  w.TDBSwiper={create(){},register(){},mount(name,section){
    assert.equal(name,'usp-drawer'); mounts++;
    if(lazy) {
      assert.ok(section.querySelector('[data-tdb-drawer]').hidden);
      assert.equal(section.querySelectorAll('[data-tdb-usp-source]').length,0);
      assert.equal(w.TDBUSPDrawerTemplate.records(section).length,5);
    }
    return {open:async(index,trigger)=>opens.push({index,trigger})};
  }};
  w.eval(read('src/shared/modules.js'));
  w.eval(read('dist/tdb-usp-drawer.js'));
  // Let the real JSDOM DOMContentLoaded event discover the section exactly once.
  const handled=new WeakSet();
  async function pump({css='load'}={}) {
    for(let i=0;i<10;i++) {
      for(const node of doc.head.querySelectorAll('script,link')) {
        if(handled.has(node)||node.tagName==='LINK'&&css==='hold')continue;
        handled.add(node);
        if(node.src?.endsWith('tdb-usp-drawer-template.js')) w.eval(read('dist/tdb-usp-drawer-template.js'));
        node.dispatchEvent(new w.Event(node.tagName==='LINK'&&css==='error'?'error':'load'));
      }
      await tick();
    }
  }
  return {w,doc,opens,observers,pump,api:w.TDBUSPDrawer,section:doc.querySelector('section'),trigger:i=>doc.querySelector(`[data-tdb-usp-launch="${i}"]`),mounts:()=>mounts,close:()=>w.close()};
}
test('load, scroll proximity, hover, focus and pointer-down do not warm lazy USP assets',async()=>{
 const f=setup();try{
  await tick();
  for(const name of ['pointerover','focusin','pointerdown'])f.trigger(0).dispatchEvent(new f.w.Event(name,{bubbles:true}));
  await f.pump();
  assert.equal(f.observers.length,0);assert.equal(f.doc.head.childElementCount,0);
  assert.equal(f.doc.querySelector('[data-tdb-usp-content]'),null);
  assert.equal(f.trigger(0).getAttribute('aria-disabled'),'false');
 }finally{f.close();}
});
test('first click waits for CSS, mounts one shell, and preserves the clicked highlight',async()=>{
 const f=setup();try{
  await tick();f.trigger(3).click();await f.pump({css:'hold'});
  assert.equal(f.trigger(3).getAttribute('aria-busy'),'true');
  assert.equal(f.doc.querySelector('[data-tdb-usp-content]'),null);
  await f.pump();
  assert.equal(f.mounts(),1);assert.equal(f.opens[0].index,3);
  assert.equal(f.trigger(3).hasAttribute('aria-busy'),false);
  assert.equal(f.doc.querySelectorAll('[data-tdb-usp-content]').length,1);
  const tags=f.doc.head.childElementCount;
  await f.api.open(1,f.trigger(1));
  assert.equal(f.mounts(),1);assert.equal(f.doc.head.childElementCount,tags);
  assert.equal(f.opens.at(-1).index,1);
 }finally{f.close();}
});
test('stylesheet failure keeps the host empty and click retries without duplicate assets',async()=>{
 const f=setup();try{
  await tick();f.trigger(0).click();await f.pump({css:'error'});
  assert.equal(f.doc.querySelector('[data-tdb-usp-mount]').childElementCount,0);
  assert.equal(f.trigger(0).hasAttribute('aria-busy'),false);
  assert.match(f.trigger(0).getAttribute('aria-label'),/Try again/);
  f.trigger(0).click();await f.pump();
  assert.equal(f.opens.length,1);assert.equal(f.mounts(),1);
  assert.equal(f.doc.querySelectorAll('link').length,2);
 }finally{f.close();}
});
test('rapid first requests share transport and the latest requested highlight wins',async()=>{
 const f=setup();try{
  await tick();const a=f.api.open(0,f.trigger(0)), b=f.api.open(4,f.trigger(4));
  await f.pump();await Promise.all([a,b]);
  assert.equal(f.mounts(),1);assert.deepEqual(f.opens.map(x=>x.index),[4]);
  assert.equal([...f.doc.scripts].filter(s=>s.src.endsWith('tdb-usp-drawer-template.js')).length,1);
 }finally{f.close();}
});
test('close while assets load prevents a late open and a subsequent request works',async()=>{
 const f=setup();try{
  await tick();const request=f.api.open(2);await f.pump({css:'hold'});f.api.close();
  await f.pump();await request;assert.equal(f.opens.length,0);
  await f.api.open(4);assert.equal(f.opens[0].index,4);
 }finally{f.close();}
});
test('non-lazy pages retain their native proximity warm-up without snapshot assets',async()=>{
 const f=setup({lazy:false});try{
  await tick();assert.equal(f.observers.length,1);
  f.observers[0].fn([{isIntersecting:true}]);await f.pump();
  assert.equal(f.mounts(),1);assert.equal(f.doc.querySelectorAll('link').length,0);
  assert.equal([...f.doc.scripts].some(s=>/template/.test(s.src)),false);
 }finally{f.close();}
});
