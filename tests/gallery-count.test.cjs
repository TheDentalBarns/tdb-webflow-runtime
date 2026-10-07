const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const code = fs.readFileSync(path.join(__dirname,'../dist/tdb-gallery-count.js'),'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(count, failMotion=false) {
  const source=count===null?'':`<div hidden data-tdb-gallery-count-source>${count ? '<div class="w-dyn-items">'+Array.from({length:count},()=>'<div data-tdb-gallery-count-item></div>').join('')+'</div>' : '<div class="w-dyn-empty">No items</div>'}</div>`;
  const dom=new JSDOM(`<a href="/smile-gallery" data-tdb-gallery-ticker-link aria-label="Explore 34 smile transformations"><span data-tdb-gallery-count-slot>34</span><span data-tdb-gallery-count-noun>smile transformations</span></a>${source}`,{url:'https://dentalbarns.webflow.io',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, updates=[],loads=[];
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.example/dist/tdb-gallery-count.js'}});
  let intersect;
  w.IntersectionObserver=class {constructor(fn){intersect=fn;}observe(){}disconnect(){}};
  w.fetch=()=>{throw Error('Count must not request a page');};
  w.TDBModules={load:url=>{loads.push(String(url));return failMotion?Promise.reject(Error('offline')):Promise.resolve();}};
  w.TDBNativeTicker={mount:slot=>({update:value=>{updates.push(value);slot.textContent=value;}})};
  w.eval(code);
  return {dom,w,updates,loads,show:()=>intersect?.([{isIntersecting:true,intersectionRatio:1}]),slot:w.document.querySelector('[data-tdb-gallery-count-slot]')};
}
test('published CMS total ticks directly from holding value only when visible, with no fetch',async()=>{
  for(const count of [35,42,12,1,0]) {
    const h=setup(count);
    try {
      assert.equal(h.slot.textContent,'34');await flush();assert.equal(h.slot.textContent,'34');
      h.show();assert.deepEqual(h.updates,[String(count)]);
      assert.equal(h.w.document.querySelector('a').getAttribute('aria-label'),`Explore ${count} smile transformation${count===1?'':'s'}`);
      h.show();assert.equal(h.updates.length,1);
    } finally {h.dom.window.close();}
  }
});
test('equal count and absent CMS source preserve holding number without dependency requests',async()=>{
  for(const count of [34,null]) {
    const h=setup(count);
    try {h.show();await flush();assert.equal(h.slot.textContent,'34');assert.equal(h.loads.length,0);assert.equal(h.updates.length,0);}
    finally {h.dom.window.close();}
  }
});
test('count remains accurate if shared motion cannot load',async()=>{
  const h=setup(42,true);
  try {h.show();await flush();assert.equal(h.slot.textContent,'42');assert.equal(h.updates.length,0);}
  finally {h.dom.window.close();}
});
