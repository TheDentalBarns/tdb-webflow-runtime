const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = path => fs.readFileSync(path, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup({lazy = true, allowed = true} = {}) {
  const dom = new JSDOM('<!doctype html><head></head><body><section data-tdb-review-introduction><button data-tdb-review-trigger>Read reviews</button><p data-tdb-review-status></p></section>' +
    (lazy ? '<div data-tdb-review-lazy></div>' : read('src/reviews/native/drawer-template.html')) + '</body>',
    {url:'https://dentalbarns.webflow.io/', runScripts:'outside-only'});
  const w = dom.window, doc = w.document, calls = [], observers = [];
  let permission = allowed, subscriber, mounted = 0, destroyed = 0;
  w.TDBReviewOptions = {permission:()=>permission, subscribe:fn=>subscriber=fn};
  w.IntersectionObserver = class {constructor(fn, options){this.fn=fn;this.options=options;observers.push(this);} observe(){} unobserve(){}};
  const script = doc.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@experiment/dist/tdb-reviews-loader.js';
  script.dataset.tdbReviewBase = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@preserved/dist/';
  Object.defineProperty(doc,'currentScript',{value:script});
  w.eval(read('src/shared/modules.js'));
  const data = {records:[], total:85, average:4.94, ensureIdentity:async()=>{}, ensure:async(ids)=>calls.push(['ensure',...ids])};
  w.TDBReviewCMS = {load:async()=>data, resolveIdentity:()=>''};
  w.TDBReviewIntroduction = {mount:()=>({destroy(){}})};
  w.TDBReviews = {};
  w.Swiper = function(){};
  w.TDBSwiper = {create(){}, register(){}, mount(name, root) {
    assert.equal(name,'review-drawer');
    assert.ok(root.closest('[data-tdb-drawer]').hidden,'mount is initially hidden');
    mounted++;
    return {open:async(trigger,id)=>calls.push(['open',id]), destroy:()=>destroyed++};
  }};
  w.eval(read('dist/tdb-reviews-loader.js'));
  doc.dispatchEvent(new w.Event('DOMContentLoaded'));
  const handled = new WeakSet();
  async function pump({css='load'}={}) {
    for(let i=0;i<12;i++) {
      for(const node of doc.head.querySelectorAll('script,link')) {
        if(handled.has(node)||node.tagName==='LINK'&&css==='hold') continue;
        handled.add(node);
        if(node.src?.endsWith('tdb-review-drawer-template.js')) w.eval(read('dist/tdb-review-drawer-template.js'));
        node.dispatchEvent(new w.Event(node.tagName==='LINK'&&css==='error'?'error':'load'));
      }
      await tick();
    }
  }
  return {w,doc,calls,observers,pump,api:w.TDBReviewLoader,trigger:doc.querySelector('button'),
    mounted:()=>mounted,destroyed:()=>destroyed,setPermission(v){permission=v;subscriber();},close:()=>w.close()};
}
test('visible reviews, hover, focus and pointer-down never warm the lazy drawer',async()=>{
  const f=setup();try{
    const section=f.trigger.closest('section');
    for(const o of f.observers)o.fn([{target:section,isIntersecting:true}]);
    for(const type of ['pointerover','focusin','pointerdown'])f.trigger.dispatchEvent(new f.w.Event(type,{bubbles:true}));
    await f.pump();
    assert.equal(f.observers.length,1,'no drawer warming observer');
    assert.equal(f.doc.querySelector('[data-tdb-reviews]'),null);
    assert.equal(f.doc.querySelector('[data-tdb-review-lazy]').childElementCount,0);
    assert.equal(f.doc.querySelector('link'),null);
    assert.equal([...f.doc.scripts].filter(n=>/drawer|filters|tdb-reviews\.js/.test(n.src)).length,0);
    assert.equal(f.api.status().instances,1,'visible review introduction still mounts');
  }finally{f.close();}
});
test('concurrent first opens wait for CSS, mount once and retain the requested review',async()=>{
  const f=setup();try{
    const first=f.api.open({trigger:f.trigger,reviewId:'selected-review'});
    const second=f.api.prepare();
    await f.pump({css:'hold'});
    assert.equal(f.doc.querySelector('[data-tdb-reviews]'),null,'no unstyled content attached');
    assert.equal(f.doc.querySelectorAll('link').length,1);
    assert.equal([...f.doc.scripts].filter(n=>n.src.endsWith('tdb-review-drawer-template.js')).length,1);
    await f.pump();await Promise.all([first,second]);
    assert.equal(f.mounted(),1);assert.equal(f.doc.querySelectorAll('[data-tdb-reviews]').length,1);
    assert.ok(f.calls.some(c=>c[0]==='open'&&c[1]==='selected-review'));
    const tags=f.doc.head.childElementCount;
    await f.api.open({trigger:f.trigger,reviewId:'another-review'});
    assert.equal(f.mounted(),1);assert.equal(f.doc.head.childElementCount,tags);
  }finally{f.close();}
});
test('failed stylesheet load leaves an empty host and a later request retries successfully',async()=>{
  const f=setup();try{
    const first=f.api.prepare();const rejected=assert.rejects(first,/Dependency unavailable/);
    await f.pump({css:'error'});await rejected;
    assert.equal(f.doc.querySelector('[data-tdb-reviews]'),null);
    const retry=f.api.prepare();await f.pump();await retry;
    assert.equal(f.mounted(),1);assert.equal(f.doc.querySelectorAll('link').length,1);
  }finally{f.close();}
});
test('permission revocation during transport prevents late insertion and supports later retry',async()=>{
  const f=setup();try{
    const first=f.api.prepare();const cancelled=assert.rejects(first,{name:'AbortError'});
    await f.pump({css:'hold'});f.setPermission(false);await f.pump();await cancelled;
    assert.equal(f.doc.querySelector('[data-tdb-reviews]'),null);assert.equal(f.mounted(),0);
    f.setPermission(true);const retry=f.api.prepare();await f.pump();await retry;
    assert.equal(f.mounted(),1);
    f.setPermission(false);assert.equal(f.destroyed(),1);
  }finally{f.close();}
});
test('individual cancelled requests do not prevent another consumer opening',async()=>{
  const f=setup();try{
    const controller=new f.w.AbortController();
    const first=f.api.prepare({signal:controller.signal});const cancelled=assert.rejects(first,{name:'AbortError'});
    const second=f.api.open({trigger:f.trigger,reviewId:'surviving-request'});
    controller.abort();await f.pump();await cancelled;await second;
    assert.equal(f.mounted(),1);assert.ok(f.calls.some(c=>c[1]==='surviving-request'));
  }finally{f.close();}
});
test('permission gate prevents any lazy request',async()=>{
  const f=setup({allowed:false});try{
    await assert.rejects(f.api.prepare(),{name:'AbortError'});
    assert.equal(f.doc.head.childElementCount,0);assert.equal(f.doc.querySelector('[data-tdb-reviews]'),null);
  }finally{f.close();}
});
